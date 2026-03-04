import React, { useMemo, useState } from 'react';
import { Plus, Trash2, Edit2, ExternalLink, Link as LinkIcon, X } from 'lucide-react';
import { ProjectData, SourceData } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SourcesTabProps {
  project: ProjectData;
  setProject: React.Dispatch<React.SetStateAction<ProjectData>>;
}

type DraftSource = Omit<SourceData, 'id'> & { id?: string };

const emptyDraft = (): DraftSource => ({
  title: '',
  institution: '',
  date: '',
  rg: '',
  url: '',
  notes: '',
});

export default function SourcesTab({ project, setProject }: SourcesTabProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<DraftSource>(emptyDraft());
  const [query, setQuery] = useState('');
  const [usedOnly, setUsedOnly] = useState(false);

  const usage = useMemo(() => {
    const nodeCountBySource: Record<string, number> = {};
    const contextCountBySource: Record<string, number> = {};

    for (const n of project.nodes) {
      for (const id of (n.sourceIds ?? [])) {
        nodeCountBySource[id] = (nodeCountBySource[id] ?? 0) + 1;
      }
    }
    for (const sec of project.sections) {
      for (const id of (sec.sourceIds ?? [])) {
        contextCountBySource[id] = (contextCountBySource[id] ?? 0) + 1;
      }
    }

    const usedIds = new Set<string>([
      ...Object.keys(nodeCountBySource),
      ...Object.keys(contextCountBySource),
    ]);

    return { nodeCountBySource, contextCountBySource, usedIds };
  }, [project.nodes, project.sections]);

  const pullSourcesInUse = () => {
    setUsedOnly(true);
    setQuery('');
  };

  const copyUsedBibliography = async () => {
    const used = project.sources
      .filter(s => usage.usedIds.has(s.id))
      .map(s => {
        const bits = [s.title];
        const meta = [s.institution, s.date, s.rg].filter(Boolean).join(' • ');
        if (meta) bits.push(`(${meta})`);
        if (s.url) bits.push(s.url);
        return bits.join(' ');
      })
      .join('\n');

    try {
      await navigator.clipboard.writeText(used || '');
      // lightweight feedback (no toast system in this build)
      alert('Copied used sources list to clipboard.');
    } catch {
      alert('Could not copy automatically. Your browser may block clipboard access.');
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = usedOnly
      ? project.sources.filter(s => usage.usedIds.has(s.id))
      : project.sources;
    if (!q) return base;
    return base.filter(s =>
      [s.title, s.institution, s.date, s.rg, s.url, s.notes].some(v =>
        String(v ?? '').toLowerCase().includes(q)
      )
    );
  }, [project.sources, query, usedOnly, usage.usedIds]);

  const openCreate = () => {
    setDraft(emptyDraft());
    setIsModalOpen(true);
  };

  const openEdit = (s: SourceData) => {
    setDraft({ ...s });
    setIsModalOpen(true);
  };

  const save = () => {
    const title = draft.title.trim();
    if (!title) return;

    setProject(prev => {
      const next = { ...prev };
      if (!draft.id) {
        const newSource: SourceData = {
          id: `src-${Date.now()}`,
          title,
          institution: draft.institution?.trim() ?? '',
          date: draft.date?.trim() ?? '',
          rg: draft.rg?.trim() ?? '',
          url: draft.url?.trim() ?? '',
          notes: draft.notes?.trim() ?? '',
        };
        next.sources = [newSource, ...prev.sources];
      } else {
        next.sources = prev.sources.map(s => s.id === draft.id ? ({
          ...s,
          title,
          institution: draft.institution?.trim() ?? '',
          date: draft.date?.trim() ?? '',
          rg: draft.rg?.trim() ?? '',
          url: draft.url?.trim() ?? '',
          notes: draft.notes?.trim() ?? '',
        }) : s);
      }
      return next;
    });

    setIsModalOpen(false);
  };

  const remove = (id: string) => {
    setProject(prev => {
      // Remove from registry
      const sources = prev.sources.filter(s => s.id !== id);

      // Also detach from any nodes/sections that referenced it
      const nodes = prev.nodes.map(n => {
        const ids = (n.sourceIds ?? []).filter(x => x !== id);
        // Keep the legacy n.sources list intact if user manually added it.
        // If this source was attached via registry, remove its label/url entry too.
        const src = prev.sources.find(s => s.id === id);
        const legacy = src
          ? n.sources.filter(ls => !(ls.label === src.title && (src.url ? ls.url === src.url : true)))
          : n.sources;

        return { ...n, sourceIds: ids, sources: legacy };
      });

      const sections = prev.sections.map(sec => ({
        ...sec,
        sourceIds: (sec.sourceIds ?? []).filter(x => x !== id),
      }));

      return { ...prev, sources, nodes, sections };
    });
  };

  return (
    <div className="flex h-full">
      <div className="w-full lg:w-[420px] border-r border-border bg-panel flex-shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-[12px] text-muted uppercase tracking-[2px]">Sources Registry</div>
              <div className="text-[22px] font-bold tracking-[1px]">Sources</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={cn(
                  'btn flex items-center gap-2',
                  usedOnly ? 'btn-accent' : 'btn-ghost'
                )}
                title="Pull sources currently attached anywhere in the graph"
                onClick={pullSourcesInUse}
              >
                Pull in-use
              </button>

              {usedOnly && (
                <button
                  className="btn btn-ghost flex items-center gap-2"
                  title="Copy a bibliography-style list of sources currently in use"
                  onClick={copyUsedBibliography}
                >
                  Copy list
                </button>
              )}

              <button
                className="btn btn-accent flex items-center gap-2"
                onClick={openCreate}
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>

          <div className="mt-3 flex items-center gap-2">
            <input
              className="bg-surface border border-border text-text font-mono text-[13px] px-2.5 py-2 flex-1 outline-none focus:border-accent"
              placeholder="Search title, institution, notes..."
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span className="text-muted">Showing:</span>
            <button
              className={cn('px-2 py-1 border rounded-md', usedOnly ? 'border-border text-muted hover:text-text' : 'border-accent text-accent')}
              onClick={() => setUsedOnly(false)}
              title="Show all registry sources"
            >
              All
            </button>
            <button
              className={cn('px-2 py-1 border rounded-md', usedOnly ? 'border-accent text-accent' : 'border-border text-muted hover:text-text')}
              onClick={() => pullSourcesInUse()}
              title="Show only sources attached to nodes/contexts"
            >
              In use ({usage.usedIds.size})
            </button>
          </div>

          <div className="mt-2 text-[11px] text-muted">
            Tip: keep the registry clean. Attach sources to nodes/contexts elsewhere — nothing here asserts truth.
          </div>
        </div>

        <div className="overflow-auto h-[calc(100%-140px)]">
          {filtered.length === 0 ? (
            <div className="p-4 text-muted text-[12px]">No sources yet.</div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(s => (
                <div key={s.id} className="p-4 hover:bg-surface/40">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-[14px] truncate">{s.title}</div>
                      <div className="text-[11px] text-muted mt-1">
                        {[s.institution, s.date, s.rg].filter(Boolean).join(' • ')}
                      </div>
                      {s.url && (
                        <a
                          className="inline-flex items-center gap-1 text-[12px] text-accent mt-2 hover:underline"
                          href={s.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink size={14} />
                          Open link
                        </a>
                      )}
                      {s.notes && (
                        <div className="text-[12px] text-muted mt-2 line-clamp-3">{s.notes}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        className="icon-btn"
                        title="Edit"
                        onClick={() => openEdit(s)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="icon-btn text-red-400"
                        title="Delete"
                        onClick={() => remove(s.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[11px] text-muted">
                    <LinkIcon size={14} />
                    Attached to{' '}
                    <span className="text-accent">
                      {(usage.nodeCountBySource[s.id] ?? 0)}
                    </span>{' '}
                    nodes and{' '}
                    <span className="text-accent">
                      {(usage.contextCountBySource[s.id] ?? 0)}
                    </span>{' '}
                    contexts
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 p-6 overflow-auto">
        <div className="max-w-3xl">
          <div className="text-[12px] text-muted uppercase tracking-[2px]">How Step 4 works</div>
          <div className="mt-2 text-[14px] leading-relaxed text-text">
            <p className="mb-3">
              This tab is the <span className="text-accent font-bold">registry</span>. It’s where sources live as reusable objects.
            </p>
            <p className="mb-3">
              Nodes and context sections don’t store citations as raw text — they store <span className="text-accent font-bold">attachments</span> to registry entries.
              That keeps ODEN aligned with your site: each node is an individual claim/asset, and sources are the evidence spine.
            </p>
            <p className="mb-3">
              Attach sources from <span className="text-accent font-bold">Nodes & Edges</span> (per-node) or <span className="text-accent font-bold">Context</span> (per-section),
              and use “Pull sources from nodes” inside a context section to build clean citations fast.
            </p>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-[720px] bg-panel border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="font-bold text-[14px] tracking-[1px]">
                {draft.id ? 'Edit Source' : 'Add Source'}
              </div>
              <button className="icon-btn" onClick={() => setIsModalOpen(false)} title="Close">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="text-[11px] text-muted uppercase tracking-[1px]">Title</label>
                <input
                  className="mt-1 w-full bg-surface border border-border text-text font-mono text-[13px] px-2.5 py-2 outline-none focus:border-accent"
                  value={draft.title}
                  onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  placeholder="Arizona Gazette — April 1909"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted uppercase tracking-[1px]">Institution / Publisher</label>
                <input
                  className="mt-1 w-full bg-surface border border-border text-text font-mono text-[13px] px-2.5 py-2 outline-none focus:border-accent"
                  value={draft.institution}
                  onChange={e => setDraft(d => ({ ...d, institution: e.target.value }))}
                  placeholder="Arizona Gazette"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted uppercase tracking-[1px]">Date</label>
                <input
                  className="mt-1 w-full bg-surface border border-border text-text font-mono text-[13px] px-2.5 py-2 outline-none focus:border-accent"
                  value={draft.date}
                  onChange={e => setDraft(d => ({ ...d, date: e.target.value }))}
                  placeholder="1909-04-05"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted uppercase tracking-[1px]">Record Group / Ref</label>
                <input
                  className="mt-1 w-full bg-surface border border-border text-text font-mono text-[13px] px-2.5 py-2 outline-none focus:border-accent"
                  value={draft.rg}
                  onChange={e => setDraft(d => ({ ...d, rg: e.target.value }))}
                  placeholder="RG 95 / Box 2 / Folder 7"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted uppercase tracking-[1px]">Link / URL</label>
                <input
                  className="mt-1 w-full bg-surface border border-border text-text font-mono text-[13px] px-2.5 py-2 outline-none focus:border-accent"
                  value={draft.url}
                  onChange={e => setDraft(d => ({ ...d, url: e.target.value }))}
                  placeholder="https://..."
                />
              </div>

              <div className="md:col-span-2">
                <label className="text-[11px] text-muted uppercase tracking-[1px]">Notes</label>
                <textarea
                  className="mt-1 w-full h-[120px] bg-surface border border-border text-text font-mono text-[13px] px-2.5 py-2 outline-none focus:border-accent resize-none"
                  value={draft.notes}
                  onChange={e => setDraft(d => ({ ...d, notes: e.target.value }))}
                  placeholder="Why this source matters, what it contains, concerns about reliability, etc."
                />
              </div>
            </div>

            <div className="p-4 border-t border-border flex items-center justify-end gap-2">
              <button className="btn" onClick={() => setIsModalOpen(false)}>Cancel</button>
              <button className="btn btn-accent" onClick={save}>
                {draft.id ? 'Save changes' : 'Create source'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
