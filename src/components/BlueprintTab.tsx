import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Link as LinkIcon, X, Layers, ChevronDown, ChevronUp } from 'lucide-react';
import { PHASES } from '../constants';
import { ProjectData, NodeData } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface BlueprintTabProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
  onSelectNode?: (id: string) => void;
}

export default function BlueprintTab({ project, setProject, onSelectNode }: BlueprintTabProps) {
  const [openPhases, setOpenPhases] = useState<string[]>(['ph1']);

  const totalFields = PHASES.reduce((acc, phase) => acc + phase.fields.length, 0);
  const filledFields = PHASES.reduce((acc, phase) => {
    return acc + phase.fields.filter(f => !!project.blueprint[f.id]).length;
  }, 0);
  const progress = Math.round((filledFields / totalFields) * 100);

  const togglePhase = (id: string) => {
    setOpenPhases(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const toggleComplete = (id: string) => {
    setProject(prev => {
      const current = prev.completedPhases || [];
      const next = current.includes(id) 
        ? current.filter(p => p !== id) 
        : [...current, id];
      return { ...prev, completedPhases: next };
    });
  };

  const updateField = (id: string, value: string) => {
    setProject(prev => ({
      ...prev,
      blueprint: { ...prev.blueprint, [id]: value }
    }));
  };

  return (
    <div className="h-full w-full flex flex-col bg-bg">
      {/* Progress Header */}
      <div className="flex-shrink-0 bg-panel border-b border-border p-4 flex items-center justify-between z-10">
        <div>
          <h2 className="text-[14px] font-bold tracking-[2px] text-accent uppercase">Investigation Blueprint</h2>
          <p className="text-[11px] text-muted">The structural foundation of your case methodology.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-[10px] text-muted uppercase font-bold">Structural Integrity</div>
            <div className="text-[18px] font-mono text-accent">{progress}%</div>
          </div>
          <div className="w-32 h-2 bg-surface border border-border rounded-full overflow-hidden">
            <div 
              className="h-full bg-accent transition-all duration-500" 
              style={{ width: `${progress}%` }} 
            />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-4 md:p-8 w-full">
          <div className="bp-intro border-l-4 border-accent bg-surface p-6 mb-8 font-serif text-[14px] leading-relaxed">
            <strong className="text-accent">ODEN Methodology — Blueprint</strong><br /><br />
            This is your research roadmap. Work through each phase in order — each one builds on the last. The goal isn't to prove something happened. It's to document what the record <em className="italic">can and cannot</em> tell you — and why.
            <br /><br />
            <span className="text-[12px] text-muted italic">Your progress is tracked by the "Structural Integrity" bar above. You can close this app and come back whenever — your work is saved locally.</span>
          </div>

          {/* Main Event anchor (recommended) */}
          <div className="border border-border bg-panel p-5 mb-8 rounded-lg">
            <div className="text-[10px] uppercase tracking-[2px] text-muted font-bold mb-2">Recommended Setup</div>
            <div className="text-[13px] text-text/90 leading-relaxed">
              Pick a <strong className="text-accent">Main Event</strong> as your central reference point. This gives your map a “home” so connections radiate outward from a single claim/event.
            </div>
            <div className="mt-3 flex gap-2 items-center">
              <select
                className="flex-1"
                value={project.mainEventId || ''}
                onChange={(e) => setProject(prev => ({ ...prev, mainEventId: e.target.value || undefined }))}
              >
                <option value="">— No main event set —</option>
                {project.nodes
                  .filter(n => n.type === 'event' || n.type === 'case')
                  .map(n => (
                    <option key={n.id} value={n.id}>{n.label}</option>
                  ))}
              </select>
              <button
                type="button"
                onClick={() => setProject(prev => ({ ...prev, mainEventId: undefined }))}
                className="px-3 py-2 text-[10px] uppercase tracking-widest font-bold border border-border bg-surface hover:bg-white/5"
              >
                Clear
              </button>
            </div>
            <div className="text-[11px] text-muted mt-2">
              If you don’t have an Event node yet, create one in <span className="text-accent">Nodes &amp; Edges</span> and come back.
            </div>
          </div>

          <div className="space-y-4">
            {PHASES.map((phase, idx) => {
              const phaseFields = phase.fields.map(f => f.id);
              const phaseFilled = phaseFields.filter(id => !!project.blueprint[id]).length;
              const isCompleted = (project.completedPhases || []).includes(phase.id);
              const phaseProgress = isCompleted ? 100 : Math.round((phaseFilled / phaseFields.length) * 100);

              return (
                <div key={phase.id} className={cn(
                  "transition-all duration-300 relative",
                  isCompleted ? "bg-accent/5" : "bg-panel"
                )}>
                  {/* Folder Tab Effect */}
                  <div className={cn(
                    "absolute -top-3 left-4 px-4 py-1 text-[8px] font-bold uppercase tracking-[2px] border-t border-l border-r rounded-t-lg z-0 transition-colors",
                    isCompleted ? "bg-accent border-accent text-bg" : "bg-surface border-border text-muted"
                  )}>
                    {phase.num}
                  </div>

                  <div 
                    className={cn(
                      "p-6 border flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors relative z-10",
                      isCompleted ? "border-accent/50" : "border-border"
                    )}
                    onClick={() => togglePhase(phase.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-full border flex items-center justify-center text-[12px] font-bold transition-colors",
                        isCompleted ? "bg-accent border-accent text-bg" : "bg-surface border-border text-muted"
                      )}>
                        {isCompleted ? "✓" : idx + 1}
                      </div>
                      <div>
                        <div className="text-[10px] tracking-[3px] text-accent mb-0.5 flex items-center gap-2 uppercase">
                          {phase.num}
                          <span className="text-muted font-mono tracking-normal ml-2">{phaseProgress}%</span>
                          {isCompleted && <span className="text-accent text-[9px] ml-2 font-bold">VERIFIED</span>}
                        </div>
                        <div className="font-serif text-[18px] text-text">
                          {phase.title} <span className="text-muted text-[12px] font-mono font-normal tracking-[1px] ml-2 opacity-50">{phase.subtitle}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleComplete(phase.id);
                        }}
                        className={cn(
                          "px-4 py-1.5 text-[9px] font-bold uppercase tracking-widest border transition-all",
                          isCompleted 
                            ? "bg-accent border-accent text-bg hover:bg-accent/80" 
                            : "bg-surface border-border text-muted hover:border-accent hover:text-accent"
                        )}
                      >
                        {isCompleted ? "UNMARK" : "MARK COMPLETE"}
                      </button>
                      <div className="text-muted">
                        {openPhases.includes(phase.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                    </div>
                  </div>

                  {openPhases.includes(phase.id) && (
                    <div className={cn(
                      "p-8 border-l border-r border-b space-y-8 bg-bg/30 relative z-10",
                      isCompleted ? "border-accent/30" : "border-border"
                    )}>
                      <div className="mb-6">
                        <p className="text-[13px] leading-relaxed text-text opacity-80 mb-6 font-serif italic border-l-2 border-border pl-4">{phase.desc}</p>
                        
                        {/* Linked Entities Section */}
                        <div className="mb-8">
                          <div className="flex items-center justify-between mb-3">
                            <div className="text-[10px] uppercase tracking-widest text-accent font-bold flex items-center gap-2">
                              <Layers size={12} />
                              Linked Entities
                            </div>
                            <div className="text-[9px] text-muted">Nodes tagged with this phase</div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {project.nodes.filter(n => n.phaseId === phase.id).length > 0 ? (
                              project.nodes.filter(n => n.phaseId === phase.id).map(n => (
                                <button 
                                  key={n.id}
                                  onClick={() => onSelectNode?.(n.id)}
                                  className="px-3 py-1.5 bg-surface border border-border hover:border-accent rounded text-[11px] text-text flex items-center gap-2 transition-colors"
                                >
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: n.placeholder ? '#888' : '#7a9e7e' }} />
                                  {n.label}
                                </button>
                              ))
                            ) : (
                              <div className="text-[11px] text-muted italic p-4 border border-dashed border-border w-full text-center">
                                No entities linked to this phase yet. Tag nodes in the "Nodes" tab to see them here.
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Examples - Non Editable */}
                        <div className="mb-8 space-y-3">
                          <div className="text-[9px] uppercase tracking-widest text-muted font-bold">Methodology Reference</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {phase.examples.map((ex, i) => (
                              <div key={i} className="bg-surface/40 border border-border/40 p-4 rounded shadow-sm">
                                <div className="text-[10px] text-accent/70 font-bold uppercase mb-1.5">{ex.label}</div>
                                <div className="text-[12px] text-muted italic leading-relaxed">{ex.text}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Methodology Tip */}
                        <div className="bg-accent/5 border-l-2 border-accent/30 p-3 text-[11px] text-accent/80 italic">
                          <span className="font-bold uppercase not-italic mr-2">Methodology Tip:</span>
                          {idx === 0 && "Without a baseline, you can't prove a gap. Be specific about the 'where' and 'when'."}
                          {idx === 1 && "Controllers are the gatekeepers. If a record is missing, these are the people who have to explain why."}
                          {idx === 2 && "Think like a bureaucrat. What forms would have been filed? What logs would have been signed?"}
                          {idx === 3 && "The 'No Record' response is your most valuable data point. Document the denial as evidence."}
                          {idx === 4 && "A gap is only structural if it exists where a record is expected. Map the hole, not just the lack of info."}
                          {idx === 5 && "Every claim in your final report must have a 'receipt'. If it's not anchored, it's just a hunch."}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="text-[9px] uppercase tracking-widest text-accent font-bold">Your Investigation Data</div>
                        {phase.fields.map(field => (
                          <div key={field.id} className="frow">
                            <label className="text-[11px] uppercase tracking-[1px] text-muted font-bold mb-2 block">
                              {field.label}
                            </label>
                            <textarea 
                              className="w-full min-h-[100px] bg-surface border border-border p-3 text-[14px] font-serif text-text outline-none focus:border-accent transition-colors"
                              placeholder={field.placeholder}
                              value={project.blueprint[field.id] || ''}
                              onChange={e => updateField(field.id, e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
