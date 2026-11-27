import { GoogleGenAI } from '@google/genai';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  Prayer,
  PrayerIntention,
  ReasonTheme,
  ReasonToLive,
  SanctuaryData,
  Vent,
  VentCategory,
} from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const IS_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = IS_VERCEL ? path.join('/tmp', 'aurora-data') : path.join(ROOT_DIR, 'data');
const DATA_FILE = path.join(DATA_DIR, 'sanctuary.json');

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

const ALLOWED_VENT_CATEGORIES: readonly VentCategory[] = [
  'Vazio interior',
  'Trabalho demais',
  'Bullying na escola',
  'Comparação',
  'Ansiedade',
  'Solidão',
  'Cansaço de viver',
  'Recomeço',
];

const ALLOWED_PRAYER_INTENTIONS: readonly PrayerIntention[] = [
  'Pedido de oração',
  'Gratidão',
  'Palavra de paz',
];

const ALLOWED_REASON_THEMES: readonly ReasonTheme[] = [
  'Pequenos gestos',
  'Pessoas e laços',
  'Fé e propósito',
  'Amanhã',
];

const LEGACY_DEMO_VENT_IDS = new Set([
  'vent-1',
  'vent-2',
  'vent-3',
  'vent-4',
  'vent-5',
  'vent-6',
  'vent-7',
]);
const LEGACY_DEMO_REPLY_IDS = new Set([
  'rep-1',
  'rep-2',
  'rep-3',
  'rep-5',
  'rep-6',
  'rep-7',
]);
const LEGACY_DEMO_PRAYER_IDS = new Set(['pray-1', 'pray-2', 'pray-3']);
const LEGACY_DEMO_REASON_IDS = new Set(['reason-1', 'reason-2', 'reason-3', 'reason-4']);

function createInitialData(): SanctuaryData {
  return {
    vents: [],
    prayers: [],
    reasons: [],
  };
}

const KV_STORE_KEY = 'aurora:sanctuary:v1';

function getRedisRestConfig(): { url: string; token: string } | null {
  const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '')
    .trim()
    .replace(/\/+$/, '');
  const token = (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!url || !token) return null;
  return { url, token };
}

function normalizeStore(parsed: Partial<SanctuaryData> | null | undefined): SanctuaryData | null {
  if (!parsed || !Array.isArray(parsed.vents) || !Array.isArray(parsed.prayers) || !Array.isArray(parsed.reasons)) {
    return null;
  }
  const vents = parsed.vents
    .filter((v) => v && !LEGACY_DEMO_VENT_IDS.has(v.id))
    .map((v) => ({
      ...v,
      embraces: typeof v.embraces === 'number' && Number.isFinite(v.embraces) ? v.embraces : 1,
      replies: Array.isArray(v.replies)
        ? v.replies.filter((r) => r && !LEGACY_DEMO_REPLY_IDS.has(r.id))
        : [],
    }));
  const prayers = parsed.prayers.filter((p) => p && !LEGACY_DEMO_PRAYER_IDS.has(p.id));
  const reasons = parsed.reasons.filter((r) => r && !LEGACY_DEMO_REASON_IDS.has(r.id));
  return {
    vents,
    prayers,
    reasons,
  };
}

let storeMutex: Promise<void> = Promise.resolve();

function withStoreLock<T>(task: () => Promise<T>): Promise<T> {
  const run = storeMutex.then(task, task);
  storeMutex = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readStore(): Promise<SanctuaryData> {
  const redis = getRedisRestConfig();
  if (redis) {
    const res = await fetch(`${redis.url}/get/${encodeURIComponent(KV_STORE_KEY)}`, {
      headers: { Authorization: `Bearer ${redis.token}` },
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`KV read failed (${res.status})`);
    }
    const payload = (await res.json()) as { result?: string | null };
    if (typeof payload.result === 'string' && payload.result.length > 0) {
      const parsed = JSON.parse(payload.result) as Partial<SanctuaryData>;
      const normalized = normalizeStore(parsed);
      if (normalized) return normalized;
    }
    const seed = createInitialData();
    await writeStore(seed);
    return seed;
  }

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    const seed = createInitialData();
    writeStoreToFile(seed);
    return seed;
  }
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  if (!raw.trim()) {
    const seed = createInitialData();
    writeStoreToFile(seed);
    return seed;
  }
  const parsed = JSON.parse(raw) as Partial<SanctuaryData>;
  const normalized = normalizeStore(parsed);
  if (!normalized) {
    const seed = createInitialData();
    writeStoreToFile(seed);
    return seed;
  }
  return normalized;
}

