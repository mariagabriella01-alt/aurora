import { GoogleGenAI } from '@google/genai';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Req = IncomingMessage & { body?: unknown };

const rateBuckets = new Map<string, number[]>();

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

async function readJsonBody(req: Req, maxBytes = 6 * 1024 * 1024): Promise<Record<string, unknown>> {
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

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function normalizeEnvSecret(value: string | undefined): string {
  const trimmed = (value || '').trim();
  if (!trimmed || trimmed === 'MY_GEMINI_API_KEY') return '';
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const inner = trimmed.slice(1, -1).trim();
    return inner === 'MY_GEMINI_API_KEY' ? '' : inner;
  }
  return trimmed;
}

function getGeminiApiKey(): string {
  return normalizeEnvSecret(process.env.GEMINI_API_KEY);
}

export default async function handler(req: Req, res: ServerResponse): Promise<void> {
  try {
    if (req.method === 'OPTIONS') {
      res.statusCode = 204;
      res.end();
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      const configured = Boolean(getGeminiApiKey());
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      if (req.method === 'HEAD') {
        res.end();
        return;
      }
      res.end(
        JSON.stringify({
          ok: configured,
          configured,
          service: 'sophia-transcribe',
          envVar: 'GEMINI_API_KEY',
        }),
      );
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Método não permitido. Utilize POST /api/transcribe.' });
      return;
    }

    if (isRateLimited(`transcribe:${getClientIp(req)}`, 20, 60_000)) {
      sendJson(res, 429, {
        error: 'Muitas gravações em sequência. Aguarde um instante e tente novamente.',
      });
      return;
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      sendJson(res, 503, {
        error: 'O reconhecimento de voz não está configurado no servidor.',
      });
      return;
    }

    const body = await readJsonBody(req);
    const audioBase64 = typeof body.audioBase64 === 'string' ? body.audioBase64.trim() : '';
    const rawMime =
      typeof body.mimeType === 'string' ? body.mimeType.trim().toLowerCase() : 'audio/webm';
    const baseMime = rawMime.split(';')[0].trim();

    const allowedAudioMimes = new Set([
      'audio/webm',
      'audio/mp4',
      'audio/m4a',
      'audio/x-m4a',
      'audio/mpeg',
      'audio/mp3',
      'audio/ogg',
      'audio/wav',
      'audio/wave',
      'audio/aac',
      'video/webm',
      'video/mp4',
    ]);

    const normalizedMime =
      baseMime === 'video/webm'
        ? 'audio/webm'
        : baseMime === 'video/mp4' || baseMime === 'audio/m4a' || baseMime === 'audio/x-m4a'
          ? 'audio/mp4'
          : allowedAudioMimes.has(baseMime)
            ? baseMime
            : 'audio/webm';

    if (!audioBase64 || audioBase64.length < 100 || audioBase64.length > 5_500_000) {
      sendJson(res, 400, {
        error: 'Áudio inválido ou muito longo. Tente gravar uma mensagem mais curta.',
      });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const transcribeModels = ['gemini-3.5-transcribe', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'] as const;
    let lastErr: unknown = null;

    for (const modelName of transcribeModels) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('503 UNAVAILABLE timeout')), 10_000),
        );

        const response = await Promise.race([
          ai.models.generateContent({
            model: modelName,
            contents: {
              parts: [
                {
                  inlineData: {
                    mimeType: normalizedMime,
                    data: audioBase64,
                  },
                },
                {
                  text: 'Transcreva exatamente o que foi falado neste áudio em português do Brasil. Retorne apenas a transcrição fiel do que a pessoa disse, sem comentários adicionais. Se não houver fala audível, retorne vazio.',
                },
              ],
            },
          }),
          timeoutPromise,
        ]);

        const transcript = (response.text ?? '').replace(/^["'“”]+|["'“”]+$/g, '').trim();
        sendJson(res, 200, { transcript });
        return;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err ?? '');
        if (
          msg.includes('403') ||
          msg.includes('PERMISSION_DENIED') ||
          msg.includes('API_KEY_INVALID')
        ) {
          break;
        }
      }
    }

    const message = lastErr instanceof Error ? lastErr.message : String(lastErr ?? 'Erro transcrição');
    console.error('[Aurora Vercel /api/transcribe error]:', message);
    sendJson(res, 503, {
      error: 'Não foi possível transcrever o áudio agora. Você também pode digitar sua mensagem.',
    });
  } catch (fatalErr) {
    console.error('[Aurora Vercel /api/transcribe fatal]:', fatalErr);
    sendJson(res, 503, {
      error: 'Não foi possível transcrever o áudio agora. Você também pode digitar sua mensagem.',
    });
  }
}
