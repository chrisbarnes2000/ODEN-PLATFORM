import React, { useState } from 'react';
import { 
  Globe, 
  Trash2, 
  Plus, 
  ExternalLink, 
  Sparkles, 
  Loader2, 
  Edit2, 
  X, 
  Mail, 
  FileText, 
  Search,
  ChevronRight,
  Info
} from 'lucide-react';
import { ProjectData, SourceData } from '../types';
import { extractUrlsFromNodes } from '../services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SourcesTabProps {
  project: ProjectData;
  setProject: (p: ProjectData) => void;
  onSelectNode: (id: string) => void;
}

export default function SourcesTab({ project, setProject, onSelectNode }: SourcesTabProps) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  React.useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const [newSource, setNewSource] = useState<Partial<SourceData>>({
    title: '',
    institution: '',
    date: new Date().toISOString().split('T')[0],
    rg: 'N/A',
    url: 'https://',
    notes: '',
    type: 'url'
  });

  const handleExtractUrls = async () => {
    setIsExtracting(true);
    try {
      const results = await extractUrlsFromNodes(project.nodes);
      
      const newSources: SourceData[] = [
        ...results.urls
          .filter(url => !project.sources.some(s => s.url === url))
          .map((url, i) => ({
            id: `src-ext-url-${Date.now()}-${i}`,
            title: `Extracted: ${url.split('/')[2] || 'Source'}`,
            institution: 'AI Extraction',
            date: new Date().toISOString().split('T')[0],
            rg: 'N/A',
            url,
            notes: 'Extracted from node descriptions and existing sources.',
            type: 'url' as const
          })),
        ...results.emails
          .filter(email => !project.sources.some(s => s.type === 'email' && s.subject === email.subject))
          .map((email, i) => ({
            id: `src-ext-email-${Date.now()}-${i}`,
            title: `Email: ${email.subject}`,
            institution: 'AI Extraction',
            date: email.date || new Date().toISOString().split('T')[0],
            rg: 'N/A',
            url: email.url || '',
            notes: `From: ${email.sender}\nTo: ${email.recipient}\nSubject: ${email.subject}`,
            type: 'email' as const,
            sender: email.sender,
            recipient: email.recipient,
            subject: email.subject
          }))
      ];
      
      if (newSources.length > 0) {
        setProject({
          ...project,
          sources: [...project.sources, ...newSources]
        });
      }
    } catch (error) {
      console.error('Failed to extract URLs:', error);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAddSource = () => {
    if (!newSource.title) return;

    const source: SourceData = {
      id: editingSourceId || `src-${Date.now()}`,
      title: newSource.title,
      institution: newSource.institution || 'Manual Entry',
      date: newSource.date || new Date().toISOString().split('T')[0],
      rg: newSource.rg || 'N/A',
      url: newSource.url || '',
      notes: newSource.notes || '',
      type: newSource.type || 'url',
      sender: newSource.sender,
      recipient: newSource.recipient,
      subject: newSource.subject
    };

    setProject({
      ...project,
      sources: editingSourceId 
        ? project.sources.map(s => s.id === editingSourceId ? source : s)
        : [...project.sources, source]
    });

    setNewSource({
      title: '',
      institution: '',
      date: new Date().toISOString().split('T')[0],
      rg: 'N/A',
      url: 'https://',
      notes: '',
      type: 'url'
    });
    setEditingSourceId(null);
  };

  const filteredSources = project.sources.filter(s => 
    (s.title && s.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.institution && s.institution.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (s.notes && s.notes.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="flex h-full overflow-hidden bg-bg">
      {/* Sidebar: Add/Edit */}
      <div className={cn(
        "flex-shrink-0 border-r border-border bg-panel overflow-y-auto transition-all duration-300",
        isSidebarExpanded ? "w-full md:w-[380px] p-6" : "w-0 p-0 border-none opacity-0"
      )}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-serif text-[18px] text-accent">
            {editingSourceId ? 'Edit Source' : 'Add Source'}
          </h3>
          {editingSourceId && (
            <button onClick={() => { setEditingSourceId(null); setNewSource({ title: '', institution: '', date: new Date().toISOString().split('T')[0], rg: 'N/A', url: 'https://', notes: '', type: 'url' }); }} className="text-muted hover:text-text">
              <X size={16} />
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div className="frow">
            <label>Source Type</label>
            <div className="flex gap-2">
              <button 
                onClick={() => setNewSource({ ...newSource, type: 'url' })}
                className={cn(
                  "flex-1 py-2 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all",
                  newSource.type === 'url' ? "bg-accent/10 border-accent text-accent" : "bg-bg border-border text-muted"
                )}
              >
                <Globe size={12} /> URL
              </button>
              <button 
                onClick={() => setNewSource({ ...newSource, type: 'email' })}
                className={cn(
                  "flex-1 py-2 rounded border text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all",
                  newSource.type === 'email' ? "bg-blue-500/10 border-blue-500/50 text-blue-400" : "bg-bg border-border text-muted"
                )}
              >
                <Mail size={12} /> Email
              </button>
            </div>
          </div>

          <div className="frow">
            <label>Title</label>
            <input 
              type="text" 
              placeholder="e.g. NARA Finding Aid, FOIA Response..." 
              value={newSource.title || ''}
              onChange={e => setNewSource({ ...newSource, title: e.target.value })}
            />
          </div>

          <div className="frow">
            <label>Institution / Controller</label>
            <input 
              type="text" 
              placeholder="e.g. USDA, FBI, State Archives" 
              value={newSource.institution || ''}
              onChange={e => setNewSource({ ...newSource, institution: e.target.value })}
            />
          </div>

          {newSource.type === 'email' ? (
            <>
              <div className="frow">
                <label>Sender</label>
                <input 
                  type="text" 
                  placeholder="sender@agency.gov" 
                  value={newSource.sender || ''}
                  onChange={e => setNewSource({ ...newSource, sender: e.target.value })}
                />
              </div>
              <div className="frow">
                <label>Recipient</label>
                <input 
                  type="text" 
                  placeholder="recipient@agency.gov" 
                  value={newSource.recipient || ''}
                  onChange={e => setNewSource({ ...newSource, recipient: e.target.value })}
                />
              </div>
              <div className="frow">
                <label>Subject</label>
                <input 
                  type="text" 
                  placeholder="Re: Record Request #123" 
                  value={newSource.subject || ''}
                  onChange={e => setNewSource({ ...newSource, subject: e.target.value })}
                />
              </div>
            </>
          ) : (
            <div className="frow">
              <label>URL</label>
              <input 
                type="text" 
                placeholder="https://..." 
                value={newSource.url || ''}
                onChange={e => setNewSource({ ...newSource, url: e.target.value })}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="frow">
              <label>Date</label>
              <input 
                type="date" 
                value={newSource.date || ''}
                onChange={e => setNewSource({ ...newSource, date: e.target.value })}
              />
            </div>
            <div className="frow">
              <label>Record Group (RG)</label>
              <input 
                type="text" 
                placeholder="RG 165" 
                value={newSource.rg || ''}
                onChange={e => setNewSource({ ...newSource, rg: e.target.value })}
              />
            </div>
          </div>

          <div className="frow">
            <label>Notes / Context</label>
            <textarea 
              placeholder="What does this source tell us? Any specific box or folder numbers?" 
              className="h-24"
              value={newSource.notes || ''}
              onChange={e => setNewSource({ ...newSource, notes: e.target.value })}
            />
          </div>

          <button 
            className="btn w-full py-3 flex items-center justify-center gap-2"
            onClick={handleAddSource}
          >
            {editingSourceId ? <Save size={16} /> : <Plus size={16} />}
            {editingSourceId ? 'UPDATE SOURCE' : 'ADD SOURCE'}
          </button>

          <div className="pt-6 border-t border-border">
            <button 
              onClick={handleExtractUrls}
              disabled={isExtracting}
              className="w-full py-3 bg-accent/5 border border-accent/20 rounded-lg text-[11px] font-bold uppercase tracking-widest text-accent hover:bg-accent/10 transition-all flex items-center justify-center gap-2"
            >
              {isExtracting ? <Loader2 className="animate-spin" size={14} /> : <Sparkles size={14} />}
              AI Extract from Nodes
            </button>
            <button 
              onClick={() => setToast({ message: 'File upload functionality would be integrated here to parse documents for sources.', type: 'error' })}
              className="w-full py-3 mt-2 bg-surface border border-border rounded-lg text-[11px] font-bold uppercase tracking-widest text-muted hover:text-accent hover:border-accent transition-all flex items-center justify-center gap-2"
            >
              <Plus size={14} />
              Upload Source File
            </button>
            <p className="text-[10px] text-muted mt-2 text-center italic">
              AI will scan node descriptions for hidden URLs and email metadata.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content: List */}
      <div className="flex-1 overflow-y-auto p-8 relative">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="text-[24px] font-serif text-accent mb-1">Investigation Sources</h2>
              <p className="text-muted text-[14px]">The archival and digital record supporting your investigation.</p>
            </div>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input 
                type="text" 
                placeholder="Search sources..." 
                className="pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-[13px] w-full md:w-64 focus:border-accent outline-none"
                value={searchQuery || ''}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {filteredSources.length === 0 ? (
            <div className="p-12 text-center border border-dashed border-border bg-surface/30 rounded-xl">
              <Globe size={48} className="mx-auto text-muted mb-4 opacity-20" />
              <p className="text-muted text-[14px]">No sources found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSources.map(src => {
                const linkedNodes = project.nodes.filter(n => 
                  n.sources.some(ns => ns.url === src.url) || 
                  (n.description && src.url && n.description.toLowerCase().includes(src.url.toLowerCase()))
                );

                return (
                  <div key={src.id} className="bg-panel border border-border p-5 rounded-xl hover:border-accent transition-all group relative">
                    <div className="flex justify-between items-start mb-3">
                      <div className={cn(
                        "text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded",
                        src.type === 'email' ? "bg-blue-500/20 text-blue-400" : "bg-accent/20 text-accent"
                      )}>
                        {src.type === 'email' ? 'EMAIL' : (src.institution || 'SOURCE')}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => {
                            setEditingSourceId(src.id);
                            setNewSource(src);
                            setIsSidebarExpanded(true);
                          }}
                          className="p-1 text-muted hover:text-accent"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => setProject({ ...project, sources: project.sources.filter(s => s.id !== src.id) })}
                          className="p-1 text-muted hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    
                    <h4 className="text-[16px] font-serif mb-2 leading-tight">{src.title}</h4>
                    
                    {src.type === 'email' ? (
                      <div className="space-y-1 mb-4 bg-bg/50 p-2 rounded border border-border/30">
                        <div className="text-[10px] text-muted truncate"><span className="font-bold text-accent/70">FROM:</span> {src.sender}</div>
                        <div className="text-[10px] text-muted truncate"><span className="font-bold text-accent/70">TO:</span> {src.recipient}</div>
                        <div className="text-[10px] text-muted italic">{src.date}</div>
                      </div>
                    ) : (
                      <a 
                        href={src.url} 
                        target="_blank" 
                        className="text-accent hover:underline text-[11px] flex items-center gap-1 mb-4 truncate"
                      >
                        <ExternalLink size={10} /> {src.url}
                      </a>
                    )}
                    
                    <div className="text-[11px] text-muted/80 line-clamp-3 mb-4 italic leading-relaxed">
                      {src.notes}
                    </div>
                    
                    {linkedNodes.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-border/30">
                        <div className="text-[9px] text-muted uppercase font-bold mb-2 flex items-center gap-1">
                          <Globe size={10} /> Linked Entities
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {linkedNodes.map(n => (
                            <button 
                              key={n.id}
                              onClick={() => onSelectNode(n.id)}
                              className="text-[10px] bg-surface border border-border px-2 py-0.5 hover:border-accent transition-colors rounded"
                            >
                              {n.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Toggle */}
      <button 
        onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-20 bg-panel border border-border p-1.5 rounded-r-md hover:text-accent transition-all hidden md:block",
          isSidebarExpanded ? "left-[380px]" : "left-0"
        )}
      >
        {isSidebarExpanded ? <X size={14} /> : <ChevronRight size={14} />}
      </button>

      {/* Toast Notification */}
      {toast && (
        <div 
          className={cn(
            "fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border text-[12px] font-bold uppercase tracking-widest bg-bg",
            toast.type === 'success' ? "border-[#7a9e7e] text-[#7a9e7e]" : "border-[#a04040] text-[#a04040]"
          )}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

function Save(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  );
}
