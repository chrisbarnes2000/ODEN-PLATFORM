import React, { useState } from 'react';
import { Sparkles, Check, X, Edit2, Info, BrainCircuit, Trash2, ChevronDown, ChevronUp, Plus, ExternalLink } from 'lucide-react';
import { ProjectData, Proposal, NodeData, NodeType } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { COLORS, getNodeColor } from '../constants';

interface ProposalTrayProps {
  project: ProjectData;
  onApprove: (proposal: Proposal) => void;
  onDismiss: (proposalId: string) => void;
  onEdit: (proposal: Proposal) => void;
  onViewInsights?: () => void;
}

export default function ProposalTray({ project, onApprove, onDismiss, onEdit, onViewInsights }: ProposalTrayProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<any>(null);

  const pendingProposals = project.proposals.filter(p => p.status === 'pending');

  const startEditing = (p: Proposal) => {
    setEditingId(p.id);
    setEditData({ ...p.data });
  };

  const saveEdit = (p: Proposal) => {
    onEdit({ ...p, data: editData });
    setEditingId(null);
    setEditData(null);
  };

  if (pendingProposals.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed border-border bg-surface/30 rounded-lg">
        <BrainCircuit size={48} className="mx-auto text-muted mb-4 opacity-20" />
        <p className="text-muted text-[13px]">No pending AI proposals. Use the "Generate Proposals" button to analyze your case.</p>
        <div className="mt-6 pt-6 border-t border-border">
          <p className="text-[11px] text-muted mb-3">Looking for the analytical briefing?</p>
          <button 
            onClick={onViewInsights}
            className="text-accent text-[11px] font-bold uppercase tracking-widest hover:underline"
          >
            Check the AI Insights Tab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {project.briefing && (
        <div className="bg-accent/5 border border-accent/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit size={16} className="text-accent" />
            <h4 className="text-[12px] font-bold uppercase tracking-widest text-accent">Case Briefing Snapshot</h4>
          </div>
          <div className="text-[11px] text-muted line-clamp-3 leading-relaxed mb-2 italic">
            {project.briefing}
          </div>
          <div className="flex justify-end">
            <button 
              onClick={onViewInsights}
              className="text-[9px] text-accent uppercase font-bold tracking-tighter hover:underline"
            >
              Full analysis available in AI Insights tab
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent" />
          <h3 className="text-[14px] font-bold uppercase tracking-wider">AI Proposals ({pendingProposals.length})</h3>
        </div>
        <div className="text-[10px] text-muted italic">Human approval required for all changes</div>
      </div>

      <div className="space-y-3">
        {pendingProposals.map((p) => (
          <div 
            key={p.id} 
            className="border border-border bg-surface rounded-lg overflow-hidden transition-all hover:border-accent/50"
          >
            {/* Header */}
            <div 
              className="p-3 flex items-center justify-between cursor-pointer bg-panel/50"
              onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}
            >
              <div className="flex items-center gap-3">
                <div className="p-1.5 bg-accent/10 rounded">
                  <ProposalIcon type={p.type} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="text-[12px] font-bold text-text uppercase tracking-tight">
                      {p.type.replace('_', ' ')}
                    </div>
                    {(p.type === 'create_node' || p.type === 'update_node') && p.data?.type && (
                      <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-surface border border-border rounded">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getNodeColor(p.data.type) }} />
                        <span className="text-[9px] font-bold uppercase text-muted">{p.data.type}</span>
                      </div>
                    )}
                    {p.confidence && (
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                        p.confidence === 'high' ? 'bg-green-400/10 text-green-400 border-green-400/30' : 
                        p.confidence === 'medium' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/30' : 
                        'bg-red-400/10 text-red-400 border-red-400/30'
                      }`}>
                        {p.confidence}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-accent font-mono">
                    {getProposalSummary(p, project)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onApprove(p); }}
                  className="p-1.5 text-[#7a9e7e] hover:bg-[#7a9e7e]/10 rounded transition-colors"
                  title="Approve"
                >
                  <Check size={16} />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); onDismiss(p.id); }}
                  className="p-1.5 text-[#a04040] hover:bg-[#a04040]/10 rounded transition-colors"
                  title="Dismiss"
                >
                  <Trash2 size={16} />
                </button>
                {expandedId === p.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
              {expandedId === p.id && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-border"
                >
                  <div className="p-4 space-y-4">
                    {editingId === p.id ? (
                      <div className="space-y-4 bg-bg/50 p-4 rounded border border-border">
                        <div className="text-[10px] uppercase font-bold text-accent mb-2">Edit Proposal Details</div>
                        
                        {/* Common Fields */}
                        <div className="space-y-1">
                          <label className="text-[10px] uppercase text-muted">Justification</label>
                          <input 
                            className="w-full bg-surface border border-border rounded px-2 py-1 text-[12px] outline-none focus:border-accent"
                            value={editData?.justification || p.justification || ''}
                            onChange={e => setEditData({ ...editData, justification: e.target.value })}
                          />
                        </div>

                        {p.type === 'create_node' || p.type === 'update_node' ? (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase text-muted">Label</label>
                                <input 
                                  className="w-full bg-surface border border-border rounded px-2 py-1 text-[12px] outline-none focus:border-accent"
                                  value={editData?.label || ''}
                                  onChange={e => setEditData({ ...editData, label: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase text-muted">Node Type</label>
                                <div className="relative flex items-center">
                                  <div 
                                    className="absolute left-2 w-2 h-2 rounded-full pointer-events-none" 
                                    style={{ backgroundColor: getNodeColor(editData?.type || '') }} 
                                  />
                                  <select 
                                    className="w-full bg-surface border border-border rounded pl-6 pr-2 py-1 text-[12px] outline-none focus:border-accent appearance-none"
                                    value={editData?.type || ''}
                                    onChange={e => setEditData({ ...editData, type: e.target.value })}
                                  >
                                    {Object.keys(COLORS).map(t => <option key={t} value={t}>{t.toUpperCase()}</option>)}
                                  </select>
                                </div>
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase text-muted">Description</label>
                              <textarea 
                                className="w-full bg-surface border border-border rounded px-2 py-1 text-[12px] outline-none focus:border-accent h-20"
                                value={editData?.description || ''}
                                onChange={e => setEditData({ ...editData, description: e.target.value })}
                              />
                            </div>
                          </>
                        ) : p.type === 'create_edge' ? (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase text-muted">From</label>
                                <input 
                                  className="w-full bg-surface border border-border rounded px-2 py-1 text-[12px] outline-none focus:border-accent"
                                  value={editData?.fromLabel || ''}
                                  onChange={e => setEditData({ ...editData, fromLabel: e.target.value })}
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase text-muted">To</label>
                                <input 
                                  className="w-full bg-surface border border-border rounded px-2 py-1 text-[12px] outline-none focus:border-accent"
                                  value={editData?.toLabel || ''}
                                  onChange={e => setEditData({ ...editData, toLabel: e.target.value })}
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase text-muted">Connection Type</label>
                              <input 
                                className="w-full bg-surface border border-border rounded px-2 py-1 text-[12px] outline-none focus:border-accent"
                                value={editData?.label || ''}
                                onChange={e => setEditData({ ...editData, label: e.target.value })}
                              />
                            </div>
                          </>
                        ) : p.type === 'merge_nodes' ? (
                          <>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase text-muted">Merged Label</label>
                              <input 
                                className="w-full bg-surface border border-border rounded px-2 py-1 text-[12px] outline-none focus:border-accent"
                                value={editData?.mergedLabel || ''}
                                onChange={e => setEditData({ ...editData, mergedLabel: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase text-muted">Merged Description</label>
                              <textarea 
                                className="w-full bg-surface border border-border rounded px-2 py-1 text-[12px] outline-none focus:border-accent h-20"
                                value={editData?.mergedDescription || ''}
                                onChange={e => setEditData({ ...editData, mergedDescription: e.target.value })}
                              />
                            </div>
                          </>
                        ) : p.type === 'create_context' ? (
                          <>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase text-muted">Heading</label>
                              <input 
                                className="w-full bg-surface border border-border rounded px-2 py-1 text-[12px] outline-none focus:border-accent"
                                value={editData?.heading || ''}
                                onChange={e => setEditData({ ...editData, heading: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase text-muted">Category</label>
                              <input 
                                className="w-full bg-surface border border-border rounded px-2 py-1 text-[12px] outline-none focus:border-accent"
                                value={editData?.category || ''}
                                onChange={e => setEditData({ ...editData, category: e.target.value })}
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase text-muted">Body Content</label>
                              <textarea 
                                className="w-full bg-surface border border-border rounded px-2 py-1 text-[12px] outline-none focus:border-accent h-32"
                                value={editData?.body || ''}
                                onChange={e => setEditData({ ...editData, body: e.target.value })}
                              />
                            </div>
                          </>
                        ) : null}

                        <div className="space-y-1">
                          <label className="text-[10px] uppercase text-muted">Methodology Reasoning</label>
                          <textarea 
                            className="w-full bg-surface border border-border rounded px-2 py-1 text-[12px] outline-none focus:border-accent h-20"
                            value={editData?.reasoning || p.reasoning || ''}
                            onChange={e => setEditData({ ...editData, reasoning: e.target.value })}
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button 
                            onClick={() => { setEditingId(null); setEditData(null); }}
                            className="text-[11px] uppercase font-bold text-muted hover:text-text"
                          >
                            Cancel
                          </button>
                          <button 
                            onClick={() => saveEdit(p)}
                            className="text-[11px] uppercase font-bold text-accent hover:underline"
                          >
                            Save Changes
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="bg-accent/5 border border-accent/20 p-2 rounded text-[10px] text-accent italic mb-2">
                          AI Disclaimer: This proposal is generated based on pattern recognition. Always verify against original sources. AI can make mistakes.
                        </div>

                        {/* Visual Preview */}
                        <div className="bg-surface border border-border rounded p-4 mb-4">
                          <div className="text-[10px] uppercase font-bold text-muted mb-3 tracking-widest">Proposal Preview</div>
                          {p.type === 'create_node' && (
                            <div className="flex items-start gap-4">
                              <div 
                                className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 shadow-lg"
                                style={{ backgroundColor: getNodeColor(p.data.type) }}
                              >
                                <Plus size={24} className="text-white" />
                              </div>
                              <div>
                                <div className="text-[14px] font-bold text-text mb-1">{p.data.label}</div>
                                <div className="text-[10px] uppercase font-bold text-accent mb-2 tracking-widest">{p.data.type}</div>
                                <div className="text-[12px] text-muted leading-relaxed">{p.data.description}</div>
                              </div>
                            </div>
                          )}
                          {p.type === 'create_edge' && (
                            <div className="flex items-center justify-between gap-4">
                              <div className="flex-1 p-3 bg-bg border border-border rounded text-center">
                                <div className="text-[12px] font-bold">{p.data.fromLabel}</div>
                              </div>
                              <div className="flex flex-col items-center gap-1 min-w-[100px]">
                                <div className="text-[10px] font-bold text-accent uppercase tracking-tighter">{p.data.label}</div>
                                <div className="w-full h-[1px] bg-accent/30 relative">
                                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-accent rotate-45" />
                                </div>
                              </div>
                              <div className="flex-1 p-3 bg-bg border border-border rounded text-center">
                                <div className="text-[12px] font-bold">{p.data.toLabel}</div>
                              </div>
                            </div>
                          )}
                          {p.type === 'update_node' && (
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <div className="text-[10px] text-muted uppercase font-bold">Updating:</div>
                                <div className="text-[12px] font-bold">{p.data.label}</div>
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="p-2 bg-bg border border-border rounded">
                                  <div className="text-[8px] text-muted uppercase font-bold mb-1">New Type</div>
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getNodeColor(p.data.type) }} />
                                    <div className="text-[11px] font-bold uppercase">{p.data.type}</div>
                                  </div>
                                </div>
                                <div className="p-2 bg-bg border border-border rounded">
                                  <div className="text-[8px] text-muted uppercase font-bold mb-1">New Description</div>
                                  <div className="text-[10px] text-muted line-clamp-2">{p.data.description}</div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-muted font-bold tracking-wider mb-1 flex items-center gap-1">
                            <Info size={10} /> Justification
                          </div>
                          <p className="text-[12px] text-text leading-relaxed italic border-l-2 border-accent/30 pl-3">
                            {p.justification}
                          </p>
                        </div>

                        {p.reasoning && (
                          <div>
                            <div className="text-[10px] uppercase text-muted font-bold tracking-wider mb-1 flex items-center gap-1">
                              <BrainCircuit size={10} /> Methodology Reasoning
                            </div>
                            <div className="text-[12px] text-text leading-relaxed italic bg-accent/5 p-3 rounded border border-accent/10">
                              {p.reasoning}
                            </div>
                          </div>
                        )}

                        {p.sourceSnippet && (
                          <div className="bg-accent/5 p-3 rounded border-l-2 border-accent">
                            <div className="text-[10px] uppercase text-accent font-bold tracking-wider mb-2 flex items-center justify-between">
                              <span>Evidence Snippet</span>
                              {p.sourceDocId && (
                                <span className="text-[9px] opacity-70">Source ID: {p.sourceDocId}</span>
                              )}
                            </div>
                            <div className="text-[11px] text-text font-serif italic leading-relaxed">
                              "{p.sourceSnippet}"
                            </div>
                            {p.sourceDocId && (
                              <div className="mt-2 flex justify-end">
                                <button className="text-[9px] uppercase font-bold text-accent hover:underline flex items-center gap-1">
                                  <ExternalLink size={10} /> View Source Document
                                </button>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="pt-2 flex justify-end">
                          <button 
                            onClick={() => startEditing(p)}
                            className="flex items-center gap-1.5 text-[11px] text-accent hover:underline uppercase font-bold"
                          >
                            <Edit2 size={12} /> Edit Details
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProposalIcon({ type }: { type: Proposal['type'] }) {
  switch (type) {
    case 'create_node': return <Plus size={14} className="text-accent" />;
    case 'create_edge': return <Sparkles size={14} className="text-accent" />;
    case 'merge_nodes': return <BrainCircuit size={14} className="text-accent" />;
    case 'attach_evidence': return <Info size={14} className="text-accent" />;
    case 'promote_placeholder': return <Check size={14} className="text-accent" />;
    case 'update_node': return <Edit2 size={14} className="text-accent" />;
    default: return <Info size={14} className="text-accent" />;
  }
}

function getProposalSummary(p: Proposal, project: ProjectData) {
  try {
    const color = getNodeColor(p.data?.type || '');
    const colorDot = <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: color }} />;

    switch (p.type) {
      case 'create_node': 
        return (
          <span className="flex items-center">
            {colorDot}
            Add {p.data?.type?.toUpperCase() || 'NODE'}: <span className="text-text font-bold ml-1">"{p.data?.label || 'Untitled'}"</span>
          </span>
        );
      case 'create_edge': 
        const fromNode = project.nodes.find(n => n.label === p.data?.fromLabel);
        const toNode = project.nodes.find(n => n.label === p.data?.toLabel);
        const fromColor = getNodeColor(fromNode?.type || '');
        const toColor = getNodeColor(toNode?.type || '');

        return (
          <span className="flex items-center gap-1.5 flex-wrap">
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fromColor }} />
              <span className="text-text font-bold">"{p.data?.fromLabel || '?'}"</span> 
            </span>
            <span className="text-muted">→</span> 
            <span className="text-accent font-bold">[{p.data?.label || 'connection'}]</span> 
            <span className="text-muted">→</span> 
            <span className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: toColor }} />
              <span className="text-text font-bold">"{p.data?.toLabel || '?'}"</span> 
            </span>
          </span>
        );
      case 'merge_nodes': 
        return `Merge entities into: "${p.data?.mergedLabel || 'Merged Entity'}"`;
      case 'attach_evidence': 
        return `Link evidence to "${p.data?.nodeLabel || 'Node'}"`;
      case 'promote_placeholder': 
        return `Verify Placeholder node`;
      case 'update_node': 
        const existingNode = project.nodes.find(n => n.id === p.data?.nodeId);
        const updateColor = getNodeColor(p.data?.type || existingNode?.type || '');
        return (
          <span className="flex items-center">
            <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: updateColor }} />
            Update {p.data?.type?.toUpperCase() || existingNode?.type?.toUpperCase() || 'NODE'}: <span className="text-text font-bold ml-1">"{p.data?.label || existingNode?.label || 'Node'}"</span>
          </span>
        );
      case 'create_context': 
        return `Add Context: "${p.data?.heading || 'Untitled Section'}"`;
      default: 
        return 'Investigation Update';
    }
  } catch (e) {
    return 'Investigation Proposal';
  }
}
