
import React, { useMemo, useState } from 'react';
import { Sparkles, Plus, Check, X as XIcon, FileText, Link2, AlertTriangle } from 'lucide-react';
import { ProjectData, NodeData, EdgeData, DocumentData } from '../types';
import { getText } from '../services/documentStore';
import { suggestConnections, type SuggestionResult } from '../services/geminiService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type ScopeMode = 'project' | 'document' | 'text';

interface AIHelperTabProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
}

function findNodeByLabel(project: ProjectData, label: string): NodeData | undefined {
  const norm = (s: string) => s.trim().toLowerCase();
  const target = norm(label);
  return project.nodes.find(n => norm(n.label) === target);
}

export default function AIHelperTab({ project, setProject }: AIHelperTabProps) {
  const [scope, setScope] = useState<ScopeMode>('project');
  const [docId, setDocId] = useState<string>(project.documents[0]?.id ?? '');
  const [customText, setCustomText] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const docOptions = useMemo(() => project.documents ?? [], [project.documents]);
  const selectedDoc = useMemo(() => docOptions.find(d => d.id === docId) ?? null, [docOptions, docId]);

  const buildInputText = async (): Promise<{ text: string, note: string }> => {
    const MAX_SEND = 40_000; // keep fast + avoid token blowups
    if (scope === 'text') {
      return { text: customText.trim(), note: customText.trim().length > MAX_SEND ? 'Custom text truncated.' : '' };
    }

    if (scope === 'document') {
      if (!selectedDoc) return { text: '', note: 'No document selected.' };

      let raw = '';
      if (selectedDoc.originalTextStorage === 'inline' && selectedDoc.originalText) raw = selectedDoc.originalText;
      if (selectedDoc.originalTextStorage === 'indexeddb' && selectedDoc.originalTextKey) {
        raw = (await getText(selectedDoc.originalTextKey)) || '';
      }

      const combined = [
        `DOCUMENT TITLE: ${selectedDoc.title}`,
        selectedDoc.url ? `URL: ${selectedDoc.url}` : '',
        selectedDoc.description ? `NOTES: ${selectedDoc.description}` : '',
        '',
        raw
      ].filter(Boolean).join('\n');

      const truncated = combined.length > MAX_SEND ? combined.slice(0, MAX_SEND) : combined;
      return { text: truncated, note: combined.length > MAX_SEND ? 'Document text truncated for AI call.' : '' };
    }

    // project scope: send a compact representation (labels, types, existing edges, doc titles, sources)
    const nodeLines = project.nodes.slice(0, 400).map(n => `NODE: ${n.label} [${n.type}]`).join('\n');
    const edgeLines = project.edges.slice(0, 600).map(e => {
      const from = project.nodes.find(n => n.id === e.from)?.label ?? e.from;
      const to = project.nodes.find(n => n.id === e.to)?.label ?? e.to;
      return `EDGE: ${from} -> ${e.label} -> ${to}`;
    }).join('\n');
    const docLines = project.documents.slice(0, 120).map(d => `DOC: ${d.title}${d.date ? ` (${d.date})` : ''}${d.url ? ` ${d.url}` : ''}`).join('\n');
    const srcLines = (project.sources || []).slice(0, 200).map(s => `SRC: ${s.title}${s.link ? ` ${s.link}` : ''}`).join('\n');

    const combined = [
      'PROJECT SNAPSHOT (compact):',
      '',
      nodeLines,
      '',
      edgeLines,
      '',
      docLines,
      '',
      srcLines
    ].join('\n');

    const truncated = combined.length > MAX_SEND ? combined.slice(0, MAX_SEND) : combined;
    return { text: truncated, note: combined.length > MAX_SEND ? 'Project snapshot truncated for AI call.' : '' };
  };

  const run = async () => {
    setError(null);
    setResult(null);

    setIsRunning(true);
    try {
      const { text, note } = await buildInputText();
      if (!text || text.trim().length === 0) {
        setError('Nothing to analyze. Add/import a document or paste text.');
        return;
      }
      const r = await suggestConnections({
        text,
        guidance: "Only propose suggestions. Do not assert truth. Prefer explicit links to evidence when possible."
      });

      // attach note if needed
      setResult(note ? { ...r, meta: { ...(r.meta || {}), note } } : r);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || 'AI failed. Check your API key and internet.');
    } finally {
      setIsRunning(false);
    }
  };

  const addEdge = (s: any, mode: 'confirmed' | 'hypothesis') => {
    const a = findNodeByLabel(project, s.from);
    const b = findNodeByLabel(project, s.to);
    if (!a || !b) return;

    const edge: EdgeData = {
      from: a.id,
      to: b.id,
      label: s.relationship,
      weight: 1,
      type: mode
    };

    setProject(prev => ({
      ...prev,
      edges: [...prev.edges, edge]
    }));
  };

  const addPlaceholderNode = (label: string) => {
    const exists = findNodeByLabel(project, label);
    if (exists) return;

    const node: NodeData = {
      id: `n-ai-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      label,
      type: 'gap' as any,
      description: 'Placeholder suggested by AI. Verify with sources before promoting.',
      tags: [],
      sources: [],
      sourceIds: [],
      x: Math.random() * 800 - 400,
      y: Math.random() * 600 - 300,
    } as any;

    setProject(prev => ({
      ...prev,
      nodes: [...prev.nodes, node]
    }));
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="border-b border-border bg-panel p-4 shrink-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="font-serif text-[16px] text-accent mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> AI Helper
            </div>
            <div className="text-[11px] text-muted leading-relaxed max-w-2xl">
              Suggestions only. Nothing is added automatically.
              ODEN’s methodology constrains the helper: it proposes cautious links you can verify, it doesn’t assert truth, and it never changes your map without your explicit click.
              Treat output as a structured hypothesis generator—use Sources + Context to ground every claim.
            </div>
          </div>
          <button className="btn btn-i flex items-center gap-2" onClick={run} disabled={isRunning}>
            <Sparkles size={14} /> {isRunning ? 'Thinking...' : 'Suggest Connections'}
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="frow">
            <label>Scope</label>
            <select value={scope} onChange={e => setScope(e.target.value as ScopeMode)}>
              <option value="project">Whole Project (compact snapshot)</option>
              <option value="document">One Document</option>
              <option value="text">Paste Text</option>
            </select>
          </div>

          {scope === 'document' && (
            <div className="frow md:col-span-2">
              <label>Document</label>
              <select value={docId} onChange={e => setDocId(e.target.value)}>
                {docOptions.map(d => (
                  <option key={d.id} value={d.id}>{d.title}</option>
                ))}
              </select>
              <div className="text-[10px] text-muted mt-1 flex items-center gap-2">
                <FileText size={12} /> Uses stored original text (inline / IndexedDB) when available.
              </div>
            </div>
          )}

          {scope === 'text' && (
            <div className="frow md:col-span-2">
              <label>Paste Text</label>
              <textarea
                placeholder="Paste an excerpt or notes. AI will propose nodes/edges + reasons. Nothing is auto-added."
                value={customText}
                onChange={e => setCustomText(e.target.value)}
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mt-3 border border-[#a04040] text-[#a04040] bg-[#a0404010] p-3 text-[11px] flex items-start gap-2">
            <AlertTriangle size={14} className="mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {result?.meta?.note && (
          <div className="mt-3 border border-border text-muted bg-bg p-3 text-[11px]">
            {result.meta.note}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {!result && !error && (
          <div className="text-[12px] text-muted leading-relaxed max-w-3xl">
            Run <span className="text-accent">Suggest Connections</span> to get proposals like:
            <div className="mt-3 border border-border bg-surface p-3 text-[11px] leading-relaxed">
              <div className="text-text mb-1">Arizona Gazette → reported → Grand Canyon Discovery Claim</div>
              <div className="text-muted">
                Process: identify candidate nodes → check shared context (same document/date/location) → propose the weakest safe relationship label (e.g., “reported”, “mentioned”, “contradicts”).
              Evidence should be a source you can attach (document entry, citation registry, or import text).
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="border border-border bg-surface p-4">
              <div className="text-[11px] tracking-[2px] uppercase text-muted mb-3 flex items-center gap-2">
                <Link2 size={14} /> Suggested Connections
              </div>

              {(result.suggestions || []).length === 0 && (
                <div className="text-[12px] text-muted">No connections suggested.</div>
              )}

              {(result.suggestions || []).map((s, idx) => {
                const fromNode = findNodeByLabel(project, s.from);
                const toNode = findNodeByLabel(project, s.to);
                const missing = !fromNode || !toNode;

                return (
                  <div key={idx} className="border border-border2 bg-bg p-3 mb-3">
                    <div className="text-[12px] text-text mb-1">
                      <span className="text-accent">{s.from}</span> → <span className="text-text">{s.relationship}</span> → <span className="text-accent">{s.to}</span>
                    </div>
                    <div className="text-[11px] text-muted leading-relaxed">
                      <div className="mb-1"><span className="text-muted">Reason:</span> {s.reason}</div>
                      {s.evidence && (
                        <div className="text-[10px] text-muted">
                          Evidence: {s.evidence}
                        </div>
                      )}
                    </div>

                    {missing && (
                      <div className="mt-2 text-[10px] text-[#d4a843] flex items-center gap-2">
                        <AlertTriangle size={12} />
                        One or both nodes do not exist yet. Create placeholders first.
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mt-3">
                      {!fromNode && (
                        <button className="btn btn-m flex items-center gap-2" onClick={() => addPlaceholderNode(s.from)}>
                          <Plus size={12} /> Add node: {s.from}
                        </button>
                      )}
                      {!toNode && (
                        <button className="btn btn-m flex items-center gap-2" onClick={() => addPlaceholderNode(s.to)}>
                          <Plus size={12} /> Add node: {s.to}
                        </button>
                      )}

                      <button
                        className={cn("btn btn-i flex items-center gap-2", missing && "opacity-50 pointer-events-none")}
                        onClick={() => addEdge(s, 'confirmed')}
                        title="Adds an edge marked as Confirmed"
                      >
                        <Check size={12} /> Add as Confirmed
                      </button>
                      <button
                        className={cn("btn btn-m flex items-center gap-2", missing && "opacity-50 pointer-events-none")}
                        onClick={() => addEdge(s, 'hypothesis')}
                        title="Adds an edge marked as Hypothesis"
                      >
                        <Plus size={12} /> Add as Hypothesis
                      </button>
                      <button className="btn btn-d flex items-center gap-2" onClick={() => { /* ignore */ }}>
                        <XIcon size={12} /> Ignore
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="border border-border bg-surface p-4">
              <div className="text-[11px] tracking-[2px] uppercase text-muted mb-3">Missing nodes / event candidates</div>

              {(result.missingNodes || []).length === 0 && (
                <div className="text-[12px] text-muted">No missing nodes suggested.</div>
              )}

              {(result.missingNodes || []).map((n, idx) => (
                <div key={idx} className="border border-border2 bg-bg p-3 mb-3">
                  <div className="text-[12px] text-text mb-1">{n.label}</div>
                  <div className="text-[11px] text-muted leading-relaxed mb-3">{n.reason}</div>
                  <button className="btn btn-m flex items-center gap-2" onClick={() => addPlaceholderNode(n.label)}>
                    <Plus size={12} /> Add placeholder node
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
