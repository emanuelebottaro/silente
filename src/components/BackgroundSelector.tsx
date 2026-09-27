import { Sparkles, Image, Link, Check, Trash2, Upload } from 'lucide-react';
import { DocumentSettings, BACKGROUND_PRESETS } from '../types';
import { useState, ChangeEvent } from 'react';

interface BackgroundSelectorProps {
  settings: DocumentSettings;
  onChange: (settings: DocumentSettings) => void;
  onClose?: () => void;
  isEmbed?: boolean;
}

export default function BackgroundSelector({ settings, onChange, onClose, isEmbed = false }: BackgroundSelectorProps) {
  const [customUrl, setCustomUrl] = useState(settings.customBgUrl && !settings.customBgUrl.startsWith('data:') ? settings.customBgUrl : '');

  const selectPreset = (presetId: string) => {
    onChange({
      ...settings,
      bgPreset: presetId,
      customBgUrl: presetId === 'custom' ? settings.customBgUrl : '',
    });
  };

  const applyCustomUrl = () => {
    if (!customUrl.trim()) return;
    onChange({
      ...settings,
      bgPreset: 'custom',
      customBgUrl: customUrl.trim(),
    });
  };

  const handleLocalFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert("L'immagine è superiore a 3MB. Potrebbe rallentare il caricamento su dispositivi con poca memoria.");
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        onChange({
          ...settings,
          bgPreset: 'custom',
          customBgUrl: base64,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const clearCustomUrl = () => {
    setCustomUrl('');
    onChange({
      ...settings,
      bgPreset: 'slate',
      customBgUrl: '',
    });
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto space-y-6 text-sm text-slate-200">
      {!isEmbed && (
        <div className="flex justify-between items-center pb-3 border-b border-white/10">
          <h3 className="text-base font-medium tracking-wide uppercase text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Sfondo Ambientale
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1"
            title="Chiudi"
          >
            &times;
          </button>
        </div>
      )}

      {/* --- PRESETS --- */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold text-sky-400 uppercase tracking-wider">Gradienti Atmosferici</label>
        <div className="grid grid-cols-1 gap-2.5">
          {BACKGROUND_PRESETS.filter(p => p.id !== 'custom').map((preset) => {
            const isSelected = settings.bgPreset === preset.id;
            return (
              <button
                key={preset.id}
                onClick={() => selectPreset(preset.id)}
                className={`relative flex items-center gap-3 p-2.5 rounded-lg border text-left transition-all group ${
                  isSelected
                    ? 'border-sky-500 bg-sky-950/20 text-sky-100 shadow-lg shadow-sky-950/30'
                    : 'border-white/5 hover:border-white/15 bg-white/5 hover:bg-white/10 text-slate-300'
                }`}
              >
                {/* Micro preview container */}
                <div
                  className="w-8 h-8 rounded border border-white/10 shadow"
                  style={{ background: preset.value }}
                />
                <span className="font-medium text-xs">{preset.name}</span>
                
                {isSelected && (
                  <Check className="w-4 h-4 text-sky-400 ml-auto mr-1" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- SFONDO DA FILE LOCALE --- */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-sky-400">
          <Upload className="w-4 h-4" />
          <span className="font-semibold text-xs uppercase tracking-wider">Immagine dal Dispositivo</span>
        </div>
        
        <p className="text-[11px] text-slate-400 font-light leading-relaxed">
          Carica un'immagine salvata sul tuo tablet o computer per usarla come sfondo personalizzato di scrittura.
        </p>

        <div className="space-y-2">
          <input
            type="file"
            id="local-bg-upload"
            accept="image/*"
            className="hidden"
            onChange={handleLocalFileChange}
          />
          <label
            htmlFor="local-bg-upload"
            className="flex items-center justify-center gap-2 border border-dashed border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/15 p-4 rounded-lg cursor-pointer transition-all text-slate-300 hover:text-white"
          >
            <Upload className="w-4 h-4 text-sky-400" />
            <span className="text-xs font-medium">Seleziona Immagine</span>
          </label>

          {settings.bgPreset === 'custom' && settings.customBgUrl && settings.customBgUrl.startsWith('data:') && (
            <div className="flex items-center justify-between p-2 rounded bg-sky-500/10 border border-sky-500/20 text-sky-300 text-[11px]">
              <span className="truncate max-w-[200px]">Immagine locale caricata</span>
              <button
                onClick={clearCustomUrl}
                className="text-sky-400 hover:text-sky-300 p-0.5"
                title="Rimuovi immagine caricata"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* --- CUSTOM URL --- */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 text-sky-400">
          <Image className="w-4 h-4" />
          <span className="font-semibold text-xs uppercase tracking-wider">Immagine da Internet</span>
        </div>
        
        <p className="text-[11px] text-slate-400 font-light leading-relaxed">
          Inserisci l'URL di un'immagine online (es. da Unsplash, Pinterest, o caricala altrove) per usarla come sfondo rilassante.
        </p>

        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full bg-slate-900/60 border border-white/10 rounded pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
              />
            </div>
            <button
              onClick={applyCustomUrl}
              disabled={!customUrl.trim()}
              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs px-3 rounded py-1.5 transition-colors flex items-center gap-1.5 shrink-0"
            >
              Applica
            </button>
          </div>

          {settings.bgPreset === 'custom' && settings.customBgUrl && !settings.customBgUrl.startsWith('data:') && (
            <div className="flex items-center justify-between p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px]">
              <span className="truncate max-w-[200px]">Uso: {settings.customBgUrl}</span>
              <button
                onClick={clearCustomUrl}
                className="text-amber-400 hover:text-amber-300 p-0.5"
                title="Rimuovi immagine personalizzata"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
