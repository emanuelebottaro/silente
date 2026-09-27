import { useState } from 'react';
import { Volume2, VolumeX, Type, Target, Eye, Sliders, ChevronDown, Maximize2, Minimize2, Palette, Sparkles, X, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentSettings } from '../types';
import BackgroundSelector from './BackgroundSelector';

const HIGHLIGHT_PRESETS = [
  { name: 'Azzurro', hex: '#38bdf8' },
  { name: 'Smeraldo', hex: '#34d399' },
  { name: 'Viola', hex: '#c084fc' },
  { name: 'Rosa', hex: '#f472b6' },
  { name: 'Ambra', hex: '#fbbf24' },
  { name: 'Corallo', hex: '#f87171' },
  { name: 'Ardesia', hex: '#94a3b8' },
];

const TEXT_PRESETS = [
  { name: 'Bianco', hex: 'rgba(255, 255, 255, 0.85)' },
  { name: 'Grigio', hex: '#cbd5e1' },
  { name: 'Crema', hex: '#fef08a' },
  { name: 'Oro', hex: '#fbbf24' },
  { name: 'Verde', hex: '#a7f3d0' },
  { name: 'Celeste', hex: '#bae6fd' },
  { name: 'Rosa', hex: '#fbcfe8' },
];

const WINDOW_BG_PRESETS = [
  { name: 'Ardesia', hex: '#0f172a' },
  { name: 'Nero', hex: '#020617' },
  { name: 'Antracite', hex: '#1c1917' },
  { name: 'Foresta', hex: '#022c22' },
  { name: 'Notte', hex: '#1e1b4b' },
  { name: 'Prugna', hex: '#3b0764' },
  { name: 'Cioccolato', hex: '#2d1a10' },
];

