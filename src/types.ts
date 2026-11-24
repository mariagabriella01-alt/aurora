export type VentCategory =
  | 'Vazio interior'
  | 'Trabalho demais'
  | 'Bullying na escola'
  | 'Comparação'
  | 'Ansiedade'
  | 'Solidão'
  | 'Cansaço de viver'
  | 'Recomeço';

export interface VentReply {
  id: string;
  author: string;
  content: string;
  createdAt: string;
}

export interface Vent {
  id: string;
  author: string;
  category: VentCategory;
  content: string;
  embraces: number;
  replies: VentReply[];
  createdAt: string;
}

export type PrayerIntention = 'Pedido de oração' | 'Gratidão' | 'Palavra de paz';

export interface Prayer {
  id: string;
  author: string;
  intention: PrayerIntention;
  content: string;
  prayingCount: number;
  createdAt: string;
}

export type ReasonTheme = 'Pequenos gestos' | 'Pessoas e laços' | 'Fé e propósito' | 'Amanhã';

export interface ReasonToLive {
  id: string;
  author: string;
  theme: ReasonTheme;
  content: string;
  savedCount: number;
  createdAt: string;
}

export interface SanctuaryData {
  vents: Vent[];
  prayers: Prayer[];
  reasons: ReasonToLive[];
}

export interface PrivateJournalEntry {
  id: string;
  mood: string;
  note: string;
  createdAt: string;
}
