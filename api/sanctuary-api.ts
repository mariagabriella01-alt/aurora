import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';

type VentCategory =
  | 'Vazio interior'
  | 'Trabalho demais'
  | 'Bullying na escola'
  | 'Comparação'
  | 'Ansiedade'
  | 'Solidão'
  | 'Cansaço de viver'
  | 'Recomeço';

type PrayerIntention = 'Pedido de oração' | 'Gratidão' | 'Palavra de paz';
type ReasonTheme = 'Pequenos gestos' | 'Pessoas e laços' | 'Fé e propósito' | 'Amanhã';

interface VentReply {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

interface Vent {
  id: string;
  author: string;
  category: VentCategory;
  content: string;
  embraces: number;
  replies: VentReply[];
  createdAt: string;
}

interface Prayer {
  id: string;
  author: string;
  intention: PrayerIntention;
  content: string;
  prayingCount: number;
  createdAt: string;
}

interface ReasonToLive {
  id: string;
  author: string;
  theme: ReasonTheme;
  content: string;
  savedCount: number;
  createdAt: string;
}

interface SanctuaryData {
  vents: Vent[];
  prayers: Prayer[];
  reasons: ReasonToLive[];
}

type Req = IncomingMessage & { body?: unknown; query?: Record<string, string | string[]> };

const DATA_DIR = path.join('/tmp', 'aurora-data');
const DATA_FILE = path.join(DATA_DIR, 'sanctuary.json');
const rateBuckets = new Map<string, number[]>();

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

async function readJsonBody(req: Req, maxBytes = 256 * 1024): Promise<Record<string, unknown>> {
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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.end(JSON.stringify(payload));
}

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
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

export default async function handler(req: Req, res: ServerResponse): Promise<void> {
  try {
    const url = new URL(req.url || '/', 'http://localhost');
    const routeParam = url.searchParams.get('route') || '';
    const idParam = url.searchParams.get('id') || '';

    if (routeParam === 'stream') {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.end('event: serverless\ndata: {"mode":"serverless"}\n\n');
      return;
    }

    if (req.method === 'GET' && (routeParam === 'sanctuary' || !routeParam)) {
      const store = await withStoreLock(() => readStore());
      sendJson(res, 200, store);
      return;
    }

    const body = await readJsonBody(req);

    if (req.method === 'POST' && routeParam === 'vents') {
      if (isRateLimited(`vent:${getClientIp(req)}`, 6, 60_000)) {
        sendJson(res, 429, {
          error: 'Aguarde um minuto antes de publicar outro desabafo. Estamos aqui com você.',
        });
        return;
      }
      const author = sanitizeText(body.author, 40) || 'Anônimo';
      const category = body.category as VentCategory;
      const content = sanitizeText(body.content, 1200);
      if (!ALLOWED_VENT_CATEGORIES.includes(category)) {
        sendJson(res, 400, { error: 'Selecione uma categoria válida.' });
        return;
      }
      if (content.length < 8) {
        sendJson(res, 400, {
          error: 'Escreva pelo menos 8 caracteres para compartilhar seu desabafo.',
        });
        return;
      }
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
      sendJson(res, 201, newVent);
      return;
    }

    if (req.method === 'POST' && routeParam === 'vent-embrace') {
      const updated = await withStoreLock(async () => {
        const store = await readStore();
        let vent = store.vents.find((v) => v.id === idParam);
        if (!vent) {
          const recovered = reconstructVentFromBody(idParam, body.parentVent);
          if (!recovered) return null;
          store.vents.unshift(recovered);
          vent = recovered;
        }
        vent.embraces += 1;
        await writeStore(store);
        return vent;
      });
      if (!updated) {
        sendJson(res, 404, { error: 'Desabafo não encontrado.' });
        return;
      }
      sendJson(res, 200, updated);
      return;
    }

    if (req.method === 'POST' && routeParam === 'vent-reply') {
      if (isRateLimited(`reply:${getClientIp(req)}`, 10, 60_000)) {
        sendJson(res, 429, {
          error: 'Aguarde um instante antes de enviar outra resposta de apoio.',
        });
        return;
      }
      const author = sanitizeText(body.author, 40) || 'Alguém que se importa';
      const content = sanitizeText(body.content, 600);
      if (content.length < 4) {
        sendJson(res, 400, {
          error: 'Escreva uma mensagem de apoio com pelo menos 4 caracteres.',
        });
        return;
      }
      const updated = await withStoreLock(async () => {
        const store = await readStore();
        let vent = store.vents.find((v) => v.id === idParam);
        if (!vent) {
          const recovered = reconstructVentFromBody(idParam, body.parentVent);
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
      if (!updated) {
        sendJson(res, 404, { error: 'Desabafo não encontrado.' });
        return;
      }
      sendJson(res, 201, updated);
      return;
    }

    if (req.method === 'POST' && routeParam === 'prayers') {
      if (isRateLimited(`prayer:${getClientIp(req)}`, 6, 60_000)) {
        sendJson(res, 429, { error: 'Aguarde um minuto antes de enviar outra oração.' });
        return;
      }
      const author = sanitizeText(body.author, 40) || 'Anônimo';
      const intention = body.intention as PrayerIntention;
      const content = sanitizeText(body.content, 600);
      if (!ALLOWED_PRAYER_INTENTIONS.includes(intention)) {
        sendJson(res, 400, { error: 'Selecione um tipo de intenção válido.' });
        return;
      }
      if (content.length < 6) {
        sendJson(res, 400, {
          error: 'Escreva sua oração ou palavra com pelo menos 6 caracteres.',
        });
        return;
      }
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
      sendJson(res, 201, newPrayer);
      return;
    }

    if (req.method === 'POST' && routeParam === 'prayer-pray') {
      const prayer = await withStoreLock(async () => {
        const store = await readStore();
        const found = store.prayers.find((p) => p.id === idParam);
        if (!found) return null;
        found.prayingCount += 1;
        await writeStore(store);
        return found;
      });
      if (!prayer) {
        sendJson(res, 404, { error: 'Oração não encontrada.' });
        return;
      }
      sendJson(res, 200, prayer);
      return;
    }

    if (req.method === 'POST' && routeParam === 'reasons') {
      if (isRateLimited(`reason:${getClientIp(req)}`, 6, 60_000)) {
        sendJson(res, 429, {
          error: 'Aguarde um minuto antes de compartilhar outro motivo para viver.',
        });
        return;
      }
      const author = sanitizeText(body.author, 40) || 'Anônimo';
      const theme = body.theme as ReasonTheme;
      const content = sanitizeText(body.content, 400);
      if (!ALLOWED_REASON_THEMES.includes(theme)) {
        sendJson(res, 400, { error: 'Selecione um tema válido.' });
        return;
      }
      if (content.length < 6) {
        sendJson(res, 400, { error: 'Escreva um motivo com pelo menos 6 caracteres.' });
        return;
      }
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
      sendJson(res, 201, newReason);
      return;
    }

    if (req.method === 'POST' && routeParam === 'reason-heart') {
      const reason = await withStoreLock(async () => {
        const store = await readStore();
        const found = store.reasons.find((r) => r.id === idParam);
        if (!found) return null;
        found.savedCount += 1;
        await writeStore(store);
        return found;
      });
      if (!reason) {
        sendJson(res, 404, { error: 'Motivo não encontrado.' });
        return;
      }
      sendJson(res, 200, reason);
      return;
    }

    sendJson(res, 404, { error: 'Rota não encontrada.' });
  } catch (err) {
    console.error('[Aurora Vercel /api/sanctuary-api error]:', err);
    sendJson(res, 500, { error: 'Erro ao processar solicitação da comunidade.' });
  }
}