interface SettingsPanelProps {
  settings: DocumentSettings;
  onChange: (settings: DocumentSettings) => void;
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export default function SettingsPanel({ settings, onChange, onClose, isFullscreen, onToggleFullscreen }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<'editor' | 'design'>('editor');

  const updateSetting = <K extends keyof DocumentSettings>(key: K, value: DocumentSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  // Check if current hex is custom
  const isCustomColor = (currentHex: string, presets: { hex: string }[]) => {
    return !presets.some(p => p.hex.toLowerCase() === currentHex.toLowerCase());
  };

  return (
    <div className="flex flex-col h-full text-sm text-slate-200 overflow-hidden space-y-4">
      {/* Panel Header */}
      <div className="flex justify-between items-center pb-2 border-b border-white/10 shrink-0">
        <h3 className="text-sm font-medium tracking-wide uppercase text-slate-100 flex items-center gap-2 font-mono">
          <Sliders className="w-4 h-4 text-sky-400" />
          Impostazioni
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-all duration-200 p-1 rounded-full hover:bg-white/5 active:scale-95"
          title="Chiudi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-white/10 text-xs font-semibold uppercase tracking-wider shrink-0 font-mono">
        <button
          onClick={() => setActiveTab('editor')}
          className={`flex-1 py-2 text-center transition-all border-b-2 ${
            activeTab === 'editor'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Sliders className="w-3.5 h-3.5" />
            Editor
          </span>
        </button>
        <button
          onClick={() => setActiveTab('design')}
          className={`flex-1 py-2 text-center transition-all border-b-2 ${
            activeTab === 'design'
              ? 'border-sky-500 text-sky-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="flex items-center justify-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-amber-400" />
            Design
          </span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto pr-1 no-scrollbar">
        <AnimatePresence mode="wait">
          {activeTab === 'editor' ? (
            <motion.div
              key="editor"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
              className="space-y-6 pb-4"
            >
              {/* --- CARATTERI --- */}
              <div className="space-y-4">
                <h4 className="font-semibold text-sky-400 flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                  <Type className="w-4 h-4" />
                  Tipografia
                </h4>
                
                <div className="space-y-3 pl-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Carattere</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['serif', 'sans', 'mono'] as const).map((font) => (
                        <button
                          key={font}
                          onClick={() => updateSetting('fontFamily', font)}
                          className={`py-1.5 px-3 rounded text-xs border capitalize transition-all cursor-pointer ${
                            settings.fontFamily === font
                              ? 'border-sky-500 bg-sky-950/40 text-sky-300 shadow-md shadow-sky-950/20 font-medium'
                              : 'border-white/10 hover:border-white/25 bg-white/5 text-slate-300'
                          }`}
                        >
                          {font === 'serif' ? 'Georgia' : font === 'sans' ? 'Inter' : 'Mono'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Dimensione ({settings.fontSize}px)</label>
                      <input
                        type="range"
                        min="14"
                        max="32"
                        value={settings.fontSize}
                        onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                        className="w-full accent-sky-400 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Interlinea ({settings.lineHeight})</label>
                      <input
                        type="range"
                        min="1.4"
                        max="2.2"
                        step="0.2"
                        value={settings.lineHeight}
                        onChange={(e) => updateSetting('lineHeight', parseFloat(e.target.value))}
                        className="w-full accent-sky-400 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Larghezza Editor ({settings.editorWidth}px)</label>
                    <input
                      type="range"
                      min="500"
                      max="1000"
                      step="50"
                      value={settings.editorWidth}
                      onChange={(e) => updateSetting('editorWidth', parseInt(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                    />
                  </div>
                </div>
              </div>

              {/* --- SUONO TASTIERA --- */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="font-semibold text-sky-400 flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                  {settings.soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  Feedback Sonoro
                </h4>
                
                <div className="space-y-3 pl-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-300">Suono alla digitazione</span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.soundEnabled}
                        onChange={(e) => updateSetting('soundEnabled', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
                    </label>
                  </div>

                  {settings.soundEnabled && (
                    <>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1 font-light">Tipo tastiera</label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['mechanical', 'soft', 'typewriter'] as const).map((type) => (
                            <button
                              key={type}
                              onClick={() => updateSetting('soundType', type)}
                              className={`py-1 px-2 rounded text-xs border transition-all cursor-pointer ${
                                settings.soundType === type
                                  ? 'border-sky-500 bg-sky-950/40 text-sky-300'
                                  : 'border-white/10 hover:border-white/25 bg-white/5 text-slate-300'
                              }`}
                            >
                              {type === 'mechanical' ? 'Meccanica' : type === 'soft' ? 'Silenziosa' : 'Scrittrice'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-slate-400 mb-1 font-light">Volume ({Math.round(settings.soundVolume * 100)}%)</label>
                        <input
                          type="range"
                          min="0.1"
                          max="1"
                          step="0.1"
                          value={settings.soundVolume}
                          onChange={(e) => updateSetting('soundVolume', parseFloat(e.target.value))}
                          className="w-full accent-sky-400 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* --- OBIETTIVO GIORNALIERO --- */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="font-semibold text-sky-400 flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                  <Target className="w-4 h-4" />
                  Obiettivo Scrittura
                </h4>
                
                <div className="space-y-3 pl-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Traguardo Parole ({settings.dailyGoal} parole)</label>
                    <input
                      type="range"
                      min="50"
                      max="2000"
                      step="50"
                      value={settings.dailyGoal}
                      onChange={(e) => updateSetting('dailyGoal', parseInt(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                    />
                    <span className="text-[10px] text-slate-400 block mt-1 leading-relaxed">
                      Imposta un traguardo per visualizzare la barra di progresso in basso.
                    </span>
                  </div>
                </div>
              </div>

              {/* --- MODALITÀ FOCUS & ALTRE --- */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="font-semibold text-sky-400 flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                  <Eye className="w-4 h-4" />
                  Esperienza Senza Distrazione
                </h4>
                
                <div className="space-y-3 pl-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-light">Isolamento Visivo (Focus)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['off', 'paragraph', 'line'] as const).map((mode) => (
                        <button
                          key={mode}
                          onClick={() => updateSetting('focusMode', mode)}
                          className={`py-1.5 px-2 rounded text-xs border transition-all cursor-pointer ${
                            settings.focusMode === mode
                              ? 'border-sky-500 bg-sky-950/40 text-sky-300'
                              : 'border-white/10 hover:border-white/25 bg-white/5 text-slate-300'
                          }`}
                        >
                          {mode === 'off' ? 'Disattivo' : mode === 'paragraph' ? 'Paragrafo' : 'Riga'}
                        </button>
                      ))}
                    </div>
                    <div className="h-8 relative mt-1 overflow-hidden">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={settings.focusMode}
                          initial={{ opacity: 0, y: 3 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -3 }}
                          transition={{ duration: 0.15 }}
                          className="text-[10px] text-slate-400 block absolute top-0 left-0 right-0 leading-relaxed font-light"
                        >
                          {settings.focusMode === 'off' && 'Nessun isolamento: tutto il testo è visibile.'}
                          {settings.focusMode === 'paragraph' && 'Sfoca tutti i paragrafi tranne quello attivo.'}
                          {settings.focusMode === 'line' && 'Sfoca tutte le righe tranne quella attiva.'}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Modalità Typewriter */}
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-xs text-slate-300 flex flex-col text-left">
                      <span>Modalità Typewriter</span>
                      <span className="text-[10px] text-slate-400 font-light mt-0.5 leading-none">Tieni la riga attiva centrata</span>
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.typewriterMode}
                        onChange={(e) => updateSetting('typewriterMode', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div 
                        className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"
                        style={{
                          backgroundColor: settings.typewriterMode ? settings.themeColor : 'rgba(255, 255, 255, 0.1)'
                        }}
                      ></div>
                    </label>
                  </div>

                  {/* Ricorda Ultimo File */}
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <span className="text-xs text-slate-300 flex flex-col text-left">
                      <span>Carica ultimo file</span>
                      <span className="text-[10px] text-slate-400 font-light mt-0.5 leading-none">Apri l'ultimo testo all'avvio</span>
                    </span>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.rememberLastFile}
                        onChange={(e) => updateSetting('rememberLastFile', e.target.checked)}
                        className="sr-only peer"
                      />
                      <div 
                        className="w-9 h-5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"
                        style={{
                          backgroundColor: settings.rememberLastFile ? settings.themeColor : 'rgba(255, 255, 255, 0.1)'
                        }}
                      ></div>
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="design"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="space-y-6 pb-4"
            >
              {/* --- SCELTA SFONDO --- */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sky-400 flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Sfondo Ambientale
                </h4>
                <BackgroundSelector settings={settings} onChange={onChange} isEmbed={true} />
              </div>

              {/* --- COLORE IN EVIDENZA --- */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <h4 className="font-semibold text-sky-400 flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                  <Palette className="w-4 h-4" />
                  Colore in Evidenza (Tema)
                </h4>
                
                <div className="pl-1">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {HIGHLIGHT_PRESETS.map((color) => {
                      const isSelected = settings.themeColor.toLowerCase() === color.hex.toLowerCase();
                      return (
                        <button
                          key={color.hex}
                          onClick={() => updateSetting('themeColor', color.hex)}
                          className={`w-7 h-7 rounded-full border transition-all relative flex items-center justify-center cursor-pointer ${
                            isSelected 
                              ? 'border-white scale-110 shadow-lg' 
                              : 'border-white/10 hover:border-white/30 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </button>
                      );
                    })}

                    {/* Custom Highlight Color Picker */}
                    <div className="relative w-7 h-7 rounded-full border border-dashed border-white/30 flex items-center justify-center hover:border-white/60 hover:scale-105 cursor-pointer bg-gradient-to-tr from-rose-400 via-violet-400 to-sky-400 overflow-hidden">
                      <input 
                        type="color" 
                        value={isCustomColor(settings.themeColor, HIGHLIGHT_PRESETS) ? settings.themeColor : '#38bdf8'} 
                        onChange={(e) => updateSetting('themeColor', e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Colore personalizzato"
                      />
                      <span className="text-[14px] text-white font-semibold select-none pointer-events-none">+</span>
                    </div>
                    {isCustomColor(settings.themeColor, HIGHLIGHT_PRESETS) && (
                      <span className="text-[10px] text-slate-400 ml-1 font-mono">{settings.themeColor}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* --- COLORE CARATTERE (TESTO) --- */}
              <div className="space-y-3 pt-4 border-t border-white/5">
                <h4 className="font-semibold text-sky-400 flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                  <Type className="w-4 h-4" />
                  Colore del Carattere (Testo)
                </h4>
                
                <div className="pl-1">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {TEXT_PRESETS.map((color) => {
                      const isSelected = settings.textColor.toLowerCase() === color.hex.toLowerCase();
                      return (
                        <button
                          key={color.hex}
                          onClick={() => updateSetting('textColor', color.hex)}
                          className={`w-7 h-7 rounded-full border transition-all relative flex items-center justify-center cursor-pointer ${
                            isSelected 
                              ? 'border-white scale-110 shadow-lg' 
                              : 'border-white/10 hover:border-white/30 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </button>
                      );
                    })}

                    {/* Custom Text Color Picker */}
                    <div className="relative w-7 h-7 rounded-full border border-dashed border-white/30 flex items-center justify-center hover:border-white/60 hover:scale-105 cursor-pointer bg-gradient-to-tr from-amber-200 via-sky-300 to-emerald-300 overflow-hidden">
                      <input 
                        type="color" 
                        value={isCustomColor(settings.textColor, TEXT_PRESETS) ? settings.textColor : '#ffffff'} 
                        onChange={(e) => updateSetting('textColor', e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Colore testo personalizzato"
                      />
                      <span className="text-[14px] text-slate-800 font-semibold select-none pointer-events-none">+</span>
                    </div>
                    {isCustomColor(settings.textColor, TEXT_PRESETS) && (
                      <span className="text-[10px] text-slate-400 ml-1 font-mono">{settings.textColor}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* --- STILE FINESTRA DI SCRITTURA --- */}
              <div className="space-y-4 pt-4 border-t border-white/5">
                <h4 className="font-semibold text-sky-400 flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  Finestra di Scrittura
                </h4>

                {/* Colore Opacità Finestra */}
                <div className="space-y-1">
                  <label className="block text-xs text-slate-400 font-light">Colore della Finestra</label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {WINDOW_BG_PRESETS.map((color) => {
                      const isSelected = settings.editorBgColor.toLowerCase() === color.hex.toLowerCase();
                      return (
                        <button
                          key={color.hex}
                          onClick={() => updateSetting('editorBgColor', color.hex)}
                          className={`w-7 h-7 rounded-full border transition-all relative flex items-center justify-center cursor-pointer ${
                            isSelected 
                              ? 'border-white scale-110 shadow-lg' 
                              : 'border-white/10 hover:border-white/30 hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.hex }}
                          title={color.name}
                        >
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-slate-100" />}
                        </button>
                      );
                    })}

                    {/* Custom Window Background Color Picker */}
                    <div className="relative w-7 h-7 rounded-full border border-dashed border-white/30 flex items-center justify-center hover:border-white/60 hover:scale-105 cursor-pointer bg-gradient-to-tr from-neutral-800 via-neutral-600 to-neutral-400 overflow-hidden">
                      <input 
                        type="color" 
                        value={isCustomColor(settings.editorBgColor, WINDOW_BG_PRESETS) ? settings.editorBgColor : '#0f172a'} 
                        onChange={(e) => updateSetting('editorBgColor', e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title="Colore finestra personalizzato"
                      />
                      <span className="text-[14px] text-white font-semibold select-none pointer-events-none">+</span>
                    </div>
                    {isCustomColor(settings.editorBgColor, WINDOW_BG_PRESETS) && (
                      <span className="text-[10px] text-slate-400 ml-1 font-mono">{settings.editorBgColor}</span>
                    )}
                  </div>
                </div>

                {/* Window opacity and blur sliders */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Opacità Finestra ({Math.round(settings.opacity * 100)}%)</label>
                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={settings.opacity}
                      onChange={(e) => updateSetting('opacity', parseFloat(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1 font-light">Sfocatura Sfondo ({settings.blurAmount}px)</label>
                    <input
                      type="range"
                      min="0"
                      max="24"
                      step="2"
                      value={settings.blurAmount}
                      onChange={(e) => updateSetting('blurAmount', parseInt(e.target.value))}
                      className="w-full accent-sky-400 cursor-pointer h-1 bg-white/10 rounded-lg appearance-none"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
