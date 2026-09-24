import { useState, useEffect } from 'react';
import { 
  Folder, FolderOpen, Search, Plus, Cloud, FileText, Trash2, 
  RefreshCw, LogIn, LogOut, Check, HardDrive 
} from 'lucide-react';
import { WritingDocument } from '../types';
import { User } from 'firebase/auth';

interface SidebarProps {
  documents: WritingDocument[];
  currentDocId: string;
  onSelectDocument: (docId: string, isCloud: boolean) => void;
  onCreateDocument: (isCloud: boolean) => void;
  onDeleteDocument: (docId: string, isCloud: boolean) => void;
  
  // Google Auth & Drive Props
  user: User | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  onLogin: () => void;
  onLogout: () => void;
  cloudDocs: any[];
  isLoadingCloud: boolean;
  onRefreshCloud: () => void;
  onClose: () => void;
}

export default function Sidebar({
  documents,
  currentDocId,
  onSelectDocument,
  onCreateDocument,
  onDeleteDocument,
  user,
  needsAuth,
  isLoggingIn,
  onLogin,
  onLogout,
  cloudDocs,
  isLoadingCloud,
  onRefreshCloud,
  onClose,
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');
  const [searchQuery, setSearchQuery] = useState('');

  // Switch tab automatically to cloud if user is signed in
  useEffect(() => {
    if (user) {
      setActiveTab('cloud');
    } else {
      setActiveTab('local');
    }
  }, [user]);

  const filteredLocalDocs = documents.filter(doc => 
    !doc.isCloud && doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCloudDocs = cloudDocs.filter(doc => 
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (isoString: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('it-IT', { 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full text-sm text-slate-200">
      {/* Title Header */}
      <div className="flex justify-between items-center pb-3 border-b border-white/10 mb-4">
        <h3 className="text-base font-medium tracking-wide uppercase text-slate-100 flex items-center gap-2">
          <FolderOpen className="w-4 h-4 text-sky-400" />
          I Miei Documenti
        </h3>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors p-1"
          title="Chiudi"
        >
          &times;
        </button>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-1 bg-black/30 p-1 rounded-lg mb-4">
        <button
          onClick={() => setActiveTab('local')}
          className={`flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'local' 
              ? 'bg-white/10 text-white shadow' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <HardDrive className="w-3.5 h-3.5" />
          Locale
        </button>
        <button
          onClick={() => setActiveTab('cloud')}
          className={`flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-medium transition-all ${
            activeTab === 'cloud' 
              ? 'bg-white/10 text-white shadow' 
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cloud className="w-3.5 h-3.5" />
          Google Drive
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cerca documento..."
          className="w-full bg-slate-900/60 border border-white/10 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors"
        />
      </div>

      {/* Action Buttons */}
      <button
        onClick={() => onCreateDocument(activeTab === 'cloud')}
        className="w-full bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium py-2 rounded-lg flex items-center justify-center gap-2 transition-colors mb-4 shadow"
      >
        <Plus className="w-3.5 h-3.5" />
        Nuovo Documento ({activeTab === 'local' ? 'Locale' : 'Drive'})
      </button>

      {/* Content scroll area */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
        {activeTab === 'local' ? (
          /* LOCAL TAB */
          filteredLocalDocs.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs font-light">
              Nessun documento locale trovato.
            </div>
          ) : (
            filteredLocalDocs.map((doc) => {
              const isSelected = doc.id === currentDocId;
              return (
                <div
                  key={doc.id}
                  className={`flex items-center justify-between p-2.5 rounded-lg border group transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-sky-500 bg-sky-950/20 text-sky-200' 
                      : 'border-transparent hover:bg-white/5 text-slate-300'
                  }`}
                  onClick={() => onSelectDocument(doc.id, false)}
                >
                  <div className="flex items-start gap-2.5 min-w-0">
                    <FileText className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                    <div className="min-w-0">
                      <div className="font-medium text-xs truncate pr-2">{doc.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(doc.lastSaved)}</div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDocument(doc.id, false);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1"
                    title="Elimina documento"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )
        ) : (
          /* CLOUD TAB */
          needsAuth || !user ? (
            <div className="flex flex-col items-center justify-center text-center py-8 space-y-4 px-2">
              <Cloud className="w-10 h-10 text-slate-500 animate-pulse" />
              <div>
                <p className="text-xs font-medium text-slate-200">Collega Google Drive</p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-[200px]">
                  Consente di salvare, riprendere e sincronizzare i tuoi scritti in tempo reale.
                </p>
              </div>
              <button
                onClick={onLogin}
                disabled={isLoggingIn}
                className="bg-white hover:bg-slate-100 text-slate-900 text-xs font-semibold py-1.5 px-3 rounded flex items-center gap-1.5 shadow transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                {isLoggingIn ? 'Connessione...' : 'Accedi con Google'}
              </button>
            </div>
          ) : (
            /* SIGNED IN CLOUD FILE LIST */
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>File in Google Drive</span>
                <button
                  onClick={onRefreshCloud}
                  disabled={isLoadingCloud}
                  className="hover:text-white p-0.5"
                  title="Aggiorna lista"
                >
                  <RefreshCw className={`w-3 h-3 ${isLoadingCloud ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isLoadingCloud ? (
                <div className="text-center py-8 text-slate-400 text-xs animate-pulse">
                  Caricamento file da Drive...
                </div>
              ) : filteredCloudDocs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs font-light">
                  Nessun file trovato in Drive per questa app. Crea un nuovo file con il pulsante sopra!
                </div>
              ) : (
                filteredCloudDocs.map((doc) => {
                  const isSelected = doc.id === currentDocId;
                  return (
                    <div
                      key={doc.id}
                      className={`flex items-center justify-between p-2.5 rounded-lg border group transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-sky-500 bg-sky-950/20 text-sky-200' 
                          : 'border-transparent hover:bg-white/5 text-slate-300'
                      }`}
                      onClick={() => onSelectDocument(doc.id, true)}
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <Cloud className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-sky-400' : 'text-slate-500'}`} />
                        <div className="min-w-0">
                          <div className="font-medium text-xs truncate pr-2">{doc.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(doc.modifiedTime)}</div>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteDocument(doc.id, true);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1"
                        title="Elimina file da Drive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )
        )}
      </div>

      {/* Cloud Account Info Footer */}
      {user && activeTab === 'cloud' && (
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-300 bg-black/10 p-2 rounded-lg">
          <div className="flex items-center gap-2 min-w-0">
            {user.photoURL ? (
              <img src={user.photoURL} alt="Avatar" className="w-6 h-6 rounded-full border border-white/20 shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-sky-700 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                {user.displayName?.charAt(0) || user.email?.charAt(0) || '?'}
              </div>
            )}
            <div className="min-w-0">
              <div className="font-medium truncate text-[11px] text-slate-200">{user.displayName || 'Google User'}</div>
              <div className="text-[9px] text-slate-400 truncate">{user.email}</div>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="text-slate-400 hover:text-red-400 transition-colors p-1"
            title="Scollega Account"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
