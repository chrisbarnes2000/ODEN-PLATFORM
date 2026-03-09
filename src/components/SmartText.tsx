import React, { useMemo } from 'react';
import { ProjectData } from '../types';

interface SmartTextProps {
  text: string;
  project: ProjectData;
  onSelectNode: (id: string) => void;
}

export default function SmartText({ text, project, onSelectNode }: SmartTextProps) {
  const parts = useMemo(() => {
    if (!text) return [];
    let result: (string | { nodeId: string, label: string })[] = [text];
    
    project.nodes.forEach(node => {
      const newResult: (string | { nodeId: string, label: string })[] = [];
      result.forEach(part => {
        if (typeof part === 'string') {
          const escapedLabel = node.label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(${escapedLabel})`, 'gi');
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
