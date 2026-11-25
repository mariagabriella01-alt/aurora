import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';

type Req = IncomingMessage & { body?: unknown; query?: Record<string, string | string[]> };
type Res = ServerResponse & {
  status?: (code: number) => Res;
  json?: (data: unknown) => void;
  send?: (body: unknown) => void;
};

interface CachedAudio {
  buffer: Buffer;
  contentType: string;
}

const rateBuckets = new Map<string, number[]>();
const ttsCache = new Map<string, CachedAudio>();

const SHOPIA_GREETING_AUDIO_FILE = path.join(
  process.cwd(),
  'public',
  'assets',
  'aistudio',
  'Oi__voc__est__bem__Eu_sou_a_So.._67203881.m4a',
);

function normalizeComparisonText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const SHOPIA_GREETING_NORMALIZED = normalizeComparisonText(
  'Oi, você está bem? Eu sou a Sophia, sua assistente virtual de acolhimento aqui na Aurora — um novo começo, uma nova esperança. Pode me contar o que está pesando hoje — seja vazio, trabalho demais, bullying na escola, comparação, superação de algum vício ou qualquer outra dor. Você não precisa enfrentar isso sem ser ouvido(a).',
);

function isShopiaGreetingText(rawText: string): boolean {
  const normalized = normalizeComparisonText(rawText);
  return (
    normalized === SHOPIA_GREETING_NORMALIZED ||
    (normalized.startsWith('oi voce esta bem eu sou a sophia sua assistente virtual de acolhimento') &&
      normalized.includes('voce nao precisa enfrentar isso sem ser ouvido'))
  );
}

function getClientIp(req: Req): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  return req.socket?.remoteAddress || 'unknown';
}

function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = (rateBuckets.get(key) ?? []).filter((ts) => now - ts < windowMs);
  if (timestamps.length >= maxRequests) {
    rateBuckets.set(key, timestamps);
    return true;
  }
  timestamps.push(now);
  rateBuckets.set(key, timestamps);
  return false;
}

async function readJsonBody(req: Req, maxBytes = 64 * 1024): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    try {
      const parsed = JSON.parse(req.body);
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(req.body)) {
    try {
      const parsed = JSON.parse(req.body.toString('utf8'));
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
    } catch {
      return {};
    }
  }

  return new Promise((resolve) => {
    let size = 0;
    const chunks: Buffer[] = [];
    let settled = false;

    const finish = (obj: Record<string, unknown>) => {
      if (!settled) {
        settled = true;
        resolve(obj);
      }
    };

    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        finish({});
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim();
        if (!raw) {
          finish({});
          return;
        }
        const parsed = JSON.parse(raw);
        finish(parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {});
      } catch {
        finish({});
      }
    });
    req.on('error', () => finish({}));
  });
}

