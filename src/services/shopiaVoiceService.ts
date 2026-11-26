export const INITIAL_SOPHIA_GREETING_TEXT =
  'Oi, você está bem? Eu sou a Sophia, sua assistente virtual de acolhimento aqui na Aurora — um novo começo, uma nova esperança. Pode me contar o que está pesando hoje — seja vazio, trabalho demais, bullying na escola, comparação, superação de algum vício ou qualquer outra dor. Você não precisa enfrentar isso sem ser ouvido(a).';

const GREETING_ASSET_URL = '/assets/aistudio/Oi__voc__est__bem__Eu_sou_a_So.._67203881.m4a';
const GREETING_SESSION_KEY = 'aurora_sophia_greeting_played_v1';

interface VoiceCallbacks {
  onLoadingChange?: (id: string | null) => void;
  onSpeakingChange?: (id: string | null) => void;
  onCaptionChange?: (caption: string | null) => void;
  onErrorChange?: (error: string | null) => void;
}

function normalizeComparisonText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const GREETING_NORMALIZED = normalizeComparisonText(INITIAL_SOPHIA_GREETING_TEXT);

function isGreetingText(rawText: string): boolean {
  const normalized = normalizeComparisonText(rawText);
  return (
    normalized === GREETING_NORMALIZED ||
    (normalized.startsWith('oi voce esta bem eu sou a sophia sua assistente virtual de acolhimento') &&
      normalized.includes('voce nao precisa enfrentar isso sem ser ouvido'))
  );
}

class ShopiaVoiceService {
  private callbacks: VoiceCallbacks = {};
  private audioEl: HTMLAudioElement | null = null;
  private objectUrl: string | null = null;
  private fetchController: AbortController | null = null;
  private currentId: string | null = null;
  private audioUnlocked = false;
  private gestureCancelFns: Array<() => void> = [];
  private greetingAttemptedThisMount = false;

  isSupported(): boolean {
    return typeof window !== 'undefined' && typeof Audio !== 'undefined';
  }

  setCallbacks(callbacks: VoiceCallbacks): void {
    this.callbacks = callbacks;
  }

  private clearGestureListeners(): void {
    for (const cleanup of this.gestureCancelFns) {
      try {
        cleanup();
      } catch {
        // Ignore cleanup errors
      }
    }
    this.gestureCancelFns = [];
  }

  private revokeObjectUrl(): void {
    if (this.objectUrl) {
      try {
        URL.revokeObjectURL(this.objectUrl);
      } catch {
        // Ignore revoke errors
      }
      this.objectUrl = null;
    }
  }

