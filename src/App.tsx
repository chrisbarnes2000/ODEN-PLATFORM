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
  ArrowRight,
  Trash2,
  ExternalLink,
  Globe,
  AlertTriangle,
  FileUp,
  Loader2,
  Eye,
  EyeOff,
  Sparkles,
  Edit2,
  BrainCircuit
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
  NodeType,
  Proposal
} from './types';
import { extractEntitiesFromText, extractEntitiesFromDocument, SmartImportResult, generateProposals } from './services/geminiService';

import BlueprintTab from './components/BlueprintTab';
import ContextTab from './components/ContextTab';
import DocsTab from './components/DocsTab';
import NodesTab from './components/NodesTab';
import AIInsightsTab from './components/AIInsightsTab';
import MethodologyCheckTab from './components/MethodologyCheckTab';
import QuickStartTab from './components/QuickStartTab';
import ProposalTray from './components/ProposalTray';
import SourcesTab from './components/SourcesTab';
import GraphView from './components/GraphView';
import NodePanel from './components/NodePanel';
import { COLORS, EDGE_COLORS } from './constants';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const INITIAL_PROJECT: ProjectData = {
  caseName: '',
  nodes: [],
  edges: [],
  sections: [],
  documents: [],
  sources: [],
  blueprint: {},
  completedPhases: [],
  proposals: [],
};

