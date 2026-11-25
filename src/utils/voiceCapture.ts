export interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

export interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternativeLike;
  isFinal: boolean;
}

export interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>;
}

export interface SpeechRecognitionErrorEventLike {
  error: string;
}

export interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

export function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function isMediaRecordingSupported(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return (
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    typeof window.MediaRecorder !== 'undefined'
  );
}

export function isAnyVoiceInputSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null || isMediaRecordingSupported();
}

export function pickSupportedAudioMimeType(): string {
  if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') return '';
  if (typeof window.MediaRecorder.isTypeSupported !== 'function') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const mime of candidates) {
    if (window.MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Falha ao ler áudio gravado.'));
    reader.readAsDataURL(blob);
  });
}

export async function transcribeAudioBlob(blob: Blob, mimeType: string): Promise<string> {
  const audioBase64 = await blobToBase64(blob);
  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audioBase64,
      mimeType: mimeType || blob.type || 'audio/webm',
    }),
  });
  const data = (await res.json()) as { transcript?: string; error?: string };
  if (!res.ok) {
    throw new Error(data.error || 'Não foi possível entender o áudio agora.');
  }
  return (data.transcript || '').trim();
}

export function getMicrophoneErrorMessage(err: unknown): string {
  const name = (err as { name?: string })?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Permita o acesso ao microfone nas configurações do navegador ou do celular para falar.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'Nenhum microfone foi encontrado neste aparelho.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'O microfone está sendo usado por outro aplicativo no momento.';
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'O microfone exige conexão segura (HTTPS) no celular.';
  }
  return 'Não foi possível acessar o microfone neste aparelho. Você pode escrever normalmente.';
}

export function isLikelyIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}
