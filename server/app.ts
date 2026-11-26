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

const SHOPIA_GREETING_AUDIO_FILE = path.join(
  ROOT_DIR,
  'public',
  'assets',
  'aistudio',
  'Oi__voc__est__bem__Eu_sou_a_So.._67203881.m4a',
);

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

function getShopiaVoiceConfig() {
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

function readStore(): SanctuaryData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      const seed = createInitialData();
      fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf8');
      return seed;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as SanctuaryData;
    if (!parsed || !Array.isArray(parsed.vents) || !Array.isArray(parsed.prayers) || !Array.isArray(parsed.reasons)) {
      const seed = createInitialData();
      fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf8');
      return seed;
    }
    const seed = createInitialData();
    const existingIds = new Set(parsed.vents.map((v) => v.id));
    const missingSeeds = seed.vents.filter((v) => !existingIds.has(v.id));
    if (missingSeeds.length > 0) {
      parsed.vents = [...parsed.vents, ...missingSeeds];
      fs.writeFileSync(DATA_FILE, JSON.stringify(parsed, null, 2), 'utf8');
    }
    return parsed;
  } catch {
    return createInitialData();
  }
}

function writeStore(data: SanctuaryData): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DATA_FILE}.${process.pid}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpFile, DATA_FILE);
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

