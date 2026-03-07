import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Link as LinkIcon, X, FileText, Database, Layers } from 'lucide-react';
import { ProjectData, DocumentData, NodeData } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface DocsTabProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  initialEditingDocId?: string | null;
  onClearEditing?: () => void;
}

export default function DocsTab({ project, setProject, initialEditingDocId, onClearEditing }: DocsTabProps) {
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [mobileView, setMobileView] = useState<'form' | 'list'>('list');

  React.useEffect(() => {
    if (initialEditingDocId) {
      const doc = project.documents.find(d => d.id === initialEditingDocId);
      if (doc) {
        setEditingDocId(doc.id);
        setNewDoc(doc);
        setIsSidebarExpanded(true);
        setMobileView('form');
        onClearEditing?.();
      }
    }
  }, [initialEditingDocId, project.documents, onClearEditing]);
  const [newDoc, setNewDoc] = useState<Partial<DocumentData>>({
    title: '',
    category: 'Correspondence',
    status: 'received',
    institution: '',
    date: '',
    url: '',
    description: '',
    nodeIds: [],
  });

  const addDoc = () => {
    if (!newDoc.title?.trim()) return;
    const doc: DocumentData = {
      id: editingDocId || `d-${Date.now()}`,
      title: newDoc.title,
      category: newDoc.category || 'Correspondence',
      status: newDoc.status || 'received',
      institution: newDoc.institution || '',
      date: newDoc.date || '',
      url: newDoc.url || '',
      description: newDoc.description || '',
      nodeIds: newDoc.nodeIds || [],
      imageData: newDoc.imageData,
      fileName: newDoc.fileName,
      mimeType: newDoc.mimeType,
    };

    setProject(prev => ({
      ...prev,
      documents: editingDocId 
        ? prev.documents.map(d => d.id === editingDocId ? doc : d)
        : [...prev.documents, doc],
    }));

    setNewDoc({
      title: '',
      category: 'Correspondence',
      status: 'received',
      institution: '',
      date: '',
      url: '',
      description: '',
      nodeIds: [],
      imageData: undefined,
      fileName: undefined,
      mimeType: undefined,
    });
    setEditingDocId(null);
  };

  const deleteDoc = (id: string) => {
    if (!confirm('Delete this document?')) return;
    setProject(prev => ({
      ...prev,
      documents: prev.documents.filter(d => d.id !== id),
    }));
  };

  const editDoc = (doc: DocumentData) => {
    setEditingDocId(doc.id);
    setNewDoc(doc);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Mobile Toggle */}
      <div className="flex md:hidden bg-panel border-b border-border shrink-0">
        <button 
          onClick={() => setMobileView('form')}
          className={cn(
            "flex-1 py-3 text-[10px] font-bold tracking-[2px] uppercase transition-colors",
            mobileView === 'form' ? "text-accent bg-white/5 border-b-2 border-accent" : "text-muted"
          )}
        >
          Add Doc
        </button>
        <button 
          onClick={() => setMobileView('list')}
          className={cn(
            "flex-1 py-3 text-[10px] font-bold tracking-[2px] uppercase transition-colors",
            mobileView === 'list' ? "text-accent bg-white/5 border-b-2 border-accent" : "text-muted"
          )}
        >
          View List
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: Form */}
        <div className={cn(
          "flex-shrink-0 border-r border-border overflow-y-auto p-5 transition-all duration-300 bg-panel",
          isSidebarExpanded ? "w-full md:w-[450px]" : "w-0 p-0 border-none opacity-0",
          "md:block",
          mobileView === 'form' ? "block" : "hidden"
        )}>
        <div className="font-serif text-[16px] text-accent mb-4">{editingDocId ? 'Edit Document' : 'Add Document'}</div>
        <div className="frow">
          <label>Title</label>
          <input 
            type="text" 
            placeholder="e.g. Trevor Kincaid USDA Travel Voucher" 
            value={newDoc.title}
            onChange={e => setNewDoc(prev => ({ ...prev, title: e.target.value }))}
          />
        </div>
        <div className="frow">
          <label>Category</label>
          <select 
            value={newDoc.category}
            onChange={e => setNewDoc(prev => ({ ...prev, category: e.target.value }))}
          >
            <option>Travel Records</option>
            <option>Correspondence</option>
            <option>Field Notes</option>
            <option>Administrative</option>
            <option>Press</option>
            <option>Legal</option>
            <option>Scientific</option>
            <option>Financial</option>
            <option>Other</option>
          </select>
        </div>
        <div className="frow">
          <label>Status</label>
          <select 
            value={newDoc.status}
            onChange={e => setNewDoc(prev => ({ ...prev, status: e.target.value as any }))}
          >
            <option value="received">Received / In Hand</option>
            <option value="requested">Formally Requested</option>
            <option value="pending">Pending / Locating</option>
            <option value="denied">Access Denied</option>
          </select>
        </div>
        <div className="frow">
          <label>Institution / Archive</label>
          <input 
            type="text" 
            placeholder="e.g. NARA College Park" 
            value={newDoc.institution}
            onChange={e => setNewDoc(prev => ({ ...prev, institution: e.target.value }))}
          />
        </div>
        <div className="frow">
          <label>Date</label>
          <input 
            type="text" 
            placeholder="e.g. April 7, 1909" 
            value={newDoc.date}
            onChange={e => setNewDoc(prev => ({ ...prev, date: e.target.value }))}
          />
        </div>
        <div className="frow">
          <label>URL (optional)</label>
          <input 
            type="text" 
            placeholder="https://..." 
            value={newDoc.url}
            onChange={e => setNewDoc(prev => ({ ...prev, url: e.target.value }))}
          />
        </div>
        <div className="frow">
          <label>Attach File (optional)</label>
          <div className="flex flex-col gap-2">
            <input 
              type="file" 
              accept="image/*,application/pdf"
              className="text-[10px] text-muted"
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    setNewDoc(prev => ({ 
                      ...prev, 
                      imageData: event.target?.result as string,
                      fileName: file.name,
                      mimeType: file.type
                    }));
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            {newDoc.imageData && (
              <div className="relative w-full p-2 bg-bg border border-border flex items-center gap-3">
                {newDoc.mimeType?.startsWith('image/') ? (
                  <img src={newDoc.imageData} className="w-10 h-10 object-cover opacity-50" referrerPolicy="no-referrer" />
                ) : (
                  <FileText size={20} className="text-accent opacity-50" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-bold truncate">{newDoc.fileName || 'Attached File'}</div>
                  <div className="text-[8px] text-muted uppercase">{newDoc.mimeType}</div>
                </div>
                <button 
                  onClick={() => setNewDoc(prev => ({ ...prev, imageData: undefined, fileName: undefined, mimeType: undefined }))}
                  className="bg-bg/80 p-1 hover:text-[#a04040]"
                >
                  <X size={12} />
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="frow">
          <label>Description</label>
          <textarea 
            placeholder="What does this document show?" 
            value={newDoc.description}
            onChange={e => setNewDoc(prev => ({ ...prev, description: e.target.value }))}
          />
        </div>
        <div className="frow">
          <label>Link to Nodes</label>
          <select 
            multiple 
            className="min-h-[100px]"
            value={newDoc.nodeIds}
            onChange={e => setNewDoc(prev => ({ 
              ...prev, 
              nodeIds: Array.from(e.target.selectedOptions).map(o => o.value) 
            }))}
          >
            {project.nodes.map(n => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button className="btn flex-1" onClick={addDoc}>{editingDocId ? 'UPDATE' : 'SAVE'}</button>
          <button className="btn btn-m" onClick={() => { 
            setEditingDocId(null); 
            setNewDoc({ 
              title: '', 
              category: 'Correspondence', 
              status: 'received', 
              nodeIds: [],
              imageData: undefined,
              fileName: undefined,
              mimeType: undefined
            }); 
          }}>CLEAR</button>
        </div>
      </div>

      {/* Sidebar Toggle Button */}
      <button 
        onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 z-20 bg-panel border border-border p-1.5 rounded-r-md hover:text-accent transition-all hidden md:block",
          isSidebarExpanded ? "left-[450px]" : "left-0"
        )}
      >
        {isSidebarExpanded ? <X size={14} /> : <Plus size={14} />}
      </button>

      {/* Right Content: List */}
      <div className={cn(
        "flex-1 overflow-y-auto p-8 bg-bg",
        "md:block",
        mobileView === 'list' ? "block" : "hidden"
      )}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {project.documents.map(doc => (
            <div key={doc.id} className="border border-border p-4 bg-surface hover:border-border2 transition-all">
              <div className="flex justify-between items-start gap-4 mb-3">
                <div className="flex-1">
                  <div className="font-serif text-[14px] text-text mb-1">{doc.title}</div>
                  <div className="text-[10px] text-muted tracking-[1px] uppercase">
                    {doc.category} {doc.institution && `· ${doc.institution}`} {doc.date && `· ${doc.date}`}
                  </div>
                </div>
                <div className={cn(
                  "text-[9px] px-2 py-0.5 border uppercase tracking-[1px]",
                  doc.status === 'received' && "border-[#7a9e7e] text-[#7a9e7e]",
                  doc.status === 'requested' && "border-[#d4a843] text-[#d4a843]",
                  doc.status === 'pending' && "border-muted text-muted",
                  doc.status === 'denied' && "border-[#a04040] text-[#a04040]"
                )}>
                  {doc.status}
                </div>
              </div>

              {doc.imageData && (
                <div className="mb-4 aspect-video bg-bg border border-border overflow-hidden flex items-center justify-center">
                  {doc.mimeType?.startsWith('image/') ? (
                    <img src={doc.imageData} className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all cursor-zoom-in" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <FileText size={40} className="text-accent opacity-50" />
                      <div className="text-[10px] text-muted font-bold uppercase">{doc.fileName || 'Document'}</div>
                    </div>
                  )}
                </div>
              )}
              
              {doc.description && (
                <p className="text-[12px] text-muted leading-relaxed mb-4">{doc.description}</p>
              )}

              <div className="flex items-center justify-between mt-auto pt-4 border-t border-border">
                <div className="flex gap-2">
                  {doc.url && (
                    <a 
                      href={doc.url} 
                      target="_blank" 
                      className="text-accent hover:underline text-[10px] flex items-center gap-1"
                    >
                      <LinkIcon size={10} /> VIEW
                    </a>
                  )}
                  <button 
                    onClick={() => editDoc(doc)}
                    className="text-muted hover:text-accent text-[10px] flex items-center gap-1"
                  >
                    <Edit2 size={10} /> EDIT
                  </button>
                </div>
                <button 
                  onClick={() => deleteDoc(doc.id)}
                  className="text-muted hover:text-[#a04040] text-[10px]"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
          {project.documents.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted opacity-50">
              <Database size={40} className="mb-4" />
              <div className="italic">No documents yet — add one to start anchoring nodes to evidence.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  </div>
);
}