  private getOrCreateAudio(): HTMLAudioElement | null {
    if (!this.isSupported()) return null;
    if (!this.audioEl) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.loop = false;
      audio.setAttribute('playsinline', 'true');
      this.audioEl = audio;
    }
    this.audioEl.loop = false;
    return this.audioEl;
  }

  unlockAudio(): void {
    if (typeof window === 'undefined' || this.audioUnlocked) return;
    try {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === 'suspended') {
          void ctx.resume().catch(() => {});
        }
        const buffer = ctx.createBuffer(1, 1, 22050);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.connect(ctx.destination);
        source.start(0);
        window.setTimeout(() => {
          void ctx.close().catch(() => {});
        }, 250);
      }
      this.audioUnlocked = true;
    } catch {
      // Ignore Web Audio unlock failures
    }
  }

  cancelPendingGreetingAutoplay(): void {
    this.clearGestureListeners();
  }

  stop(): void {
    if (this.fetchController) {
      try {
        this.fetchController.abort();
      } catch {
        // Ignore abort errors
      }
      this.fetchController = null;
    }

    if (this.audioEl) {
      try {
        this.audioEl.onended = null;
        this.audioEl.onerror = null;
        this.audioEl.pause();
        this.audioEl.currentTime = 0;
        this.audioEl.removeAttribute('src');
        this.audioEl.load();
      } catch {
        // Ignore audio reset errors
      }
    }

    this.revokeObjectUrl();
    this.currentId = null;
    this.callbacks.onLoadingChange?.(null);
    this.callbacks.onSpeakingChange?.(null);
    this.callbacks.onCaptionChange?.(null);
  }

  destroy(): void {
    this.clearGestureListeners();
    this.stop();
    this.audioEl = null;
  }

  private hasGreetingPlayed(): boolean {
    if (typeof window === 'undefined') return true;
    try {
      return window.sessionStorage.getItem(GREETING_SESSION_KEY) === '1';
    } catch {
      return this.greetingAttemptedThisMount;
    }
  }

  private markGreetingPlayed(): void {
    this.greetingAttemptedThisMount = true;
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(GREETING_SESSION_KEY, '1');
    } catch {
      // Ignore sessionStorage restrictions
    }
  }

  playInitialGreetingOnce(shouldPlay: () => boolean): void {
    if (!this.isSupported() || this.greetingAttemptedThisMount || this.hasGreetingPlayed()) {
      return;
    }
    if (!shouldPlay()) return;

    this.greetingAttemptedThisMount = true;

    const tryPlay = async (fromGesture: boolean) => {
      if (!shouldPlay() || this.hasGreetingPlayed()) {
        this.clearGestureListeners();
        return;
      }
      try {
        const played = await this.playAudioForText(INITIAL_SOPHIA_GREETING_TEXT, 'init-1', {
          silentAutoplay: !fromGesture,
        });
        if (played) {
          this.markGreetingPlayed();
          this.clearGestureListeners();
        }
      } catch {
        // Keep gesture fallback if autoplay was blocked
      }
    };

    const scheduleFirstGestureRetry = () => {
      if (this.gestureCancelFns.length > 0 || this.hasGreetingPlayed()) return;
      const onGesture = (event: Event) => {
        const target = event.target as HTMLElement | null;
        if (target?.closest('[data-mic-control="true"]')) {
          this.clearGestureListeners();
          return;
        }
        this.unlockAudio();
        this.clearGestureListeners();
        if (shouldPlay() && !this.hasGreetingPlayed()) {
          void tryPlay(true);
        }
      };

      const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown'];
      for (const evt of events) {
        window.addEventListener(evt, onGesture, { passive: true, once: true });
        this.gestureCancelFns.push(() => window.removeEventListener(evt, onGesture));
      }
    };

    void (async () => {
      if (!shouldPlay() || this.hasGreetingPlayed()) return;
      const played = await this.playAudioForText(INITIAL_SOPHIA_GREETING_TEXT, 'init-1', {
        silentAutoplay: true,
      });
      if (played) {
        this.markGreetingPlayed();
      } else {
        scheduleFirstGestureRetry();
      }
    })();
  }

  async speak(text: string, id = 'global'): Promise<void> {
    if (!this.isSupported()) {
      this.callbacks.onErrorChange?.('Seu navegador não suporta reprodução de áudio.');
      return;
    }

    this.clearGestureListeners();
    this.unlockAudio();
    this.callbacks.onErrorChange?.(null);

    if (this.currentId === id && this.audioEl && !this.audioEl.paused) {
      this.stop();
      return;
    }

    await this.playAudioForText(text, id, { silentAutoplay: false });
  }

  private async fetchShopiaAudioUrl(text: string, signal: AbortSignal): Promise<string> {
    const isGreeting = isGreetingText(text);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
        signal,
      });

      const contentType = (res.headers.get('content-type') || '').toLowerCase();

      if (res.ok && contentType.includes('audio/')) {
        const blob = await res.blob();
        if (blob.size > 0) {
          this.revokeObjectUrl();
          this.objectUrl = URL.createObjectURL(blob);
          return this.objectUrl;
        }
      }

      if (isGreeting) {
        return GREETING_ASSET_URL;
      }

      if (contentType.includes('text/html')) {
        throw new Error(
          'A rota de voz /api/tts respondeu com HTML em vez do servidor da Shopia. Verifique se o backend Node/Vercel está ativo.',
        );
      }

      let errMsg = 'Não foi possível reproduzir o áudio da Sophia agora.';
      if (contentType.includes('application/json')) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        if (json.error) errMsg = json.error;
      }
      throw new Error(errMsg);
    } catch (err) {
      if ((err as { name?: string })?.name === 'AbortError') {
        throw err;
      }
      if (isGreeting) {
        return GREETING_ASSET_URL;
      }
      throw err;
    }
  }

  private async playAudioForText(
    text: string,
    id: string,
    options: { silentAutoplay: boolean },
  ): Promise<boolean> {
    this.stop();

    const audio = this.getOrCreateAudio();
    if (!audio) return false;

    const controller = new AbortController();
    this.fetchController = controller;
    this.currentId = id;
    this.callbacks.onLoadingChange?.(id);

    try {
      const srcUrl = await this.fetchShopiaAudioUrl(text, controller.signal);
      if (controller.signal.aborted || this.currentId !== id) {
        return false;
      }

      audio.loop = false;
      audio.src = srcUrl;

      audio.onended = () => {
        if (this.currentId === id) {
          this.currentId = null;
          this.callbacks.onSpeakingChange?.(null);
          this.callbacks.onCaptionChange?.(null);
          this.revokeObjectUrl();
        }
      };

      audio.onerror = () => {
        if (this.currentId === id) {
          this.currentId = null;
          this.callbacks.onLoadingChange?.(null);
          this.callbacks.onSpeakingChange?.(null);
          this.callbacks.onCaptionChange?.(null);
          if (!options.silentAutoplay) {
            this.callbacks.onErrorChange?.('Não foi possível reproduzir a saudação em áudio agora.');
          }
          this.revokeObjectUrl();
        }
      };

      await audio.play();

      if (controller.signal.aborted || this.currentId !== id) {
        this.stop();
        return false;
      }

      this.fetchController = null;
      this.callbacks.onLoadingChange?.(null);
      this.callbacks.onSpeakingChange?.(id);
      this.callbacks.onCaptionChange?.(text);
      return true;
    } catch (err) {
      const name = (err as { name?: string })?.name || '';
      this.fetchController = null;
      this.callbacks.onLoadingChange?.(null);
      this.callbacks.onSpeakingChange?.(null);
      this.callbacks.onCaptionChange?.(null);
      this.currentId = null;
      this.revokeObjectUrl();

      if (name === 'AbortError') {
        return false;
      }
      if (options.silentAutoplay && name === 'NotAllowedError') {
        return false;
      }
      if (!options.silentAutoplay) {
        const msg =
          err instanceof Error ? err.message : 'Não foi possível reproduzir a voz da Sophia agora.';
        this.callbacks.onErrorChange?.(msg);
      }
      return false;
    }
  }
}

export const shopiaVoiceService = new ShopiaVoiceService();