function sendJson(res: Res, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function prepareShopiaSpeechText(raw: string): string {
  return raw
    .replace(/([.!?])\s*\n+/g, '$1 ')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .replace(/\s*·\s*/g, ', ')
    .replace(/\s*—\s*/g, ', ')
    .replace(/\s+-\s+/g, ', ')
    .replace(/:\s*/g, ': ')
    .replace(/\bCVV\b/g, 'C V V')
    .replace(/\bUBS\b/g, 'U B S')
    .replace(/\bCAPS AD\b/g, 'C A P S A D')
    .replace(/\s+/g, ' ')
    .trim();
}

function getShopiaConfig() {
  const apiUrl = (process.env.SHOPIA_TTS_API_URL || '').trim();
  const apiKey = (process.env.SHOPIA_TTS_API_KEY || '').trim();
  const voiceId = (process.env.SHOPIA_VOICE_ID || '').trim();
  const model = (process.env.SHOPIA_TTS_MODEL || '').trim();
  const greetingAudioAvailable = fs.existsSync(SHOPIA_GREETING_AUDIO_FILE);

  return {
    apiUrl,
    apiKey,
    voiceId,
    model,
    greetingAudioAvailable,
    isConfigured: Boolean(apiUrl && apiKey && voiceId),
  };
}

export default async function handler(req: Req, res: Res): Promise<void> {
  try {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    const cfg = getShopiaConfig();

    if (req.method === 'GET') {
      sendJson(res, 200, {
        ok: cfg.isConfigured || cfg.greetingAudioAvailable,
        provider: 'shopia',
        shopiaConfigured: cfg.isConfigured,
        hasApiUrl: Boolean(cfg.apiUrl),
        hasApiKey: Boolean(cfg.apiKey),
        hasVoiceId: Boolean(cfg.voiceId),
        voiceId: cfg.voiceId || 'unconfigured',
        ttsModel: cfg.model || 'shopia-exclusive',
        greetingAudioAvailable: cfg.greetingAudioAvailable,
      });
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Método não permitido. Utilize POST /api/tts.' });
      return;
    }

    if (isRateLimited(`tts:${getClientIp(req)}`, 30, 60_000)) {
      sendJson(res, 429, {
        error: 'Muitas solicitações de áudio em sequência. Aguarde alguns instantes.',
      });
      return;
    }

    const body = await readJsonBody(req);
    const rawText = typeof body.text === 'string' ? body.text.trim().slice(0, 2200) : '';
    if (!rawText) {
      sendJson(res, 400, { error: 'Texto vazio para leitura com a voz da Shopia.' });
      return;
    }

    if (isShopiaGreetingText(rawText) && cfg.greetingAudioAvailable) {
      const audioBuffer = fs.readFileSync(SHOPIA_GREETING_AUDIO_FILE);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'audio/mp4');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('X-Aurora-Voice-Id', 'shopia-greeting');
      res.setHeader('X-Aurora-Voice-Source', 'shopia-recorded-audio');
      res.end(audioBuffer);
      return;
    }

    if (!cfg.isConfigured) {
      sendJson(res, 503, {
        error:
          'A integração exclusiva da voz da Shopia ainda não está com todas as credenciais configuradas no servidor (SHOPIA_TTS_API_URL, SHOPIA_TTS_API_KEY e SHOPIA_VOICE_ID). Nenhuma outra voz ou Google TTS será usada como alternativa.',
        code: 'SHOPIA_VOICE_NOT_CONFIGURED',
      });
      return;
    }

    const text = prepareShopiaSpeechText(rawText);
    const cacheKey = `shopia:${cfg.voiceId}:${cfg.model}:${text}`;
    const cached = ttsCache.get(cacheKey);
    if (cached) {
      ttsCache.delete(cacheKey);
      ttsCache.set(cacheKey, cached);
      res.statusCode = 200;
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('X-Aurora-Voice-Id', cfg.voiceId);
      res.setHeader('X-Aurora-Voice-Source', 'shopia-tts');
      res.end(cached.buffer);
      return;
    }

    const targetUrl = cfg.apiUrl
      .replace(/\{voice_id\}/gi, encodeURIComponent(cfg.voiceId))
      .replace(/\{voiceId\}/g, encodeURIComponent(cfg.voiceId));

    const isElevenLabs = /elevenlabs\.io/i.test(targetUrl);
    const requestPayload = isElevenLabs
      ? {
          text,
          ...(cfg.model ? { model_id: cfg.model } : {}),
        }
      : {
          text,
          voiceId: cfg.voiceId,
          voice_id: cfg.voiceId,
          ...(cfg.model ? { model: cfg.model } : {}),
        };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 18_000);

    let upstreamRes: Response;
    try {
      upstreamRes = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'audio/*, application/json',
          Authorization: `Bearer ${cfg.apiKey}`,
          'xi-api-key': cfg.apiKey,
          'X-API-Key': cfg.apiKey,
        },
        body: JSON.stringify(requestPayload),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text().catch(() => '');
      console.error('[Aurora Shopia /api/tts upstream error]:', upstreamRes.status, errText.slice(0, 300));
      if (upstreamRes.status === 401 || upstreamRes.status === 403) {
        sendJson(res, 502, {
          error:
            'As credenciais da integração da Shopia (SHOPIA_TTS_API_KEY ou SHOPIA_VOICE_ID) foram recusadas pelo serviço da Shopia.',
          code: 'SHOPIA_AUTH_ERROR',
        });
        return;
      }
      sendJson(res, 503, {
        error: 'Não foi possível gerar o áudio com a voz exclusiva da Shopia agora. Tente novamente em instantes.',
        code: 'SHOPIA_TTS_UNAVAILABLE',
      });
      return;
    }

    const contentType = (upstreamRes.headers.get('content-type') || '').toLowerCase();
    let audioBuffer: Buffer | null = null;
    let outputMime = 'audio/mpeg';

    if (contentType.includes('audio/') || contentType.includes('application/octet-stream')) {
      const ab = await upstreamRes.arrayBuffer();
      audioBuffer = Buffer.from(ab);
      outputMime = contentType.includes('audio/') ? contentType.split(';')[0].trim() : 'audio/mpeg';
    } else if (contentType.includes('application/json')) {
      const json = (await upstreamRes.json()) as {
        audioBase64?: string;
        audio_base64?: string;
        audio?: string;
        data?: string;
        mimeType?: string;
        mime_type?: string;
      };
      const b64 = json.audioBase64 || json.audio_base64 || json.audio || json.data || '';
      if (b64) {
        audioBuffer = Buffer.from(b64, 'base64');
        outputMime = json.mimeType || json.mime_type || 'audio/wav';
      }
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      sendJson(res, 503, {
        error: 'O serviço da Shopia retornou uma resposta de áudio vazia.',
        code: 'SHOPIA_EMPTY_AUDIO',
      });
      return;
    }

    if (ttsCache.size >= 80) {
      const oldestKey = ttsCache.keys().next().value;
      if (oldestKey !== undefined) ttsCache.delete(oldestKey);
    }
    ttsCache.set(cacheKey, { buffer: audioBuffer, contentType: outputMime });

    res.statusCode = 200;
    res.setHeader('Content-Type', outputMime);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('X-Aurora-Voice-Id', cfg.voiceId);
    res.setHeader('X-Aurora-Voice-Source', 'shopia-tts');
    res.end(audioBuffer);
  } catch (fatalErr) {
    console.error('[Aurora Shopia /api/tts fatal]:', fatalErr);
    sendJson(res, 503, {
      error: 'Erro temporário ao gerar o áudio exclusivo da Shopia. Tente novamente em instantes.',
      code: 'SHOPIA_INTERNAL_ERROR',
    });
  }
}
