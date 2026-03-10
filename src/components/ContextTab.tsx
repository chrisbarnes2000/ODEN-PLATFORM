import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Link as LinkIcon, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { ProjectData, ContextSection, NodeData } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ContextTabProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  onSelectNode: (id: string) => void;
  onSwitchToMap: () => void;
  initialSectionId?: string | null;
}

export default function ContextTab({ project, setProject, onSelectNode, onSwitchToMap, initialSectionId }: ContextTabProps) {
  const [activeSecId, setActiveSecId] = useState<string | null>(initialSectionId || null);
  const [newSecCat, setNewSecCat] = useState('');
  const [newSecHdg, setNewSecHdg] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ message: string, onConfirm: () => void } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (initialSectionId) {
      setActiveSecId(initialSectionId);
      setIsEditing(false);
      setMobileView('editor');
    }
  }, [initialSectionId]);

  const activeSection = project.sections.find(s => s.id === activeSecId);

  const addSection = () => {
    if (!newSecHdg.trim()) return;
    const newSec: ContextSection = {
      id: `s-${Date.now()}`,
      category: newSecCat.toUpperCase() || 'SECTION',
      heading: newSecHdg,
      body: '',
      linkedNodeIds: [],
    };
    setProject(prev => ({
      ...prev,
      sections: [...prev.sections, newSec],
    }));
    setNewSecCat('');
    setNewSecHdg('');
    setActiveSecId(newSec.id);
    setIsEditing(true);
  };

  const updateBody = (body: string) => {
    if (!activeSecId) return;
    setProject(prev => ({
      ...prev,
      sections: prev.sections.map(s => s.id === activeSecId ? { ...s, body } : s),
    }));
  };

  const deleteSection = (id: string) => {
    setConfirmAction({
      message: 'Delete this section?',
      onConfirm: () => {
        setProject(prev => ({
          ...prev,
          sections: prev.sections.filter(s => s.id !== id),
          nodes: prev.nodes.map(n => n.sectionId === id ? { ...n, sectionId: undefined } : n),
        }));
        if (activeSecId === id) setActiveSecId(null);
        setToast({ message: 'Section deleted successfully.', type: 'success' });
      }
    });
  };

  const linkNode = (nodeId: string) => {
    if (!activeSecId) return;
    setProject(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === activeSecId 
          ? { ...s, linkedNodeIds: Array.from(new Set([...s.linkedNodeIds, nodeId])) } 
          : s
      ),
      nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, sectionId: activeSecId } : n),
    }));
  };

  const unlinkNode = (nodeId: string) => {
    if (!activeSecId) return;
    setProject(prev => ({
      ...prev,
      sections: prev.sections.map(s => 
        s.id === activeSecId 
          ? { ...s, linkedNodeIds: s.linkedNodeIds.filter(id => id !== nodeId) } 
          : s
      ),
      nodes: prev.nodes.map(n => n.id === nodeId ? { ...n, sectionId: undefined } : n),
    }));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Mobile Toggle */}
      <div className="flex md:hidden bg-panel border-b border-border shrink-0">
        <button 
          onClick={() => setMobileView('list')}
          className={cn(
            "flex-1 py-3 text-[10px] font-bold tracking-[2px] uppercase transition-colors",
            mobileView === 'list' ? "text-accent bg-white/5 border-b-2 border-accent" : "text-muted"
          )}
        >
          Sections
        </button>
        <button 
          onClick={() => setMobileView('editor')}
          className={cn(
            "flex-1 py-3 text-[10px] font-bold tracking-[2px] uppercase transition-colors",
            mobileView === 'editor' ? "text-accent bg-white/5 border-b-2 border-accent" : "text-muted"
          )}
        >
          Narrative
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: Section List */}
        <div className={cn(
          "flex-shrink-0 border-r border-border overflow-y-auto p-5 transition-all duration-300 bg-panel",
          isSidebarExpanded ? "w-full md:w-[380px]" : "w-0 p-0 border-none opacity-0",
          "md:block",
          mobileView === 'list' ? "block" : "hidden"
        )}>
          <div className="flex justify-between items-center mb-4">
            <div className="font-serif text-[16px] text-accent">Add Section</div>
          </div>
          <div className="frow">
            <label>Category Label</label>
            <input 
              type="text" 
              placeholder="e.g. BURDEN OF PROOF" 
              value={newSecCat || ''}
              onChange={e => setNewSecCat(e.target.value)}
            />
          </div>
          <div className="frow">
            <label>Section Heading</label>
            <input 
              type="text" 
              placeholder="e.g. The Institutional Access Problem" 
              value={newSecHdg || ''}
              onChange={e => setNewSecHdg(e.target.value)}
            />
          </div>
          <button className="btn w-full mb-8" onClick={addSection}>ADD SECTION</button>

          <div className="text-[13px] text-muted tracking-[1px] mb-2.5 border-b border-border pb-1.5 uppercase">
            Sections ({project.sections.length})
          </div>
          <div className="space-y-3.5">
            {project.sections.map(s => (
              <div 
                key={s.id}
                onClick={() => { setActiveSecId(s.id); setIsEditing(false); setMobileView('editor'); }}
                className={cn(
                  "border border-border p-3 cursor-pointer transition-all hover:border-border2",
                  activeSecId === s.id && "border-accent"
                )}
              >
              <div className="text-[10px] tracking-[2px] text-muted uppercase mb-1">{s.category}</div>
              <div className="font-serif text-[13px] text-text leading-tight">{s.heading}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-muted">{s.linkedNodeIds.length} nodes linked</span>
                <button 
                  onClick={(e) => { e.stopPropagation(); deleteSection(s.id); }}
                  className="text-muted hover:text-[#a04040]"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {project.sections.length === 0 && (
            <div className="text-muted italic text-center py-5">No sections yet.</div>
          )}
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      <button 
        onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-20 bg-panel border border-border p-1.5 rounded-r-md hover:text-accent transition-all",
          isSidebarExpanded ? "left-[380px]" : "left-0"
        )}
      >
        {isSidebarExpanded ? <X size={14} /> : <Plus size={14} />}
      </button>

      {/* Right Content: Editor */}
      <div className={cn(
        "flex-1 overflow-y-auto p-8 bg-bg",
        "md:block",
        mobileView === 'editor' ? "block" : "hidden"
      )}>
        {!activeSection ? (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
            <div className="text-[28px] mb-4 opacity-30">≡</div>
            <div className="font-serif text-[15px] text-text mb-3">Your writing goes here</div>
            <div className="text-[12px] text-muted leading-relaxed">
              Create a section using the form on the left, then <strong className="text-accent">click its title</strong> to open the writing area.
            </div>
          </div>
        ) : (
          <div className="max-w-3xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="text-[11px] tracking-[2px] text-muted uppercase mb-2">{activeSection.category}</div>
                <h3 className="font-serif text-[24px] text-accent">{activeSection.heading}</h3>
              </div>
              <button 
                className="btn btn-sm"
                onClick={() => setIsEditing(!isEditing)}
              >
                {isEditing ? 'VIEW MODE' : 'EDIT MODE'}
              </button>
            </div>
            
            {isEditing ? (
              <textarea 
                className="w-full bg-bg border border-border text-text font-serif text-[14px] p-4 min-h-[400px] outline-none focus:border-accent leading-relaxed"
                placeholder="Write your section content here..."
                value={activeSection.body || ''}
                onChange={e => updateBody(e.target.value)}
              />
            ) : (
              <div className="bg-surface border border-border p-6 min-h-[400px]">
                <SmartText 
                  text={activeSection.body} 
                  project={project} 
                  onSelectNode={(id) => { onSelectNode(id); onSwitchToMap(); }} 
                />
              </div>
            )}

            <div className="mt-8 border-t border-border pt-8">
              <div className="text-[13px] text-muted tracking-[1px] mb-4 uppercase">Linked Nodes ({activeSection.linkedNodeIds.length})</div>
              <div className="flex gap-4 mb-4">
                <select 
                  className="flex-1 bg-surface border border-border text-text font-mono text-[12px] p-2 outline-none focus:border-accent"
                  onChange={e => e.target.value && linkNode(e.target.value)}
                  value=""
                >
                  <option value="">— link a node to this section —</option>
                  {project.nodes
                    .filter(n => !activeSection.linkedNodeIds.includes(n.id))
                    .map(n => (
                      <option key={n.id} value={n.id}>{n.label}</option>
                    ))}
                </select>
              </div>

              <div className="space-y-2">
                {activeSection.linkedNodeIds.map(nid => {
                  const node = project.nodes.find(n => n.id === nid);
                  if (!node) return null;
                  return (
                    <div key={nid} className="flex items-center gap-3 bg-surface border border-border p-2 text-[12px]">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#c8923f' }} />
                      <span className="flex-1">{node.label}</span>
                      <button onClick={() => unlinkNode(nid)} className="text-muted hover:text-[#a04040]">
                        <X size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>

    {/* Confirmation Modal */}
    {confirmAction && (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-bg/80 backdrop-blur-sm">
        <div className="bg-panel border border-border p-8 rounded-xl shadow-2xl max-w-sm w-full text-center">
          <h3 className="text-[18px] font-serif text-text mb-2">Are you sure?</h3>
          <p className="text-[13px] text-muted mb-8 leading-relaxed">
            {confirmAction.message}
          </p>
          <div className="flex gap-3">
            <button 
              className="btn btn-m flex-1"
              onClick={() => setConfirmAction(null)}
            >
              CANCEL
            </button>
            <button 
              className="btn btn-d flex-1"
              onClick={() => {
                confirmAction.onConfirm();
                setConfirmAction(null);
              }}
            >
              CONFIRM
            </button>
          </div>
        </div>
      </div>
    )}

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

function SmartText({ text, project, onSelectNode }: { text: string, project: ProjectData, onSelectNode: (id: string) => void }) {
  const parts = React.useMemo(() => {
    if (!text) return [];
    let result: (string | { nodeId: string, label: string })[] = [text];
    
    project.nodes.forEach(node => {
      if (!node.label || !node.label.trim()) return;
      const newResult: (string | { nodeId: string, label: string })[] = [];
      result.forEach(part => {
        if (typeof part === 'string') {
          const escapedLabel = node.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(${escapedLabel})`, 'gi');
          const split = part.split(regex);
          split.forEach(s => {
            if (s && node.label && s.toLowerCase() === node.label.toLowerCase()) {
              newResult.push({ nodeId: node.id, label: s });
            } else if (s) {
              newResult.push(s);
            }
          });
        } else {
          newResult.push(part);
        }
      });
      result = newResult;
    });
    
    return result;
  }, [text, project.nodes]);

  return (
    <div className="text-[13px] leading-relaxed text-text whitespace-pre-wrap font-serif">
      {parts.map((part, i) => (
        typeof part === 'string' ? (
          <span key={i}>{part}</span>
        ) : (
          <button 
            key={i} 
            onClick={() => onSelectNode(part.nodeId)}
            className="text-accent hover:underline font-bold"
          >
            {part.label}
          </button>
        )
      ))}
    </div>
  );
}
