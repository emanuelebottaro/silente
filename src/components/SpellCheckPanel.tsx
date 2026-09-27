import { useState, useEffect } from 'react';
import { Sparkles, Check, AlertCircle, X, CheckCheck, RefreshCw, Eye, EyeOff, HelpCircle, Bot, Zap, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { scanText, applyCorrection, autoCorrectAll, SpellCheckIssue } from '../utils/spellChecker';

interface SpellCheckPanelProps {
  content: string;
  onChangeContent: (newContent: string) => void;
  onClose: () => void;
  nativeSpellCheck: boolean;
  onToggleNativeSpellCheck: (val: boolean) => void;
}

export default function SpellCheckPanel({
  content,
  onChangeContent,
  onClose,
  nativeSpellCheck,
  onToggleNativeSpellCheck,
}: SpellCheckPanelProps) {
  const [activeTab, setActiveTab] = useState<'quick' | 'ai'>('quick');
  const [quickIssues, setQuickIssues] = useState<SpellCheckIssue[]>([]);
  const [isScanningQuick, setIsScanningQuick] = useState(false);

  // AI-Powered state
  const [aiIssues, setAiIssues] = useState<SpellCheckIssue[]>([]);
  const [isScanningAi, setIsScanningAi] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [noApiKey, setNoApiKey] = useState(false);

  // Scan content with local rules
  const performQuickScan = () => {
    setIsScanningQuick(true);
    setTimeout(() => {
      const detectedIssues = scanText(content);
      setQuickIssues(detectedIssues);
      setIsScanningQuick(false);
    }, 400);
  };

  // Re-run quick scan when content changes
  useEffect(() => {
    const detectedIssues = scanText(content);
    setQuickIssues(detectedIssues);
  }, [content]);

  // Run AI Deep spelling and syntax scan
  const performAiScan = async () => {
    if (!content.trim()) return;
    setIsScanningAi(true);
    setAiError(null);
    setNoApiKey(false);

    try {
      const response = await fetch('/api/spellcheck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: content }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.noApiKey) {
          setNoApiKey(true);
        } else {
          setAiError(data.error || 'Errore durante la scansione intelligente.');
        }
        setIsScanningAi(false);
        return;
      }

      setAiIssues(data.issues || []);
    } catch (err: any) {
      console.error(err);
      setAiError('Impossibile connettersi al server per la scansione AI. Verifica che il server sia attivo.');
    } finally {
      setIsScanningAi(false);
    }
  };

  // Fix a single issue
  const handleFixIssue = (issue: SpellCheckIssue, source: 'quick' | 'ai') => {
    const updated = applyCorrection(content, issue);
    onChangeContent(updated);

    // If source is AI, we might want to manually remove the issue or update its index
    if (source === 'ai') {
      setAiIssues(prev => prev.filter(i => i.id !== issue.id));
    }
  };

  // Fix all quick issues
  const handleFixAllQuick = () => {
    const { correctedText, count } = autoCorrectAll(content);
    if (count > 0) {
      onChangeContent(correctedText);
    }
  };

  // Fix all AI issues
  const handleFixAllAi = () => {
    let currentText = content;
    let appliedCount = 0;

    // Apply corrections one by one in reverse index order to prevent index shifting
    const sortedIssues = [...aiIssues].sort((a, b) => b.index - a.index);
    for (const issue of sortedIssues) {
      currentText = applyCorrection(currentText, issue);
      appliedCount++;
    }

    if (appliedCount > 0) {
      onChangeContent(currentText);
      setAiIssues([]);
    }
  };

  const currentIssues = activeTab === 'quick' ? quickIssues : aiIssues;
  const isCurrentlyScanning = activeTab === 'quick' ? isScanningQuick : isScanningAi;

  return (
    <div className="flex flex-col h-full text-sm text-slate-200 overflow-hidden space-y-4 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center pb-2 border-b border-white/10 shrink-0">
        <h3 className="text-sm font-medium tracking-wide uppercase text-slate-100 flex items-center gap-2 font-mono">
          <Sparkles className="w-4 h-4 text-sky-400" />
          Ortografia & Sintassi
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-all duration-200 p-1 rounded-full hover:bg-white/5 active:scale-95 cursor-pointer"
          title="Chiudi"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Tabs */}
      <div className="grid grid-cols-2 gap-1 bg-white/5 p-1 rounded-lg border border-white/10 shrink-0">
        <button
          onClick={() => setActiveTab('quick')}
          className={`py-1.5 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'quick'
              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Analisi Rapida</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('ai');
            // If it's the first time switching to AI tab and we have text, auto-run or prompt
          }}
          className={`py-1.5 px-3 text-xs font-semibold rounded-md transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'ai'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/10'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Google AI (Sintassi)</span>
        </button>
      </div>

      {/* Quick native browser spellcheck toggle */}
      <div className="bg-white/5 rounded-lg p-2.5 border border-white/5 space-y-1.5 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {nativeSpellCheck ? (
              <Eye className="w-3.5 h-3.5 text-sky-400" />
            ) : (
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="text-xs font-semibold text-slate-200">Sottolineatura rossa browser</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={nativeSpellCheck}
              onChange={(e) => onToggleNativeSpellCheck(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-8 h-4.5 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-sky-500"></div>
          </label>
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed font-light">
          Usa il dizionario locale del browser Chrome per evidenziare refusi in tempo reale nel testo.
        </p>
      </div>

      {/* Main Panel Content */}
      <div className="flex-1 overflow-y-auto pr-1 no-scrollbar flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {isCurrentlyScanning ? (
            <motion.div
              key="scanning"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-8 space-y-3"
            >
              <RefreshCw className="w-6 h-6 text-sky-400 animate-spin" />
              <p className="text-xs text-slate-400 font-mono">
                {activeTab === 'quick' ? 'Analisi dizionario...' : 'Google Gemini in ascolto...'}
              </p>
            </motion.div>
          ) : activeTab === 'ai' && noApiKey ? (
            <motion.div
              key="no-api-key"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4"
            >
              <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-400">
                <Key className="w-5 h-5" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-200">Chiave API non trovata</p>
                <p className="text-[11px] text-slate-400 leading-relaxed font-light">
                  Per utilizzare la correzione sintattica avanzata con Google Gemini, configura la tua chiave <code className="bg-black/40 px-1 py-0.5 rounded font-mono text-amber-300">GEMINI_API_KEY</code> nel pannello <strong>Secrets / Impostazioni</strong> di AI Studio.
                </p>
              </div>
            </motion.div>
          ) : activeTab === 'ai' && aiError ? (
            <motion.div
              key="ai-error"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4"
            >
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 text-red-400">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-200">Si è verificato un errore</p>
                <p className="text-[11px] text-slate-400 leading-relaxed font-light">
                  {aiError}
                </p>
              </div>
              <button
                onClick={performAiScan}
                className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded hover:bg-white/10 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Riprova</span>
              </button>
            </motion.div>
          ) : activeTab === 'ai' && aiIssues.length === 0 && !isScanningAi ? (
            <motion.div
              key="ai-start"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400">
                <Bot className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-200">Correzione Sintattica Google AI</p>
                <p className="text-[11px] text-slate-400 leading-relaxed font-light max-w-[220px] mx-auto">
                  Analizza grammaticalmente la sintassi, gli accenti complessi, l'accordo verbale e lo stile del testo usando lo stesso motore intelligente integrato su Gmail e Google Drive.
                </p>
              </div>
              <button
                onClick={performAiScan}
                disabled={!content.trim()}
                className={`w-full py-2 px-4 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border shadow-lg transition-all active:scale-[0.98] ${
                  content.trim()
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 cursor-pointer'
                    : 'bg-white/5 text-slate-500 border-white/5 cursor-not-allowed'
                }`}
              >
                <Sparkles className="w-4 h-4" />
                <span>Avvia Analisi Profonda</span>
              </button>
            </motion.div>
          ) : currentIssues.length === 0 ? (
            <motion.div
              key="no-errors"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-200">Nessun errore rilevato!</p>
                <p className="text-[10px] text-slate-400 leading-relaxed font-light max-w-[200px] mx-auto">
                  {activeTab === 'quick' 
                    ? 'Le regole locali non hanno rilevato refusi. Il tuo testo sembra pulito!' 
                    : 'La scansione profonda con Google Gemini non ha rilevato errori o suggerimenti stilistici!'}
                </p>
              </div>
              <button
                onClick={activeTab === 'quick' ? performQuickScan : performAiScan}
                className="mt-2 text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded hover:bg-white/10 cursor-pointer transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Rianalizza</span>
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="issues-list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {/* Summary Stats */}
              <div className={`flex items-center justify-between border rounded-lg p-3 shrink-0 ${
                activeTab === 'quick' 
                  ? 'bg-sky-950/20 border-sky-500/20 text-sky-300' 
                  : 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
              }`}>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold flex items-center gap-1.5">
                    <CheckCheck className={`w-4 h-4 shrink-0 ${activeTab === 'quick' ? 'text-sky-400' : 'text-emerald-400'}`} />
                    Trovate {currentIssues.length} anomalie
                  </p>
                  <p className="text-[10px] text-slate-400 font-light">
                    Correzioni pronte per essere applicate.
                  </p>
                </div>
                <button
                  onClick={activeTab === 'quick' ? handleFixAllQuick : handleFixAllAi}
                  className={`font-medium text-xs px-2.5 py-1.5 rounded flex items-center gap-1 transition-all shadow cursor-pointer active:scale-95 text-white ${
                    activeTab === 'quick'
                      ? 'bg-sky-600 hover:bg-sky-500 shadow-sky-900/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/30'
                  }`}
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span>Correggi Tutti</span>
                </button>
              </div>

              {/* List of Issues */}
              <div className="space-y-2.5 max-h-[50vh] overflow-y-auto no-scrollbar">
                {currentIssues.map((issue) => (
                  <div
                    key={issue.id}
                    className="border border-white/10 rounded-lg p-3 bg-slate-900/40 hover:bg-slate-900/70 transition-all space-y-2 text-left"
                  >
                    {/* Header line of the card */}
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-1.5 text-xs font-semibold">
                        <AlertCircle className={`w-3.5 h-3.5 shrink-0 ${
                          issue.type === 'grammar' || issue.type === 'style' ? 'text-emerald-400' : 'text-amber-400'
                        }`} />
                        <span className={issue.type === 'grammar' || issue.type === 'style' ? 'text-emerald-400' : 'text-amber-400'}>
                          {issue.type === 'accent' && 'Accento errato'}
                          {issue.type === 'apostrophe' && 'Apostrofo errato'}
                          {issue.type === 'punctuation' && 'Spaziatura punteggiatura'}
                          {issue.type === 'spacing' && 'Spazio consecutivo'}
                          {issue.type === 'common_error' && 'Errore comune'}
                          {issue.type === 'grammar' && 'Errore grammaticale'}
                          {issue.type === 'style' && 'Suggerimento di stile'}
                        </span>
                      </div>
                      
                      {/* Suggestion action */}
                      <button
                        onClick={() => handleFixIssue(issue, activeTab)}
                        className={`text-[10px] border rounded px-2 py-0.5 font-medium transition-all duration-200 cursor-pointer ${
                          activeTab === 'quick'
                            ? 'bg-sky-500/10 hover:bg-sky-500 text-sky-300 hover:text-white border-sky-500/20'
                            : 'bg-emerald-500/10 hover:bg-emerald-500 text-emerald-300 hover:text-white border-emerald-500/20'
                        }`}
                      >
                        Correggi
                      </button>
                    </div>

                    {/* Change comparison display */}
                    <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded font-mono text-xs">
                      <span className="line-through text-red-400 bg-red-950/20 px-1 rounded truncate max-w-[90px]">
                        {issue.original}
                      </span>
                      <span className="text-slate-500">&rarr;</span>
                      <span className="text-emerald-400 bg-emerald-950/20 px-1 rounded font-semibold truncate max-w-[90px]">
                        {issue.replacement}
                      </span>
                    </div>

                    {/* Context preview */}
                    {issue.context && (
                      <div className="text-[10px] text-slate-400 bg-white/5 p-1.5 rounded border border-white/5 italic font-light">
                        {issue.context}
                      </div>
                    )}

                    {/* Helpful explanation message */}
                    <div className="text-[10px] text-slate-300 leading-relaxed flex items-start gap-1">
                      <HelpCircle className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                      <span>{issue.message}</span>
                    </div>
                  </div>
                ))}
              </div>

              {activeTab === 'ai' && (
                <button
                  onClick={performAiScan}
                  className="w-full text-xs text-emerald-400 hover:text-emerald-300 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded hover:bg-white/10 cursor-pointer transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Rianalizza con Google AI</span>
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