export default function App() {
  const [project, setProject] = useState<ProjectData>(() => {
    const saved = localStorage.getItem('oden_project');
    const data = saved ? JSON.parse(saved) : INITIAL_PROJECT;
    // Ensure new fields exist for backward compatibility
    return {
      ...INITIAL_PROJECT,
      ...data,
      proposals: data.proposals || []
    };
  });
  const [activeTab, setActiveTab] = useState('guide');
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [editingNodeIdFromPanel, setEditingNodeIdFromPanel] = useState<string | null>(null);
  const [editingDocIdFromPanel, setEditingDocIdFromPanel] = useState<string | null>(null);
  const [hiddenNodeTypes, setHiddenNodeTypes] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importText, setImportText] = useState('');
  const [importResult, setImportResult] = useState<SmartImportResult | null>(null);
  const [simulationTrigger, setSimulationTrigger] = useState(0);
  const [isGeneratingProposals, setIsGeneratingProposals] = useState(false);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleGenerateProposals = async (contextText?: string, customProject?: ProjectData) => {
    setIsGeneratingProposals(true);
    const targetProject = customProject || project;
    try {
      const suggestions = await generateProposals(targetProject, contextText);
      const newProposals: Proposal[] = suggestions.map((s: any, i: number) => ({
        id: `prop-${Date.now()}-${i}`,
        type: s.type,
        data: s.data,
        justification: s.justification,
        sourceSnippet: s.sourceSnippet,
        confidence: s.confidence,
        status: 'pending'
      }));
      setProject(prev => ({
        ...prev,
        proposals: [...prev.proposals, ...newProposals]
      }));
      setActiveTab('proposals');
    } catch (error) {
      console.error('Failed to generate proposals:', error);
      alert('Failed to generate AI proposals.');
    } finally {
      setIsGeneratingProposals(false);
    }
  };

  const handleApproveProposal = (proposal: Proposal) => {
    setProject(prev => {
      let updatedNodes = [...prev.nodes];
      let updatedEdges = [...prev.edges];

      if (proposal.type === 'create_node') {
        const newNode: NodeData = {
          id: `n-${Date.now()}`,
          label: proposal.data.label,
          type: proposal.data.type,
          description: proposal.data.description,
          placeholder: proposal.data.placeholder,
          confidence: proposal.confidence,
          tags: [],
          sources: [],
          x: Math.random() * 800 - 400,
          y: Math.random() * 600 - 300,
        };
        updatedNodes.push(newNode);
      } else if (proposal.type === 'create_edge') {
        const fromNode = prev.nodes.find(n => n.label === proposal.data.fromLabel);
        const toNode = prev.nodes.find(n => n.label === proposal.data.toLabel);
        if (fromNode && toNode) {
          updatedEdges.push({
            from: fromNode.id,
            to: toNode.id,
            label: proposal.data.label,
            type: proposal.data.type || 'relation',
            weight: 1,
            confidence: proposal.confidence
          });
        }
      } else if (proposal.type === 'promote_placeholder') {
        updatedNodes = updatedNodes.map(n => 
          n.id === proposal.data.nodeId ? { ...n, placeholder: false } : n
        );
      } else if (proposal.type === 'merge_nodes') {
        const { nodeAId, nodeBId, mergedLabel, mergedDescription } = proposal.data;
        const nodeA = updatedNodes.find(n => n.id === nodeAId);
        const nodeB = updatedNodes.find(n => n.id === nodeBId);
        
        if (nodeA && nodeB) {
          // Create merged node
          const mergedNode: NodeData = {
            ...nodeA,
            label: mergedLabel || nodeA.label,
            description: mergedDescription || `${nodeA.description}\n\nMerged with ${nodeB.label}: ${nodeB.description}`,
            sources: [...nodeA.sources, ...nodeB.sources],
            tags: Array.from(new Set([...nodeA.tags, ...nodeB.tags]))
          };
          
          // Update nodes list
          updatedNodes = updatedNodes.filter(n => n.id !== nodeAId && n.id !== nodeBId);
          updatedNodes.push(mergedNode);
          
          // Update edges to point to merged node
          updatedEdges = updatedEdges.map(e => {
            if (e.from === nodeBId) return { ...e, from: nodeAId };
            if (e.to === nodeBId) return { ...e, to: nodeAId };
            return e;
          });
        }
      } else if (proposal.type === 'update_node') {
        const { nodeId, label, description, type } = proposal.data;
        updatedNodes = updatedNodes.map(n => 
          n.id === nodeId ? { ...n, label: label || n.label, description: description || n.description, type: type || n.type } : n
        );
      } else if (proposal.type === 'create_context') {
        const newSection: ContextSection = {
          id: `ctx-${Date.now()}`,
          heading: proposal.data.heading,
          category: proposal.data.category || 'AI Analysis',
          body: proposal.data.body,
          linkedNodeIds: []
        };
        return {
          ...prev,
          sections: [...prev.sections, newSection],
          proposals: prev.proposals.map(p => p.id === proposal.id ? { ...p, status: 'approved' } : p)
        };
      }

      return {
        ...prev,
        nodes: updatedNodes,
        edges: updatedEdges,
        proposals: prev.proposals.map(p => p.id === proposal.id ? { ...p, status: 'approved' } : p)
      };
    });
  };

  const handleDismissProposal = (proposalId: string) => {
    setProject(prev => ({
      ...prev,
      proposals: prev.proposals.map(p => p.id === proposalId ? { ...p, status: 'dismissed' } : p)
    }));
  };

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
      const fullContext = project.sections.map(s => s.body).join('\n');
      if (importFile) {
        result = await extractEntitiesFromDocument(
          { data: importFile.data, mimeType: importFile.mimeType }, 
          project.nodes,
          fullContext,
          project.documents,
          project.sources,
          project.blueprint
        );
      } else {
        result = await extractEntitiesFromText(
          importText, 
          project.nodes,
          fullContext,
          project.documents,
          project.sources,
          project.blueprint
        );
      }
      setImportResult(result);
    } catch (error) {
      console.error('Import failed:', error);
      alert('Smart import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleSimpleUpload = () => {
    if (!importText.trim() && !importFile) return;
    
    const newDoc: DocumentData = {
      id: `doc-${Date.now()}`,
      title: importFile?.name || (importText.split('\n')[0].substring(0, 50)) || 'Imported Document',
      category: 'Evidence',
      status: 'received',
      description: `Uploaded on ${new Date().toLocaleString()}`,
      originalContent: importText || undefined,
      date: new Date().toISOString().split('T')[0],
      url: '',
      nodeIds: [],
      fileName: importFile?.name,
      mimeType: importFile?.mimeType || 'text/plain',
      imageData: importFile?.data
    };
    
    setProject(prev => ({
      ...prev,
      documents: [...prev.documents, newDoc]
    }));
    
    setImportText('');
    setImportFile(null);
    setActiveTab('docs');
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

  const commitImport = () => {
    if (!importResult) return;

    const includedNodes = importResult.nodes.filter(n => n.included !== false);
    const includedEdges = importResult.edges.filter(e => e.included !== false);

    const newNodes: NodeData[] = includedNodes.map((n, i) => ({
      id: `n-imp-${Date.now()}-${i}`,
      label: n.label,
      type: n.type as NodeType,
      description: n.description,
      confidence: n.confidence,
      tags: n.reasoning ? [`Reasoning: ${n.reasoning}`] : [],
      sources: [],
      x: Math.random() * 800 - 400,
      y: Math.random() * 600 - 300,
    }));

    const newEdges: EdgeData[] = includedEdges.map(e => {
      const fromNode = newNodes.find(n => n.label === e.from) || project.nodes.find(n => n.label === e.from);
      const toNode = newNodes.find(n => n.label === e.to) || project.nodes.find(n => n.label === e.to);
      return {
        from: fromNode?.id || '',
        to: toNode?.id || '',
        label: e.label,
        weight: 1,
        type: e.type || 'import',
        confidence: e.confidence
      };
    }).filter(e => e.from && e.to);

    const newSources: SourceData[] = [
      ...importResult.urls.map((url, i) => ({
        id: `src-imp-url-${Date.now()}-${i}`,
        title: `Extracted: ${url.split('/')[2] || 'Source'}`,
        institution: 'AI Extraction',
        date: new Date().toISOString().split('T')[0],
        rg: 'N/A',
        url,
        notes: 'Automatically extracted during smart import.',
        type: 'url' as const
      })),
      ...importResult.emails.map((email, i) => ({
        id: `src-imp-email-${Date.now()}-${i}`,
        title: `Email: ${email.subject}`,
        institution: 'AI Extraction',
        date: email.date,
        rg: 'N/A',
        url: email.url,
        notes: `From: ${email.sender}\nTo: ${email.recipient}\nSubject: ${email.subject}`,
        type: 'email' as const,
        sender: email.sender,
        recipient: email.recipient,
        subject: email.subject
      }))
    ];

    const docId = `doc-${Date.now()}`;
    const newDoc: DocumentData = {
      id: docId,
      title: importFile?.name || (importText.split('\n')[0].substring(0, 50)) || 'Imported Text',
      category: 'RESEARCH',
      status: 'received',
      description: `Imported on ${new Date().toLocaleString()}`,
      originalContent: importText || undefined,
      summary: importResult.context,
      nodeIds: newNodes.map(n => n.id),
      date: new Date().toISOString().split('T')[0],
      fileName: importFile?.name,
      mimeType: importFile?.mimeType || 'text/plain',
      imageData: importFile?.data
    };

    const newSection: ContextSection = {
      id: `s-${Date.now()}`,
      category: 'IMPORT',
      heading: `Imported Context: ${newDoc.title}`,
      body: importResult.context,
      linkedNodeIds: newNodes.map(n => n.id),
    };

    const nextProject: ProjectData = {
      ...project,
      nodes: [...project.nodes, ...newNodes],
      edges: [...project.edges, ...newEdges],
      sections: [...project.sections, newSection],
      documents: [...project.documents, newDoc],
      sources: [...project.sources, ...newSources],
    };

    setProject(nextProject);

    setImportResult(null);
    setImportText('');
    setImportFile(null);
    setActiveTab('map');
    
    handleGenerateProposals(importResult.context, nextProject);
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
          DOCS <span className="text-accent">{project.documents.length}</span>
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
      <nav className="flex border-b border-border bg-panel flex-shrink-0 overflow-x-auto relative no-scrollbar">
        <div className="flex md:hidden items-center px-4 border-r border-border bg-surface z-50 sticky left-0">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 text-accent hover:bg-white/5 transition-colors"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Plus size={20} className="rotate-45" />}
          </button>
        </div>

        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-full left-0 w-full bg-panel border-b border-border z-50 md:hidden shadow-2xl overflow-y-auto max-h-[70vh]"
            >
              <div className="flex flex-col p-2">
                {[
                  { id: 'guide', label: '? Quick Start', icon: Info },
                  { id: 'map', label: '◈ Map', icon: MapIcon },
                  { id: 'context', label: '≡ Context', icon: FileText },
                  { id: 'docs', label: '☰ Documents', icon: Database },
                  { id: 'sources', label: 'Sources', icon: Globe },
                  { id: 'blueprint', label: '☷ Blueprint', icon: Layers },
                  { id: 'nodes', label: '⊞ Nodes & Edges', icon: Plus },
                  { id: 'check', label: '✓ Methodology', icon: CheckCircle },
                  { id: 'import', label: '⇑ Smart Import', icon: FileUp, ai: true },
                  { id: 'proposals', label: '✧ Proposals', icon: Sparkles, ai: true },
                  { id: 'ai-insights', label: '✧ AI Insights', icon: BrainCircuit, ai: true },
                  { id: 'save', label: '⇓ Save', icon: Save },
                ].map((tab: any) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-3 p-4 text-[12px] tracking-[1px] uppercase font-bold transition-all border-b border-border/50 last:border-none",
                      activeTab === tab.id ? "text-accent bg-accent/5" : "text-muted hover:text-text",
                      tab.ai && "text-accent/70"
                    )}
                  >
                    <tab.icon size={16} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-nowrap">
          {[
            { id: 'guide', label: '? Quick Start', icon: Info },
            { id: 'map', label: '◈ Map', icon: MapIcon },
            { id: 'context', label: '≡ Context', icon: FileText },
            { id: 'docs', label: '☰ Documents', icon: Database },
            { id: 'sources', label: 'Sources', icon: Globe },
            { id: 'blueprint', label: '☷ Blueprint', icon: Layers },
            { id: 'nodes', label: '⊞ Nodes & Edges', icon: Plus },
            { id: 'check', label: '✓ Methodology', icon: CheckCircle },
            { type: 'divider' },
            { id: 'import', label: '⇑ Smart Import', icon: FileUp, ai: true },
            { id: 'proposals', label: '✧ Proposals', icon: Sparkles, ai: true },
            { id: 'ai-insights', label: '✧ AI Insights', icon: BrainCircuit, ai: true },
            { type: 'divider' },
            { id: 'save', label: '⇓ Save', icon: Save },
          ].map((tab: any, idx) => (
            tab.type === 'divider' ? (
              <div key={`div-${idx}`} className="w-[1px] h-6 bg-border self-center mx-2 shrink-0 hidden md:block" />
            ) : (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "tab-btn flex items-center gap-2 shrink-0",
                  activeTab === tab.id && "active",
                  tab.ai && "text-accent/70 hover:text-accent"
                )}
              >
                <tab.icon size={14} />
                <span className="hidden sm:inline">{tab.label.toUpperCase()}</span>
                <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              </button>
            )
          ))}
        </div>
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
                nodes={project.nodes.filter(n => !hiddenNodeTypes.has(n.type))} 
                edges={project.edges.filter(e => {
                  const from = project.nodes.find(n => n.id === e.from);
                  const to = project.nodes.find(n => n.id === e.to);
                  return from && to && !hiddenNodeTypes.has(from.type) && !hiddenNodeTypes.has(to.type);
                })} 
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
                hiddenNodeTypes={hiddenNodeTypes}
                setHiddenNodeTypes={setHiddenNodeTypes}
                allNodes={project.nodes}
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
              />
            </motion.div>
          )}

              {activeTab === 'proposals' && (
                <motion.div 
                  key="proposals"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex-1 p-8 overflow-y-auto max-w-4xl mx-auto w-full"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-[24px] font-serif text-accent mb-2">AI Proposals</h2>
                      <p className="text-muted text-[14px]">Review and approve structural suggestions from the AI analyst.</p>
                    </div>
                    <button 
                      className="btn btn-lg flex items-center gap-2"
                      onClick={() => handleGenerateProposals()}
                      disabled={isGeneratingProposals}
                    >
                      {isGeneratingProposals ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} />}
                      GENERATE NEW PROPOSALS
                    </button>
                  </div>

                  <div className="mb-6 p-4 bg-accent/5 border border-accent/10 rounded-lg flex items-start gap-3">
                    <Info size={18} className="text-accent shrink-0 mt-0.5" />
                    <div className="text-[12px] text-muted leading-relaxed">
                      <span className="font-bold text-accent uppercase tracking-wider block mb-1">AI Disclaimer</span>
                      ODEN AI does not make any changes to your investigation without explicit authorization. 
                      <span className="text-text font-medium"> All suggestions are based strictly on the context you have provided or uploaded. No external data is used.</span>
                    </div>
                  </div>

              <ProposalTray 
                project={project}
                onApprove={handleApproveProposal}
                onDismiss={handleDismissProposal}
                onEdit={(p) => setEditingProposal(p)}
              />
            </motion.div>
          )}

          {activeTab === 'ai-insights' && (
            <motion.div 
              key="ai-insights"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 overflow-hidden"
            >
              <AIInsightsTab 
                project={project} 
                onUpdateBriefing={(briefing) => setProject(prev => ({ ...prev, briefing }))}
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
                onClearEditing={() => setEditingDocIdFromPanel(null)}
              />
            </motion.div>
          )}

          {activeTab === 'sources' && (
            <motion.div 
              key="sources"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 p-8 overflow-y-auto"
            >
              <SourcesTab 
                project={project} 
                setProject={setProject} 
                onSelectNode={(id) => { setSelectedNodeIds(new Set([id])); setActiveTab('map'); }}
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

              <div className="mb-6 p-4 bg-accent/5 border border-accent/10 rounded-lg flex items-start gap-3">
                <Info size={18} className="text-accent shrink-0 mt-0.5" />
                <div className="text-[12px] text-muted leading-relaxed">
                  <span className="font-bold text-accent uppercase tracking-wider block mb-1">AI Disclaimer</span>
                  This tool analyzes your uploaded text and documents to suggest nodes and connections. 
                  <span className="text-text font-medium"> It does not search outside your provided research, and it will not add anything to your map without your explicit approval via the Proposals tab.</span>
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

                  <div className="flex flex-col gap-3">
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
                          <Sparkles size={16} />
                          SMART EXTRACT (AI)
                        </>
                      )}
                    </button>
                    
                    <button 
                      className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-lg text-muted hover:text-text hover:bg-surface transition-all text-[12px] font-bold uppercase"
                      onClick={handleSimpleUpload}
                      disabled={isImporting || (!importText.trim() && !importFile)}
                    >
                      <FileUp size={16} />
                      SIMPLE UPLOAD (NO AI)
                    </button>
                    
                    <div className="text-[10px] text-center text-muted italic">
                      AI extraction is optional. Simple upload just adds the content to your Documents tab.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="bg-accent/5 border border-border/20 p-4 rounded-lg flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                      <AlertTriangle size={20} className="text-accent" />
                    </div>
                    <div>
                      <h4 className="text-[12px] font-bold text-accent uppercase tracking-wider mb-1">AI Intelligence Disclaimer</h4>
                      <p className="text-[11px] text-accent/80 leading-relaxed">
                        These entities and relationships were extracted automatically by the Gemini AI engine. 
                        <strong> AI can make mistakes or hallucinate information.</strong> 
                        Always verify extracted data against your primary sources. You have full control: edit or remove any item before committing.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] uppercase text-muted font-bold tracking-widest">Source Context</h4>
                      </div>
                      <div className="bg-bg border border-border p-4 rounded-lg h-[400px] overflow-y-auto text-[12px] font-serif leading-relaxed text-muted whitespace-pre-wrap">
                        {importText || "Multimodal document (PDF/Image) - Text extracted by AI engine."}
                      </div>
                    </div>

                    <div className="lg:col-span-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] uppercase text-muted font-bold tracking-widest">Extracted Nodes ({importResult.nodes.length})</h4>
                        <button 
                          onClick={() => setImportResult(prev => prev ? { ...prev, nodes: [...prev.nodes, { label: 'New Entity', type: 'actor', description: '', confidence: 'medium' }] } : null)}
                          className="text-[10px] text-accent hover:underline uppercase font-bold flex items-center gap-1"
                        >
                          <Plus size={10} /> Add Node
                        </button>
                      </div>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {importResult.nodes.map((n, i) => (
                          <div key={i} className={cn(
                            "bg-surface border p-3 rounded group relative transition-opacity",
                            n.included === false ? "opacity-40 grayscale border-border/20" : "border-border"
                          )}>
                            <div className="absolute top-2 right-2 flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  const newNodes = [...importResult.nodes];
                                  newNodes[i].included = n.included === false ? true : false;
                                  setImportResult({ ...importResult, nodes: newNodes });
                                }}
                                className={cn(
                                  "p-1 rounded transition-colors",
                                  n.included === false ? "text-muted hover:text-accent" : "text-accent hover:text-muted"
                                )}
                                title={n.included === false ? "Include" : "Exclude"}
                              >
                                {n.included === false ? <Plus size={12} /> : <X size={12} />}
                              </button>
                              <button 
                                onClick={() => setImportResult(prev => prev ? { ...prev, nodes: prev.nodes.filter((_, idx) => idx !== i) } : null)}
                                className="text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              <input 
                                className="bg-bg border border-border rounded px-2 py-1 text-[11px] font-bold outline-none focus:border-accent"
                                value={n.label}
                                onChange={e => {
                                  const newNodes = [...importResult.nodes];
                                  newNodes[i].label = e.target.value;
                                  setImportResult({ ...importResult, nodes: newNodes });
                                }}
                              />
                              <select 
                                className="bg-bg border border-border rounded px-2 py-1 text-[11px] outline-none focus:border-accent"
                                value={n.type}
                                onChange={e => {
                                  const newNodes = [...importResult.nodes];
                                  newNodes[i].type = e.target.value;
                                  setImportResult({ ...importResult, nodes: newNodes });
                                }}
                              >
                                {Object.keys(COLORS).map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                              </select>
                            </div>
                            <textarea 
                              className="w-full bg-bg border border-border rounded px-2 py-1 text-[10px] min-h-[40px] outline-none focus:border-accent"
                              value={n.description}
                              onChange={e => {
                                const newNodes = [...importResult.nodes];
                                newNodes[i].description = e.target.value;
                                setImportResult({ ...importResult, nodes: newNodes });
                              }}
                            />
                            {n.reasoning && (
                              <div className="mt-2 p-2 bg-accent/5 border border-accent/10 rounded text-[9px] text-accent italic">
                                <strong>AI Reasoning:</strong> {n.reasoning}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[8px] uppercase text-muted font-bold">Confidence:</span>
                              <div className="flex gap-1">
                                {['low', 'medium', 'high'].map(level => (
                                  <button
                                    key={level}
                                    onClick={() => {
                                      const newNodes = [...importResult.nodes];
                                      newNodes[i].confidence = level;
                                      setImportResult({ ...importResult, nodes: newNodes });
                                    }}
                                    className={cn(
                                      "text-[8px] px-1.5 py-0.5 rounded uppercase font-bold transition-colors",
                                      n.confidence === level 
                                        ? (level === 'high' ? 'bg-green-500/20 text-green-400' : level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400')
                                        : 'bg-bg text-muted hover:text-text'
                                    )}
                                  >
                                    {level}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] uppercase text-muted font-bold tracking-widest">Extracted Edges ({importResult.edges.length})</h4>
                        <button 
                          onClick={() => setImportResult(prev => prev ? { ...prev, edges: [...prev.edges, { from: '', to: '', label: 'connected to', confidence: 'medium' }] } : null)}
                          className="text-[10px] text-accent hover:underline uppercase font-bold flex items-center gap-1"
                        >
                          <Plus size={10} /> Add Edge
                        </button>
                      </div>
                      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {importResult.edges.map((e, i) => (
                          <div key={i} className={cn(
                            "bg-surface border p-3 rounded group relative transition-opacity",
                            e.included === false ? "opacity-40 grayscale border-border/20" : "border-border"
                          )}>
                            <div className="absolute top-2 right-2 flex items-center gap-2">
                              <button 
                                onClick={() => {
                                  const newEdges = [...importResult.edges];
                                  newEdges[i].included = e.included === false ? true : false;
                                  setImportResult({ ...importResult, edges: newEdges });
                                }}
                                className={cn(
                                  "p-1 rounded transition-colors",
                                  e.included === false ? "text-muted hover:text-accent" : "text-accent hover:text-muted"
                                )}
                                title={e.included === false ? "Include" : "Exclude"}
                              >
                                {e.included === false ? <Plus size={12} /> : <X size={12} />}
                              </button>
                              <button 
                                onClick={() => setImportResult(prev => prev ? { ...prev, edges: prev.edges.filter((_, idx) => idx !== i) } : null)}
                                className="text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                            <div className="grid grid-cols-[1fr,auto,1fr] items-center gap-2 mb-2">
                              <input 
                                className="bg-bg border border-border rounded px-2 py-1 text-[11px] outline-none focus:border-accent"
                                placeholder="From Label"
                                value={e.from}
                                onChange={val => {
                                  const newEdges = [...importResult.edges];
                                  newEdges[i].from = val.target.value;
                                  setImportResult({ ...importResult, edges: newEdges });
                                }}
                              />
                              <ArrowRight size={12} className="text-accent" />
                              <input 
                                className="bg-bg border border-border rounded px-2 py-1 text-[11px] outline-none focus:border-accent"
                                placeholder="To Label"
                                value={e.to}
                                onChange={val => {
                                  const newEdges = [...importResult.edges];
                                  newEdges[i].to = val.target.value;
                                  setImportResult({ ...importResult, edges: newEdges });
                                }}
                              />
                            </div>
                            <input 
                              className="w-full bg-bg border border-border rounded px-2 py-1 text-[10px] outline-none focus:border-accent"
                              placeholder="Relationship Label"
                              value={e.label}
                              onChange={val => {
                                const newEdges = [...importResult.edges];
                                newEdges[i].label = val.target.value;
                                setImportResult({ ...importResult, edges: newEdges });
                              }}
                            />
                            {e.reasoning && (
                              <div className="mt-2 p-2 bg-accent/5 border border-accent/10 rounded text-[9px] text-accent italic">
                                <strong>AI Reasoning:</strong> {e.reasoning}
                              </div>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-[8px] uppercase text-muted font-bold">Confidence:</span>
                              <div className="flex gap-1">
                                {['low', 'medium', 'high'].map(level => (
                                  <button
                                    key={level}
                                    onClick={() => {
                                      const newEdges = [...importResult.edges];
                                      newEdges[i].confidence = level;
                                      setImportResult({ ...importResult, edges: newEdges });
                                    }}
                                    className={cn(
                                      "text-[8px] px-1.5 py-0.5 rounded uppercase font-bold transition-colors",
                                      e.confidence === level 
                                        ? (level === 'high' ? 'bg-green-500/20 text-green-400' : level === 'medium' ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400')
                                        : 'bg-bg text-muted hover:text-text'
                                    )}
                                  >
                                    {level}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase text-muted font-bold tracking-widest">Context Summary</h4>
                    <textarea 
                      className="w-full bg-surface border border-border p-4 font-serif text-[13px] leading-relaxed min-h-[150px] outline-none focus:border-accent"
                      value={importResult.context}
                      onChange={e => setImportResult({ ...importResult, context: e.target.value })}
                    />
                  </div>

                  <div className="flex gap-4 pt-4 border-t border-border">
                    <button className="btn flex-1 py-4 flex items-center justify-center gap-2" onClick={commitImport}>
                      <CheckCircle size={16} />
                      COMMIT {importResult.nodes.length} NODES & {importResult.edges.length} EDGES
                    </button>
                    <button className="btn btn-m flex-1 py-4" onClick={() => { setImportResult(null); setImportFile(null); }}>
                      CANCEL / START OVER
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Proposal Edit Modal */}
      {editingProposal && (
        <div className="fixed inset-0 bg-bg/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-panel border border-border rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
              <h3 className="text-[14px] font-bold uppercase tracking-wider">Edit Proposal</h3>
              <button onClick={() => setEditingProposal(null)} className="text-muted hover:text-text">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {editingProposal.type === 'create_node' && (
                <>
                  <div>
                    <label className="block text-[10px] uppercase text-muted font-bold mb-1">Label</label>
                    <input 
                      className="w-full bg-bg border border-border rounded px-3 py-2 text-[13px] outline-none focus:border-accent"
                      value={editingProposal.data.label}
                      onChange={e => setEditingProposal({ ...editingProposal, data: { ...editingProposal.data, label: e.target.value } })}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase text-muted font-bold mb-1">Description</label>
                    <textarea 
                      className="w-full bg-bg border border-border rounded px-3 py-2 text-[13px] outline-none focus:border-accent min-h-[100px]"
                      value={editingProposal.data.description}
                      onChange={e => setEditingProposal({ ...editingProposal, data: { ...editingProposal.data, description: e.target.value } })}
                    />
                  </div>
                </>
              )}
              {/* Add more type-specific editors as needed */}
              <div className="pt-4">
                <button 
                  className="btn w-full py-3"
                  onClick={() => {
                    setProject(prev => ({
                      ...prev,
                      proposals: prev.proposals.map(p => p.id === editingProposal.id ? editingProposal : p)
                    }));
                    setEditingProposal(null);
                  }}
                >
                  SAVE CHANGES
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
