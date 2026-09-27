import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Plus, Folder, Save, Download, Sparkles, Settings, Cloud, 
  HelpCircle, Clock, BookOpen, Check, AlertCircle, RefreshCw,
  Layout, Eye, Sliders, Play, HardDrive, LogIn, Volume2,
  Menu, X, Maximize2, Minimize2, Undo, Redo, Pause, Square,
  Mic, MicOff, ChevronDown, FileText, LogOut, SpellCheck
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
import SpellCheckPanel from './components/SpellCheckPanel';
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
  editorBgColor: '#0f172a',
  typewriterMode: false,
  rememberLastFile: true,
};

export default function App() {
  // Application Settings
  const [settings, setSettings] = useState<DocumentSettings>(() => {
    const saved = localStorage.getItem('focuswriter_settings');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Merge with defaults to ensure any new keys like typewriterMode are present
        const merged = { ...DEFAULT_SETTINGS, ...parsed };
        // Sync to SoundManager
        soundManager.enabled = merged.soundEnabled;
        soundManager.volume = merged.soundVolume;
        soundManager.soundType = merged.soundType;
        return merged;
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
  const [activePanel, setActivePanel] = useState<'none' | 'sidebar' | 'settings' | 'backgrounds' | 'spellcheck'>('none');
  const [nativeSpellCheck, setNativeSpellCheck] = useState<boolean>(true);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(true);
  const [currentTime, setCurrentTime] = useState('');
  const [isReading, setIsReading] = useState(false);
  const [isSpeakingPaused, setIsSpeakingPaused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // File Menu State & Ref
  const [isFileMenuOpen, setIsFileMenuOpen] = useState(false);
  const fileMenuRef = useRef<HTMLDivElement>(null);

  // Voice Dictation State & Ref
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Handle click outside File Menu to close it
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fileMenuRef.current && !fileMenuRef.current.contains(e.target as Node)) {
        setIsFileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Undo / Redo states & refs
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [redoStack, setRedoStack] = useState<string[]>([]);
  const lastHistoryContentRef = useRef<string>('');
  const lastPushTimeRef = useRef<number>(0);
  const debounceTimeoutRef = useRef<any>(null);

  // Reset Undo/Redo tracking on document change
  useEffect(() => {
    setUndoStack([]);
    setRedoStack([]);
    lastHistoryContentRef.current = content;
    lastPushTimeRef.current = Date.now();
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }
  }, [currentDocId]);

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

    // Fullscreen change listener
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

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
    const wasClosedOnExit = localStorage.getItem('focuswriter_closed_on_exit') === 'true';

    const savedSettings = localStorage.getItem('focuswriter_settings');
    let shouldLoadLastFile = true;
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings);
        if (parsedSettings.rememberLastFile === false) {
          shouldLoadLastFile = false;
        }
      } catch (e) {}
    }

    if (savedDocs) {
      try {
        const parsed = JSON.parse(savedDocs) as WritingDocument[];
        setLocalDocs(parsed);
        // Set the default or first document if allowed and not closed on exit
        if (parsed.length > 0) {
          if (shouldLoadLastFile && !wasClosedOnExit) {
            const defaultDoc = parsed[0];
            setCurrentDocId(defaultDoc.id);
            setDocName(defaultDoc.name);
            setContent(defaultDoc.content);
            setIsCloudDoc(false);
          } else {
            setCurrentDocId('');
            setDocName('');
            setContent('');
          }
        } else {
          if (shouldLoadLastFile && !wasClosedOnExit) {
            createDefaultLocalDoc();
          } else {
            setCurrentDocId('');
            setDocName('');
            setContent('');
          }
        }
      } catch (e) {
        if (shouldLoadLastFile && !wasClosedOnExit) {
          createDefaultLocalDoc();
        } else {
          setCurrentDocId('');
          setDocName('');
          setContent('');
        }
      }
    } else {
      if (shouldLoadLastFile && !wasClosedOnExit) {
        createDefaultLocalDoc();
      } else {
        setCurrentDocId('');
        setDocName('');
        setContent('');
      }
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
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
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
      content: 'Benvenuto in Lele Writer.\n\nQuesto è uno spazio di scrittura minimalista e senza distrazioni progettato per aiutarti a concentrarti.\n\nSposta il mouse sul BORDO SUPERIORE per rivelare la barra dei menu con opzioni di salvataggio, esportazione e design.\n\nSposta il mouse sul BORDO INFERIORE per consultare le statistiche del testo (parole, caratteri) e impostare il tuo traguardo giornaliero.\n\nPuoi scegliere sfondi diversi, cambiare tipo di carattere, regolare la trasparenza e attivare rilassanti suoni di tastiere meccaniche o macchine da scrivere storiche.\n\nCollega Google Drive per salvare i tuoi testi direttamente nel Cloud ed evitare qualsiasi perdita di dati.',
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
  const handleUndo = () => {
    // Commit any uncommitted typing changes first
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    let currentUndoStack = undoStack;
    let activeLastContent = lastHistoryContentRef.current;

    if (activeLastContent !== content) {
      // Commit current state before undoing
      currentUndoStack = [...undoStack, activeLastContent];
      setUndoStack(currentUndoStack);
      activeLastContent = content;
      lastHistoryContentRef.current = content;
    }

    if (currentUndoStack.length === 0) return;

    const prevContent = currentUndoStack[currentUndoStack.length - 1];
    const newUndoStack = currentUndoStack.slice(0, -1);
    
    setUndoStack(newUndoStack);
    setRedoStack(prev => [...prev, content]);
    
    setContent(prevContent);
    lastHistoryContentRef.current = prevContent;
    lastPushTimeRef.current = Date.now();

    // Keep focus and scroll sync
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      handleScroll();
    }, 10);
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    const nextContent = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);

    setUndoStack(prev => [...prev, content]);
    setRedoStack(newRedoStack);
    
    setContent(nextContent);
    lastHistoryContentRef.current = nextContent;
    lastPushTimeRef.current = Date.now();

    // Keep focus and scroll sync
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
      handleScroll();
    }, 10);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    const prevContent = content;
    setContent(newContent);
    setSelectionStart(e.target.selectionStart);
    
    // Auto sync scroll on typing
    if (settings.typewriterMode) {
      syncTypewriterScroll();
    } else {
      setTimeout(handleScroll, 10);
    }

    // Auto-hide mobile menu when starting to type
    if (mobileMenuOpen) {
      setMobileMenuOpen(false);
    }

    // Undo / Redo grouping and debouncing
    const now = Date.now();
    const isSpaceOrNewline = newContent.endsWith(' ') || newContent.endsWith('\n');
    const isBigChange = Math.abs(newContent.length - lastHistoryContentRef.current.length) > 2;
    const isTimeElapsed = now - lastPushTimeRef.current > 2000;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (isSpaceOrNewline || isBigChange || isTimeElapsed) {
      if (lastHistoryContentRef.current !== prevContent) {
        setUndoStack(prev => [...prev, lastHistoryContentRef.current]);
        setRedoStack([]);
        lastHistoryContentRef.current = prevContent;
      }
      lastPushTimeRef.current = now;
    }

    // Debounce state saving
    debounceTimeoutRef.current = setTimeout(() => {
      if (lastHistoryContentRef.current !== newContent) {
        setUndoStack(prev => [...prev, lastHistoryContentRef.current]);
        setRedoStack([]);
        lastHistoryContentRef.current = newContent;
      }
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Detect Save shortcut
    const isSave = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's';
    // Detect Undo/Redo shortcuts
    const isUndo = (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey;
    const isRedo = ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') || 
                   ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && e.shiftKey);

    if (isSave) {
      e.preventDefault();
      handleManualSave();
      return;
    }
    if (isUndo) {
      e.preventDefault();
      handleUndo();
      return;
    }
    if (isRedo) {
      e.preventDefault();
      handleRedo();
      return;
    }

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
    if (settings.typewriterMode) {
      syncTypewriterScroll();
    }
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
  
  // Toggle Fullscreen mode
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Errore nel cambio schermo intero:', err);
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
      setTimeout(() => setSaveStatus('saved'), 400);
    }
  };

  // Web Speech API - Read Aloud function
  const handleReadAloud = () => {
    if (!('speechSynthesis' in window)) {
      alert('La sintesi vocale non è supportata dal tuo browser.');
      return;
    }

    if (isReading) {
      window.speechSynthesis.cancel();
      setIsReading(false);
      setIsSpeakingPaused(false);
    } else {
      if (!content.trim()) {
        alert('Non c\'è testo da leggere.');
        return;
      }
      
      window.speechSynthesis.cancel();

      // Clean HTML tags if any (just in case) or read text directly
      const textToRead = content;
      const utterance = new SpeechSynthesisUtterance(textToRead);
      
      // Select Italian voice
      const voices = window.speechSynthesis.getVoices();
      const italianVoice = voices.find(voice => voice.lang.startsWith('it'));
      if (italianVoice) {
        utterance.voice = italianVoice;
      }
      utterance.lang = 'it-IT';

      utterance.onend = () => {
        setIsReading(false);
        setIsSpeakingPaused(false);
      };

      utterance.onerror = () => {
        setIsReading(false);
        setIsSpeakingPaused(false);
      };

      window.speechSynthesis.speak(utterance);
      setIsReading(true);
      setIsSpeakingPaused(false);
    }
  };

  const handlePauseResumeSpeech = () => {
    if (!('speechSynthesis' in window)) return;
    if (isSpeakingPaused) {
      window.speechSynthesis.resume();
      setIsSpeakingPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsSpeakingPaused(true);
    }
  };

  // Voice Dictation (Dettatura Vocale) with Web Speech API
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("La dettatura vocale non è supportata da questo browser. Usa Google Chrome o Microsoft Edge.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'it-IT';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript;
        if (transcript && transcript.trim()) {
          setContent(prev => {
            // Save state for undo
            setUndoStack(u => [...u, prev]);
            setRedoStack([]);

            const space = prev.length > 0 && !prev.endsWith(' ') && !prev.endsWith('\n') ? ' ' : '';
            return prev + space + transcript;
          });
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Errore riconoscimento vocale:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.error('Riconoscimento vocale fallito:', err);
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const toggleListening = () => {
    if (!currentDocId) {
      alert("Devi prima aprire o creare un documento per poter dettare.");
      return;
    }
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Turn off listening on document change
  useEffect(() => {
    if (isListening) {
      stopListening();
    }
  }, [currentDocId]);

  // Stop reading when changing documents
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentDocId]);

  // Typewriter Mode scroll alignment
  const syncTypewriterScroll = () => {
    if (!textareaRef.current) return;
    const textarea = textareaRef.current;
    
    setTimeout(() => {
      const textBeforeCaret = textarea.value.substring(0, textarea.selectionStart);
      const lines = textBeforeCaret.split('\n');
      const lineCountBefore = lines.length;
      
      const lineHeightPx = settings.fontSize * settings.lineHeight;
      const textareaHeight = textarea.clientHeight || 400;
      
      const targetScrollTop = Math.max(0, (lineCountBefore - 1) * lineHeightPx - (textareaHeight / 2) + (lineHeightPx / 2));
      
      textarea.scrollTop = targetScrollTop;
      if (mirrorRef.current) {
        mirrorRef.current.scrollTop = targetScrollTop;
      }
    }, 0);
  };

  // Close the active document
  const handleCloseDocument = () => {
    if (currentDocId) {
      if (!isCloudDoc) {
        // Save local
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
      }
    }
    
    // Set to closed empty state
    setCurrentDocId('');
    setDocName('');
    setContent('');
    setIsCloudDoc(false);
    localStorage.setItem('focuswriter_closed_on_exit', 'true');
  };

  // Sync Typewriter Scroll on mode toggle
  useEffect(() => {
    if (settings.typewriterMode) {
      syncTypewriterScroll();
    }
  }, [settings.typewriterMode]);

  // Change currently loaded document
  const handleSelectDocument = async (docId: string, selectFromCloud: boolean) => {
    localStorage.removeItem('focuswriter_closed_on_exit');
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
    localStorage.removeItem('focuswriter_closed_on_exit');
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

      let spanStyle: React.CSSProperties = {
        color: settings.textColor || 'rgba(255, 255, 255, 0.85)',
        transition: 'opacity 300ms',
      };

      if (settings.focusMode === 'paragraph' || settings.focusMode === 'line') {
        if (isCurrent) {
          spanStyle.opacity = 1;
          spanStyle.fontWeight = '500';
        } else {
          spanStyle.opacity = 0.15;
        }
      } else {
        spanStyle.opacity = 1;
      }

      return (
        <span key={index} style={spanStyle}>
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

  // Helper to convert hex to RGB
  const hexToRgb = (hex: string): string => {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    const fullHex = hex.replace(shorthandRegex, (_, r, g, b) => r + r + g + g + b + b);
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(fullHex);
    return result
      ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
      : '56, 189, 248';
  };

  // Helper to get hover color (slightly darker for buttons)
  const getHoverColor = (hex: string): string => {
    const rgbString = hexToRgb(hex);
    const parts = rgbString.split(',').map(x => Math.max(0, Math.floor(parseInt(x.trim(), 10) * 0.85)));
    return `rgb(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  };

  const currentThemeColor = settings.themeColor || '#38bdf8';
  const themeRgb = hexToRgb(currentThemeColor);

  return (
    <div 
      className="relative w-full h-screen overflow-hidden flex flex-col transition-all duration-700"
      style={mainBackgroundStyle}
      id="focuswriter-container"
    >
      <style>{`
        :root {
          --theme-color: ${currentThemeColor};
          --theme-color-hover: ${getHoverColor(currentThemeColor)};
          --theme-rgb: ${themeRgb};
        }
        
        /* Direct overrides of tailwind utility classes for theme colors */
        .text-sky-400 {
          color: var(--theme-color) !important;
        }
        .text-sky-300 {
          color: rgba(var(--theme-rgb), 0.9) !important;
        }
        .bg-sky-600 {
          background-color: var(--theme-color) !important;
        }
        .bg-sky-700 {
          background-color: var(--theme-color) !important;
        }
        .hover\\:bg-sky-500:hover {
          background-color: var(--theme-color-hover) !important;
        }
        .hover\\:bg-sky-600:hover {
          background-color: var(--theme-color-hover) !important;
        }
        .bg-sky-500\\/10 {
          background-color: rgba(var(--theme-rgb), 0.1) !important;
        }
        .bg-sky-500\\/20 {
          background-color: rgba(var(--theme-rgb), 0.2) !important;
        }
        .border-sky-500 {
          border-color: var(--theme-color) !important;
        }
        .focus\\:border-sky-500:focus {
          border-color: var(--theme-color) !important;
        }
        .accent-sky-400 {
          accent-color: var(--theme-color) !important;
        }
        .bg-sky-400 {
          background-color: var(--theme-color) !important;
        }
        .bg-sky-950\\/20 {
          background-color: rgba(var(--theme-rgb), 0.08) !important;
        }
        .bg-sky-950\\/40 {
          background-color: rgba(var(--theme-rgb), 0.16) !important;
        }
        .peer:checked ~ .peer-checked\\:bg-sky-500 {
          background-color: var(--theme-color) !important;
        }
        .focus\\:ring-sky-500\\/50:focus {
          --tw-ring-color: rgba(var(--theme-rgb), 0.5) !important;
        }
      `}</style>

      {/* 1. ATMOSPHERE LIGHT EFFECTS OVERLAYS */}
      <div className="absolute inset-0 bg-black/10 pointer-events-none" />
      <div 
        className="absolute inset-0 pointer-events-none" 
        style={{
          background: `radial-gradient(circle at 30% 30%, rgba(${themeRgb}, 0.06) 0%, transparent 50%)`
        }} 
      />
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
        <header className={`w-full h-full bg-gradient-to-b from-slate-950/90 to-transparent flex items-center justify-between px-6 transition-all duration-500 transform ${mobileMenuOpen || activePanel !== 'none' ? 'translate-y-0' : '-translate-y-full'} group-hover/header:translate-y-0 focus-within:translate-y-0 backdrop-blur-[2px]`}>
          {/* App title */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-sky-400 tracking-wider text-xs font-semibold uppercase">
              Lele Writer
            </span>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1">
            {/* FILE MENU DROPDOWN */}
            <div className="relative" ref={fileMenuRef}>
              <button
                onClick={() => setIsFileMenuOpen(!isFileMenuOpen)}
                className={`hover:bg-white/10 text-slate-300 hover:text-white px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                  isFileMenuOpen ? 'bg-white/10 text-white font-bold' : ''
                }`}
                title="Menu File"
              >
                <span>File</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isFileMenuOpen ? 'rotate-180 text-sky-400' : 'text-slate-400'}`} />
              </button>

              {isFileMenuOpen && (
                <div className="absolute top-full mt-1.5 left-0 bg-slate-950/95 border border-white/10 rounded-lg shadow-2xl p-1.5 w-56 z-50 text-xs text-slate-200 backdrop-blur-md animate-in fade-in slide-in-from-top-1 duration-150 font-sans">
                  {/* Nuovo Locale */}
                  <button
                    onClick={() => {
                      handleCreateDocument(false);
                      setIsFileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-sky-600 hover:text-white flex items-center gap-2 transition-colors cursor-pointer text-slate-300"
                  >
                    <Plus className="w-3.5 h-3.5 text-sky-400" />
                    <span>Nuovo File Locale</span>
                  </button>

                  {/* Nuovo su Drive */}
                  <button
                    onClick={() => {
                      if (!user) {
                        handleLogin();
                      } else {
                        handleCreateDocument(true);
                      }
                      setIsFileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-sky-600 hover:text-white flex items-center justify-between transition-colors cursor-pointer text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <Cloud className="w-3.5 h-3.5 text-sky-400" />
                      <span>Nuovo File su Drive</span>
                    </div>
                    {!user && <span className="text-[10px] text-slate-500 font-light font-mono">Connetti</span>}
                  </button>

                  <div className="h-px bg-white/10 my-1" />

                  {/* Miei Documenti */}
                  <button
                    onClick={() => {
                      setActivePanel(activePanel === 'sidebar' ? 'none' : 'sidebar');
                      setIsFileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 transition-colors cursor-pointer text-slate-300 ${
                      activePanel === 'sidebar' ? 'bg-sky-500/20 text-sky-300 font-medium' : 'hover:bg-sky-600 hover:text-white'
                    }`}
                  >
                    <Folder className="w-3.5 h-3.5 text-sky-400" />
                    <span>I Miei Documenti</span>
                  </button>

                  <div className="h-px bg-white/10 my-1" />

                  {/* Salva */}
                  <button
                    disabled={!currentDocId}
                    onClick={() => {
                      handleManualSave();
                      setIsFileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 transition-colors ${
                      !currentDocId 
                        ? 'text-slate-600 cursor-not-allowed opacity-55' 
                        : 'hover:bg-sky-600 hover:text-white cursor-pointer text-slate-300'
                    }`}
                  >
                    <Save className={`w-3.5 h-3.5 ${currentDocId ? 'text-sky-400' : 'text-slate-600'}`} />
                    <span>Salva</span>
                  </button>

                  <div className="h-px bg-white/10 my-1" />

                  {/* Esporta Subheading */}
                  <div className="px-3 py-1 text-[10px] uppercase text-slate-500 font-mono tracking-wider font-semibold">
                    Esporta come...
                  </div>
                  <button
                    disabled={!content.trim()}
                    onClick={() => {
                      triggerExport('txt');
                      setIsFileMenuOpen(false);
                    }}
                    className="w-full text-left px-5 py-1.5 rounded hover:bg-sky-600 hover:text-white flex items-center gap-2 transition-colors cursor-pointer text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>Testo Semplice (.txt)</span>
                  </button>
                  <button
                    disabled={!content.trim()}
                    onClick={() => {
                      triggerExport('md');
                      setIsFileMenuOpen(false);
                    }}
                    className="w-full text-left px-5 py-1.5 rounded hover:bg-sky-600 hover:text-white flex items-center gap-2 transition-colors cursor-pointer text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>Markdown (.md)</span>
                  </button>
                  <button
                    disabled={!content.trim()}
                    onClick={() => {
                      triggerExport('rtf');
                      setIsFileMenuOpen(false);
                    }}
                    className="w-full text-left px-5 py-1.5 rounded hover:bg-sky-600 hover:text-white flex items-center gap-2 transition-colors cursor-pointer text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>Rich Text (.rtf)</span>
                  </button>
                  <button
                    disabled={!content.trim()}
                    onClick={() => {
                      triggerExport('html');
                      setIsFileMenuOpen(false);
                    }}
                    className="w-full text-left px-5 py-1.5 rounded hover:bg-sky-600 hover:text-white flex items-center gap-2 transition-colors cursor-pointer text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <FileText className="w-3 h-3 text-slate-400" />
                    <span>Pagina Web (.html)</span>
                  </button>

                  <div className="h-px bg-white/10 my-1" />

                  {/* Leggi / Sintesi Vocale */}
                  <button
                    onClick={() => {
                      handleReadAloud();
                      setIsFileMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-sky-600 hover:text-white flex items-center gap-2 transition-colors cursor-pointer text-slate-300"
                  >
                    {isReading ? (
                      <>
                        <Square className="w-3.5 h-3.5 text-red-400 fill-red-400/10" />
                        <span>Ferma Lettura</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-sky-400 fill-sky-400/10" />
                        <span>Leggi ad alta voce</span>
                      </>
                    )}
                  </button>

                  <div className="h-px bg-white/10 my-1" />

                  {/* Chiudi */}
                  <button
                    disabled={!currentDocId}
                    onClick={() => {
                      handleCloseDocument();
                      setIsFileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md flex items-center gap-2 transition-colors ${
                      !currentDocId 
                        ? 'text-slate-600 cursor-not-allowed opacity-55' 
                        : 'hover:bg-red-600 hover:text-white cursor-pointer text-slate-300'
                    }`}
                  >
                    <X className={`w-3.5 h-3.5 ${currentDocId ? 'text-red-400' : 'text-slate-600'}`} />
                    <span>Chiudi file attivo</span>
                  </button>
                </div>
              )}
            </div>

            <div className="w-px h-5 bg-white/10 mx-1" />

            {/* ANNULLA & RIPRISTINA */}
            <button
              onClick={handleUndo}
              disabled={undoStack.length === 0 && lastHistoryContentRef.current === content}
              className={`hover:bg-white/10 px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                (undoStack.length === 0 && lastHistoryContentRef.current === content)
                  ? 'text-slate-600 opacity-40 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white cursor-pointer'
              }`}
              title="Annulla ultima scrittura (Ctrl+Z)"
            >
              <Undo className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Annulla</span>
            </button>

            <button
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className={`hover:bg-white/10 px-2.5 py-1.5 rounded text-xs font-semibold flex items-center gap-1 transition-all ${
                redoStack.length === 0
                  ? 'text-slate-600 opacity-40 cursor-not-allowed'
                  : 'text-slate-300 hover:text-white cursor-pointer'
              }`}
              title="Ripristina modifiche annullate (Ctrl+Y)"
            >
              <Redo className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Ripristina</span>
            </button>

            <div className="w-px h-5 bg-white/10 mx-1" />

            {/* DETTATURA VOCALE (Voice Dictation) */}
            <button
              onClick={toggleListening}
              className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                isListening
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 animate-pulse font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer'
              }`}
              title={isListening ? "Ferma dettatura vocale" : "Avvia dettatura vocale"}
            >
              {isListening ? (
                <>
                  <MicOff className="w-3.5 h-3.5 text-red-400" />
                  <span>Dettatura in corso...</span>
                </>
              ) : (
                <>
                  <Mic className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
                  <span>Dettatura</span>
                </>
              )}
            </button>

            <div className="w-px h-5 bg-white/10 mx-1" />

            {/* CORRETTORE ORTOGRAFICO (Spellchecker) */}
            <button
              onClick={() => setActivePanel(activePanel === 'spellcheck' ? 'none' : 'spellcheck')}
              className={`hover:bg-white/10 px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activePanel === 'spellcheck' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold' : 'text-slate-300 hover:text-white'
              }`}
              title="Analizza ed evidenzia errori ortografici"
            >
              <SpellCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Ortografia</span>
            </button>

            <div className="w-px h-5 bg-white/10 mx-1" />

            {/* IMPOSTAZIONI */}
            <button
              onClick={() => setActivePanel(activePanel === 'settings' ? 'none' : 'settings')}
              className={`hover:bg-white/10 px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activePanel === 'settings' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold' : 'text-slate-300 hover:text-white'
              }`}
              title="Regola dimensioni, sfondi e colori"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Impostazioni</span>
            </button>

            {/* SCHERMO INTERO */}
            <button
              onClick={toggleFullscreen}
              className="hover:bg-white/10 px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors text-slate-300 hover:text-white cursor-pointer"
              title={isFullscreen ? "Esci da Schermo Intero" : "Schermo Intero"}
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 text-sky-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isFullscreen ? 'Schermo Normale' : 'Schermo Intero'}</span>
            </button>
          </div>

          {/* Right Side: Drive integration status */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs border border-green-500/30 bg-green-950/20 py-1 px-2.5 rounded-full text-green-300">
                  <Cloud className="w-3.5 h-3.5 text-green-400 shrink-0" />
                  <span className="hidden sm:inline font-semibold">Drive Collegato</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-white/5 transition-colors cursor-pointer"
                  title="Scollega Google Drive"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleLogin}
                disabled={isLoggingIn}
                className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold py-1 px-3 rounded flex items-center gap-1.5 shadow transition-colors cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Collega Drive</span>
              </button>
            )}

            <button
              onClick={() => setShowHelpModal(true)}
              className="text-slate-400 hover:text-white p-1 cursor-pointer"
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
          
          <AnimatePresence mode="popLayout">
            {/* Sliding Sidebar Panel (Left) */}
            {activePanel === 'sidebar' && (
              <motion.div 
                key="sidebar-panel"
                initial={{ opacity: 0, x: -120, y: '-50%' }}
                animate={{ opacity: 1, x: 0, y: '-50%' }}
                exit={{ opacity: 0, x: -120, y: '-50%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 190 }}
                className="absolute left-0 top-1/2 h-[82%] w-72 bg-slate-950/90 border border-white/10 rounded-xl shadow-2xl p-4 z-30 backdrop-blur-xl"
              >
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
              </motion.div>
            )}

            {/* Sliding Settings / Background Panels (Right) */}
            {activePanel === 'settings' && (
              <motion.div 
                key="settings-panel"
                initial={{ opacity: 0, x: 120, y: '-50%' }}
                animate={{ opacity: 1, x: 0, y: '-50%' }}
                exit={{ opacity: 0, x: 120, y: '-50%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 190 }}
                className="absolute right-0 top-1/2 h-[82%] w-80 bg-slate-950/90 border border-white/10 rounded-xl shadow-2xl p-4 z-30 backdrop-blur-xl"
              >
                <SettingsPanel
                  settings={settings}
                  onChange={setSettings}
                  onClose={() => setActivePanel('none')}
                  isFullscreen={isFullscreen}
                  onToggleFullscreen={toggleFullscreen}
                />
              </motion.div>
            )}

            {/* Sliding Spell Check Panel (Right) */}
            {activePanel === 'spellcheck' && (
              <motion.div 
                key="spellcheck-panel"
                initial={{ opacity: 0, x: 120, y: '-50%' }}
                animate={{ opacity: 1, x: 0, y: '-50%' }}
                exit={{ opacity: 0, x: 120, y: '-50%' }}
                transition={{ type: 'spring', damping: 26, stiffness: 190 }}
                className="absolute right-0 top-1/2 h-[82%] w-80 bg-slate-950/90 border border-white/10 rounded-xl shadow-2xl p-4 z-30 backdrop-blur-xl"
              >
                <SpellCheckPanel
                  content={content}
                  onChangeContent={(newContent) => {
                    setUndoStack(prev => [...prev, content]);
                    setRedoStack([]);
                    setContent(newContent);
                  }}
                  onClose={() => setActivePanel('none')}
                  nativeSpellCheck={nativeSpellCheck}
                  onToggleNativeSpellCheck={setNativeSpellCheck}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Primary Immersive Writing Card */}
          <div
            id="writing-container"
            className="h-full w-full max-h-[85vh] rounded-lg border border-white/10 flex flex-col overflow-hidden transition-all duration-500 shadow-2xl"
            style={{
              maxWidth: `${settings.editorWidth}px`,
              background: `rgba(${hexToRgb(settings.editorBgColor || '#0f172a')}, ${settings.opacity})`,
              backdropFilter: `blur(${settings.blurAmount}px)`,
            }}
          >
            {!currentDocId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 md:p-14 select-none">
                {/* Subtle themed glowing backdrop under the icon */}
                <div 
                  className="relative flex items-center justify-center w-16 h-16 rounded-full mb-6 transition-all duration-700"
                  style={{
                    background: `radial-gradient(circle, rgba(${themeRgb}, 0.15) 0%, rgba(${themeRgb}, 0.02) 70%)`,
                    border: `1px solid rgba(${themeRgb}, 0.18)`
                  }}
                >
                  <BookOpen className="w-6 h-6" style={{ color: settings.themeColor }} />
                  <div 
                    className="absolute inset-0 rounded-full blur-md opacity-40 animate-pulse pointer-events-none"
                    style={{ backgroundColor: settings.themeColor }}
                  />
                </div>

                <h2 className="text-xl font-serif text-slate-100 tracking-wide font-light mb-2">Lo spazio della tua scrittura</h2>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed mb-8 font-light">
                  Crea un nuovo documento locale o collegati a Google Drive per iniziare a comporre i tuoi pensieri in un ambiente intimo e privo di distrazioni.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-xs sm:max-w-md justify-center">
                  <button
                    onClick={() => handleCreateDocument(false)}
                    className="w-full sm:w-auto px-5 py-2.5 rounded text-white font-medium text-xs flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-lg hover:shadow-xl cursor-pointer font-mono tracking-wide"
                    style={{ 
                      backgroundColor: settings.themeColor,
                      boxShadow: `0 4px 14px rgba(${themeRgb}, 0.25)`
                    }}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Nuovo File Locale</span>
                  </button>
                  
                  {user && (
                    <button
                      onClick={() => handleCreateDocument(true)}
                      className="w-full sm:w-auto px-5 py-2.5 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 transition-all active:scale-95 cursor-pointer font-mono tracking-wide"
                    >
                      <Cloud className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Nuovo su Drive</span>
                    </button>
                  )}
                  
                  <button
                    onClick={() => setActivePanel('sidebar')}
                    className="w-full sm:w-auto px-5 py-2.5 rounded bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-medium text-xs flex items-center justify-center gap-2 border border-white/10 hover:border-white/20 transition-all active:scale-95 cursor-pointer font-mono tracking-wide"
                  >
                    <Folder className="w-3.5 h-3.5" style={{ color: settings.themeColor }} />
                    <span>I Miei Documenti</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
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
                        paddingBottom: settings.typewriterMode ? '40vh' : '3rem',
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
                    spellCheck={nativeSpellCheck}
                    className={`w-full h-full bg-transparent resize-none border-none outline-none overflow-y-auto pr-2 leading-relaxed text-left focus:ring-0`}
                    placeholder="Inizia a comporre la tua opera qui..."
                    style={{
                      fontFamily: settings.fontFamily === 'serif' ? 'Lora, Georgia, serif' : settings.fontFamily === 'sans' ? 'Inter, sans-serif' : 'JetBrains Mono, monospace',
                      fontSize: `${settings.fontSize}px`,
                      lineHeight: settings.lineHeight,
                      color: settings.focusMode !== 'off' ? 'transparent' : (settings.textColor || 'rgba(255, 255, 255, 0.85)'),
                      caretColor: settings.themeColor,
                      paddingBottom: settings.typewriterMode ? '40vh' : '3rem',
                    }}
                  />
                </div>
              </>
            )}
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
              Lele Writer è uno spazio puro per i tuoi pensieri. Per darti il massimo isolamento e allontanare ogni distrazione visiva, abbiamo nascosto tutti i menu.
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
