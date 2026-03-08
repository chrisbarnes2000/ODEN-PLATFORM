import React, { useState } from 'react';
import { Sparkles, Check, X, Edit2, Info, BrainCircuit, Trash2, ChevronDown, ChevronUp, Plus, ExternalLink } from 'lucide-react';
import { ProjectData, Proposal, NodeData, NodeType } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ProposalTrayProps {
  project: ProjectData;
  onApprove: (proposal: Proposal) => void;
  onDismiss: (proposalId: string) => void;
  onEdit: (proposal: Proposal) => void;
}

export default function ProposalTray({ project, onApprove, onDismiss, onEdit }: ProposalTrayProps) {
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
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
                    {getProposalSummary(p)}
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
                            value={editData?.justification || p.justification}
                            onChange={e => setEditData({ ...editData, justification: e.target.value })}
                          />
                        </div>

                        {p.type === 'create_node' || p.type === 'update_node' ? (
                          <>
                            <div className="space-y-1">
                              <label className="text-[10px] uppercase text-muted">Label</label>
                              <input 
                                className="w-full bg-surface border border-border rounded px-2 py-1 text-[12px] outline-none focus:border-accent"
                                value={editData?.label || ''}
                                onChange={e => setEditData({ ...editData, label: e.target.value })}
                              />
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

function getProposalSummary(p: Proposal) {
  try {
    switch (p.type) {
      case 'create_node': 
        return `Add ${(p.data?.type || 'node').toUpperCase()}: "${p.data?.label || 'Untitled'}"`;
      case 'create_edge': 
        return `Connect "${p.data?.fromLabel || '?'}" to "${p.data?.toLabel || '?'}" as ${p.data?.label || 'connection'}`;
      case 'merge_nodes': 
        return `Merge entities into: "${p.data?.mergedLabel || 'Merged Entity'}"`;
      case 'attach_evidence': 
        return `Link evidence to "${p.data?.nodeLabel || 'Node'}"`;
      case 'promote_placeholder': 
        return `Verify Placeholder node`;
      case 'update_node': 
        return `Update details for "${p.data?.label || 'Node'}"`;
      case 'create_context': 
        return `Add Context: "${p.data?.heading || 'Untitled Section'}"`;
      default: 
        return 'Investigation Update';
    }
  } catch (e) {
    return 'Investigation Proposal';
  }
}
