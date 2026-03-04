import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as mammoth from 'mammoth';
import { 
  Search, 
  Map as MapIcon, 
  FileText, 
  Database, 
  Layers, 
  Plus, 
  Save, 
  Upload, 
  CheckCircle, 
  Info, 
  X, 
  ChevronRight,
  Trash2,
  ExternalLink,
  Link as LinkIcon,
  AlertTriangle,
  FileUp,
  Loader2,
  Eye,
  EyeOff,
  Crosshair,
  Sparkles,
  Edit2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Stage, Layer, Circle, Line, Text, Group, Rect } from 'react-konva';
import * as d3 from 'd3-force';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  ProjectData, 
  NodeData, 
  EdgeData, 
  ContextSection, 
  DocumentData, 
  SourceData, 
  NodeType 
} from './types';
import { extractEntitiesFromText, extractEntitiesFromDocument, SmartImportResult } from './services/geminiService';
import { putText } from './services/documentStore';

import BlueprintTab from './components/BlueprintTab';
import ContextTab from './components/ContextTab';
import DocsTab from './components/DocsTab';
import AIHelperTab from './components/AIHelperTab';
import NodesTab from './components/NodesTab';
import SourcesTab from './components/SourcesTab';
import MethodologyCheckTab from './components/MethodologyCheckTab';
import QuickStartTab from './components/QuickStartTab';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Normalizes node.type values coming from uploads / AI / user edits so the renderer
// always resolves to a known palette key.
function normalizeNodeType(raw: any): NodeType {
  const t = String(raw ?? '').trim().toLowerCase();
  // common aliases
  const map: Record<string, NodeType> = {
    'person': 'actor',
    'people': 'actor',
    'org': 'institution',
    'organization': 'institution',
    'place': 'location',
    'site': 'location',
    'doc': 'document',
    'paper': 'document',
    'record': 'document',
    'money': 'financial',
    'finance': 'financial',
    'law-enforcement': 'law',
    'science/medical': 'science',
  };
  const normalized = (map[t] ?? t) as NodeType;
  // final guard
  return (normalized in COLORS ? normalized : 'concept') as NodeType;
}

function getAvailableNodeTypes(nodes: NodeData[]): Set<NodeType> {
  const set = new Set<NodeType>();
  nodes.forEach(n => set.add(normalizeNodeType((n as any).type)));
  return set;
}

const COLORS: Record<NodeType, string> = {
  case: '#ff4444', // Bright Red
  event: '#ff8800', // Orange-Red
  actor: '#c8923f', // Gold
  institution: '#7a9e7e', // Sage
  gap: '#5a8fc4', // Blue
  location: '#b07e85', // Dusty Rose
  media: '#c49a6c', // Tan
  document: '#7ab8b0', // Teal
  concept: '#a87ab8', // Purple
  object: '#7a9e6a', // Olive
  relation: '#c47a8a', // Pink
  financial: '#a8c44a', // Lime
  witness: '#7aaed4', // Sky Blue
  suspect: '#c46a4a', // Terracotta
  law: '#6a8ab8', // Steel Blue
  science: '#7ac4b8', // Mint
  family: '#c4606a', // Coral
  network: '#4ab8a8', // Turquoise
  period: '#c4a882', // Sand
  alias: '#c4907a', // Peach
  rumor: '#b87a9a', // Magenta
  pattern: '#6a8aaa', // Slate
};

const EDGE_COLORS: Record<string, string> = {
  financial: '#a8c44a', // Lime
  personal: '#c4606a', // Coral
  professional: '#6a8ab8', // Steel Blue
  conflict: '#ff4444', // Bright Red
  evidence: '#7ab8b0', // Teal
  temporal: '#c4a882', // Sand
  spatial: '#b07e85', // Dusty Rose
  import: '#9aa4b2',   // Muted Steel
  other: '#b3bcc8',    // Light Gray
};

const INITIAL_PROJECT: ProjectData = {
  caseName: '',
  nodes: [],
  edges: [],
  sections: [],
  documents: [],
  sources: [],
  blueprint: {},
  completedPhases: [],
  mainEventId: undefined,
};