function writeStoreToFile(data: SanctuaryData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DATA_FILE}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 7)}.tmp`;
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmpFile, DATA_FILE);
  } catch (err) {
    try {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    } catch {
      // Ignore cleanup error
    }
    throw err;
  }
}

async function writeStore(data: SanctuaryData): Promise<void> {
  const redis = getRedisRestConfig();
  if (redis) {
    const res = await fetch(redis.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${redis.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(['SET', KV_STORE_KEY, JSON.stringify(data)]),
      cache: 'no-store',
    });
    if (!res.ok) {
      throw new Error(`KV write failed (${res.status})`);
    }
    return;
  }
  writeStoreToFile(data);
}

function setNoStoreHeaders(res: express.Response): void {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function reconstructVentFromBody(ventId: string, rawParent: unknown): Vent | null {
  if (!rawParent || typeof rawParent !== 'object') return null;
  const candidate = rawParent as Partial<Vent>;
  if (candidate.id !== ventId) return null;
  const category = candidate.category as VentCategory;
  if (!ALLOWED_VENT_CATEGORIES.includes(category)) return null;
  const content = sanitizeText(candidate.content, 1200);
  if (content.length < 8) return null;
  const author = sanitizeText(candidate.author, 40) || 'Anônimo';
  const createdAt =
    typeof candidate.createdAt === 'string' && !Number.isNaN(new Date(candidate.createdAt).getTime())
      ? candidate.createdAt
      : new Date().toISOString();
  const embraces =
    typeof candidate.embraces === 'number' && Number.isFinite(candidate.embraces) && candidate.embraces >= 1
      ? Math.floor(candidate.embraces)
      : 1;
  const replies = Array.isArray(candidate.replies)
    ? candidate.replies
        .filter((r) => r && typeof r.id === 'string' && typeof r.content === 'string')
        .map((r) => ({
          id: sanitizeText(r.id, 64) || makeId('rep'),
          author: sanitizeText(r.author, 40) || 'Alguém que se importa',
          content: sanitizeText(r.content, 600),
          createdAt:
            typeof r.createdAt === 'string' && !Number.isNaN(new Date(r.createdAt).getTime())
              ? r.createdAt
              : createdAt,
        }))
        .filter((r) => r.content.length >= 4)
    : [];
  return {
    id: ventId,
    author,
    category,
    content,
    embraces,
    replies,
    createdAt,
  };
}

const sseClients = new Set<express.Response>();

function broadcastEvent(eventName: string, payload: unknown): void {
  const frame = `event: ${eventName}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of sseClients) {
    try {
      client.write(frame);
    } catch {
      sseClients.delete(client);
    }
  }
}

const rateBuckets = new Map<string, number[]>();

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

