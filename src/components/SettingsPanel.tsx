import { Volume2, VolumeX, Type, Target, Eye, Sliders, ChevronDown } from 'lucide-react';
import { DocumentSettings } from '../types';

interface SettingsPanelProps {
  settings: DocumentSettings;
  onChange: (settings: DocumentSettings) => void;
  onClose: () => void;
}

export default function SettingsPanel({ settings, onChange, onClose }: SettingsPanelProps) {
  const updateSetting = <K extends keyof DocumentSettings>(key: K, value: DocumentSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-6 text-sm text-slate-200">
      <div className="flex justify-between items-center pb-3 border-b border-white/10">
        <h3 className="text-base font-medium tracking-wide uppercase text-slate-100 flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          Impostazioni Scrittura
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1"
          title="Chiudi"
        >
          &times;
        </button>
      </div>

      {/* --- CARATTERI --- */}
      <div className="space-y-4">
        <h4 className="font-semibold text-sky-400 flex items-center gap-2">
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
                  className={`py-1.5 px-3 rounded text-xs border capitalize transition-all ${
                    settings.fontFamily === font
                      ? 'border-sky-500 bg-sky-950/40 text-sky-300 shadow-md shadow-sky-950/20'
                      : 'border-white/10 hover:border-white/25 bg-white/5'
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
      <div className="space-y-4 pt-2 border-t border-white/5">
        <h4 className="font-semibold text-sky-400 flex items-center gap-2">
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
                      className={`py-1 px-2 rounded text-xs border transition-all ${
                        settings.soundType === type
                          ? 'border-sky-500 bg-sky-950/40 text-sky-300'
                          : 'border-white/10 hover:border-white/25 bg-white/5'
                      }`}
                    >
                      {type === 'mechanical' ? 'Meccanica' : type === 'soft' ? 'Silenziosa' : 'Scrittrice'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Volume ({Math.round(settings.soundVolume * 100)}%)</label>
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
      <div className="space-y-4 pt-2 border-t border-white/5">
        <h4 className="font-semibold text-sky-400 flex items-center gap-2">
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
            <span className="text-[10px] text-slate-400 block mt-1">
              Imposta un traguardo per visualizzare la barra di progresso in basso.
            </span>
          </div>
        </div>
      </div>

      {/* --- MODALITÀ FOCUS --- */}
      <div className="space-y-4 pt-2 border-t border-white/5">
        <h4 className="font-semibold text-sky-400 flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Esperienza Senza Distrazione
        </h4>
        
        <div className="space-y-3 pl-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Modalità Focus</label>
            <div className="grid grid-cols-3 gap-2">
              {(['off', 'paragraph', 'line'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => updateSetting('focusMode', mode)}
                  className={`py-1.5 px-2 rounded text-xs border transition-all ${
                    settings.focusMode === mode
                      ? 'border-sky-500 bg-sky-950/40 text-sky-300'
                      : 'border-white/10 hover:border-white/25 bg-white/5'
                  }`}
                >
                  {mode === 'off' ? 'Disattivo' : mode === 'paragraph' ? 'Paragrafo' : 'Riga'}
                </button>
              ))}
            </div>
            <span className="text-[10px] text-slate-400 block mt-1">
              {settings.focusMode === 'off' && 'Nessun isolamento: tutto il testo è visibile.'}
              {settings.focusMode === 'paragraph' && 'Sfoca tutti i paragrafi tranne quello attivo.'}
              {settings.focusMode === 'line' && 'Sfoca tutte le righe tranne quella in cui stai scrivendo.'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Opacità Finestra ({Math.round(settings.opacity * 100)}%)</label>
              <input
                type="range"
                min="0.1"
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
      </div>
    </div>
  );
}
