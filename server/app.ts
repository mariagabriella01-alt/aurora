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

function createInitialData(): SanctuaryData {
  const now = Date.now();
  return {
    vents: [
      {
        id: 'vent-1',
        author: 'Anônimo',
        category: 'Vazio interior',
        content:
          'Acordei com aquela sensação silenciosa de que os dias estão só passando e nada parece me preencher de verdade. Não estou com raiva de ninguém, só cansado de tentar parecer bem o tempo inteiro.',
        embraces: 14,
        replies: [
          {
            id: 'rep-1',
            author: 'Mariana S.',
            content:
              'Você não precisa fingir força aqui. Esse vazio muitas vezes é só a alma pedindo descanso depois de carregar peso demais por muito tempo. Respira fundo hoje, um passo pequeno já basta.',
            createdAt: new Date(now - 1000 * 60 * 55).toISOString(),
          },
        ],
        createdAt: new Date(now - 1000 * 60 * 110).toISOString(),
      },
      {
        id: 'vent-2',
        author: 'Lucas M.',
        category: 'Ansiedade',
        content:
          'Minha cabeça não desacelera à noite. Fico revivendo erros antigos e com medo de não dar conta do futuro. Vim aqui só para colocar isso para fora sem medo de julgamento.',
        embraces: 9,
        replies: [
          {
            id: 'rep-2',
            author: 'Rafael',
            content:
              'Já passei por muitas madrugadas assim. O que me ajudou foi lembrar que nossos pensamentos cansados à noite não são profecias. Estamos torcendo por você.',
            createdAt: new Date(now - 1000 * 60 * 180).toISOString(),
          },
        ],
        createdAt: new Date(now - 1000 * 60 * 240).toISOString(),
      },
      {
        id: 'vent-3',
        author: 'Larissa',
        category: 'Cansaço de viver',
        content:
          'Tem dias em que levantar da cama parece escalar uma montanha. Não quero deixar de existir, eu só queria que a dor desse uma trégua e que eu voltasse a sentir sentido nas coisas simples.',
        embraces: 22,
        replies: [
          {
            id: 'rep-3',
            author: 'Camila Oliveira',
            content:
              'Que bom que você escreveu isso e ficou mais um dia. A dor não vai mandar na sua história para sempre. Se hoje ficar pesado demais, liga no 188 ou conversa com alguém de confiança. Você importa muito.',
            createdAt: new Date(now - 1000 * 60 * 310).toISOString(),
          },
        ],
        createdAt: new Date(now - 1000 * 60 * 390).toISOString(),
      },
      {
        id: 'vent-4',
        author: 'Gabriel',
        category: 'Recomeço',
        content:
          'Há seis meses eu achava que não ia conseguir atravessar meu luto e a depressão. Hoje ainda tenho dias difíceis, mas consegui tomar sol na varanda e fazer terapia. Só queria dizer para quem está no fundo do poço que a luz volta aos poucos.',
        embraces: 31,
        replies: [],
        createdAt: new Date(now - 1000 * 60 * 620).toISOString(),
      },
      {
        id: 'vent-5',
        author: 'Renata C.',
        category: 'Trabalho demais',
        content:
          'Sinto que minha vida virou apenas cumprir metas e responder mensagens. Quando tento descansar no fim de semana, bate uma culpa enorme, mas meu corpo já está exausto.',
        embraces: 18,
        replies: [
          {
            id: 'rep-5',
            author: 'Bruno',
            content:
              'Você não é uma máquina para justificar sua existência produzindo. Descansar também é cuidado com a saúde mental. Comece desligando as notificações por uma hora hoje.',
            createdAt: new Date(now - 1000 * 60 * 140).toISOString(),
          },
        ],
        createdAt: new Date(now - 1000 * 60 * 210).toISOString(),
      },
      {
        id: 'vent-6',
        author: 'Anônimo',
        category: 'Bullying na escola',
        content:
          'Ir para a escola tem sido um pesadelo. Ficam rindo do meu jeito e me deixando de lado no intervalo. Às vezes começo a acreditar nas coisas cruéis que dizem sobre mim.',
        embraces: 25,
        replies: [
          {
            id: 'rep-6',
            author: 'Prof. Helena',
            content:
              'A crueldade dos outros nunca define o seu valor. Você não tem culpa pelo bullying que sofre. Por favor, conte para um adulto de confiança, coordenação ou psicólogo escolar — você merece proteção.',
            createdAt: new Date(now - 1000 * 60 * 160).toISOString(),
          },
        ],
        createdAt: new Date(now - 1000 * 60 * 290).toISOString(),
      },
      {
        id: 'vent-7',
        author: 'Sofia',
        category: 'Comparação',
        content:
          'Abro as redes sociais e parece que todo mundo da minha idade já conquistou tudo, tem amigos perfeitos e uma vida feliz, enquanto eu estou aqui tentando só passar do dia de hoje.',
        embraces: 21,
        replies: [
          {
            id: 'rep-7',
            author: 'Tiago',
            content:
              'Na internet a gente compara os nossos bastidores reais com o palco editado dos outros. Cada história tem um tempo diferente, e sobreviver em dias difíceis já é uma força gigante.',
            createdAt: new Date(now - 1000 * 60 * 195).toISOString(),
          },
        ],
        createdAt: new Date(now - 1000 * 60 * 350).toISOString(),
      },
    ],
    prayers: [
      {
        id: 'pray-1',
        author: 'Ana Paula',
        intention: 'Pedido de oração',
        content:
          'Peço oração para que Deus preencha o vazio que tenho sentido no peito e renove minha vontade de continuar nos dias nublados.',
        prayingCount: 27,
        createdAt: new Date(now - 1000 * 60 * 95).toISOString(),
      },
      {
        id: 'pray-2',
        author: 'João Pedro',
        intention: 'Palavra de paz',
        content:
          'Deus não se assusta com nossas dúvidas nem com nossas lágrimas. Mesmo quando não conseguimos orar com palavras bonitas, Ele escuta o silêncio do coração.',
        prayingCount: 19,
        createdAt: new Date(now - 1000 * 60 * 280).toISOString(),
      },
      {
        id: 'pray-3',
        author: 'Beatriz',
        intention: 'Gratidão',
        content:
          'Agradeço a Deus por ter me sustentado numa semana em que pensei em desistir. Hoje consegui dormir em paz e conversar com minha mãe.',
        prayingCount: 34,
        createdAt: new Date(now - 1000 * 60 * 520).toISOString(),
      },
    ],
    reasons: [
      {
        id: 'reason-1',
        author: 'Helena',
        theme: 'Amanhã',
        content:
          'Você ainda não conheceu todas as pessoas que vão amar profundamente o seu jeito de existir e agradecer por você ter ficado.',
        savedCount: 41,
        createdAt: new Date(now - 1000 * 60 * 140).toISOString(),
      },
      {
        id: 'reason-2',
        author: 'Matheus',
        theme: 'Pequenos gestos',
        content:
          'Sentir a brisa fresca no rosto depois de uma chuva de fim de tarde, tomar um café passado na hora e ouvir uma música que parece entender sua alma.',
        savedCount: 29,
        createdAt: new Date(now - 1000 * 60 * 330).toISOString(),
      },
      {
        id: 'reason-3',
        author: 'Priscila',
        theme: 'Fé e propósito',
        content:
          'A sua dor de hoje pode se tornar exatamente a ponte que vai salvar outra pessoa quando você contar que sobreviveu.',
        savedCount: 53,
        createdAt: new Date(now - 1000 * 60 * 480).toISOString(),
      },
      {
        id: 'reason-4',
        author: 'Daniel',
        theme: 'Pessoas e laços',
        content:
          'Meu cachorro me esperando na porta sem pedir nada em troca — às vezes um vínculo simples segura a gente até o sol voltar.',
        savedCount: 36,
        createdAt: new Date(now - 1000 * 60 * 700).toISOString(),
      },
    ],
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
  const vents = parsed.vents.map((v) => ({
    ...v,
    embraces: typeof v.embraces === 'number' && Number.isFinite(v.embraces) ? v.embraces : 1,
    replies: Array.isArray(v.replies) ? v.replies : [],
  }));
  const seed = createInitialData();
  const existingIds = new Set(vents.map((v) => v.id));
  const missingSeeds = seed.vents.filter((v) => !existingIds.has(v.id));
  return {
    vents: missingSeeds.length > 0 ? [...vents, ...missingSeeds] : vents,
    prayers: parsed.prayers,
    reasons: parsed.reasons,
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

  app.use(express.json({ limit: '64kb' }));

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
