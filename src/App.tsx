import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Folder, Save, Download, Sparkles, Settings, Cloud, 
  HelpCircle, Clock, BookOpen, Check, AlertCircle, RefreshCw,
  Layout, Eye, Sliders, Play, HardDrive, LogIn, Volume2,
  Menu, X
} from 'lucide-react';
import { DocumentSettings, WritingDocument } from './types';
import { initAuth, googleSignIn, logout, getAccessToken } from './firebase';
import { 
  listDriveFiles, getDriveFileContent, createDriveFile, 
  updateDriveFile, deleteDriveFile, DriveFile 
} from './driveService';
import { soundManager } from './components/SoundManager';
import { exportToTxt, exportToMd, exportToRtf, exportToHtml } from './utils/exportUtils';
import Sidebar from './components/Sidebar';
import SettingsPanel from './components/SettingsPanel';
import BackgroundSelector from './components/BackgroundSelector';
import { User } from 'firebase/auth';

const DEFAULT_SETTINGS: DocumentSettings = {
  bgPreset: 'slate',
  customBgUrl: '',
  fontFamily: 'serif',
  fontSize: 20,
  lineHeight: 1.8,
  editorWidth: 720,
  opacity: 0.65,
  blurAmount: 12,
  soundEnabled: true,
  soundType: 'mechanical',
  soundVolume: 0.4,
  dailyGoal: 300,
  focusMode: 'off',
  textColor: 'rgba(255, 255, 255, 0.85)',
  themeColor: '#38bdf8',
};

