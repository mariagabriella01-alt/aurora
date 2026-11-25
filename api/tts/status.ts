import fs from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';

const SHOPIA_GREETING_AUDIO_FILE = path.join(
  process.cwd(),
  'public',
  'assets',
  'aistudio',
  'Oi__voc__est__bem__Eu_sou_a_So.._67203881.m4a',
);

export default async function handler(_req: IncomingMessage, res: ServerResponse): Promise<void> {
  const apiUrl = (process.env.SHOPIA_TTS_API_URL || '').trim();
  const apiKey = (process.env.SHOPIA_TTS_API_KEY || '').trim();
  const voiceId = (process.env.SHOPIA_VOICE_ID || '').trim();
  const ttsModel = (process.env.SHOPIA_TTS_MODEL || '').trim();
  const greetingAudioAvailable = fs.existsSync(SHOPIA_GREETING_AUDIO_FILE);
  const shopiaConfigured = Boolean(apiUrl && apiKey && voiceId);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(
    JSON.stringify({
      provider: 'shopia',
      shopiaConfigured,
      hasApiUrl: Boolean(apiUrl),
      hasApiKey: Boolean(apiKey),
      hasVoiceId: Boolean(voiceId),
      voiceId: voiceId || 'unconfigured',
      ttsModel: ttsModel || 'shopia-exclusive',
      greetingAudioAvailable,
    }),
  );
}
