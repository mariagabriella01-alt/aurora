export interface ShopiaPlaybackCallbacks {
  onLoadingChange: (id: string | null) => void;
  onSpeakingChange: (id: string | null) => void;
  onCaptionChange: (caption: string | null) => void;
  onErrorChange: (error: string | null) => void;
}

interface PlayAudioResult {
  ok: boolean;
  blocked?: boolean;
}

const SILENT_WAV_URI =
  'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';

const NON_RETRYABLE_CODES = new Set([
  'SHOPIA_VOICE_NOT_CONFIGURED',
  'SHOPIA_AUTH_ERROR',
  'SHOPIA_EMPTY_AUDIO',
  'HTML_FALLBACK',
]);

function decodeBase64ToBlob(base64Raw: string, mimeType: string): Blob | null {
  try {
    const cleaned = base64Raw.replace(/^data:audio\/[a-z0-9.+-]+;base64,/i, '').trim();
    if (!cleaned) return null;
    const binary = window.atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mimeType || 'audio/mpeg' });
  } catch {
    return null;
  }
}

class ShopiaVoiceService {
  private audioEl: HTMLAudioElement | null = null;
  private abortController: AbortController | null = null;
  private audioCache = new Map<string, string>();
  private inFlightRequests = new Map<string, Promise<Blob>>();
  private activeVoiceTag: string | null = null;
  private seq = 0;
  private callbacks: ShopiaPlaybackCallbacks | null = null;

  public setCallbacks(callbacks: ShopiaPlaybackCallbacks | null): void {
    this.callbacks = callbacks;
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && typeof Audio !== 'undefined';
  }

  private getOrCreatePlayer(): HTMLAudioElement {
    if (!this.audioEl) {
      const el = new Audio();
      el.preload = 'auto';
      el.setAttribute('playsinline', 'true');
      this.audioEl = el;
    }
    return this.audioEl;
  }

