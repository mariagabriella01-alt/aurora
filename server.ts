import 'dotenv/config';
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
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'sanctuary.json');

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

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
        author: 'Clara',
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

async function startServer() {
  const app = express();
  app.set('trust proxy', true);
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

  app.post('/api/assistant', async (req, res) => {
    if (isRateLimited(`ai:${getClientIp(req)}`, 15, 60_000)) {
      res.status(429).json({
        error: 'Muitas mensagens em sequência. Respire um pouquinho e tente novamente em instantes.',
      });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({
        error:
          'A chave do serviço de inteligência artificial não está configurada no servidor. Verifique as configurações de segredos.',
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

    // Gemini generateContent requires conversations to begin with 'user' and alternate roles strictly.
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

    const systemInstruction =
      'Você é Clara, uma assistente gentil, acolhedora e respeitosa do site Aurora — Um novo começo, uma nova esperança, em português do Brasil. ' +
      'Seu papel é ouvir pessoas que estão enfrentando dor emocional, vazio interior, excesso de trabalho, bullying na escola, comparação, solidão ou desânimo. ' +
      'Responda com empatia humana, calma e clareza (em 2 a 4 parágrafos curtos). ' +
      'Valide o sentimento da pessoa sem julgamentos, ofereça um passo pequeno e gentil para o momento presente, e quando fizer sentido ou for pedido, compartilhe um versículo bíblico consolador e motivos concretos de esperança. ' +
      'Nunca substitua um psicólogo ou médico. Se a pessoa demonstrar risco de suicídio, desesperança extrema ou vontade de se machucar, acolha com muito carinho e oriente imediatamente a ligar gratuitamente para o CVV no número 188 (24 horas, em sigilo) ou conversar com alguém de confiança. ' +
      'Escreva em texto simples e acolhedor, sem usar asteriscos, negrito ou formatação markdown. ' +
      'Encerre com encorajamento sincero lembrando que ela consegue atravessar esse momento e não está sozinha.';

    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview',
      'gemini-3.5-flash',
      'gemini-4-hydrogen',
    ] as const;
    let lastErr: unknown = null;

    for (const modelName of candidateModels) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('503 UNAVAILABLE timeout')), 10_000),
        );
        const response = await Promise.race([
          ai.models.generateContent({
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
    console.error('[Clara /api/assistant error]:', message);

    if (
      message.includes('403') ||
      message.includes('PERMISSION_DENIED') ||
      message.includes('API_KEY_INVALID')
    ) {
      res.status(502).json({
        error:
          'Não foi possível autenticar a assistente. Verifique a chave configurada em Settings > Secrets.',
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

  const ttsCache = new Map<string, Buffer>();
  const aiTts = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    apiVersion: 'v1beta',
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  function prepareNaturalSpeechText(raw: string): string {
    return raw
      .replace(/\s*·\s*/g, ', ')
      .replace(/\s*—\s*/g, '... ')
      .replace(/\s+-\s+/g, ', ')
      .replace(/:\s*/g, ': ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  app.post('/api/tts', async (req, res) => {
    if (isRateLimited(`tts:${getClientIp(req)}`, 30, 60_000)) {
      res.status(429).json({
        error: 'Muitas solicitações de áudio em sequência. Aguarde alguns instantes.',
      });
      return;
    }

    if (!process.env.GEMINI_API_KEY) {
      res.status(503).json({
        error: 'O serviço de voz neural não está configurado no servidor.',
      });
      return;
    }

    const rawText = sanitizeText(req.body?.text, 2200);
    if (!rawText) {
      res.status(400).json({ error: 'Texto vazio para leitura em voz.' });
      return;
    }

    const text = prepareNaturalSpeechText(rawText);

    const cached = ttsCache.get(text);
    if (cached) {
      ttsCache.delete(text);
      ttsCache.set(text, cached);
      res.setHeader('Content-Type', 'audio/wav');
      res.setHeader('Cache-Control', 'private, max-age=3600');
      res.send(cached);
      return;
    }

    const ttsAttempts: Array<{ model: string; voice: string }> = [
      { model: 'gemini-3.8-flash-tts', voice: 'Zephyr' },
      { model: 'gemini-3.8-flash-lite-tts', voice: 'Zephyr' },
      { model: 'gemini-3.8-flash-lite-tts', voice: 'Kore' },
    ];

    const voiceStyle =
      'Speak in warm, authentic, empathetic Brazilian Portuguese as a caring woman having an intimate, calm conversation. Use natural human cadence with gentle breathing pauses at commas and periods, soft expressive melody, subtle genuine emotion, clear unhurried articulation, and an inviting timbre — never robotic or theatrical.';

    let lastErr: unknown = null;
    for (const attempt of ttsAttempts) {
      for (const withStyle of [true, false]) {
        try {
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('503 UNAVAILABLE timeout')), 14_000),
          );
          const part = withStyle
            ? { text, speechMetadata: { style: voiceStyle } }
            : { text };

          const response = await Promise.race([
            aiTts.models.generateContent({
              model: attempt.model,
              contents: [
                {
                  role: 'user',
                  parts: [part],
                },
              ],
              config: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: attempt.voice },
                  },
                },
              },
            }),
            timeoutPromise,
          ]);

          const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            const wavBuffer = Buffer.from(base64Audio, 'base64');
            if (ttsCache.size >= 40) {
              const oldestKey = ttsCache.keys().next().value;
              if (oldestKey !== undefined) ttsCache.delete(oldestKey);
            }
            ttsCache.set(text, wavBuffer);
            res.setHeader('Content-Type', 'audio/wav');
            res.setHeader('Cache-Control', 'private, max-age=3600');
            res.send(wavBuffer);
            return;
          }
        } catch (err) {
          lastErr = err;
          const msg = err instanceof Error ? err.message : String(err ?? '');
          if (withStyle && msg.includes('speechMetadata')) {
            continue;
          }
          if (msg.includes('403') || msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
            break;
          }
          break;
        }
      }
    }

    const message = lastErr instanceof Error ? lastErr.message : String(lastErr ?? 'Erro TTS');
    console.error('[Aurora /api/tts error]:', message);
    res.status(503).json({
      error: 'Voz neural temporariamente indisponível.',
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Aurora — Um novo começo, uma nova esperança running at http://localhost:${PORT}`);
  });
}

startServer();
