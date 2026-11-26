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

function sendJson(res: ServerResponse, statusCode: number, payload: unknown): void {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function sanitizeText(value: unknown, maxLen: number): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLen);
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
          service: 'sophia-assistant',
          envVar: 'GEMINI_API_KEY',
        }),
      );
      return;
    }

    if (req.method !== 'POST') {
      sendJson(res, 405, { error: 'Método não permitido. Utilize POST /api/assistant.' });
      return;
    }

    if (isRateLimited(`ai:${getClientIp(req)}`, 15, 60_000)) {
      sendJson(res, 429, {
        error: 'Muitas mensagens em sequência. Respire um pouquinho e tente novamente em instantes.',
      });
      return;
    }

    const apiKey = getGeminiApiKey();
    if (!apiKey) {
      sendJson(res, 503, {
        error:
          'A chave do serviço de conversação (GEMINI_API_KEY) não está configurada no servidor.',
      });
      return;
    }

    const body = await readJsonBody(req);
    const rawMessages: unknown[] = Array.isArray(body.messages) ? body.messages : [];
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
      sendJson(res, 400, { error: 'Envie uma mensagem para conversar com a assistente.' });
      return;
    }

    const rawRecovery = body.recoveryContext;
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

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

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
          ai.models.generateContent({
            model: modelName,
            contents: normalizedTurns,
            config: { systemInstruction },
          }),
          timeoutPromise,
        ]);

        const replyText = response.text?.trim();
        if (replyText) {
          sendJson(res, 200, { reply: replyText });
          return;
        }
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

    const message = lastErr instanceof Error ? lastErr.message : String(lastErr ?? 'Erro desconhecido');
    console.error('[Sophia Vercel /api/assistant error]:', message);

    if (
      message.includes('403') ||
      message.includes('PERMISSION_DENIED') ||
      message.includes('API_KEY_INVALID')
    ) {
      sendJson(res, 502, {
        error:
          'Não foi possível autenticar a assistente. Verifique a chave GEMINI_API_KEY configurada em Settings > Secrets ou na Vercel.',
      });
      return;
    }
    if (message.includes('429') || message.includes('RESOURCE_EXHAUSTED')) {
      sendJson(res, 429, {
        error: 'Muitas conversas ao mesmo tempo. Aguarde alguns instantes e tente novamente.',
      });
      return;
    }
    if (message.includes('503') || message.includes('UNAVAILABLE')) {
      sendJson(res, 503, {
        error:
          'A assistente está com muitos acessos neste momento. Aguarde alguns segundos e clique em Enviar novamente.',
      });
      return;
    }
    sendJson(res, 503, {
      error: 'Houve uma instabilidade ao responder agora. Tente novamente em instantes.',
    });
  } catch (fatalErr) {
    console.error('[Sophia Vercel /api/assistant fatal]:', fatalErr);
    sendJson(res, 503, {
      error: 'Houve uma instabilidade momentânea ao responder. Tente novamente em instantes.',
    });
  }
}
