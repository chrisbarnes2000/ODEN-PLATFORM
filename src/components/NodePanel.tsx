import React from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  ExternalLink, 
  Globe, 
  FileText, 
  Edit2, 
  ChevronRight, 
  Database, 
  Link as LinkIcon, 
  Mail 
} from 'lucide-react';
import { NodeData, ProjectData, NodeType } from '../types';
import { COLORS } from '../constants';
import SmartText from './SmartText';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface NodePanelProps {
  node?: NodeData;
  onClose: () => void;
  onSelectNode: (id: string) => void;
  onGoToSection: (id: string) => void;
  onEditNode: (id: string) => void;
  onEditDoc: (id: string) => void;
  project: ProjectData;
}

export default function NodePanel({ 
  node, 
  onClose, 
  onSelectNode, 
  onGoToSection, 
  onEditNode, 
  onEditDoc, 
  project 
}: NodePanelProps) {
  if (!node) return null;

  const linkedSection = project.sections.find(s => s.id === node.sectionId);
  const linkedDocs = project.documents.filter(d => d.nodeIds.includes(node.id));
  const linkedSources = project.sources.filter(s => 
    node.sources.some(ns => ns.url === s.url) || 
    node.description.toLowerCase().includes(s.url.toLowerCase())
  );
  
  const backlinks = project.nodes.filter(n => 
    n.id !== node.id && n.description.toLowerCase().includes(node.label.toLowerCase())
  );

  const incomingEdges = project.edges.filter(e => e.to === node.id);

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      className="absolute top-0 right-0 w-full md:w-[360px] h-full bg-panel border-l border-border overflow-y-auto p-6 z-40 shadow-2xl"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="text-[10px] tracking-[2px] uppercase font-bold" style={{ color: COLORS[node.type] }}>
              {node.type}
            </div>
            {node.placeholder && (
              <div className="text-[8px] bg-accent/20 text-accent px-1.5 py-0.5 rounded uppercase font-bold tracking-widest">
                Hunch / Gap
              </div>
            )}
          </div>
          <h3 className="text-[24px] font-serif leading-tight">{node.label}</h3>
          {node.date && <div className="text-[11px] font-mono text-muted italic">{node.date}</div>}
        </div>
        <button onClick={onClose} className="p-3 -mr-2 text-muted hover:text-text transition-colors">
          <X size={24} />
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-bg/50 p-4 rounded border border-border/30">
          <div className="text-[10px] uppercase tracking-widest text-muted mb-2 font-bold flex items-center gap-1.5">
            <Database size={10} /> Context & Description
          </div>
          <SmartText text={node.description} project={project} onSelectNode={onSelectNode} />
          <button 
            onClick={() => onEditNode(node.id)}
            className="mt-3 text-[10px] text-accent hover:underline flex items-center gap-1 uppercase font-bold tracking-widest"
          >
            <Edit2 size={10} /> Edit Details
          </button>
        </div>

        {linkedSection && (
          <div className="bg-accent/5 border border-accent/20 p-4 rounded">
            <div className="text-[10px] uppercase tracking-widest text-accent mb-2 font-bold">Anchored Blueprint Section</div>
            <div className="text-[13px] font-medium mb-2">{linkedSection.heading}</div>
            <button 
              onClick={() => onGoToSection(linkedSection.id)}
              className="text-[10px] text-accent hover:underline flex items-center gap-1 uppercase font-bold"
            >
              View in Blueprint <ChevronRight size={10} />
            </button>
          </div>
        )}

        {linkedDocs.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-accent mb-3 font-bold flex items-center gap-1.5">
              <FileText size={10} /> Evidence & Traceability
            </div>
            <div className="space-y-3">
              {linkedDocs.map(doc => (
                <div key={doc.id} className="bg-surface border border-border rounded overflow-hidden">
                  <button 
                    onClick={() => onEditDoc(doc.id)}
                    className="w-full text-left p-3 border-b border-border flex items-center justify-between group hover:bg-accent/5 transition-all"
                  >
                    <div className="flex flex-col">
                      <span className="text-[11px] font-bold text-accent uppercase tracking-wider">{doc.category}</span>
                      <span className="text-[13px] font-serif">{doc.title}</span>
                    </div>
                    <ExternalLink size={14} className="text-muted group-hover:text-accent" />
                  </button>
                  {doc.description && doc.description.length > 10 && (
                    <div className="p-3 bg-bg/30">
                      <div className="text-[9px] uppercase font-bold text-muted mb-1">Extracted Snippet</div>
                      <div className="text-[11px] text-text italic leading-relaxed font-serif">
                        "{doc.description.length > 200 ? doc.description.substring(0, 200) + '...' : doc.description}"
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {linkedSources.length > 0 && (
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted mb-3 font-bold flex items-center gap-1.5">
              <Globe size={10} /> Archival Sources
            </div>
            <div className="space-y-2">
              {linkedSources.map(src => (
                <a 
                  key={src.id}
                  href={src.url}
                  target="_blank"
                  className="block p-2 bg-surface border border-border rounded hover:border-accent transition-all group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium truncate">{src.title}</span>
                    <ExternalLink size={12} className="text-muted group-hover:text-accent" />
                  </div>
                  <div className="text-[10px] text-muted truncate">{src.url}</div>
                </a>
              ))}
            </div>
          </div>
        )}

        {(backlinks.length > 0 || incomingEdges.length > 0) && (
          <div className="pt-4 border-t border-border">
            <div className="text-[10px] uppercase tracking-widest text-muted mb-3 font-bold flex items-center gap-1.5">
              <LinkIcon size={10} /> Structural Connections
            </div>
            <div className="flex flex-wrap gap-2">
              {backlinks.map(n => (
                <button 
                  key={n.id}
                  onClick={() => onSelectNode(n.id)}
                  className="text-[10px] bg-bg border border-border px-2 py-1 rounded hover:border-accent transition-all"
                >
                  Mentioned in: {n.label}
                </button>
              ))}
              {incomingEdges.map((e, i) => {
                const fromNode = project.nodes.find(n => n.id === e.from);
                if (!fromNode) return null;
                return (
                  <button 
                    key={i}
                    onClick={() => onSelectNode(fromNode.id)}
                    className="text-[10px] bg-bg border border-border px-2 py-1 rounded hover:border-accent transition-all"
                  >
                    Linked by {fromNode.label} ({e.label})
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