function getClientIp(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || 'unknown';
}

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createAuroraApiApp(): express.Express {
  const app = express();
  app.set('trust proxy', true);

  let cachedApiKey = '';
  let cachedAi: GoogleGenAI | null = null;

  const getAiClient = (): GoogleGenAI | null => {
    const apiKey = getGeminiApiKey();
    if (!apiKey) return null;
    if (apiKey !== cachedApiKey || !cachedAi) {
      cachedApiKey = apiKey;
      cachedAi = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });
    }
    return cachedAi;
  };

  app.get('/api/transcribe', (_req, res) => {
    const configured = Boolean(getGeminiApiKey());
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: configured,
      configured,
      service: 'aurora-transcribe',
      envVar: 'GEMINI_API_KEY',
    });
  });

  app.post('/api/transcribe', express.json({ limit: '6mb' }), async (req, res) => {
    if (isRateLimited(`transcribe:${getClientIp(req)}`, 20, 60_000)) {
      res.status(429).json({
        error: 'Muitas gravações em sequência. Aguarde um instante e tente novamente.',
      });
      return;
    }

    const aiClient = getAiClient();
    if (!aiClient) {
      res.status(503).json({
        error: 'O reconhecimento de voz não está configurado no servidor.',
      });
      return;
    }

    const audioBase64 = typeof req.body?.audioBase64 === 'string' ? req.body.audioBase64.trim() : '';
    const rawMime = typeof req.body?.mimeType === 'string' ? req.body.mimeType.trim().toLowerCase() : 'audio/webm';
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
      res.status(400).json({
        error: 'Áudio inválido ou muito longo. Tente gravar uma mensagem mais curta.',
      });
      return;
    }

    const transcribeModels = ['gemini-3.5-transcribe', 'gemini-3.1-flash-lite', 'gemini-2.5-flash'] as const;
    let lastErr: unknown = null;

    for (const modelName of transcribeModels) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('503 UNAVAILABLE timeout')), 10_000),
        );

        const response = await Promise.race([
          aiClient.models.generateContent({
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

        const transcript = (response.text ?? '')
          .replace(/^["'“”]+|["'“”]+$/g, '')
          .trim();

        res.json({ transcript });
        return;
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err ?? '');
        if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
          break;
        }
      }
    }

    const message = lastErr instanceof Error ? lastErr.message : String(lastErr ?? 'Erro transcrição');
    console.error('[Aurora /api/transcribe error]:', message);
    res.status(503).json({
      error: 'Não foi possível transcrever o áudio agora. Você também pode digitar sua mensagem.',
    });
  });

  app.use(express.json({ limit: '256kb' }));

  app.get('/api/sanctuary', async (_req, res) => {
    setNoStoreHeaders(res);
    try {
      const store = await withStoreLock(() => readStore());
      res.json(store);
    } catch (err) {
      console.error('[Aurora GET /api/sanctuary error]:', err);
      res.status(500).json({ error: 'Não foi possível carregar os registros da comunidade agora.' });
    }
  });

  app.get('/api/sanctuary/stream', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(': connected\n\n');

    sseClients.add(res);
    const keepalive = setInterval(() => {
      try {
        res.write(': keepalive\n\n');
      } catch {
        clearInterval(keepalive);
        sseClients.delete(res);
      }
    }, 25_000);

    req.on('close', () => {
      clearInterval(keepalive);
      sseClients.delete(res);
    });
  });

  app.post('/api/vents', async (req, res) => {
    setNoStoreHeaders(res);
    if (isRateLimited(`vent:${getClientIp(req)}`, 6, 60_000)) {
      res.status(429).json({
        error: 'Aguarde um minuto antes de publicar outro desabafo. Estamos aqui com você.',
      });
      return;
    }

    const author = sanitizeText(req.body?.author, 40) || 'Anônimo';
    const category = req.body?.category as VentCategory;
    const content = sanitizeText(req.body?.content, 1200);

    if (!ALLOWED_VENT_CATEGORIES.includes(category)) {
      res.status(400).json({ error: 'Selecione uma categoria válida.' });
      return;
    }
    if (content.length < 8) {
      res.status(400).json({ error: 'Escreva pelo menos 8 caracteres para compartilhar seu desabafo.' });
      return;
    }

    try {
      const newVent = await withStoreLock(async () => {
        const store = await readStore();
        const item: Vent = {
          id: makeId('vent'),
          author,
          category,
          content,
          embraces: 1,
          replies: [],
          createdAt: new Date().toISOString(),
        };
        store.vents.unshift(item);
        await writeStore(store);
        return item;
      });
      broadcastEvent('vent:created', newVent);
      res.status(201).json(newVent);
    } catch (err) {
      console.error('[Aurora POST /api/vents error]:', err);
      res.status(500).json({ error: 'Não foi possível salvar seu desabafo agora. Tente novamente.' });
    }
  });

  app.post('/api/vents/:id/embrace', async (req, res) => {
    setNoStoreHeaders(res);
    try {
      const updatedVent = await withStoreLock(async () => {
        const store = await readStore();
        let vent = store.vents.find((v) => v.id === req.params.id);
        if (!vent) {
          const recovered = reconstructVentFromBody(req.params.id, req.body?.parentVent);
          if (!recovered) return null;
          store.vents.unshift(recovered);
          vent = recovered;
        }
        vent.embraces += 1;
        await writeStore(store);
        return vent;
      });
      if (!updatedVent) {
        res.status(404).json({ error: 'Desabafo não encontrado.' });
        return;
      }
      broadcastEvent('vent:updated', updatedVent);
      res.json(updatedVent);
    } catch (err) {
      console.error('[Aurora POST /api/vents/:id/embrace error]:', err);
      res.status(500).json({ error: 'Erro ao registrar acolhimento.' });
    }
  });

  app.post('/api/vents/:id/replies', async (req, res) => {
    setNoStoreHeaders(res);
    if (isRateLimited(`reply:${getClientIp(req)}`, 10, 60_000)) {
      res.status(429).json({
        error: 'Aguarde um instante antes de enviar outra resposta de apoio.',
      });
      return;
    }

    const author = sanitizeText(req.body?.author, 40) || 'Alguém que se importa';
    const content = sanitizeText(req.body?.content, 600);
    if (content.length < 4) {
      res.status(400).json({ error: 'Escreva uma mensagem de apoio com pelo menos 4 caracteres.' });
      return;
    }

    try {
      const updatedVent = await withStoreLock(async () => {
        const store = await readStore();
        let vent = store.vents.find((v) => v.id === req.params.id);
        if (!vent) {
          const recovered = reconstructVentFromBody(req.params.id, req.body?.parentVent);
          if (!recovered) return null;
          store.vents.unshift(recovered);
          vent = recovered;
        }
        if (!Array.isArray(vent.replies)) {
          vent.replies = [];
        }
        vent.replies.push({
          id: makeId('rep'),
          author,
          content,
          createdAt: new Date().toISOString(),
        });
        await writeStore(store);
        return vent;
      });
      if (!updatedVent) {
        res.status(404).json({ error: 'Desabafo não encontrado.' });
        return;
      }
      broadcastEvent('vent:updated', updatedVent);
      res.status(201).json(updatedVent);
    } catch (err) {
      console.error('[Aurora POST /api/vents/:id/replies error]:', err);
      res.status(500).json({ error: 'Não foi possível salvar seu comentário agora. Tente novamente.' });
    }
  });

  app.post('/api/prayers', async (req, res) => {
    setNoStoreHeaders(res);
    if (isRateLimited(`prayer:${getClientIp(req)}`, 6, 60_000)) {
      res.status(429).json({
        error: 'Aguarde um minuto antes de enviar outra oração.',
      });
      return;
    }

    const author = sanitizeText(req.body?.author, 40) || 'Anônimo';
    const intention = req.body?.intention as PrayerIntention;
    const content = sanitizeText(req.body?.content, 600);

    if (!ALLOWED_PRAYER_INTENTIONS.includes(intention)) {
      res.status(400).json({ error: 'Selecione um tipo de intenção válido.' });
      return;
    }
    if (content.length < 6) {
      res.status(400).json({ error: 'Escreva sua oração ou palavra com pelo menos 6 caracteres.' });
      return;
    }

    try {
      const newPrayer = await withStoreLock(async () => {
        const store = await readStore();
        const item: Prayer = {
          id: makeId('pray'),
          author,
          intention,
          content,
          prayingCount: 1,
          createdAt: new Date().toISOString(),
        };
        store.prayers.unshift(item);
        await writeStore(store);
        return item;
      });
      broadcastEvent('prayer:created', newPrayer);
      res.status(201).json(newPrayer);
    } catch (err) {
      console.error('[Aurora POST /api/prayers error]:', err);
      res.status(500).json({ error: 'Não foi possível salvar sua oração agora. Tente novamente.' });
    }
  });

  app.post('/api/prayers/:id/pray', async (req, res) => {
    setNoStoreHeaders(res);
    try {
      const prayer = await withStoreLock(async () => {
        const store = await readStore();
        const found = store.prayers.find((p) => p.id === req.params.id);
        if (!found) return null;
        found.prayingCount += 1;
        await writeStore(store);
        return found;
      });
      if (!prayer) {
        res.status(404).json({ error: 'Oração não encontrada.' });
        return;
      }
      broadcastEvent('prayer:updated', prayer);
      res.json(prayer);
    } catch (err) {
      console.error('[Aurora POST /api/prayers/:id/pray error]:', err);
      res.status(500).json({ error: 'Erro ao registrar oração.' });
    }
  });

  app.post('/api/reasons', async (req, res) => {
    setNoStoreHeaders(res);
    if (isRateLimited(`reason:${getClientIp(req)}`, 6, 60_000)) {
      res.status(429).json({
        error: 'Aguarde um minuto antes de compartilhar outro motivo para viver.',
      });
      return;
    }

    const author = sanitizeText(req.body?.author, 40) || 'Anônimo';
    const theme = req.body?.theme as ReasonTheme;
    const content = sanitizeText(req.body?.content, 400);

    if (!ALLOWED_REASON_THEMES.includes(theme)) {
      res.status(400).json({ error: 'Selecione um tema válido.' });
      return;
    }
    if (content.length < 6) {
      res.status(400).json({ error: 'Escreva um motivo com pelo menos 6 caracteres.' });
      return;
    }

    try {
      const newReason = await withStoreLock(async () => {
        const store = await readStore();
        const item: ReasonToLive = {
          id: makeId('reason'),
          author,
          theme,
          content,
          savedCount: 1,
          createdAt: new Date().toISOString(),
        };
        store.reasons.unshift(item);
        await writeStore(store);
        return item;
      });
      broadcastEvent('reason:created', newReason);
      res.status(201).json(newReason);
    } catch (err) {
      console.error('[Aurora POST /api/reasons error]:', err);
      res.status(500).json({ error: 'Não foi possível salvar seu motivo agora. Tente novamente.' });
    }
  });

  app.post('/api/reasons/:id/heart', async (req, res) => {
    setNoStoreHeaders(res);
    try {
      const reason = await withStoreLock(async () => {
        const store = await readStore();
        const found = store.reasons.find((r) => r.id === req.params.id);
        if (!found) return null;
        found.savedCount += 1;
        await writeStore(store);
        return found;
      });
      if (!reason) {
        res.status(404).json({ error: 'Motivo não encontrado.' });
        return;
      }
      broadcastEvent('reason:updated', reason);
      res.json(reason);
    } catch (err) {
      console.error('[Aurora POST /api/reasons/:id/heart error]:', err);
      res.status(500).json({ error: 'Erro ao guardar âncora.' });
    }
  });

  return app;
}
