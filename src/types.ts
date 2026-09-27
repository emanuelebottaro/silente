export interface DocumentSettings {
  bgPreset: string;
  customBgUrl: string;
  fontFamily: 'serif' | 'sans' | 'mono';
  fontSize: number; // 14 to 32
  lineHeight: number; // 1.4 to 2.2
  editorWidth: number; // 500 to 1000
  opacity: number; // 0.1 to 1.0
  blurAmount: number; // 0 to 24
  soundEnabled: boolean;
  soundType: 'mechanical' | 'soft' | 'typewriter';
  soundVolume: number;
  dailyGoal: number; // words target
  focusMode: 'off' | 'paragraph' | 'line';
  textColor: string;
  themeColor: string; // e.g., '#38bdf8'
  editorBgColor: string; // e.g., '#0f172a'
  typewriterMode: boolean;
  rememberLastFile: boolean;
}

export interface WritingDocument {
  id: string; // 'local' or a Google Drive file ID
  name: string;
  content: string;
  lastSaved: string;
  isCloud: boolean;
}

export const BACKGROUND_PRESETS = [
  {
    id: 'slate',
    name: 'Atmosfera Scura',
    value: 'radial-gradient(circle at center, #162031 0%, #07090d 100%)',
  },
  {
    id: 'nebula',
    name: 'Spazio Cosmo',
    value: 'radial-gradient(circle at center, #1e1b4b 0%, #090514 100%)',
  },
  {
    id: 'forest',
    name: 'Foresta Smeraldo',
    value: 'radial-gradient(circle at center, #064e3b 0%, #022c22 100%)',
  },
  {
    id: 'sunset',
    name: 'Tramonto Silente',
    value: 'radial-gradient(circle at center, #451a03 0%, #1c0a00 100%)',
  },
  {
    id: 'ocean',
    name: 'Abisso Marino',
    value: 'radial-gradient(circle at center, #0c4a6e 0%, #021e33 100%)',
  },
  {
    id: 'custom',
    name: 'Immagine Personalizzata',
    value: '',
  },
];