export default function App() {
  const [project, setProject] = useState<ProjectData>(() => {
    const saved = localStorage.getItem('oden_project');
    return saved ? JSON.parse(saved) : INITIAL_PROJECT;
  });
  const [activeTab, setActiveTab] = useState('guide');
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [editingNodeIdFromPanel, setEditingNodeIdFromPanel] = useState<string | null>(null);
  const [editingDocIdFromPanel, setEditingDocIdFromPanel] = useState<string | null>(null);
  const [openOriginalDocIdFromPanel, setOpenOriginalDocIdFromPanel] = useState<string | null>(null);
  // Highlight system (like the Unverifiable spider graph): keep everything visible,
  // but dim/de-emphasize nodes/edges outside the active highlight set.
  const [highlightNodeTypes, setHighlightNodeTypes] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<SmartImportResult | null>(null);
  const [simulationTrigger, setSimulationTrigger] = useState(0);
  const [focusMainEvent, setFocusMainEvent] = useState(false);

  useEffect(() => {
    localStorage.setItem('oden_project', JSON.stringify(project));
  }, [project]);

  const handleReLayout = () => {
    setSimulationTrigger(prev => prev + 1);
  };

  const handleAddNode = (node: Omit<NodeData, 'id'>) => {
    const newNode: NodeData = {
      ...node,
      id: `n-${Date.now()}`,
    };
    setProject(prev => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
  };

  const handleAddEdge = (edge: EdgeData) => {
    setProject(prev => ({
      ...prev,
      edges: [...prev.edges, edge],
    }));
  };

  const [importFile, setImportFile] = useState<{ data: string, mimeType: string, name: string } | null>(null);

  const handleSmartImport = async () => {
    if (!importText.trim() && !importFile) return;
    setIsImporting(true);
    try {
      let result;
      if (importFile) {
        result = await extractEntitiesFromDocument({ data: importFile.data, mimeType: importFile.mimeType });
      } else {
        result = await extractEntitiesFromText(importText);
      }
      setImportResult(result);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Smart import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // Handle Text-based files
    if (['txt', 'md', 'csv'].includes(extension || '')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImportText(event.target?.result as string);
        setImportFile(null);
      };
      reader.readAsText(file);
      return;
    }

    // Handle DOCX
    if (extension === 'docx') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target?.result as ArrayBuffer;
        try {
          const result = await mammoth.extractRawText({ arrayBuffer });
          setImportText(result.value);
          setImportFile(null);
        } catch (err) {
          console.error('DOCX extraction failed:', err);
          alert('Failed to extract text from DOCX.');
        }
      };
      reader.readAsArrayBuffer(file);
      return;
    }

    // Handle PDF and Images (Multimodal)
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = (event.target?.result as string).split(',')[1];
      setImportFile({
        data: base64,
        mimeType: file.type,
        name: file.name
      });
      setImportText(''); // Clear text if multimodal file is selected
    };
    reader.readAsDataURL(file);
  };

  
  const commitImport = async () => {
    if (!importResult) return;

    const docId = `doc-imp-${Date.now()}`;
    const now = new Date();

    // Decide where to store the raw imported text.
    // - Small text: inline on the document record
    // - Large text: IndexedDB, store only the key on the document record
    const RAW_TEXT_LIMIT = 200_000; // ~200KB keeps UI snappy
    const rawText = (importText || '').trim();
    let originalText: string | undefined = undefined;
    let originalTextKey: string | undefined = undefined;
    let originalTextStorage: 'inline' | 'indexeddb' | 'none' = 'none';

    try {
      if (rawText.length > 0) {
        if (rawText.length <= RAW_TEXT_LIMIT) {
          originalText = rawText;
          originalTextStorage = 'inline';
        } else {
          originalTextKey = `${docId}:text`;
          await putText(originalTextKey, rawText);
          originalTextStorage = 'indexeddb';
        }
      }
    } catch (err) {
      console.warn('Failed to store original import text. Proceeding without it.', err);
      originalTextStorage = 'none';
    }

    const newNodes: NodeData[] = importResult.nodes.map((n, i) => ({
      id: `n-imp-${Date.now()}-${i}`,
      label: n.label,
      // Normalize so filters/UI don't miss uppercase or unknown values.
      type: normalizeNodeType((n as any).type ?? 'entity'),
      description: n.description,
      tags: [],
      sources: [],
      sourceIds: [],
      documentIds: [docId],
      x: Math.random() * 800 - 400,
      y: Math.random() * 600 - 300,
    }));

    const newEdges: EdgeData[] = importResult.edges.map(e => {
      const fromNode = newNodes.find(n => n.label === e.from) || project.nodes.find(n => n.label === e.from);
      const toNode = newNodes.find(n => n.label === e.to) || project.nodes.find(n => n.label === e.to);
      return {
        from: fromNode?.id || '',
        to: toNode?.id || '',
        label: e.label,
        weight: (typeof (e as any).weight === 'number' ? (e as any).weight : Number((e as any).weight)) || 1,
        type: 'import'
      };
    }).filter(e => e.from && e.to);

    const newSection: ContextSection = {
      id: `s-${Date.now()}`,
      category: 'IMPORT',
      heading: `Imported Context: ${now.toLocaleDateString()}`,
      body: importResult.context,
      linkedNodeIds: newNodes.map(n => n.id),
      sourceIds: [],
    } as any;

    const importDoc: DocumentData = {
      id: docId,
      title: `Smart Import — ${now.toLocaleString()}`,
      category: 'SMART_IMPORT',
      status: 'received',
      description: (importResult.context || '').trim() || 'Imported via Smart Import.',
      nodeIds: newNodes.map(n => n.id),
      fileName: importFile?.name,
      mimeType: importFile?.mimeType,
      originalText,
      originalTextKey,
      originalTextStorage,
    };

    setProject(prev => ({
      ...prev,
      nodes: [...prev.nodes, ...newNodes],
      edges: [...prev.edges, ...newEdges],
      sections: [...prev.sections, newSection],
      documents: [importDoc, ...prev.documents],
    }));

    setImportResult(null);
    setImportText('');
    setImportFile(null);
    setActiveTab('map');
  };

  return (
    <div className="flex flex-col h-screen bg-bg text-text font-mono">
      {/* Header */}
      <header className="flex items-center gap-5 px-5 py-2.5 border-b border-border bg-panel flex-shrink-0">
        <div className="font-bold text-[22px] tracking-[8px] text-accent whitespace-nowrap">
          ODEN
          <span className="block text-muted text-[11px] tracking-[2px] font-normal">
            OBSERVATIONAL DIAGNOSTIC ENTRY NETWORK
          </span>
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <label className="text-muted text-[11px] tracking-[1px] whitespace-nowrap uppercase">Case:</label>
          <input 
            className="bg-surface border border-border text-text font-mono text-[14px] px-2.5 py-1 flex-1 outline-none focus:border-accent"
            placeholder="Name your investigation..."
            value={project.caseName}
            onChange={e => setProject(prev => ({ ...prev, caseName: e.target.value }))}
          />
        </div>
        <div className="text-muted text-[11px] tracking-[1px] whitespace-nowrap">
          NODES <span className="text-accent">{project.nodes.length}</span> &nbsp;
          EDGES <span className="text-accent">{project.edges.length}</span> &nbsp;
          SECTIONS <span className="text-accent">{project.sections.length}</span> &nbsp;
          DOCS <span className="text-accent">{project.documents.length}</span> &nbsp;
          SOURCES <span className="text-accent">{project.sources.length}</span>
        </div>
        
        {/* Blueprint Progress Mini-Bar */}
        <div className="hidden lg:flex items-center gap-3 pl-5 border-l border-border ml-2">
          <div className="text-right">
            <div className="text-[9px] text-muted uppercase font-bold leading-none mb-1">Blueprint</div>
            <div className="text-[12px] font-mono text-accent leading-none">
              {Math.round((Object.values(project.blueprint).filter(v => !!v).length / 13) * 100)}%
            </div>
          </div>
          <div className="w-20 h-1.5 bg-surface border border-border rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-500" 
              style={{ width: `${Math.min(100, (Object.values(project.blueprint).filter(v => !!v).length / 13) * 100)}%` }} 
            />
          </div>
        </div>
      </header>

      {/* Tabs */}
      <nav className="flex border-b border-border bg-panel flex-shrink-0 overflow-x-auto">
        {[
          { id: 'guide', label: '? Quick Start', icon: Info },
          { id: 'map', label: '◈ Map', icon: MapIcon },
          { id: 'context', label: '≡ Context', icon: FileText },
          { id: 'docs', label: '☰ Documents', icon: Database },
          { id: 'sources', label: '⛓ Sources', icon: LinkIcon },
          { id: 'blueprint', label: '☷ Blueprint', icon: Layers },
          { id: 'nodes', label: '⊞ Nodes & Edges', icon: Plus },
          { id: 'ai', label: '✧ AI Helper', icon: Sparkles },
          { id: 'check', label: '✓ Methodology', icon: CheckCircle },
          { id: 'import', label: '⇑ Smart Import', icon: FileUp },
          { id: 'save', label: '⇓ Save', icon: Save },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "tab-btn flex items-center gap-2",
              activeTab === tab.id && "active"
            )}
          >
            <tab.icon size={14} />
            {tab.label.toUpperCase()}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="flex-1 overflow-hidden relative flex">
        <AnimatePresence mode="wait">
          {activeTab === 'guide' && (
            <motion.div 
              key="guide"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <QuickStartTab />
            </motion.div>
          )}

          {activeTab === 'map' && (
            <motion.div 
              key="map"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 relative"
            >
              <GraphView 
                nodes={project.nodes}
                edges={project.edges}
                onSelectNode={(id) => {
                  setSelectedNodeIds(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
                selectedNodeIds={selectedNodeIds}
                simulationTrigger={simulationTrigger}
                onReLayout={handleReLayout}
                highlightNodeTypes={highlightNodeTypes}
                setHighlightNodeTypes={setHighlightNodeTypes}
                allNodes={project.nodes}
                mainEventId={project.mainEventId || null}
                focusMainEvent={focusMainEvent}
                setFocusMainEvent={setFocusMainEvent}
                isActive={activeTab === 'map'}
              />
              <NodePanel 
                node={project.nodes.find(n => Array.from(selectedNodeIds).pop() === n.id)} 
                onClose={() => setSelectedNodeIds(new Set())}
                onSelectNode={(id) => {
                  setSelectedNodeIds(prev => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id);
                    else next.add(id);
                    return next;
                  });
                }}
                onGoToSection={(id) => { setSelectedSectionId(id); setActiveTab('context'); }}
                onEditNode={(id) => {
                  setEditingNodeIdFromPanel(id);
                  setActiveTab('nodes');
                }}
                onEditDoc={(id) => {
                  setEditingDocIdFromPanel(id);
                  setActiveTab('docs');
                }}
                project={project}
                mainEventId={project.mainEventId || null}
                onSetMainEvent={(id) => setProject(prev => ({ ...prev, mainEventId: id }))}
                onClearMainEvent={() => setProject(prev => ({ ...prev, mainEventId: undefined }))}
                focusMainEvent={focusMainEvent}
                setFocusMainEvent={setFocusMainEvent}
                onToggleFocus={() => setFocusMainEvent(v => !v)}
              />
            </motion.div>
          )}

          {activeTab === 'check' && (
            <motion.div 
              key="check"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <MethodologyCheckTab project={project} />
            </motion.div>
          )}

          {activeTab === 'context' && (
            <motion.div 
              key="context"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <ContextTab 
                project={project} 
                setProject={setProject} 
                onSelectNode={(id) => {
                  setSelectedNodeIds(new Set([id]));
                  setActiveTab('map');
                }}
                onSwitchToMap={() => setActiveTab('map')}
                initialSectionId={selectedSectionId}
              />
            </motion.div>
          )}

          {activeTab === 'docs' && (
            <motion.div 
              key="docs"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1"
            >
              <DocsTab 
                project={project} 
                setProject={setProject} 
                initialEditingDocId={editingDocIdFromPanel}
                initialOpenOriginalDocId={openOriginalDocIdFromPanel}
                onClearEditing={() => { setEditingDocIdFromPanel(null); setOpenOriginalDocIdFromPanel(null); }}
              />
            </motion.div>
          )}

          
          {activeTab === 'sources' && (
            <motion.div 
              key="sources"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex-1 overflow-hidden"
            >
              <SourcesTab
                project={project}
                setProject={setProject}
              />
            </motion.div>
          )}

{activeTab === 'blueprint' && (
            <motion.div 
              key="blueprint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              <BlueprintTab 
                project={project} 
                setProject={setProject} 
                onSelectNode={(id) => {
                  setSelectedNodeIds(new Set([id]));
                  setActiveTab('map');
                }}
              />
            </motion.div>
          )}

          {activeTab === 'nodes' && (
            <motion.div 
              key="nodes"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full w-full"
            >
              <NodesTab 
                project={project} 
                setProject={setProject} 
                initialEditingNodeId={editingNodeIdFromPanel}
                onClearEditing={() => setEditingNodeIdFromPanel(null)}
                onOpenOriginalDoc={(docId) => { setOpenOriginalDocIdFromPanel(docId); setActiveTab('docs'); }}
              />
            </motion.div>
          )}

          {activeTab === 'save' && (
            <motion.div 
              key="save"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full"
            >
              <div className="mbox">
                <h3>Save Your Investigation</h3>
                <p>Your work is automatically saved to your browser's local storage. However, for long-term storage or sharing, you should download a .oden file.</p>
              </div>

              <div className="space-y-6">
                <div className="border border-border p-6 bg-surface">
                  <h4 className="font-serif text-[16px] text-accent mb-4">Export Data</h4>
                  <p className="text-[12px] text-muted mb-4">Download your entire investigation as a JSON file. This includes all nodes, edges, context, and documents.</p>
                  <button 
                    className="btn flex items-center gap-2"
                    onClick={() => {
                      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `${project.caseName || 'oden-investigation'}.oden`;
                      a.click();
                    }}
                  >
                    <Save size={16} /> DOWNLOAD .ODEN FILE
                  </button>
                </div>

                <div className="border border-border p-6 bg-surface">
                  <h4 className="font-serif text-[16px] text-accent mb-4">Import Data</h4>
                  <p className="text-[12px] text-muted mb-4">Load a previously saved .oden file. This will replace your current investigation.</p>
                  <label className="btn inline-flex items-center gap-2 cursor-pointer">
                    <Upload size={16} /> UPLOAD .ODEN FILE
                    <input 
                      type="file" 
                      className="hidden" 
                      accept=".oden,.json"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          try {
                            const data = JSON.parse(event.target?.result as string);
                            setProject(data);
                            alert('Investigation loaded successfully.');
                          } catch (err) {
                            alert('Failed to load file. Invalid format.');
                          }
                        };
                        reader.readAsText(file);
                      }}
                    />
                  </label>
                </div>

                <div className="border border-border p-6 bg-surface">
                  <h4 className="font-serif text-[16px] text-[#a04040] mb-4">Danger Zone</h4>
                  <p className="text-[12px] text-muted mb-4">Permanently delete all data and start a new investigation.</p>
                  <button 
                    className="btn btn-d flex items-center gap-2"
                    onClick={() => {
                      if (confirm('Are you sure? This will delete everything.')) {
                        setProject(INITIAL_PROJECT);
                        localStorage.removeItem('oden_project');
                      }
                    }}
                  >
                    <Trash2 size={16} /> RESET EVERYTHING
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          
          {activeTab === 'ai' && (
            <motion.div
              key="ai"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0"
            >
              <AIHelperTab project={project} setProject={setProject} />
            </motion.div>
          )}

{activeTab === 'import' && (
            <motion.div 
              key="import"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full"
            >
              <div className="mbox flex items-center justify-between">
                <div>
                  <h3>Smart Import</h3>
                  <p>Paste your research notes or upload a document (PDF, DOCX, TXT, MD, CSV, Image). ODEN will use AI to extract entities, relationships, and create a structured context section for you.</p>
                </div>
                <div className="flex flex-col items-end gap-1 opacity-50">
                  <div className="text-[8px] uppercase tracking-widest font-bold">Intelligence Engine</div>
                  <div className="flex items-center gap-1.5 bg-accent/10 border border-accent/20 px-2 py-1 rounded">
                    <Sparkles size={10} className="text-accent" />
                    <span className="text-[10px] font-bold text-accent">Gemini 3.1 Pro</span>
                  </div>
                </div>
              </div>

              {!importResult ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="text-[10px] uppercase text-muted font-bold tracking-wider">Option A: Paste Text</div>
                      <textarea
                        className="w-full bg-bg border border-border text-text font-serif text-[14px] p-4 min-h-[200px] outline-none focus:border-accent leading-relaxed"
                        placeholder="Paste your research notes here..."
                        value={importText}
                        onChange={e => {
                          setImportText(e.target.value);
                          setImportFile(null);
                        }}
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="text-[10px] uppercase text-muted font-bold tracking-wider">Option B: Upload Document</div>
                      <div className={cn(
                        "w-full bg-bg border-2 border-dashed border-border p-8 min-h-[200px] flex flex-col items-center justify-center text-center transition-all",
                        (importFile || importText) && "border-accent bg-accent/5"
                      )}>
                        {importFile ? (
                          <div className="space-y-4">
                            <FileText className="mx-auto text-accent" size={32} />
                            <div>
                              <div className="text-[14px] font-bold text-text truncate max-w-[200px]">{importFile.name}</div>
                              <div className="text-[10px] text-muted">{importFile.mimeType}</div>
                            </div>
                            <button 
                              onClick={() => setImportFile(null)}
                              className="text-[10px] text-accent hover:underline uppercase font-bold"
                            >
                              Remove File
                            </button>
                          </div>
                        ) : importText && !importFile ? (
                          <div className="space-y-4">
                            <FileText className="mx-auto text-accent" size={32} />
                            <div>
                              <div className="text-[14px] font-bold text-text truncate max-w-[200px]">Text File Loaded</div>
                              <div className="text-[10px] text-muted">{importText.length} characters</div>
                            </div>
                            <button 
                              onClick={() => setImportText('')}
                              className="text-[10px] text-accent hover:underline uppercase font-bold"
                            >
                              Remove Content
                            </button>
                          </div>
                        ) : (
                          <label className="cursor-pointer group">
                            <Upload className="mx-auto text-muted group-hover:text-accent transition-colors mb-4" size={32} />
                            <div className="text-[12px] text-muted group-hover:text-text transition-colors">
                              Click to upload PDF, DOCX, TXT, MD, CSV, or Image
                            </div>
                            <input 
                              type="file" 
                              className="hidden" 
                              accept=".pdf,.docx,.txt,.md,.csv,image/*"
                              onChange={handleFileChange}
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>

                  <button 
                    className="btn w-full flex items-center justify-center gap-2 py-4"
                    onClick={handleSmartImport}
                    disabled={isImporting || (!importText.trim() && !importFile)}
                  >
                    {isImporting ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        ANALYZING {importFile ? 'DOCUMENT' : 'TEXT'}...
                      </>
                    ) : (
                      <>
                        <FileUp size={16} />
                        EXTRACT NODES & CONTEXT
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="border border-accent/30 p-4 bg-accent/5">
                    <h4 className="text-accent text-[14px] font-serif mb-2">Extracted Preview</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h5 className="text-[10px] uppercase text-muted mb-2">Nodes Found ({importResult.nodes.length})</h5>
                        <div className="space-y-1">
                          {importResult.nodes.map((n, i) => (
                            <div key={i} className="flex items-center gap-2 text-[11px]">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[n.type as NodeType] || '#888' }} />
                              <span className="font-bold">{n.label}</span>
                              <span className="text-muted italic">({n.type})</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h5 className="text-[10px] uppercase text-muted mb-2">Edges Found ({importResult.edges.length})</h5>
                        <div className="space-y-1">
                          {importResult.edges.map((e, i) => (
                            <div key={i} className="text-[11px]">
                              {e.from} <span className="text-accent">→</span> {e.to}
                              <div className="text-muted text-[9px] ml-4">{e.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase text-muted">Context Summary</h4>
                    <div className="bg-surface border border-border p-4 font-serif text-[13px] leading-relaxed">
                      <ReactMarkdown>{importResult.context}</ReactMarkdown>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <button className="btn flex-1" onClick={commitImport}>
                      COMMIT TO INVESTIGATION
                    </button>
                    <button className="btn btn-m flex-1" onClick={() => { setImportResult(null); setImportFile(null); }}>
                      CANCEL / START OVER
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

const NODE_CATEGORIES: Record<string, NodeType[]> = {
  'Investigation Core': ['case', 'event', 'gap'],
  'Entities': ['actor', 'institution', 'location', 'object', 'suspect', 'witness', 'family', 'alias'],
  'Context': ['period', 'media', 'network', 'science', 'law', 'financial'],
  'Evidence & Analysis': ['document', 'relation', 'concept', 'rumor', 'pattern'],
};

function GraphView({ 
  nodes, 
  edges, 
  onSelectNode, 
  selectedNodeIds, 
  simulationTrigger, 
  onReLayout,
  highlightNodeTypes,
  setHighlightNodeTypes,
  allNodes,
  mainEventId,
  focusMainEvent,
  setFocusMainEvent,
  isActive,
}: { 
  nodes: NodeData[], 
  edges: EdgeData[], 
  onSelectNode: (id: string) => void,
  selectedNodeIds: Set<string>,
  simulationTrigger: number,
  onReLayout: () => void,
  highlightNodeTypes: Set<string>,
  setHighlightNodeTypes: React.Dispatch<React.SetStateAction<Set<string>>>,
  allNodes: NodeData[],
  mainEventId: string | null,
  focusMainEvent: boolean,
  setFocusMainEvent: React.Dispatch<React.SetStateAction<boolean>>,
  isActive?: boolean,
}) {
  const stageRef = useRef<any>(null);
  const simulationRef = useRef<any>(null);
  // Store the initial settled layout so we can snap back to the original 'gravity pattern' on double-click.
  const initialLayoutRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const initialLayoutKeyRef = useRef<string>('');

  const [dimensions, setDimensions] = useState({ width: window.innerWidth, height: window.innerHeight });
  const [graphNodes, setGraphNodes] = useState<any[]>([]);
  const [zoom, setZoom] = useState(1);

  // Main Event behavior (matches Unverifiable spider-graph feel):
  // - Main Event starts centered.
  // - Users can drag ANY node (including Main Event) and it stays where dropped.
  // - The camera/view does NOT follow the Main Event when it moves.
  // - Double‑click resets view + recenters the Main Event.
  const [isDraggingMainEvent, setIsDraggingMainEvent] = useState(false);
  const [isLegendCollapsed, setIsLegendCollapsed] = useState(false);
  const [isHeatmapMode, setIsHeatmapMode] = useState(false);
  const [pulse, setPulse] = useState(0);
  const [timelineIndex, setTimelineIndex] = useState<number | null>(null);

  const highlightActive = highlightNodeTypes.size > 0;

// Note: we intentionally do NOT auto-recenter the camera on the Main Event.
// Users keep full spatial control; reset (dbl‑click) recenters when needed.


  // Focus view: keep only the main event + 1-hop neighbors (optional).
  const focusIds = useMemo(() => {
    if (!focusMainEvent || !mainEventId) return null;
    const keep = new Set<string>();
    keep.add(mainEventId);
    edges.forEach(e => {
      if (e.from === mainEventId) keep.add(e.to);
      if (e.to === mainEventId) keep.add(e.from);
    });
    return keep;
  }, [focusMainEvent, mainEventId, edges]);

  const visibleNodes = useMemo(() => {
    if (!focusIds) return nodes;
    return nodes.filter(n => focusIds.has(n.id));
  }, [nodes, focusIds]);

  const visibleEdges = useMemo(() => {
    if (!focusIds) return edges;
    return edges.filter(e => focusIds.has(e.from) && focusIds.has(e.to));
  }, [edges, focusIds]);
  const dates = useMemo(() => {
    const d = allNodes.map(n => n.date).concat(visibleEdges.map(e => e.date)).filter(Boolean) as string[];
    return Array.from(new Set(d)).sort();
  }, [allNodes, visibleEdges]);

  useEffect(() => {
    if (dates.length > 0 && timelineIndex === null) {
      setTimelineIndex(dates.length - 1);
    }
  }, [dates]);

  const filteredGraphNodes = useMemo(() => {
    const base = graphNodes;
    if (timelineIndex === null || dates.length === 0) return base;
    const currentDate = dates[timelineIndex];
    return base.filter(n => !n.date || n.date <= currentDate);
  }, [graphNodes, timelineIndex, dates]);

  const filteredEdges = useMemo(() => {
    if (timelineIndex === null || dates.length === 0) return visibleEdges;
    const currentDate = dates[timelineIndex];
    return visibleEdges.filter(e => !e.date || e.date <= currentDate);
  }, [visibleEdges, timelineIndex, dates]);

  useEffect(() => {
    let frame: number;
    const animate = (time: number) => {
      setPulse(Math.sin(time / 300) * 0.5 + 0.5);
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, []);

  // When the Map tab opens, reset any weird pan/zoom so users don't land on a blank void.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.position({ x: 0, y: 0 });
    stage.scale({ x: 1, y: 1 });
    setZoom(1);
    stage.batchDraw();
  }, []);

  // Also reset whenever the map tab becomes active (helps if the tab stays mounted in some setups).
  useEffect(() => {
    if (!isActive) return;
    const stage = stageRef.current;
    if (!stage) return;
    stage.position({ x: 0, y: 0 });
    stage.scale({ x: 1, y: 1 });
    setZoom(1);
    stage.batchDraw();
  }, [isActive]);


  useEffect(() => {
    const handleResize = () => {
      const width = Math.max(320, window.innerWidth);
      const heightBase = window.innerWidth < 768 ? window.innerHeight - 160 : window.innerHeight - 100;
      const height = Math.max(320, heightBase);
      setDimensions({ width, height });
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize or update simulation
  useEffect(() => {
    const d3Nodes = visibleNodes.map(n => {
      const existing = graphNodes.find(gn => gn.id === n.id);
      const isMain = n.id === mainEventId;
      const centerX = dimensions.width / 2;
      const centerY = dimensions.height / 2;

      // If this is the Main Event and it doesn't already have a fixed position,
      // start it at the center AND fix it there until the user drags it.
      const fx = existing?.fx ?? (isMain ? centerX : undefined);
      const fy = existing?.fy ?? (isMain ? centerY : undefined);
      return {
        ...n,
        x: existing?.x || n.x || (isMain ? centerX : (centerX + (Math.random() - 0.5) * 100)),
        y: existing?.y || n.y || (isMain ? centerY : (centerY + (Math.random() - 0.5) * 100)),
        fx,
        fy
      };
    });

    const d3Edges = visibleEdges.map(e => ({
      source: e.from,
      target: e.to,
      weight: e.weight
    }));

    if (simulationRef.current) {
      simulationRef.current.stop();
    }

    const simulation = d3.forceSimulation(d3Nodes)
      .force('link', d3.forceLink(d3Edges).id((d: any) => d.id).distance(120).strength(0.5))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide().radius(60))
      .force('x', d3.forceX(dimensions.width / 2).strength(0.05))
      .force('y', d3.forceY(dimensions.height / 2).strength(0.05));
    // Main Event anchor behavior: layout stays user-controlled.
    // We do NOT pull nodes toward the main event (no gravity force).
    // Centering on the main event is handled as a camera/viewport feature below.

    if (simulationTrigger > 0) {
      // Release all fixed positions on re-layout
      d3Nodes.forEach(n => {
        n.fx = null;
        n.fy = null;
      });
      // Re-lock the main event to center after a re-layout (until the user drags it).
      if (mainEventId) {
        const main = d3Nodes.find((n: any) => n.id === mainEventId);
        if (main) {
          main.fx = dimensions.width / 2;
          main.fy = dimensions.height / 2;
        }
      }
    }

    simulationRef.current = simulation;

    // Capture the first "settled" layout as the reset target.
    const layoutKey = `${visibleNodes.map(n => n.id).join(',')}|${visibleEdges.map(e => `${e.from}->${e.to}`).join(',')}`;
    if (initialLayoutKeyRef.current !== layoutKey) {
      initialLayoutKeyRef.current = layoutKey;
      initialLayoutRef.current = new Map();
    }

    simulation.on('tick', () => {
      setGraphNodes([...d3Nodes]);

      // Once the simulation cools enough, store the positions as the initial "gravity pattern".
      if (initialLayoutRef.current.size === 0 && simulation.alpha() < 0.08) {
        const snapshot = new Map<string, { x: number; y: number }>();
        d3Nodes.forEach((n: any) => snapshot.set(n.id, { x: n.x ?? 0, y: n.y ?? 0 }));
        initialLayoutRef.current = snapshot;
      }
    });

    return () => { simulation.stop(); };
  }, [visibleNodes, visibleEdges, dimensions.width, dimensions.height, simulationTrigger, mainEventId]);

  const handleRecenter = (e?: any) => {
  const stage = stageRef.current;
  if (!stage) return;

  // Only treat double-click on empty space/background as a reset.
  // (Double-clicking a node should NOT trigger a layout reset.)
  if (e?.target && e.target !== stage) return;

  // Reset camera (pan/zoom).
  stage.scale({ x: 1, y: 1 });
  stage.position({ x: 0, y: 0 });
  stage.batchDraw();
  setZoom(1);

  // Reset node positions back to the first settled "gravity pattern".
  const sim = simulationRef.current;
  if (!sim) return;

  try {
    const simNodes: any[] = sim.nodes();
    const snapshot = initialLayoutRef.current;

    // Release any fixed positions so the reset is truly "back to default".
    simNodes.forEach((n: any) => {
      n.fx = null;
      n.fy = null;

      const p = snapshot.get(n.id);
      if (p) {
        n.x = p.x;
        n.y = p.y;
        n.vx = 0;
        n.vy = 0;
      }
    });

    // Keep Main Event anchored at center if configured.
    if (mainEventId) {
      const main = simNodes.find(n => n.id === mainEventId);
      if (main) {
        main.x = dimensions.width / 2;
        main.y = dimensions.height / 2;
        main.fx = dimensions.width / 2;
        main.fy = dimensions.height / 2;
      }
    }

    // Cool simulation: snap to the stored layout, but allow future drags to re-energize it.
    sim.alpha(0).alphaTarget(0);
    sim.restart();
    setGraphNodes([...simNodes]);
  } catch {
    // no-op
  }
};

  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const speed = 0.002;
    const newScale = e.evt.deltaY > 0 ? oldScale / (1 + speed * Math.abs(e.evt.deltaY)) : oldScale * (1 + speed * Math.abs(e.evt.deltaY));
    
    stage.scale({ x: newScale, y: newScale });
    setZoom(newScale);

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    stage.position(newPos);
    stage.batchDraw();
  };

  const toggleHighlightType = (type: string) => {
    setHighlightNodeTypes(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  return (
    <div className="w-full h-full bg-bg overflow-hidden relative">
      <Stage 
        width={dimensions.width} 
        height={dimensions.height} 
        draggable
        ref={stageRef}
        onDblClick={handleRecenter}
        onWheel={handleWheel}
        className="cursor-grab active:cursor-grabbing"
      >
        <Layer>
          {/* Grid lines */}
          {Array.from({ length: 40 }).map((_, i) => (
            <React.Fragment key={i}>
              <Line 
                points={[(i - 20) * 100, -2000, (i - 20) * 100, 2000]} 
                stroke="#1a1a1a" 
                strokeWidth={1} 
              />
              <Line 
                points={[-2000, (i - 20) * 100, 2000, (i - 20) * 100]} 
                stroke="#1a1a1a" 
                strokeWidth={1} 
              />
            </React.Fragment>
          ))}

          {/* Edges */}
          {filteredEdges.map((edge, i) => {
            // Try by id first; if your edges store labels, this fallback keeps them visible.
            const from =
              filteredGraphNodes.find((n) => n.id === edge.from) ||
              filteredGraphNodes.find((n) => n.label === (edge as any).from);
            const to =
              filteredGraphNodes.find((n) => n.id === edge.to) ||
              filteredGraphNodes.find((n) => n.label === (edge as any).to);

            if (!from || !to) {
              // Open DevTools console to see which edge couldn't be matched.
              console.log("EDGE NOT FOUND", edge, { fromFound: !!from, toFound: !!to });
              return null;
            }

            // Avoid NaN stroke widths when weight is missing / blank.
            const weightRaw: any = (edge as any).weight;
            const weightNum = typeof weightRaw === "number" ? weightRaw : Number(weightRaw);
            const w = Number.isFinite(weightNum) && weightNum > 0 ? weightNum : 1;

            const isHighlighted =
              selectedNodeIds.has(edge.from) || selectedNodeIds.has(edge.to);

            // Spider-graph style highlights: dim edges that aren't connected to highlighted node types.
            const fromType = normalizeNodeType(from.type);
            const toType = normalizeNodeType(to.type);
            const fromInHighlight = !highlightActive || highlightNodeTypes.has(fromType);
            const toInHighlight = !highlightActive || highlightNodeTypes.has(toType);
            const bothInHighlight = fromInHighlight && toInHighlight;
            const eitherInHighlight = fromInHighlight || toInHighlight;
            const isContradiction = edge.type === "conflict";
            const midX = (from.x + to.x) / 2;
            const midY = (from.y + to.y) / 2;
            const edgeType = String(edge.type ?? 'other').trim().toLowerCase();
        const edgeColor = EDGE_COLORS[edgeType] || '#444';

        const baseOpacity = highlightActive ? (bothInHighlight ? 0.95 : (eitherInHighlight ? 0.6 : 0.18)) : 0.65;
        const baseStroke = highlightActive ? (bothInHighlight ? 1.2 : (eitherInHighlight ? 1.05 : 0.9)) : 1.1;

return (
              <Group key={i}>
                <Line
                  points={[from.x, from.y, to.x, to.y]}
                  stroke={isHighlighted ? "#c8923f" : edgeColor}
                  strokeWidth={isHighlighted ? (w * 2.0) + 1.5 : (w * 2.0) * baseStroke}
                  lineCap="round"
                  lineJoin="round"
                  opacity={isContradiction ? 0.4 + (pulse * 0.4) : (isHighlighted ? 1 : baseOpacity)}
                  shadowBlur={isHighlighted || isContradiction ? 8 : 0}
                  shadowColor={isContradiction ? "#ff4444" : (isHighlighted ? "#c8923f" : "transparent")}
                />
                {/* Connection Points */}
                <Circle 
                  x={from.x} 
                  y={from.y} 
                  radius={2} 
                  fill={isHighlighted ? "#c8923f" : edgeColor} 
                  opacity={isHighlighted ? 1 : baseOpacity}
                />
                <Circle 
                  x={to.x} 
                  y={to.y} 
                  radius={2} 
                  fill={isHighlighted ? "#c8923f" : edgeColor} 
                  opacity={isHighlighted ? 1 : baseOpacity}
                />
                {isHighlighted && edge.label && (
                  <Group x={midX} y={midY}>
                    <Rect 
                      fill="#1a1a1a"
                      stroke="#c8923f"
                      strokeWidth={0.5}
                      width={edge.label.length * 6 + 10}
                      height={14}
                      offsetX={(edge.label.length * 6 + 10) / 2}
                      offsetY={7}
                      cornerRadius={2}
                    />
                    <Text 
                      text={edge.label}
                      fill="#c8923f"
                      fontSize={8}
                      fontFamily="JetBrains Mono"
                      align="center"
                      width={edge.label.length * 6 + 10}
                      offsetX={(edge.label.length * 6 + 10) / 2}
                      offsetY={4}
                    />
                  </Group>
                )}
              </Group>
            );
          })}

          {/* Nodes */}
          {filteredGraphNodes.map(node => (
            <Group 
              key={node.id} 
              x={node.x} 
              y={node.y}
              draggable
              onDragStart={() => {
                if (simulationRef.current) {
                  simulationRef.current.alphaTarget(0.3).restart();
                }
                if (node.id === mainEventId) setIsDraggingMainEvent(true);
                node.fx = node.x;
                node.fy = node.y;
              }}
              onDragMove={(e) => {
                node.fx = e.target.x();
                node.fy = e.target.y();
              }}
              onDragEnd={() => {
                if (simulationRef.current) {
                  simulationRef.current.alphaTarget(0);
                }
                if (node.id === mainEventId) {
                  setIsDraggingMainEvent(false);
                }
                // Keep fixed if you want, or release:
                // node.fx = null;
                // node.fy = null;
              }}
              onClick={() => onSelectNode(node.id)}
              onTap={() => onSelectNode(node.id)}
              className="cursor-pointer"
            >
              {(() => {
                const t = normalizeNodeType(node.type);
                const inHighlight = !highlightActive || highlightNodeTypes.has(t);
                const connectedCount = filteredEdges.filter(e => e.from === node.id || e.to === node.id).length;
                const r = 15 + (connectedCount * 2);
                const baseFill = COLORS[t] || '#888';
                // Subtle dimming (readable) instead of "disappear" dimming.
                const nodeOpacity = isHeatmapMode
                  ? (node.placeholder ? 1 : 0.2)
                  : (node.placeholder ? (inHighlight ? 0.65 : 0.35) : (inHighlight ? 1 : 0.38));

                const isTypeHighlighted = highlightActive && highlightNodeTypes.has(t);
                const isSelected = selectedNodeIds.has(node.id);

                return (
                  <>
                    {/* Outer spotlight ring (spider-graph style). */}
                    {(isTypeHighlighted || isSelected) && (
                      <Circle
                        radius={r + 7}
                        fill="transparent"
                        stroke={isSelected ? "#ffffff" : baseFill}
                        strokeWidth={2.5}
                        opacity={isSelected ? 0.9 : 0.55}
                        shadowBlur={18}
                        shadowColor={isSelected ? "#ffffff" : baseFill}
                      />
                    )}

                    <Circle
                      radius={r}
                      fill={baseFill}
                      stroke={isSelected ? '#fff' : 'transparent'}
                      strokeWidth={2}
                      dash={node.placeholder ? [5, 5] : undefined}
                      shadowBlur={isSelected || (isHeatmapMode && node.placeholder) ? 15 : 0}
                      shadowColor={isHeatmapMode && node.placeholder ? "#ff8800" : baseFill}
                      opacity={nodeOpacity}
                    />
                  </>
                );
              })()}
              {node.sectionId && (
                <Circle 
                  radius={4}
                  x={12}
                  y={-12}
                  fill="#7a9e7e"
                />
              )}
              <Text
                text={node.label}
                y={25}
                align="center"
                width={120}
                offsetX={60}
                fill={selectedNodeIds.has(node.id) ? '#fff' : '#aaa'}
                fontSize={10}
                fontFamily="JetBrains Mono"
              />
            </Group>
          ))}
        </Layer>
      </Stage>
      <div className="absolute bottom-5 left-5 text-[10px] text-muted pointer-events-none z-20 hidden md:block">
        DRAG to pan &nbsp;|&nbsp; SCROLL to zoom &nbsp;|&nbsp; CLICK to toggle highlight &nbsp;|&nbsp; DOUBLE CLICK to recenter view &nbsp;|&nbsp; DRAG NODES to pin &nbsp;|&nbsp; CLICK 'RESET' to restore natural clusters
      </div>
      <div className="absolute bottom-5 left-5 text-[10px] text-muted pointer-events-none z-20 md:hidden">
        DRAG to pan &nbsp;|&nbsp; PINCH to zoom &nbsp;|&nbsp; TAP to toggle highlight &nbsp;|&nbsp; DOUBLE TAP to recenter &nbsp;|&nbsp; RESET to restore clusters
      </div>

      {/* Map Controls */}
      <div className="absolute top-5 right-5 flex flex-col gap-2 z-30">
        <button 
          onClick={() => setIsHeatmapMode(!isHeatmapMode)}
          className={cn(
            "bg-panel/90 border border-border p-2 transition-colors shadow-lg flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold",
            isHeatmapMode ? "text-accent border-accent" : "text-muted hover:text-accent"
          )}
          title="Toggle Heatmap"
        >
          <AlertTriangle size={14} />
          {isHeatmapMode ? "HEATMAP ON" : "HEATMAP"}
        </button>

<button
  onClick={() => {
    if (!mainEventId) return;
    setFocusMainEvent(prev => !prev);
    // When turning focus on, gently re-center so users don't land in empty space.
    requestAnimationFrame(() => {
      if (stageRef.current) {
        stageRef.current.position({ x: 0, y: 0 });
        stageRef.current.scale({ x: 1, y: 1 });
      }
    });
  }}
  disabled={!mainEventId}
  className={cn(
    "bg-panel/90 border border-border p-2 transition-colors shadow-lg flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold",
    !mainEventId
      ? "opacity-50 cursor-not-allowed text-muted"
      : (focusMainEvent ? "text-accent border-accent" : "text-muted hover:text-accent")
  )}
  title={mainEventId ? "Focus the map on your Main Event node (toggle)" : "Set a Main Event first (Blueprint or Nodes & Edges)"}
>
  <Crosshair size={14} />
  {focusMainEvent ? "FOCUS ON" : "FOCUS"}
</button>
        <button 
          onClick={onReLayout}
          className="bg-panel/90 border border-border p-2 text-accent hover:bg-white/5 transition-colors shadow-lg flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold"
          title="Reset Layout"
        >
          <Sparkles size={14} />
          RESET LAYOUT
        </button>
      </div>

      {/* Temporal Playback Slider */}
      {dates.length > 1 && timelineIndex !== null && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 w-full max-w-md px-8 z-30">
          <div className="bg-panel/90 border border-border p-4 backdrop-blur-md shadow-2xl rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <div className="text-[10px] uppercase tracking-[2px] text-accent font-bold">Temporal Playback</div>
              <div className="text-[12px] font-mono text-text">{dates[timelineIndex]}</div>
            </div>
            <input 
              type="range" 
              min={0} 
              max={dates.length - 1} 
              value={timelineIndex}
              onChange={(e) => setTimelineIndex(parseInt(e.target.value))}
              className="w-full accent-accent cursor-pointer"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-muted uppercase tracking-widest">{dates[0]}</span>
              <span className="text-[8px] text-muted uppercase tracking-widest">{dates[dates.length - 1]}</span>
            </div>
          </div>
        </div>
      )}

      {/* Map Legend */}
      <div className={cn(
        "absolute top-5 left-5 bg-panel/95 border border-border backdrop-blur-md z-30 pointer-events-auto transition-all duration-300 shadow-2xl overflow-hidden flex flex-col",
        isLegendCollapsed ? "w-10 h-10 rounded-full items-center justify-center p-0" : "w-44 md:w-52 max-h-[60%] md:max-h-[85%] p-3"
      )}>
        {isLegendCollapsed ? (
          <button 
            onClick={() => setIsLegendCollapsed(false)}
            className="w-full h-full flex items-center justify-center text-accent hover:bg-white/5 transition-colors"
            title="Expand Legend"
          >
            <Layers size={18} />
          </button>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3 border-b border-border pb-1 shrink-0">
              <div className="flex items-center gap-1.5">
                <Layers size={10} className="text-accent" />
                <div className="text-[10px] tracking-[2px] text-muted uppercase font-bold">Layers</div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsLegendCollapsed(true)}
                  className="text-muted hover:text-accent p-1"
                  title="Collapse"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
              <div className="flex gap-2 mb-3">
                <button 
                  onClick={() => setHighlightNodeTypes(new Set())}
                  className="text-[8px] text-accent hover:underline"
                  title="Clear highlights"
                >
                  CLEAR HIGHLIGHTS
                </button>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <button
                  onClick={handleRecenter}
                  className="text-[8px] text-accent hover:underline"
                  title="Reset view (zoom + pan) and recenter the Main Event"
                >
                  RESET VIEW (DOUBLE‑CLICK)
                </button>
              </div>

        {/* Visual Key - Explaining the Language */}
        <div className="mb-6 pt-4 border-t border-border/30">
          <div className="text-[8px] text-muted uppercase tracking-widest mb-2 opacity-50">Visual Language</div>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <div className="w-3 h-3 rounded-full bg-accent flex-shrink-0 mt-0.5" />
              <div className="text-[10px] text-muted leading-tight">
                <span className="text-text font-bold block mb-0.5">Node Color</span>
                Represents the entity type (e.g., Red for Case/Event, Blue for Gap).
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full border-2 border-dashed border-muted flex-shrink-0 mt-0.5" />
              <div className="text-[10px] text-muted leading-tight">
                <span className="text-text font-bold block mb-0.5">Dashed Border</span>
                Indicates a "Hunch" or unverified entity (Placeholder).
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex flex-col items-center gap-1 mt-1 flex-shrink-0">
                <div className="w-3 h-3 rounded-full bg-muted" />
                <div className="w-5 h-5 rounded-full bg-muted" />
              </div>
              <div className="text-[10px] text-muted leading-tight">
                <span className="text-text font-bold block mb-0.5">Node Size</span>
                Nodes grow larger as they accumulate more connections.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="flex flex-col gap-1.5 mt-2 flex-shrink-0 w-6">
                <div className="h-[1px] w-full bg-muted opacity-30" />
                <div className="h-[3px] w-full bg-muted opacity-60" />
              </div>
              <div className="text-[10px] text-muted leading-tight">
                <span className="text-text font-bold block mb-0.5">Line Weight</span>
                Thicker lines represent stronger or more direct connections.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-4 h-0.5 bg-accent flex-shrink-0 mt-2" />
              <div className="text-[10px] text-muted leading-tight">
                <span className="text-text font-bold block mb-0.5">Connection Color</span>
                Shows relationship type (e.g., Red for Conflict, Green for Financial).
              </div>
            </div>
          </div>
        </div>

        {/* Highlights - Spider-graph style spotlighting */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[8px] text-muted uppercase tracking-widest opacity-50">Highlights</div>
            <button
              onClick={() => setHighlightNodeTypes(new Set())}
              className="text-[9px] text-muted hover:text-accent border border-border hover:border-accent px-2 py-0.5 rounded transition-colors"
              title="Clear all highlights"
            >
              CLEAR
            </button>
          </div>
          <div className="text-[10px] text-muted leading-tight">
            Select one or more types to spotlight. Click again to undo.
          </div>
        </div>
        
        <div className="space-y-4">
          {(() => {
            const available = getAvailableNodeTypes(allNodes);
            const seen = new Set<NodeType>();

            const blocks: JSX.Element[] = [];

            // Render the predefined categories first (clean + familiar).
            Object.entries(NODE_CATEGORIES).forEach(([catName, types]) => {
              const activeTypes = types.filter(t => available.has(t));
              if (activeTypes.length === 0) return;
              activeTypes.forEach(t => seen.add(t));

              blocks.push(
                <div key={catName} className="space-y-1.5">
                  <div className="text-[9px] text-accent/50 font-bold uppercase tracking-wider mb-1">{catName}</div>
                  {activeTypes.map(type => {
                    const count = allNodes.filter(n => normalizeNodeType((n as any).type) === type).length;
                    const isActive = highlightNodeTypes.has(type);
                    const color = COLORS[type] ?? '#888';
                    return (
                      <button
                        key={type}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleHighlightType(type);
                        }}
                        className={cn(
                          "flex items-center gap-2 w-full text-left transition-all hover:bg-white/5 p-1 rounded",
                          isActive ? "opacity-100" : (highlightNodeTypes.size > 0 ? "opacity-45" : "opacity-100")
                        )}
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold uppercase truncate">{type}</div>
                        </div>
                        <div className="text-[9px] text-muted">{count}</div>
                      </button>
                    );
                  })}
                </div>
              );
            });

            // Any types that exist in the graph but weren't in the predefined buckets.
            const leftovers = Array.from(available).filter(t => !seen.has(t));
            if (leftovers.length > 0) {
              blocks.push(
                <div key="Other" className="space-y-1.5">
                  <div className="text-[9px] text-accent/50 font-bold uppercase tracking-wider mb-1">Other</div>
                  {leftovers.map(type => {
                    const count = allNodes.filter(n => normalizeNodeType((n as any).type) === type).length;
                    const isActive = highlightNodeTypes.has(type);
                    const color = COLORS[type] ?? '#888';
                    return (
                      <button
                        key={type}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleHighlightType(type);
                        }}
                        className={cn(
                          "flex items-center gap-2 w-full text-left transition-all hover:bg-white/5 p-1 rounded",
                          isActive ? "opacity-100" : (highlightNodeTypes.size > 0 ? "opacity-45" : "opacity-100")
                        )}
                      >
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-bold uppercase truncate">{type}</div>
                        </div>
                        <div className="text-[9px] text-muted">{count}</div>
                      </button>
                    );
                  })}
                </div>
              );
            }

            return blocks;
          })()}
        </div>
              <div className="mt-4 pt-2 border-t border-border text-[8px] text-muted leading-tight shrink-0">
                Click types to toggle. Double-click background to center.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SmartText({ text, project, onSelectNode }: { text: string, project: ProjectData, onSelectNode: (id: string) => void }) {
  // Simple regex to find node labels in text
  const parts = useMemo(() => {
    if (!text) return [];
    let result: (string | { nodeId: string, label: string })[] = [text];
    
    project.nodes.forEach(node => {
      const newResult: (string | { nodeId: string, label: string })[] = [];
      result.forEach(part => {
        if (typeof part === 'string') {
          const regex = new RegExp(`(${node.label})`, 'gi');
          const split = part.split(regex);
          split.forEach(s => {
            if (s.toLowerCase() === node.label.toLowerCase()) {
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
    <p className="text-[13px] leading-relaxed text-text">
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
    </p>
  );
}

function NodePanel({ node, onClose, onSelectNode, onGoToSection, onEditNode, onEditDoc, project }: { 
  node?: NodeData, 
  onClose: () => void,
  onSelectNode: (id: string) => void,
  onGoToSection: (id: string) => void,
  onEditNode: (id: string) => void,
  onEditDoc: (id: string) => void,
  project: ProjectData
}) {
  if (!node) return null;

  const linkedSection = project.sections.find(s => s.id === node.sectionId);
  const linkedDocs = project.documents.filter(d => d.nodeIds.includes(node.id));
  
  // Find backlinks: other nodes that mention this node's label in their description
  const backlinks = project.nodes.filter(n => 
    n.id !== node.id && n.description.toLowerCase().includes(node.label.toLowerCase())
  );

  // Find incoming connections
  const incomingEdges = project.edges.filter(e => e.to === node.id);

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="absolute top-0 right-0 w-full md:w-[360px] h-full bg-panel border-l border-border overflow-y-auto p-6 z-40 shadow-2xl"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className="text-[10px] tracking-[2px] uppercase font-bold" style={{ color: COLORS[node.type] }}>
            {node.type}
          </div>
          {node.placeholder && (
            <span className="text-[9px] bg-accent/20 text-accent px-1.5 py-0.5 rounded border border-accent/30">HUNCH / UNVERIFIED</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onEditNode(node.id)}
            className="text-muted hover:text-accent transition-colors p-1"
            title="Edit Entity"
          >
            <Edit2 size={16} />
          </button>
          <button 
            onClick={onClose}
            className="text-muted hover:text-text transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <h2 className="font-serif text-[20px] text-accent leading-tight mb-4">
        {node.label}
      </h2>

      <div className="mb-6">
        <SmartText text={node.description} project={project} onSelectNode={onSelectNode} />
      </div>

      {node.sentiment && (
        <div className="mb-4 flex items-center gap-2">
          <span className="text-[10px] text-muted uppercase">Sentiment:</span>
          <span className="text-[11px] text-accent font-bold">{node.sentiment}</span>
        </div>
      )}

      <hr className="border-border my-6" />

      <div className="space-y-6">
        {linkedSection && (
          <div>
            <div className="text-[10px] tracking-[1px] text-muted uppercase mb-2 flex items-center gap-1">
              <FileText size={10} /> Linked Context
            </div>
            <button 
              onClick={() => onGoToSection(linkedSection.id)}
              className="w-full text-left bg-surface border border-border p-3 hover:border-accent transition-colors group"
            >
              <div className="text-[10px] text-muted mb-1">{linkedSection.category}</div>
              <div className="text-[13px] font-serif group-hover:text-accent">{linkedSection.heading}</div>
            </button>
          </div>
        )}

        {incomingEdges.length > 0 && (
          <div>
            <div className="text-[10px] tracking-[1px] text-muted uppercase mb-2 flex items-center gap-1">
              <LinkIcon size={10} /> Incoming Connections
            </div>
            <div className="space-y-2">
              {incomingEdges.map((edge, i) => {
                const fromNode = project.nodes.find(n => n.id === edge.from);
                return (
                  <button 
                    key={i}
                    onClick={() => onSelectNode(edge.from)}
                    className="w-full text-left bg-surface border border-border p-2 hover:border-accent transition-colors flex items-center gap-2"
                  >
                    <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[fromNode?.type || 'actor'] }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold truncate">{fromNode?.label}</div>
                      <div className="text-[9px] text-muted truncate">{edge.label}</div>
                    </div>
                    <ChevronRight size={12} className="text-muted" />
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {backlinks.length > 0 && (
          <div>
            <div className="text-[10px] tracking-[1px] text-muted uppercase mb-2 flex items-center gap-1">
              <Search size={10} /> Referenced In
            </div>
            <div className="space-y-2">
              {backlinks.map(n => (
                <button 
                  key={n.id}
                  onClick={() => onSelectNode(n.id)}
                  className="w-full text-left bg-surface border border-border p-2 hover:border-accent transition-colors flex items-center gap-2"
                >
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[n.type] }} />
                  <span className="text-[11px] flex-1 truncate">{n.label}</span>
                  <ChevronRight size={12} className="text-muted" />
                </button>
              ))}
            </div>
          </div>
        )}

        {linkedDocs.length > 0 && (
          <div>
            <div className="text-[10px] tracking-[1px] text-muted uppercase mb-2 flex items-center gap-1">
              <Database size={10} /> Evidence Documents
            </div>
            <div className="space-y-2">
              {linkedDocs.map(doc => (
                <div key={doc.id} className="bg-surface border border-border p-3 group">
                  <div className="flex justify-between items-start mb-1">
                    <div className="text-[12px] font-bold">{doc.title}</div>
                    <button 
                      onClick={() => onEditDoc(doc.id)}
                      className="text-muted hover:text-accent opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                  <div className="text-[10px] text-muted">{doc.institution}</div>
                  {doc.url && (
                    <a href={doc.url} target="_blank" className="text-accent hover:underline text-[10px] mt-2 inline-flex items-center gap-1">
                      <ExternalLink size={10} /> VIEW SOURCE
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {node.sources.length > 0 && (
          <div>
            <div className="text-[10px] tracking-[1px] text-muted uppercase mb-2 flex items-center gap-1">
              <Layers size={10} /> Sources
            </div>
            <ul className="space-y-2">
              {node.sources.map((src, i) => (
                <li key={i} className="text-[11px] text-text flex items-start gap-2">
                  <span className="text-accent mt-1">•</span>
                  <div className="flex-1">
                    {src.url ? (
                      <a href={src.url} target="_blank" className="hover:underline text-accent font-bold">
                        {src.label} <ExternalLink size={8} className="inline ml-1" />
                      </a>
                    ) : (
                      <span>{src.label}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {node.tags.length > 0 && (
          <div>
            <div className="text-[10px] tracking-[1px] text-muted uppercase mb-2">Tags</div>
            <div className="flex flex-wrap gap-2">
              {node.tags.map((tag, i) => (
                <span key={i} className="bg-surface border border-border px-2 py-0.5 text-[10px] text-muted">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
