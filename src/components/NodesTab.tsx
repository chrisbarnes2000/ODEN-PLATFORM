import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Link as LinkIcon, X, User, Building, MapPin, Calendar, FileText, HelpCircle } from 'lucide-react';
import { PHASES } from '../constants';
import { ProjectData, NodeData, EdgeData, NodeType } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const COLORS: Record<NodeType, string> = {
  case: '#ff4444',
  event: '#ff8800',
  actor: '#c8923f',
  institution: '#7a9e7e',
  gap: '#5a8fc4',
  location: '#b07e85',
  media: '#c49a6c',
  document: '#7ab8b0',
  concept: '#a87ab8',
  object: '#7a9e6a',
  relation: '#c47a8a',
  financial: '#a8c44a',
  witness: '#7aaed4',
  suspect: '#c46a4a',
  law: '#6a8ab8',
  science: '#7ac4b8',
  family: '#c4606a',
  network: '#4ab8a8',
  period: '#c4a882',
  alias: '#c4907a',
  rumor: '#b87a9a',
  pattern: '#6a8aaa',
};

interface NodesTabProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  initialEditingNodeId?: string | null;
  onClearEditing?: () => void;
}

export default function NodesTab({ project, setProject, initialEditingNodeId, onClearEditing }: NodesTabProps) {
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [mobileView, setMobileView] = useState<'nodes' | 'edges' | 'merge'>('nodes');
  const [mergeSourceId, setMergeSourceId] = useState<string | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState<string | null>(null);

  const handleMerge = () => {
    if (!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId) return;
    
    const sourceNode = project.nodes.find(n => n.id === mergeSourceId);
    const targetNode = project.nodes.find(n => n.id === mergeTargetId);
    
    if (!sourceNode || !targetNode) return;

    if (!confirm(`Merge "${sourceNode.label}" into "${targetNode.label}"? This will move all connections and delete "${sourceNode.label}".`)) return;

    // 1. Update edges to point to targetNode
    const updatedEdges = project.edges.map(edge => {
      let newEdge = { ...edge };
      if (edge.from === mergeSourceId) newEdge.from = mergeTargetId;
      if (edge.to === mergeSourceId) newEdge.to = mergeTargetId;
      return newEdge;
    }).filter(edge => edge.from !== edge.to); // Remove self-loops

    // 2. Merge data (tags, sources, description)
    const updatedTargetNode: NodeData = {
      ...targetNode,
      description: `${targetNode.description}\n\nMerged from ${sourceNode.label}: ${sourceNode.description}`,
      tags: Array.from(new Set([...targetNode.tags, ...sourceNode.tags])),
      sources: [...targetNode.sources, ...sourceNode.sources],
    };

    // 3. Update project
    setProject(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== mergeSourceId).map(n => n.id === mergeTargetId ? updatedTargetNode : n),
      edges: updatedEdges,
    }));

    setMergeSourceId(null);
    setMergeTargetId(null);
    alert('Nodes merged successfully.');
  };

  React.useEffect(() => {
    if (initialEditingNodeId) {
      const node = project.nodes.find(n => n.id === initialEditingNodeId);
      if (node) {
        setEditingNodeId(node.id);
        setNewNode(node);
        setSourceInput(node.sources.map(s => s.url ? `${s.label} | ${s.url}` : s.label).join('\n'));
        setIsSidebarExpanded(true);
        setMobileView('nodes');
        onClearEditing?.();
      }
    }
  }, [initialEditingNodeId, project.nodes, onClearEditing]);

  const [newNode, setNewNode] = useState<Partial<NodeData>>({
    label: '',
    type: 'actor',
    description: '',
    tags: [],
    sources: [],
    placeholder: false,
    sectionId: '',
    phaseId: '',
  });

  const [sourceInput, setSourceInput] = useState('');

  const addNode = () => {
    if (!newNode.label?.trim()) return;
    
    const sources = sourceInput.trim() ? sourceInput.split('\n').map(line => {
      const [label, url] = line.split('|').map(s => s.trim());
      return { label: label || line, url: url || '' };
    }) : [];

    const node: NodeData = {
      id: editingNodeId || `n-${Date.now()}`,
      label: newNode.label,
      type: newNode.type as NodeType || 'actor',
      description: newNode.description || '',
      tags: newNode.tags || [],
      sources: sources,
      placeholder: newNode.placeholder || false,
      sectionId: newNode.sectionId || undefined,
      phaseId: newNode.phaseId || undefined,
      x: editingNodeId ? (project.nodes.find(n => n.id === editingNodeId)?.x || 0) : Math.random() * 400 - 200,
      y: editingNodeId ? (project.nodes.find(n => n.id === editingNodeId)?.y || 0) : Math.random() * 400 - 200,
    };

    setProject(prev => ({
      ...prev,
      nodes: editingNodeId 
        ? prev.nodes.map(n => n.id === editingNodeId ? node : n)
        : [...prev.nodes, node],
    }));

    setNewNode({ label: '', type: 'actor', description: '', tags: [], sources: [], placeholder: false, sectionId: '', phaseId: '' });
    setSourceInput('');
    setEditingNodeId(null);
  };

  const [newEdge, setNewEdge] = useState<Partial<EdgeData>>({
    from: '',
    to: '',
    type: 'other',
    label: '',
    weight: 2,
  });

  const addEdge = () => {
    if (!newEdge.from || !newEdge.to) return;
    const edge: EdgeData = {
      from: newEdge.from,
      to: newEdge.to,
      type: newEdge.type || 'other',
      label: newEdge.label || '',
      weight: newEdge.weight || 2,
    };

    setProject(prev => ({
      ...prev,
      edges: [...prev.edges, edge],
    }));

    setNewEdge({ from: '', to: '', type: 'other', label: '', weight: 2 });
  };

  const deleteNode = (id: string) => {
    if (!confirm('Delete this node and all its connections?')) return;
    setProject(prev => ({
      ...prev,
      nodes: prev.nodes.filter(n => n.id !== id),
      edges: prev.edges.filter(e => e.from !== id && e.to !== id),
    }));
  };

  const editNode = (n: NodeData) => {
    setEditingNodeId(n.id);
    setNewNode(n);
    setSourceInput(n.sources.map(s => s.url ? `${s.label} | ${s.url}` : s.label).join('\n'));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Mobile Toggle */}
      <div className="flex md:hidden bg-panel border-b border-border shrink-0">
        <button 
          onClick={() => setMobileView('nodes')}
          className={cn(
            "flex-1 py-3 text-[10px] font-bold tracking-[2px] uppercase transition-colors",
            mobileView === 'nodes' ? "text-accent bg-white/5 border-b-2 border-accent" : "text-muted"
          )}
        >
          Nodes
        </button>
        <button 
          onClick={() => setMobileView('edges')}
          className={cn(
            "flex-1 py-3 text-[10px] font-bold tracking-[2px] uppercase transition-colors",
            mobileView === 'edges' ? "text-accent bg-white/5 border-b-2 border-accent" : "text-muted"
          )}
        >
          Connections
        </button>
        <button 
          onClick={() => setMobileView('merge')}
          className={cn(
            "flex-1 py-3 text-[10px] font-bold tracking-[2px] uppercase transition-colors",
            mobileView === 'merge' ? "text-accent bg-white/5 border-b-2 border-accent" : "text-muted"
          )}
        >
          Merge
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left: Nodes */}
        <div className={cn(
          "flex-shrink-0 border-r border-border overflow-y-auto p-5 transition-all duration-300 bg-panel",
          isSidebarExpanded ? "w-full md:w-[450px]" : "w-0 p-0 border-none opacity-0",
          "md:block",
          mobileView === 'nodes' ? "block" : "hidden"
        )}>
          <div className="font-serif text-[16px] text-accent mb-4">{editingNodeId ? 'Edit Node' : 'Add Node'}</div>
          <div className="frow">
            <label>Label</label>
            <input 
              type="text" 
              placeholder="e.g. Trevor Kincaid, USDA, or Cave Entrance" 
              value={newNode.label}
              onChange={e => setNewNode(prev => ({ ...prev, label: e.target.value }))}
            />
          </div>
          <div className="frow">
            <label>Type</label>
            <select 
              value={newNode.type}
              onChange={e => setNewNode(prev => ({ ...prev, type: e.target.value as NodeType }))}
            >
              {Object.keys(COLORS).map(type => (
                <option key={type} value={type}>{type.toUpperCase()}</option>
              ))}
            </select>
          </div>
          <div className="frow">
            <label>Description</label>
            <textarea 
              placeholder="What is this entity and why does it matter? Anchor this to a primary source if possible." 
              value={newNode.description}
              onChange={e => setNewNode(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>
          <div className="frow">
            <label>Tags (comma-separated)</label>
            <input 
              type="text" 
              placeholder="Federal agency, 1909, Access control" 
              value={newNode.tags?.join(', ')}
              onChange={e => setNewNode(prev => ({ ...prev, tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) }))}
            />
          </div>
          <div className="frow">
            <label>Sources (one per line: Label | URL)</label>
            <textarea 
              placeholder="NARA Finding Aid | https://archives.gov/..." 
              value={sourceInput}
              onChange={e => setSourceInput(e.target.value)}
            />
          </div>
          <div className="frow flex items-start gap-2">
            <input 
              type="checkbox" 
              id="n-placeholder"
              checked={newNode.placeholder}
              onChange={e => setNewNode(prev => ({ ...prev, placeholder: e.target.checked }))}
              className="w-4 h-4 accent-accent mt-0.5"
            />
            <label htmlFor="n-placeholder" className="normal-case tracking-normal mb-0 cursor-pointer text-[11px] leading-tight">
              <strong className="text-accent">A hunch, lead, or reference you haven't verified yet.</strong> Shown with a dotted outline. Excluded from Methodology Check warnings.
            </label>
          </div>
          <div className="frow">
            <label>Link to Investigation Phase (Blueprint)</label>
            <select 
              value={newNode.phaseId || ''}
              onChange={e => setNewNode(prev => ({ ...prev, phaseId: e.target.value }))}
            >
              <option value="">— not linked to a phase —</option>
              {PHASES.map(p => (
                <option key={p.id} value={p.id}>{p.num}: {p.title}</option>
              ))}
            </select>
            <p className="text-[10px] text-muted mt-1 italic">Links this entity to a specific phase in the Blueprint tab for structural tracking.</p>
          </div>
          <div className="frow">
            <label>Link to Context Section (optional)</label>
            <select 
              value={newNode.sectionId || ''}
              onChange={e => setNewNode(prev => ({ ...prev, sectionId: e.target.value }))}
            >
              <option value="">— select a narrative section to link —</option>
              {project.sections.map(s => (
                <option key={s.id} value={s.id}>{s.category} — {s.heading}</option>
              ))}
            </select>
            <p className="text-[10px] text-muted mt-1 italic">Links this entity directly to a narrative section in the Context tab.</p>
          </div>
          <div className="flex gap-2">
            <button className="btn flex-1" onClick={addNode}>{editingNodeId ? 'UPDATE' : 'ADD NODE'}</button>
            <button className="btn btn-m" onClick={() => { setEditingNodeId(null); setNewNode({ label: '', type: 'actor', sectionId: '' }); setSourceInput(''); }}>CLEAR</button>
          </div>

          <div className="sec-hdr mt-8 mb-4 border-b border-border pb-2 text-muted uppercase text-[11px] tracking-[1px] flex justify-between items-center">
            <span>Nodes ({project.nodes.length})</span>
            <button 
              onClick={() => setMobileView('merge')}
              className="text-[9px] text-accent hover:underline font-bold"
            >
              MERGE TOOL
            </button>
          </div>
          <div className="space-y-2">
            {project.nodes.map(n => (
              <div key={n.id} className="flex items-center gap-3 border border-border p-2 hover:border-border2 transition-all group">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[n.type] }} />
                <span className="flex-1 text-[12px] truncate">{n.label}</span>
                <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button onClick={() => { setEditingNodeId(n.id); setNewNode(n); }} className="text-muted hover:text-accent"><Edit2 size={12} /></button>
                  <button onClick={() => deleteNode(n.id)} className="text-muted hover:text-[#a04040]"><Trash2 size={12} /></button>
                </div>
              </div>
            ))}
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

        {/* Right: Edges or Merge */}
        <div className={cn(
          "flex-1 overflow-y-auto p-8 bg-bg",
          "md:block",
          mobileView === 'edges' || mobileView === 'merge' ? "block" : "hidden"
        )}>
          {mobileView === 'merge' ? (
            <div className="max-w-xl">
              <div className="font-serif text-[16px] text-accent mb-4">Merge Nodes</div>
              <p className="text-[12px] text-muted mb-6">
                Combine two nodes into one. All connections from the "Source" node will be moved to the "Target" node, and the "Source" node will be deleted.
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="frow">
                  <label>Source Node (To be deleted)</label>
                  <select 
                    value={mergeSourceId || ''}
                    onChange={e => setMergeSourceId(e.target.value)}
                  >
                    <option value="">— select source —</option>
                    {project.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                  </select>
                </div>
                <div className="frow">
                  <label>Target Node (To keep)</label>
                  <select 
                    value={mergeTargetId || ''}
                    onChange={e => setMergeTargetId(e.target.value)}
                  >
                    <option value="">— select target —</option>
                    {project.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                  </select>
                </div>
              </div>

              <button 
                className="btn w-full py-4 bg-accent/10 hover:bg-accent/20 border-accent/30"
                onClick={handleMerge}
                disabled={!mergeSourceId || !mergeTargetId || mergeSourceId === mergeTargetId}
              >
                MERGE NODES
              </button>

              <div className="mt-12 p-6 border border-border bg-surface rounded-lg">
                <h4 className="text-[12px] font-bold text-accent uppercase tracking-wider mb-2">Merge Logic</h4>
                <ul className="text-[11px] text-muted space-y-2 list-disc pl-4">
                  <li><strong>Edges:</strong> All incoming and outgoing connections are redirected to the target node.</li>
                  <li><strong>Description:</strong> The source node's description is appended to the target node's description.</li>
                  <li><strong>Tags & Sources:</strong> Tags and sources from both nodes are combined (duplicates removed).</li>
                  <li><strong>Deletion:</strong> The source node is permanently removed from the map.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="max-w-xl">
              <div className="font-serif text-[16px] text-accent mb-4">Add Connection</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="frow">
                  <label>From Node</label>
                  <select 
                    value={newEdge.from}
                    onChange={e => setNewEdge(prev => ({ ...prev, from: e.target.value }))}
                  >
                    <option value="">— select —</option>
                    {project.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                  </select>
                </div>
                <div className="frow">
                  <label>To Node</label>
                  <select 
                    value={newEdge.to}
                    onChange={e => setNewEdge(prev => ({ ...prev, to: e.target.value }))}
                  >
                    <option value="">— select —</option>
                    {project.nodes.map(n => <option key={n.id} value={n.id}>{n.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="frow">
                  <label>Connection Type</label>
                  <select 
                    value={newEdge.type}
                    onChange={e => setNewEdge(prev => ({ ...prev, type: e.target.value }))}
                  >
                    <option value="other">Other / General</option>
                    <option value="financial">Financial / Transaction</option>
                    <option value="personal">Personal / Family</option>
                    <option value="professional">Professional / Work</option>
                    <option value="conflict">Conflict / Adversarial</option>
                    <option value="evidence">Evidence / Anchor</option>
                    <option value="temporal">Temporal / Sequence</option>
                    <option value="spatial">Spatial / Proximity</option>
                  </select>
                </div>
                <div className="frow">
                  <label>Connection Label</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Controlled access to records" 
                    value={newEdge.label}
                    onChange={e => setNewEdge(prev => ({ ...prev, label: e.target.value }))}
                  />
                </div>
              </div>
              <div className="frow">
                <label>Weight (1-3)</label>
                <select 
                  value={newEdge.weight}
                  onChange={e => setNewEdge(prev => ({ ...prev, weight: parseInt(e.target.value) }))}
                >
                  <option value="1">1 — Weak / Circumstantial</option>
                  <option value="2">2 — Documented</option>
                  <option value="3">3 — Strongly Documented</option>
                </select>
              </div>
              <button className="btn w-full" onClick={addEdge}>ADD CONNECTION</button>

              <div className="sec-hdr mt-12 mb-4 border-b border-border pb-2 text-muted uppercase text-[11px] tracking-[1px]">
                Connections ({project.edges.length})
              </div>
              <div className="space-y-2">
                {project.edges.map((e, i) => {
                  const fromNode = project.nodes.find(n => n.id === e.from);
                  const toNode = project.nodes.find(n => n.id === e.to);
                  return (
                    <div key={i} className="flex items-center gap-4 border border-border p-3 text-[12px] group">
                      <div className="flex-1">
                        <span className="font-bold">{fromNode?.label}</span>
                        <span className="text-accent mx-2">↔</span>
                        <span className="font-bold">{toNode?.label}</span>
                        <div className="text-muted text-[10px] mt-1">{e.label} (Weight: {e.weight})</div>
                      </div>
                      <button onClick={() => {
                        setProject(prev => ({
                          ...prev,
                          edges: prev.edges.filter((_, idx) => idx !== i)
                        }));
                      }} className="text-muted hover:text-[#a04040] opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
