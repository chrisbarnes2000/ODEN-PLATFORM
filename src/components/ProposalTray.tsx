import React, { useState } from 'react';
import { Sparkles, Check, X, Edit2, Info, BrainCircuit, Trash2, ChevronDown, ChevronUp, Plus } from 'lucide-react';
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

  const pendingProposals = project.proposals.filter(p => p.status === 'pending');

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
                      <div>
                        <div className="text-[10px] uppercase text-muted font-bold tracking-wider mb-1">Evidence Snippet</div>
                        <div className="text-[11px] text-muted bg-bg p-2 rounded border border-border font-serif italic">
                          "{p.sourceSnippet}"
                        </div>
                      </div>
                    )}

                    <div className="pt-2 flex justify-end">
                      <button 
                        onClick={() => onEdit(p)}
                        className="flex items-center gap-1.5 text-[11px] text-accent hover:underline uppercase font-bold"
                      >
                        <Edit2 size={12} /> Edit Details
                      </button>
                    </div>
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
  switch (p.type) {
    case 'create_node': return p.data.label;
    case 'create_edge': return `${p.data.fromLabel} → ${p.data.toLabel}`;
    case 'merge_nodes': return `${p.data.mergedLabel} (Merge)`;
    case 'attach_evidence': return `Link to ${p.data.nodeLabel}`;
    case 'promote_placeholder': return `Verify Placeholder`;
    case 'update_node': return `Update ${p.data.label}`;
    default: return 'Investigation Update';
  }
}