function prepareNaturalSpeechText(raw: string): string {
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

  app.get('/api/sanctuary', (_req, res) => {
    const store = readStore();
    res.json(store);
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

  app.post('/api/vents', (req, res) => {
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

    const store = readStore();
    const newVent: Vent = {
      id: makeId('vent'),
      author,
      category,
      content,
      embraces: 1,
      replies: [],
      createdAt: new Date().toISOString(),
    };
    store.vents.unshift(newVent);
    if (store.vents.length > 80) store.vents.pop();
    writeStore(store);
    broadcastEvent('vent:created', newVent);
    res.status(201).json(newVent);
  });

  app.post('/api/vents/:id/embrace', (req, res) => {
    const store = readStore();
    const vent = store.vents.find((v) => v.id === req.params.id);
    if (!vent) {
      res.status(404).json({ error: 'Desabafo não encontrado.' });
      return;
    }
    vent.embraces += 1;
    writeStore(store);
    broadcastEvent('vent:updated', vent);
    res.json(vent);
  });

  app.post('/api/vents/:id/replies', (req, res) => {
    if (isRateLimited(`reply:${getClientIp(req)}`, 10, 60_000)) {
      res.status(429).json({
        error: 'Aguarde um instante antes de enviar outra resposta de apoio.',
      });
      return;
    }

    const store = readStore();
    const vent = store.vents.find((v) => v.id === req.params.id);
    if (!vent) {
      res.status(404).json({ error: 'Desabafo não encontrado.' });
      return;
    }
    const author = sanitizeText(req.body?.author, 40) || 'Alguém que se importa';
    const content = sanitizeText(req.body?.content, 600);
    if (content.length < 4) {
      res.status(400).json({ error: 'Escreva uma mensagem de apoio com pelo menos 4 caracteres.' });
      return;
    }

    vent.replies.push({
      id: makeId('rep'),
      author,
      content,
      createdAt: new Date().toISOString(),
    });
    writeStore(store);
    broadcastEvent('vent:updated', vent);
    res.status(201).json(vent);
  });

  app.post('/api/prayers', (req, res) => {
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

    const store = readStore();
    const newPrayer: Prayer = {
      id: makeId('pray'),
      author,
      intention,
      content,
      prayingCount: 1,
      createdAt: new Date().toISOString(),
    };
    store.prayers.unshift(newPrayer);
    if (store.prayers.length > 60) store.prayers.pop();
    writeStore(store);
    broadcastEvent('prayer:created', newPrayer);
    res.status(201).json(newPrayer);
  });

  app.post('/api/prayers/:id/pray', (req, res) => {
    const store = readStore();
    const prayer = store.prayers.find((p) => p.id === req.params.id);
    if (!prayer) {
      res.status(404).json({ error: 'Oração não encontrada.' });
      return;
    }
    prayer.prayingCount += 1;
    writeStore(store);
    broadcastEvent('prayer:updated', prayer);
    res.json(prayer);
  });

  app.post('/api/reasons', (req, res) => {
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

    const store = readStore();
    const newReason: ReasonToLive = {
      id: makeId('reason'),
      author,
      theme,
      content,
      savedCount: 1,
      createdAt: new Date().toISOString(),
    };
    store.reasons.unshift(newReason);
    if (store.reasons.length > 80) store.reasons.pop();
    writeStore(store);
    broadcastEvent('reason:created', newReason);
    res.status(201).json(newReason);
  });

  app.post('/api/reasons/:id/heart', (req, res) => {
    const store = readStore();
    const reason = store.reasons.find((r) => r.id === req.params.id);
    if (!reason) {
      res.status(404).json({ error: 'Motivo não encontrado.' });
      return;
    }
    reason.savedCount += 1;
    writeStore(store);
    broadcastEvent('reason:updated', reason);
    res.json(reason);
  });

  app.get('/api/assistant', (_req, res) => {
    const configured = Boolean(getGeminiApiKey());
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ok: configured,
      configured,
      service: 'sophia-assistant',
      envVar: 'GEMINI_API_KEY',
    });
  });

  app.post('/api/assistant', async (req, res) => {
    if (isRateLimited(`ai:${getClientIp(req)}`, 15, 60_000)) {
      res.status(429).json({
        error: 'Muitas mensagens em sequência. Respire um pouquinho e tente novamente em instantes.',
      });
      return;
    }

    const aiClient = getAiClient();
    if (!aiClient) {
      res.status(503).json({
        error:
          'A chave do serviço de conversação (GEMINI_API_KEY) não está configurada no servidor.',
      });
      return;
    }

    const rawMessages: unknown[] = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const filtered = rawMessages
      .slice(-16)
      .filter(
        (m: unknown): m is { role: 'user' | 'model'; text: string } =>
          typeof m === 'object' &&
          m !== null &&
          ((m as { role?: unknown }).role === 'user' || (m as { role?: unknown }).role === 'model') &&
          typeof (m as { text?: unknown }).text === 'string' &&
          (m as { text: string }).text.trim().length > 0,
      )
      .map((m) => ({
        role: m.role,
        text: m.text.trim().slice(0, 1000),
      }));

    const firstUserIndex = filtered.findIndex((m) => m.role === 'user');
    const normalizedTurns: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
    if (firstUserIndex !== -1) {
      for (const msg of filtered.slice(firstUserIndex)) {
        const last = normalizedTurns[normalizedTurns.length - 1];
        if (last && last.role === msg.role) {
          last.parts[0].text = `${last.parts[0].text}\n\n${msg.text}`.slice(0, 1800);
        } else {
          normalizedTurns.push({
            role: msg.role,
            parts: [{ text: msg.text }],
          });
        }
      }
    }

    if (normalizedTurns.length === 0 || normalizedTurns[normalizedTurns.length - 1].role !== 'user') {
      res.status(400).json({ error: 'Envie uma mensagem para conversar com a assistente.' });
      return;
    }

    const rawRecovery = req.body?.recoveryContext;
    let recoveryNote = '';
    if (rawRecovery && typeof rawRecovery === 'object') {
      const habitName = sanitizeText((rawRecovery as { habitName?: unknown }).habitName, 120);
      const daysClean = Number((rawRecovery as { daysClean?: unknown }).daysClean);
      const hoursClean = Number((rawRecovery as { hoursClean?: unknown }).hoursClean);
      const bestDays = Number((rawRecovery as { bestDays?: unknown }).bestDays);
      const relapseCount = Number((rawRecovery as { relapseCount?: unknown }).relapseCount);
      const intent = sanitizeText((rawRecovery as { intent?: unknown }).intent, 24);
      if (habitName) {
        recoveryNote =
          `\n\nContexto atual de "Minha Superação" compartilhado voluntariamente pela pessoa neste momento: ` +
          `Objetivo: "${habitName}". Tempo atual: ${Number.isFinite(daysClean) ? daysClean : 0} dia(s) e ${Number.isFinite(hoursClean) ? hoursClean : 0} hora(s). ` +
          `Recorde pessoal: ${Number.isFinite(bestDays) ? bestDays : 0} dia(s). Recaídas registradas: ${Number.isFinite(relapseCount) ? relapseCount : 0}. ` +
          `Foco pedido: ${intent || 'apoio'}.`;
      }
    }

    const systemInstruction =
      'Você é Sophia, uma assistente virtual gentil, calma, acolhedora e respeitosa do site Aurora — Um novo começo, uma nova esperança, em português do Brasil. ' +
      'Seu papel é ouvir pessoas que estão enfrentando dor emocional, vazio interior, excesso de trabalho, bullying na escola, comparação, solidão, desânimo ou lutando para superar vícios e hábitos difíceis na seção Minha Superação. ' +
      'Responda com empatia humana, calma e clareza (em 2 a 4 parágrafos curtos). ' +
      'Valide o sentimento da pessoa sem julgamentos, ofereça um passo pequeno e gentil para o momento presente, e quando fizer sentido ou for pedido, compartilhe um versículo bíblico consolador e motivos concretos de esperança. ' +
      'Regras essenciais de segurança e saúde: ' +
      '1) Deixe claro com naturalidade quando falar de saúde, dependências ou tratamentos que você é uma assistente virtual e não substitui médicos, psicólogos ou outros profissionais de saúde. ' +
      '2) Na superação de vícios e hábitos: incentive com carinho, comemore cada dia e hora conquistados, ajude com estratégias práticas para lidar com fissura e gatilhos (respirar fundo, beber água, adiar 10 minutos, mudar de ambiente, pedir apoio a alguém de confiança) e acolha recaídas sem culpa, lembrando que recomeçar também é vencer. ' +
      '3) Para dependências químicas (álcool, cigarro, drogas) ou uso de medicamentos: incentive acompanhamento médico ou psicológico (como UBS ou CAPS AD) e NUNCA recomende interromper álcool ou medicamentos de forma abrupta sem supervisão médica, pois a abstinência súbita pode oferecer riscos à saúde. ' +
      '4) Se a pessoa demonstrar risco de suicídio, desesperança extrema ou vontade de se machucar, acolha com muito carinho e oriente imediatamente a ligar gratuitamente para o CVV no número 188 (24 horas, em sigilo) ou procurar atendimento de emergência e alguém de confiança. ' +
      'Escreva em texto simples, calmo e acolhedor, sem usar asteriscos, negrito ou formatação markdown. ' +
      'Encerre com encorajamento sincero lembrando que ela consegue atravessar esse momento e não está sozinha.' +
      recoveryNote;

    const candidateModels = [
      'gemini-4-hydrogen',
      'gemini-3.1-flash-lite',
      'gemini-2.5-flash',
      'gemini-3-flash-preview',
    ] as const;
    const deadlineMs = Date.now() + 24_000;
    let lastErr: unknown = null;

    for (const modelName of candidateModels) {
      const remainingMs = deadlineMs - Date.now();
      if (remainingMs < 2_500) break;
      const attemptTimeoutMs = Math.min(9_000, remainingMs);

      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('503 UNAVAILABLE timeout')), attemptTimeoutMs),
        );
        const response = await Promise.race([
          aiClient.models.generateContent({
            model: modelName,
            contents: normalizedTurns,
            config: {
              systemInstruction,
            },
          }),
          timeoutPromise,
        ]);

        const replyText = response.text?.trim();
        if (replyText) {
          res.json({ reply: replyText });
          return;
        }
      } catch (err) {
        lastErr = err;
        const msg = err instanceof Error ? err.message : String(err ?? '');
        const isAuthError =
          msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID');
        if (isAuthError) {
          break;
        }
      }
    }

    const message = lastErr instanceof Error ? lastErr.message : String(lastErr ?? 'Erro desconhecido');
    console.error('[Sophia /api/assistant error]:', message);

    if (
      message.includes('403') ||
      message.includes('PERMISSION_DENIED') ||
      message.includes('API_KEY_INVALID')
    ) {
      res.status(502).json({
        error:
          'Não foi possível autenticar a assistente. Verifique a chave GEMINI_API_KEY configurada em Settings > Secrets ou na Vercel.',
      });
      return;
    }
    if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
      res.status(429).json({
        error: 'Muitas conversas ao mesmo tempo. Aguarde alguns instantes e tente novamente.',
      });
      return;
    }
    if (message.includes('503') || message.includes('UNAVAILABLE')) {
      res.status(503).json({
        error:
          'A assistente está com muitos acessos neste momento. Aguarde alguns segundos e clique em Enviar novamente.',
      });
      return;
    }
    if (message.includes('404') || message.includes('NOT_FOUND')) {
      res.status(502).json({
        error: 'O modelo da assistente não foi encontrado no momento. Tente novamente em instantes.',
      });
      return;
    }
    res.status(500).json({
      error: 'Houve uma instabilidade ao responder agora. Tente novamente em instantes.',
    });
  });

  const ttsCache = new Map<string, { buffer: Buffer; contentType: string }>();

  app.get('/api/tts/status', (_req, res) => {
    const cfg = getShopiaVoiceConfig();
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      provider: 'shopia',
      shopiaConfigured: cfg.isConfigured,
      hasApiUrl: Boolean(cfg.apiUrl),
      hasApiKey: Boolean(cfg.apiKey),
      hasVoiceId: Boolean(cfg.voiceId),
      voiceId: cfg.voiceId || 'unconfigured',
      ttsModel: cfg.model || 'shopia-exclusive',
      greetingAudioAvailable: cfg.greetingAudioAvailable,
    });
  });

  app.get('/api/tts', (_req, res) => {
    const cfg = getShopiaVoiceConfig();
    res.setHeader('Cache-Control', 'no-store');
    res.json({
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
  });

  app.post('/api/tts', async (req, res) => {
    try {
      if (isRateLimited(`tts:${getClientIp(req)}`, 30, 60_000)) {
        res.status(429).json({
          error: 'Muitas solicitações de áudio em sequência. Aguarde alguns instantes.',
        });
        return;
      }

      const rawText = sanitizeText(req.body?.text, 2200);
      if (!rawText) {
        res.status(400).json({ error: 'Texto vazio para leitura com a voz da Shopia.' });
        return;
      }

      const cfg = getShopiaVoiceConfig();

      if (isShopiaGreetingText(rawText) && cfg.greetingAudioAvailable) {
        const audioBuffer = fs.readFileSync(SHOPIA_GREETING_AUDIO_FILE);
        res.setHeader('Content-Type', 'audio/mp4');
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('X-Aurora-Voice-Id', 'shopia-greeting');
        res.setHeader('X-Aurora-Voice-Source', 'shopia-recorded-audio');
        res.send(audioBuffer);
        return;
      }

      if (!cfg.isConfigured) {
        res.status(503).json({
          error:
            'A integração exclusiva da voz da Shopia ainda não está com todas as credenciais configuradas no servidor (SHOPIA_TTS_API_URL, SHOPIA_TTS_API_KEY e SHOPIA_VOICE_ID). Nenhuma outra voz ou Google TTS será usada como alternativa.',
          code: 'SHOPIA_VOICE_NOT_CONFIGURED',
        });
        return;
      }

      const text = prepareNaturalSpeechText(rawText);
      const cacheKey = `shopia:${cfg.voiceId}:${cfg.model}:${text}`;

      const cached = ttsCache.get(cacheKey);
      if (cached) {
        ttsCache.delete(cacheKey);
        ttsCache.set(cacheKey, cached);
        res.setHeader('Content-Type', cached.contentType);
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.setHeader('X-Aurora-Voice-Id', cfg.voiceId);
        res.setHeader('X-Aurora-Voice-Source', 'shopia-tts');
        res.send(cached.buffer);
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

      let upstreamRes: globalThis.Response;
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
          res.status(502).json({
            error:
              'As credenciais da integração da Shopia (SHOPIA_TTS_API_KEY ou SHOPIA_VOICE_ID) foram recusadas pelo serviço da Shopia.',
            code: 'SHOPIA_AUTH_ERROR',
          });
          return;
        }
        res.status(503).json({
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
        res.status(503).json({
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

      res.setHeader('Content-Type', outputMime);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('X-Aurora-Voice-Id', cfg.voiceId);
      res.setHeader('X-Aurora-Voice-Source', 'shopia-tts');
      res.send(audioBuffer);
    } catch (err) {
      console.error('[Aurora Shopia /api/tts error]:', err);
      res.status(503).json({
        error: 'Erro temporário ao gerar o áudio exclusivo da Shopia. Tente novamente em instantes.',
        code: 'SHOPIA_INTERNAL_ERROR',
      });
    }
  });

  return app;
}