export default function App() {
  // Application Settings
  const [settings, setSettings] = useState<DocumentSettings>(() => {
    const saved = localStorage.getItem('focuswriter_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Sync to SoundManager
        soundManager.enabled = parsed.soundEnabled;
        soundManager.volume = parsed.soundVolume;
        soundManager.soundType = parsed.soundType;
        return parsed;
      } catch (e) {
        return DEFAULT_SETTINGS;
      }
    }
    // Initialize soundManager default
    soundManager.enabled = DEFAULT_SETTINGS.soundEnabled;
    soundManager.volume = DEFAULT_SETTINGS.soundVolume;
    soundManager.soundType = DEFAULT_SETTINGS.soundType;
    return DEFAULT_SETTINGS;
  });

  // Editor states
  const [content, setContent] = useState('');
  const [docName, setDocName] = useState('Senza nome.txt');
  const [currentDocId, setCurrentDocId] = useState('local_default');
  const [isCloudDoc, setIsCloudDoc] = useState(false);
  const [selectionStart, setSelectionStart] = useState(0);

  // Lists & Syncing
  const [localDocs, setLocalDocs] = useState<WritingDocument[]>([]);
  const [cloudDocs, setCloudDocs] = useState<DriveFile[]>([]);
  const [isLoadingCloud, setIsLoadingCloud] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  // Google Auth
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // UI Panels
  const [activePanel, setActivePanel] = useState<'none' | 'sidebar' | 'settings' | 'backgrounds'>('none');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  // Refs for Scroll Syncing
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);

  // Load settings and local docs on startup
  useEffect(() => {
    // Current time ticker
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);

    // Detect Touch/Coarse Pointer device
    const checkTouch = () => {
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      setIsTouchDevice(coarsePointer || touchSupport);
    };
    checkTouch();
    
    const handleTouchStart = () => {
      setIsTouchDevice(true);
    };
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    // Load Local Documents from LocalStorage
    const savedDocs = localStorage.getItem('focuswriter_local_docs');
    if (savedDocs) {
      try {
        const parsed = JSON.parse(savedDocs) as WritingDocument[];
        setLocalDocs(parsed);
        // Set the default or first document
        if (parsed.length > 0) {
          const defaultDoc = parsed[0];
          setCurrentDocId(defaultDoc.id);
          setDocName(defaultDoc.name);
          setContent(defaultDoc.content);
          setIsCloudDoc(false);
        } else {
          createDefaultLocalDoc();
        }
      } catch (e) {
        createDefaultLocalDoc();
      }
    } else {
      createDefaultLocalDoc();
    }

    // Initialize Firebase Auth
    initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
        fetchCloudFiles(accessToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );

    return () => {
      clearInterval(interval);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  // Save settings to LocalStorage when changed
  useEffect(() => {
    localStorage.setItem('focuswriter_settings', JSON.stringify(settings));
    soundManager.enabled = settings.soundEnabled;
    soundManager.volume = settings.soundVolume;
    soundManager.soundType = settings.soundType;
  }, [settings]);

  // Create default document if none exists
  const createDefaultLocalDoc = () => {
    const defaultDoc: WritingDocument = {
      id: 'local_default',
      name: 'Appunti del Mattino.txt',
      content: 'Benvenuto in FocusWriter Web.\n\nQuesto è uno spazio di scrittura minimalista e senza distrazioni progettato per aiutarti a concentrarti.\n\nSposta il mouse sul BORDO SUPERIORE per rivelare la barra dei menu con opzioni di salvataggio, esportazione e design.\n\nSposta il mouse sul BORDO INFERIORE per consultare le statistiche del testo (parole, caratteri) e impostare il tuo traguardo giornaliero.\n\nPuoi scegliere sfondi diversi, cambiare tipo di carattere, regolare la trasparenza e attivare rilassanti suoni di tastiere meccaniche o macchine da scrivere storiche.\n\nCollega Google Drive per salvare i tuoi testi direttamente nel Cloud ed evitare qualsiasi perdita di dati.',
      lastSaved: new Date().toISOString(),
      isCloud: false,
    };
    setLocalDocs([defaultDoc]);
    localStorage.setItem('focuswriter_local_docs', JSON.stringify([defaultDoc]));
    setCurrentDocId(defaultDoc.id);
    setDocName(defaultDoc.name);
    setContent(defaultDoc.content);
    setIsCloudDoc(false);
  };

  // Sync scroll from textarea to mirror overlay
  const handleScroll = () => {
    if (textareaRef.current && mirrorRef.current) {
      mirrorRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Keyboard and typing handlers
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setSelectionStart(e.target.selectionStart);
    
    // Auto sync scroll on typing
    setTimeout(handleScroll, 10);

    // Auto-hide mobile menu when starting to type
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Play synthesizer keyclick sound
    if (settings.soundEnabled) {
      const isModifier = e.ctrlKey || e.altKey || e.metaKey || ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key);
      if (!isModifier) {
        soundManager.playClick(e.key);
      }
    }
  };

  const handleSelectionChange = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    setSelectionStart(e.currentTarget.selectionStart);
  };

  // Local/Cloud File Saving Pipeline
  useEffect(() => {
    if (!currentDocId) return;

    if (!isCloudDoc) {
      // Local Document auto-saving (instant)
      const updated = localDocs.map(doc => {
        if (doc.id === currentDocId) {
          return {
            ...doc,
            name: docName,
            content: content,
            lastSaved: new Date().toISOString(),
          };
        }
        return doc;
      });
      setLocalDocs(updated);
      localStorage.setItem('focuswriter_local_docs', JSON.stringify(updated));
      setSaveStatus('saved');
    } else {
      // Cloud Document auto-saving (debounced 2.5s to avoid hitting API rate limits)
      if (!token) return;
      setSaveStatus('saving');
      const delayDebounceFn = setTimeout(async () => {
        try {
          const updatedFile = await updateDriveFile(token, currentDocId, docName, content);
          // Update cached file representation
          setCloudDocs(prev => prev.map(f => f.id === currentDocId ? updatedFile : f));
          setSaveStatus('saved');
        } catch (error) {
          console.error('Google Drive auto-save error:', error);
          setSaveStatus('error');
        }
      }, 2500);

      return () => clearTimeout(delayDebounceFn);
    }
  }, [content, docName]);

  // Fetch file list from Google Drive
  const fetchCloudFiles = async (accessToken: string) => {
    setIsLoadingCloud(true);
    try {
      const files = await listDriveFiles(accessToken);
      setCloudDocs(files);
    } catch (e) {
      console.error('Failed to load files from Google Drive:', e);
    } finally {
      setIsLoadingCloud(false);
    }
  };

  // Google OAuth Login
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        fetchCloudFiles(result.accessToken);
      }
    } catch (err) {
      console.error('Sign-in failed:', err);
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Google Logout
  const handleLogout = async () => {
    const confirmed = window.confirm('Sei sicuro di voler scollegare il tuo account Google? Dovrai connetterti di nuovo per accedere ai file su Google Drive.');
    if (!confirmed) return;
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setCloudDocs([]);
      // If current document is cloud, switch back to local
      if (isCloudDoc) {
        createDefaultLocalDoc();
      }
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  // Manual save trigger (Ctrl+S or button click)
  const handleManualSave = async () => {
    if (isCloudDoc) {
      if (!token) {
        alert('Devi collegare Google Drive per poter salvare.');
        return;
      }
      setSaveStatus('saving');
      try {
        const updatedFile = await updateDriveFile(token, currentDocId, docName, content);
        setCloudDocs(prev => prev.map(f => f.id === currentDocId ? updatedFile : f));
        setSaveStatus('saved');
      } catch (e) {
        console.error('Manual save failed:', e);
        setSaveStatus('error');
      }
    } else {
      // Local documents save immediately, but trigger visual status
      setSaveStatus('saving');
      setTimeout(() => setSaveStatus('saved'), 400);
    }
  };

  // Change currently loaded document
  const handleSelectDocument = async (docId: string, selectFromCloud: boolean) => {
    // Unsaved alert check not required since we auto-save continuously, but good practice
    if (selectFromCloud) {
      if (!token) return;
      setIsLoadingCloud(true);
      try {
        const fileContent = await getDriveFileContent(token, docId);
        const fileMeta = cloudDocs.find(f => f.id === docId);
        if (fileMeta) {
          setCurrentDocId(docId);
          setDocName(fileMeta.name);
          setContent(fileContent);
          setIsCloudDoc(true);
          setActivePanel('none');
        }
      } catch (err) {
        alert('Errore nel recupero del contenuto del file da Google Drive.');
        console.error(err);
      } finally {
        setIsLoadingCloud(false);
      }
    } else {
      const doc = localDocs.find(d => d.id === docId);
      if (doc) {
        setCurrentDocId(doc.id);
        setDocName(doc.name);
        setContent(doc.content);
        setIsCloudDoc(false);
        setActivePanel('none');
      }
    }
  };

  // Create a brand new document
  const handleCreateDocument = async (createOnCloud: boolean) => {
    const timestamp = new Date().toLocaleDateString('it-IT');
    const defaultName = `Nuovo Documento (${timestamp}).txt`;
    
    if (createOnCloud) {
      if (!token) {
        alert('Devi collegare Google Drive per creare file nel Cloud.');
        return;
      }
      setSaveStatus('saving');
      try {
        const newFile = await createDriveFile(token, defaultName, 'Inizia a scrivere qui...');
        setCloudDocs(prev => [newFile, ...prev]);
        setCurrentDocId(newFile.id);
        setDocName(newFile.name);
        setContent('Inizia a scrivere qui...');
        setIsCloudDoc(true);
        setActivePanel('none');
        setSaveStatus('saved');
      } catch (e) {
        console.error('Error creating cloud file:', e);
        alert('Impossibile creare il file su Google Drive.');
        setSaveStatus('error');
      }
    } else {
      const newDoc: WritingDocument = {
        id: `local_${Date.now()}`,
        name: defaultName,
        content: 'Inizia a scrivere qui...',
        lastSaved: new Date().toISOString(),
        isCloud: false,
      };
      const updated = [newDoc, ...localDocs];
      setLocalDocs(updated);
      localStorage.setItem('focuswriter_local_docs', JSON.stringify(updated));
      setCurrentDocId(newDoc.id);
      setDocName(newDoc.name);
      setContent(newDoc.content);
      setIsCloudDoc(false);
      setActivePanel('none');
      setSaveStatus('saved');
    }
  };

  // Delete document
  const handleDeleteDocument = async (docId: string, deleteFromCloud: boolean) => {
    const confirmed = window.confirm(
      deleteFromCloud 
        ? 'Sei sicuro di voler eliminare permanentemente questo file da Google Drive? Questa azione è irreversibile.' 
        : 'Sei sicuro di voler eliminare questo documento salvato localmente?'
    );
    if (!confirmed) return;

    if (deleteFromCloud) {
      if (!token) return;
      try {
        await deleteDriveFile(token, docId);
        setCloudDocs(prev => prev.filter(f => f.id !== docId));
        // If we deleted the active document, load another local doc
        if (currentDocId === docId) {
          createDefaultLocalDoc();
        }
      } catch (e) {
        console.error(e);
        alert('Impossibile eliminare il file da Google Drive.');
      }
    } else {
      const updated = localDocs.filter(d => d.id !== docId);
      setLocalDocs(updated);
      localStorage.setItem('focuswriter_local_docs', JSON.stringify(updated));
      
      if (currentDocId === docId) {
        if (updated.length > 0) {
          const next = updated[0];
          setCurrentDocId(next.id);
          setDocName(next.name);
          setContent(next.content);
          setIsCloudDoc(false);
        } else {
          createDefaultLocalDoc();
        }
      }
    }
  };

  // Direct file renaming handler
  const handleRename = (newName: string) => {
    setDocName(newName);
  };

  // Word & Character count calculation
  const wordCount = content.trim() === '' ? 0 : content.trim().split(/\s+/).length;
  const charCount = content.length;
  const progressPercent = Math.min(100, Math.round((wordCount / settings.dailyGoal) * 100));

  // Focus mode paragraph highlight index computation
  const getActiveParagraphIndex = (text: string, cursorIndex: number): number => {
    const paragraphs = text.split('\n');
    let currentLength = 0;
    for (let i = 0; i < paragraphs.length; i++) {
      const pLength = paragraphs[i].length + 1; // +1 for the newline char
      if (cursorIndex >= currentLength && cursorIndex <= currentLength + pLength) {
        return i;
      }
      currentLength += pLength;
    }
    return 0;
  };

  // Determine typeface family CSS classes
  const fontClass = 
    settings.fontFamily === 'serif' 
      ? 'font-serif' 
      : settings.fontFamily === 'sans' 
        ? 'font-sans' 
        : 'font-mono';

  // Format mirror components for paragraph highlighting
  const activeParagraphIndex = getActiveParagraphIndex(content, selectionStart);
  
  const renderMirrorContent = () => {
    const lines = content.split('\n');
    return lines.map((line, index) => {
      const isLast = index === lines.length - 1;
      const isCurrent = index === activeParagraphIndex;
      const displayText = line === '' ? ' ' : line; // force character space for height preservation
      const suffix = isLast ? '' : '\n';

      // Inline styles are perfectly matched with textarea dimensions
      let opacityStyle = 'opacity-100 text-slate-100 transition-opacity duration-300';
      if (settings.focusMode === 'paragraph') {
        opacityStyle = isCurrent 
          ? 'opacity-100 text-slate-100 font-medium' 
          : 'opacity-15 text-slate-500/80';
      } else if (settings.focusMode === 'line') {
        // Line mode dims older entries
        opacityStyle = isCurrent 
          ? 'opacity-100 text-slate-100 font-medium' 
          : 'opacity-15 text-slate-500/80';
      }

      return (
        <span key={index} className={opacityStyle}>
          {displayText}{suffix}
        </span>
      );
    });
  };

  // Background configurations
  const currentBgPreset = settings.bgPreset;
  const customBgUrl = settings.customBgUrl;
  
  let mainBackgroundStyle: React.CSSProperties = {
    background: 'radial-gradient(circle at center, #162031 0%, #07090d 100%)' // Fallback default
  };

  if (currentBgPreset === 'custom' && customBgUrl) {
    mainBackgroundStyle = {
      backgroundImage: `url(${customBgUrl})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    };
  } else {
    // Standard ambient presets
    switch (currentBgPreset) {
      case 'nebula':
        mainBackgroundStyle = { background: 'radial-gradient(circle at center, #1e1b4b 0%, #090514 100%)' };
        break;
      case 'forest':
        mainBackgroundStyle = { background: 'radial-gradient(circle at center, #064e3b 0%, #022c22 100%)' };
        break;
      case 'sunset':
        mainBackgroundStyle = { background: 'radial-gradient(circle at center, #451a03 0%, #1c0a00 100%)' };
        break;
      case 'ocean':
        mainBackgroundStyle = { background: 'radial-gradient(circle at center, #0c4a6e 0%, #021e33 100%)' };
        break;
      case 'slate':
      default:
        mainBackgroundStyle = { background: 'radial-gradient(circle at center, #162031 0%, #07090d 100%)' };
        break;
    }
  }

  // File exporter execution
  const triggerExport = (format: 'txt' | 'md' | 'rtf' | 'html') => {
    const rawFilename = docName.replace(/\.(txt|md|rtf|html)$/i, '');
    switch (format) {
      case 'txt':
        exportToTxt(content, rawFilename);
        break;
      case 'md':
        exportToMd(content, rawFilename);
        break;
      case 'rtf':
        exportToRtf(docName, content, rawFilename);
        break;
      case 'html':
        exportToHtml(docName, content, rawFilename);
        break;
    }
    setShowExportMenu(false);
  };

  return (
    <div 
      className="relative w-full h-screen overflow-hidden flex flex-col transition-all duration-700"
      style={mainBackgroundStyle}
      id="focuswriter-container"
    >
      {/* 1. ATMOSPHERE LIGHT EFFECTS OVERLAYS */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(56,189,248,0.06)_0%,transparent_50%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.06)_0%,transparent_50%)] pointer-events-none" />

      {/* MOBILE MENU TOGGLE (Visible on touch devices or small screens) */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className={`absolute top-4 right-4 ${isTouchDevice ? 'block' : 'md:hidden'} z-50 p-2.5 rounded-full bg-slate-900/60 hover:bg-slate-900/80 border border-white/10 text-slate-300 backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-sky-500/50`}
        title="Menu"
      >
        {mobileMenuOpen ? <X className="w-5 h-5 text-sky-400" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* 2. AUTO-HIDE HEADER (Menu appears on hover at top 60px) */}
      <div className="absolute top-0 left-0 right-0 h-16 group/header z-40">
        <header className={`w-full h-full bg-gradient-to-b from-slate-950/90 to-transparent flex items-center justify-between px-6 transition-all duration-500 transform ${mobileMenuOpen ? 'translate-y-0' : '-translate-y-full'} group-hover/header:translate-y-0 focus-within:translate-y-0 backdrop-blur-[2px]`}>
          {/* App title */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-sky-400 tracking-wider text-xs font-semibold uppercase">
              FocusWriter Web
            </span>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleCreateDocument(isCloudDoc)}
              className="hover:bg-white/10 text-slate-300 hover:text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Crea un nuovo documento vuoto"
            >
              <Plus className="w-3.5 h-3.5 text-sky-400" />
              <span>Nuovo</span>
            </button>

            <button
              onClick={() => setActivePanel(activePanel === 'sidebar' ? 'none' : 'sidebar')}
              className={`hover:bg-white/10 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activePanel === 'sidebar' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-300 hover:text-white'
              }`}
              title="Apri i documenti locali o da cloud"
            >
              <Folder className="w-3.5 h-3.5" />
              <span>I Miei Documenti</span>
            </button>

            <button
              onClick={handleManualSave}
              className="hover:bg-white/10 text-slate-300 hover:text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
              title="Salva immediatamente le modifiche"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Salva</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="hover:bg-white/10 text-slate-300 hover:text-white px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Esporta</span>
              </button>
              
              {showExportMenu && (
                <div className="absolute top-full mt-1 left-0 bg-slate-900/95 border border-white/10 rounded-lg shadow-2xl p-1 w-44 z-50 text-xs text-slate-300 backdrop-blur-md">
                  <div className="px-2 py-1 text-[10px] uppercase text-slate-500 font-semibold border-b border-white/5 mb-1">
                    Formati Open & Web
                  </div>
                  <button onClick={() => triggerExport('txt')} className="w-full text-left px-3 py-1.5 rounded hover:bg-sky-500 hover:text-white transition-colors">
                    Testo Semplice (.txt)
                  </button>
                  <button onClick={() => triggerExport('md')} className="w-full text-left px-3 py-1.5 rounded hover:bg-sky-500 hover:text-white transition-colors">
                    Markdown Document (.md)
                  </button>
                  <button onClick={() => triggerExport('rtf')} className="w-full text-left px-3 py-1.5 rounded hover:bg-sky-500 hover:text-white transition-colors">
                    Rich Text Format (.rtf)
                  </button>
                  <button onClick={() => triggerExport('html')} className="w-full text-left px-3 py-1.5 rounded hover:bg-sky-500 hover:text-white transition-colors">
                    Pagina Web (.html)
                  </button>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-white/10 mx-1" />

            <button
              onClick={() => setActivePanel(activePanel === 'backgrounds' ? 'none' : 'backgrounds')}
              className={`hover:bg-white/10 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activePanel === 'backgrounds' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-300 hover:text-white'
              }`}
              title="Personalizza lo sfondo"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Sfondo</span>
            </button>

            <button
              onClick={() => setActivePanel(activePanel === 'settings' ? 'none' : 'settings')}
              className={`hover:bg-white/10 px-3 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activePanel === 'settings' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'text-slate-300 hover:text-white'
              }`}
              title="Regola dimensioni e suoni"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Impostazioni</span>
            </button>
          </div>

          {/* Right Side: Drive integration status */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2 text-xs border border-green-500/30 bg-green-950/20 py-1 px-2.5 rounded-full text-green-300">
                <Cloud className="w-3.5 h-3.5 text-green-400 shrink-0" />
                <span className="hidden sm:inline font-medium">Drive Collegato</span>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium py-1 px-3 rounded flex items-center gap-1.5 shadow transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Collega Drive</span>
              </button>
            )}

            <button
              onClick={() => setShowHelpModal(true)}
              className="text-slate-400 hover:text-white p-1"
              title="Mostra Guida"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>
        </header>
        {/* Subtle hover trigger hint (dotted line) */}
        <div className="w-full h-[3px] bg-sky-500/10 opacity-0 group-hover/header:opacity-100 transition-opacity" />
      </div>

      {/* 3. MAIN CONTAINER (Centered editor window) */}
      <main className="flex-1 flex items-center justify-center p-4 md:p-8 h-full overflow-hidden">
        {/* Slidout side panels overlay container */}
        <div className="relative w-full h-full flex items-center justify-center">
          
          {/* Sliding Sidebar Panel (Left) */}
          {activePanel === 'sidebar' && (
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[82%] w-72 bg-slate-950/90 border border-white/10 rounded-xl shadow-2xl p-4 z-30 backdrop-blur-xl transition-all duration-300">
              <Sidebar
                documents={localDocs}
                currentDocId={currentDocId}
                onSelectDocument={handleSelectDocument}
                onCreateDocument={handleCreateDocument}
                onDeleteDocument={handleDeleteDocument}
                user={user}
                needsAuth={needsAuth}
                isLoggingIn={isLoggingIn}
                onLogin={handleLogin}
                onLogout={handleLogout}
                cloudDocs={cloudDocs}
                isLoadingCloud={isLoadingCloud}
                onRefreshCloud={() => token && fetchCloudFiles(token)}
                onClose={() => setActivePanel('none')}
              />
            </div>
          )}

          {/* Sliding Settings / Background Panels (Right) */}
          {activePanel === 'settings' && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[82%] w-80 bg-slate-950/90 border border-white/10 rounded-xl shadow-2xl p-4 z-30 backdrop-blur-xl transition-all duration-300">
              <SettingsPanel
                settings={settings}
                onChange={setSettings}
                onClose={() => setActivePanel('none')}
              />
            </div>
          )}

          {activePanel === 'backgrounds' && (
            <div className="absolute right-0 top-1/2 -translate-y-1/2 h-[82%] w-80 bg-slate-950/90 border border-white/10 rounded-xl shadow-2xl p-4 z-30 backdrop-blur-xl transition-all duration-300">
              <BackgroundSelector
                settings={settings}
                onChange={setSettings}
                onClose={() => setActivePanel('none')}
              />
            </div>
          )}

          {/* Primary Immersive Writing Card */}
          <div
            id="writing-container"
            className="h-full w-full max-h-[85vh] rounded-lg border border-white/10 flex flex-col overflow-hidden transition-all duration-500 shadow-2xl"
            style={{
              maxWidth: `${settings.editorWidth}px`,
              background: `rgba(15, 23, 42, ${settings.opacity})`,
              backdropFilter: `blur(${settings.blurAmount}px)`,
            }}
          >
            {/* Inline renaming & metadata title container */}
            <div className="text-center pt-6 pb-2 shrink-0 select-none">
              <input
                type="text"
                value={docName}
                onChange={(e) => handleRename(e.target.value)}
                className="bg-transparent text-center border-b border-transparent hover:border-white/20 focus:border-sky-500 text-xs font-serif italic text-slate-400 focus:outline-none focus:bg-slate-950/20 px-3 py-1 rounded transition-all max-w-[280px]"
                title="Clicca per rinominare il file"
              />
            </div>

            {/* Core Dual-layer Scrolling Editor Body */}
            <div className="flex-1 relative overflow-hidden px-8 md:px-14 pb-8">
              
              {/* Layer A: Passive underlying text highlighter (Visible only in Focus Mode) */}
              {settings.focusMode !== 'off' && (
                <div
                  ref={mirrorRef}
                  className={`absolute inset-x-8 md:inset-x-14 inset-y-0 pointer-events-none select-none overflow-hidden no-scrollbar whitespace-pre-wrap break-words leading-relaxed text-left`}
                  style={{
                    fontFamily: settings.fontFamily === 'serif' ? 'Lora, Georgia, serif' : settings.fontFamily === 'sans' ? 'Inter, sans-serif' : 'JetBrains Mono, monospace',
                    fontSize: `${settings.fontSize}px`,
                    lineHeight: settings.lineHeight,
                  }}
                >
                  {renderMirrorContent()}
                </div>
              )}

              {/* Layer B: Active transparent textarea (Receives inputs, scrolling, cursors) */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleTextChange}
                onScroll={handleScroll}
                onKeyDown={handleKeyDown}
                onSelect={handleSelectionChange}
                className={`w-full h-full bg-transparent resize-none border-none outline-none overflow-y-auto pr-2 pb-12 leading-relaxed text-left focus:ring-0`}
                placeholder="Inizia a comporre la tua opera qui..."
                style={{
                  fontFamily: settings.fontFamily === 'serif' ? 'Lora, Georgia, serif' : settings.fontFamily === 'sans' ? 'Inter, sans-serif' : 'JetBrains Mono, monospace',
                  fontSize: `${settings.fontSize}px`,
                  lineHeight: settings.lineHeight,
                  color: settings.focusMode !== 'off' ? 'transparent' : 'rgba(255, 255, 255, 0.85)',
                  caretColor: '#38bdf8',
                }}
              />
            </div>
          </div>
        </div>
      </main>

      {/* 4. AUTO-HIDE FOOTER (Displays stats and sync status on bottom 60px hover) */}
      <div className="absolute bottom-0 left-0 right-0 h-16 group/footer z-40">
        <footer className={`w-full h-full bg-gradient-to-t from-slate-950/90 to-transparent flex items-center justify-between px-8 transition-all duration-500 transform ${mobileMenuOpen ? 'translate-y-0' : 'translate-y-full'} group-hover/footer:translate-y-0 backdrop-blur-[2px]`}>
          
          {/* Left stats: Counts */}
          <div className="text-slate-400 font-mono text-xs flex items-center gap-4">
            <span>{wordCount} {wordCount === 1 ? 'Parola' : 'Parole'}</span>
            <span className="text-slate-600">|</span>
            <span>{charCount} {charCount === 1 ? 'Carattere' : 'Caratteri'}</span>
          </div>

          {/* Middle: Goal meter */}
          <div className="flex items-center gap-3 max-w-xs w-full justify-center">
            <span className="text-[10px] font-mono text-slate-400">Progresso</span>
            <div className="w-36 bg-white/10 h-1.5 rounded-full overflow-hidden shadow">
              <div 
                className={`h-full transition-all duration-500 rounded-full ${progressPercent >= 100 ? 'bg-emerald-400 animate-pulse' : 'bg-sky-400'}`} 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-[10px] font-mono font-medium text-slate-300">
              {wordCount} / {settings.dailyGoal} ({progressPercent}%)
            </span>
          </div>

          {/* Right stats: Time & Synced State */}
          <div className="flex items-center gap-6 text-slate-400 font-mono text-xs">
            {/* Sync status */}
            <div className="flex items-center gap-2">
              {saveStatus === 'saving' && (
                <>
                  <RefreshCw className="w-3 h-3 text-sky-400 animate-spin" />
                  <span className="text-[10px] text-sky-400">Salvataggio...</span>
                </>
              )}
              {saveStatus === 'saved' && (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow shadow-emerald-400" />
                  <span className="text-[10px] text-emerald-400">Sincronizzato</span>
                </>
              )}
              {saveStatus === 'error' && (
                <>
                  <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                  <span className="text-[10px] text-red-400">Errore Sincronizzazione</span>
                </>
              )}
              {saveStatus === 'idle' && (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                  <span className="text-[10px] text-slate-400">In attesa</span>
                </>
              )}
            </div>

            <div className="text-slate-600">|</div>

            {/* Time ticker */}
            <div className="flex items-center gap-1.5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{currentTime}</span>
            </div>
          </div>
        </footer >
        {/* Subtle hover trigger hint (dotted line) */}
        <div className="w-full h-[3px] bg-sky-500/10 opacity-0 group-hover/footer:opacity-100 transition-opacity" />
      </div >

      {/* 5. USER WELCOME GUIDE MODAL */}
      {showHelpModal && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center p-4 z-50 backdrop-blur-md">
          <div className="bg-slate-900/95 border border-white/10 max-w-md w-full rounded-2xl shadow-2xl p-6 text-slate-200">
            <h3 className="text-lg font-serif italic text-white text-center mb-4 flex items-center justify-center gap-2">
              <BookOpen className="w-5 h-5 text-sky-400" />
              Scrittura Immersiva Silente
            </h3>
            
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              FocusWriter è uno spazio puro per i tuoi pensieri. Per darti il massimo isolamento e allontanare ogni distrazione visiva, abbiamo nascosto tutti i menu.
              <span className={`block mt-1.5 text-sky-300 font-medium ${isTouchDevice ? 'block' : 'md:hidden'}`}>Su smartphone e tablet, puoi usare il pulsante fluttuante (☰) in alto a destra per mostrare o nascondere i menu in qualsiasi momento.</span>
            </p>

            <div className="space-y-3.5 text-xs mb-6 pl-1">
              <div className="flex gap-3">
                <div className="bg-sky-500/10 p-1.5 rounded text-sky-400 shrink-0 h-8 w-8 flex items-center justify-center">
                  <Layout className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-100">Bordo Superiore</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Sposta il mouse in alto per gestire i file, l'esportazione, gli sfondi e le impostazioni.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-sky-500/10 p-1.5 rounded text-sky-400 shrink-0 h-8 w-8 flex items-center justify-center">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-100">Bordo Inferiore</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Sposta il mouse in basso per vedere il conteggio parole, l'ora ed il traguardo quotidiano.</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="bg-sky-500/10 p-1.5 rounded text-sky-400 shrink-0 h-8 w-8 flex items-center justify-center">
                  <Volume2 className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-100">Suoni e Trasparenza</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">Regola il volume dei tasti meccanici ed il livello di sfocatura dello sfondo dalle impostazioni.</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setShowHelpModal(false);
                // Trigger quick click sound to register AudioContext
                if (settings.soundEnabled) soundManager.playClick(' ');
              }}
              className="w-full bg-sky-600 hover:bg-sky-500 text-white font-medium py-2 rounded-lg text-xs transition-colors flex items-center justify-center gap-1.5 shadow"
            >
              <Play className="w-3.5 h-3.5" />
              Inizia a Scrivere
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