  public unlockAudio(): void {
    if (!this.isSupported()) return;
    try {
      const player = this.getOrCreatePlayer();
      if (
        !player.paused &&
        player.currentTime > 0 &&
        player.src &&
        !player.src.startsWith('data:audio/wav')
      ) {
        return;
      }
      player.muted = true;
      player.src = SILENT_WAV_URI;
      const playPromise = player.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            player.pause();
            player.muted = false;
          })
          .catch(() => {
            player.muted = false;
          });
      } else {
        player.muted = false;
      }
    } catch {
      // Ignore mobile audio unlock issues
    }
  }

  public clearCache(): void {
    for (const url of this.audioCache.values()) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // Ignore URL revoke issues
      }
    }
    this.audioCache.clear();
  }

  public stopActive(): void {
    this.seq += 1;
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    if (this.audioEl) {
      try {
        this.audioEl.onended = null;
        this.audioEl.onerror = null;
        this.audioEl.pause();
        this.audioEl.currentTime = 0;
      } catch {
        // Ignore audio stop errors
      }
    }
  }

  public stop(): void {
    this.stopActive();
    this.callbacks?.onLoadingChange(null);
    this.callbacks?.onSpeakingChange(null);
    this.callbacks?.onCaptionChange(null);
  }

  public destroy(): void {
    this.stop();
    this.clearCache();
    this.inFlightRequests.clear();
    this.callbacks = null;
  }

  private playAudioUrl(
    url: string,
    text: string,
    id: string,
    seq: number,
  ): Promise<PlayAudioResult> {
    return new Promise((resolve) => {
      if (seq !== this.seq) {
        resolve({ ok: false });
        return;
      }
      try {
        const audio = this.getOrCreatePlayer();
        audio.onended = null;
        audio.onerror = null;
        audio.muted = false;
        audio.playbackRate = 1.0;
        audio.pause();
        audio.src = url;
        audio.currentTime = 0;

        audio.onended = () => {
          if (seq === this.seq) {
            this.callbacks?.onSpeakingChange(null);
          }
        };

        audio.onerror = () => {
          if (seq === this.seq) {
            this.callbacks?.onSpeakingChange(null);
          }
          resolve({ ok: false });
        };

        this.callbacks?.onLoadingChange(null);
        this.callbacks?.onSpeakingChange(id);
        this.callbacks?.onCaptionChange(text);

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise
            .then(() => {
              if (seq !== this.seq) {
                try {
                  audio.pause();
                } catch {
                  // Ignore
                }
                resolve({ ok: false });
                return;
              }
              resolve({ ok: true });
            })
            .catch((err: unknown) => {
              const name = (err as { name?: string })?.name || '';
              resolve({ ok: false, blocked: name === 'NotAllowedError' });
            });
        } else {
          resolve({ ok: true });
        }
      } catch {
        resolve({ ok: false });
      }
    });
  }

  private async fetchAudioBlobOnce(text: string, signal: AbortSignal): Promise<Blob> {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'audio/*, application/json',
      },
      cache: 'no-store',
      body: JSON.stringify({ text: text.slice(0, 2200) }),
      signal,
    });

    const contentType = (res.headers.get('content-type') || '').toLowerCase();

    if (!res.ok) {
      let apiError = 'Não foi possível gerar o áudio com a voz exclusiva da Shopia agora.';
      let code = '';
      try {
        const errData = (await res.json()) as { error?: string; code?: string };
        if (errData?.error) apiError = errData.error;
        if (errData?.code) code = errData.code;
      } catch {
        if (res.status === 404) {
          apiError = 'O serviço de voz da Shopia (/api/tts) não foi encontrado neste servidor.';
          code = 'NOT_FOUND';
        }
      }
      const err = new Error(apiError) as Error & { code?: string; status?: number };
      err.code = code;
      err.status = res.status;
      throw err;
    }

    const voiceTag = res.headers.get('x-aurora-voice-id');
    if (voiceTag && this.activeVoiceTag && this.activeVoiceTag !== voiceTag) {
      this.clearCache();
    }
    if (voiceTag) {
      this.activeVoiceTag = voiceTag;
    }

    if (contentType.includes('audio/') || contentType.includes('application/octet-stream')) {
      const blob = await res.blob();
      if (blob.size === 0) {
        const err = new Error('O serviço da Shopia retornou um áudio vazio.') as Error & {
          code?: string;
        };
        err.code = 'SHOPIA_EMPTY_AUDIO';
        throw err;
      }
      return contentType.includes('audio/')
        ? blob
        : new Blob([blob], { type: 'audio/mpeg' });
    }

    if (contentType.includes('application/json')) {
      const json = (await res.json()) as {
        error?: string;
        code?: string;
        provider?: string;
        shopiaConfigured?: boolean;
        audioBase64?: string;
        audio_base64?: string;
        audio?: string;
        data?: string;
        mimeType?: string;
        mime_type?: string;
      };
      const b64 = json.audioBase64 || json.audio_base64 || json.audio || json.data || '';
      if (b64) {
        const decoded = decodeBase64ToBlob(
          b64,
          json.mimeType || json.mime_type || 'audio/mpeg',
        );
        if (decoded && decoded.size > 0) {
          return decoded;
        }
      }
      if (json.error) {
        const err = new Error(json.error) as Error & { code?: string };
        err.code = json.code || 'SHOPIA_TTS_UNAVAILABLE';
        throw err;
      }
      if (json.provider === 'shopia' && json.shopiaConfigured === false) {
        const err = new Error(
          'A integração exclusiva da voz da Shopia ainda não está com todas as credenciais configuradas no servidor (SHOPIA_TTS_API_URL, SHOPIA_TTS_API_KEY e SHOPIA_VOICE_ID).',
        ) as Error & { code?: string };
        err.code = 'SHOPIA_VOICE_NOT_CONFIGURED';
        throw err;
      }
    }

    if (contentType.includes('text/html')) {
      const err = new Error(
        'A rota de voz /api/tts respondeu com HTML em vez do servidor da Shopia. Verifique se o backend Node/Vercel está ativo.',
      ) as Error & { code?: string };
      err.code = 'HTML_FALLBACK';
      throw err;
    }

    const err = new Error('O servidor não retornou um áudio válido da Shopia.') as Error & {
      code?: string;
    };
    err.code = 'INVALID_CONTENT_TYPE';
    throw err;
  }

  private async fetchAudioBlobWithRetry(text: string, signal: AbortSignal): Promise<Blob> {
    const existingPromise = this.inFlightRequests.get(text);
    if (existingPromise) {
      return existingPromise;
    }

    const task = (async () => {
      try {
        return await this.fetchAudioBlobOnce(text, signal);
      } catch (firstErr) {
        if (signal.aborted || (firstErr as { name?: string })?.name === 'AbortError') {
          throw firstErr;
        }
        const errObj = firstErr as { code?: string; status?: number };
        const shouldRetry =
          !errObj.code ||
          (!NON_RETRYABLE_CODES.has(errObj.code) &&
            errObj.status !== 400 &&
            errObj.status !== 404 &&
            errObj.status !== 429);

        if (!shouldRetry) {
          throw firstErr;
        }

        await new Promise<void>((resolve, reject) => {
          const timer = window.setTimeout(resolve, 450);
          signal.addEventListener(
            'abort',
            () => {
              window.clearTimeout(timer);
              reject(new DOMException('Aborted', 'AbortError'));
            },
            { once: true },
          );
        });

        return await this.fetchAudioBlobOnce(text, signal);
      } finally {
        this.inFlightRequests.delete(text);
      }
    })();

    this.inFlightRequests.set(text, task);
    return task;
  }

  public speak(text: string, id = 'global'): void {
    const cleanText = text.trim();
    if (!cleanText) return;

    this.stopActive();
    const seq = this.seq;

    this.callbacks?.onErrorChange(null);
    this.callbacks?.onCaptionChange(cleanText);

    const cachedUrl = this.audioCache.get(cleanText);
    if (cachedUrl) {
      this.audioCache.delete(cleanText);
      this.audioCache.set(cleanText, cachedUrl);
      this.callbacks?.onLoadingChange(null);
      this.callbacks?.onSpeakingChange(id);
      void this.playAudioUrl(cachedUrl, cleanText, id, seq).then(({ ok, blocked }) => {
        if (!ok && seq === this.seq) {
          this.callbacks?.onSpeakingChange(null);
          this.callbacks?.onErrorChange(
            blocked
              ? 'Toque no botão de áudio novamente para iniciar a reprodução neste aparelho.'
              : 'Não foi possível reproduzir o áudio da Shopia neste navegador.',
          );
        }
      });
      return;
    }

    this.unlockAudio();
    this.callbacks?.onSpeakingChange(null);
    this.callbacks?.onLoadingChange(id);

    const controller = new AbortController();
    this.abortController = controller;

    void (async () => {
      try {
        const blob = await this.fetchAudioBlobWithRetry(cleanText, controller.signal);
        if (seq !== this.seq || controller.signal.aborted) {
          return;
        }

        const objectUrl = URL.createObjectURL(blob);
        if (this.audioCache.size >= 40) {
          const oldest = this.audioCache.entries().next().value as [string, string] | undefined;
          if (oldest) {
            URL.revokeObjectURL(oldest[1]);
            this.audioCache.delete(oldest[0]);
          }
        }
        this.audioCache.set(cleanText, objectUrl);

        const { ok, blocked } = await this.playAudioUrl(objectUrl, cleanText, id, seq);
        if (!ok && seq === this.seq) {
          this.callbacks?.onLoadingChange(null);
          this.callbacks?.onSpeakingChange(null);
          this.callbacks?.onErrorChange(
            blocked
              ? 'Toque no botão de áudio para iniciar a reprodução neste aparelho.'
              : 'Não foi possível reproduzir o áudio gerado neste aparelho.',
          );
        }
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
        if (seq === this.seq) {
          this.callbacks?.onLoadingChange(null);
          this.callbacks?.onSpeakingChange(null);
          this.callbacks?.onErrorChange(
            err instanceof Error && err.message
              ? err.message
              : 'Erro de conexão ao gerar a voz exclusiva da Shopia.',
          );
        }
      } finally {
        if (this.abortController === controller) {
          this.abortController = null;
        }
      }
    })();
  }
}

export const shopiaVoiceService = new ShopiaVoiceService();
