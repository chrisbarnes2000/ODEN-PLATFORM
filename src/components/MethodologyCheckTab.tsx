import React, { useState } from 'react';
import { CheckCircle, AlertTriangle, Info, Sparkles, Loader2, BrainCircuit } from 'lucide-react';
import { ProjectData } from '../types';
import { generateCaseNarrative } from '../services/geminiService';

interface MethodologyCheckTabProps {
  project: ProjectData;
}

export default function MethodologyCheckTab({ project }: MethodologyCheckTabProps) {
  const [hasRun, setHasRun] = useState(false);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  const [activeView, setActiveView] = useState<'method' | 'ai'>('method');

  const runCheck = () => {
    const checks = [];
    const allNodes = project.nodes;
    const edges = project.edges;
    const placeholders = allNodes.filter(n => n.placeholder);
    const nodes = allNodes.filter(n => !n.placeholder);
    const edgeCountById: Record<string, number> = {};
    edges.forEach(e => {
      edgeCountById[e.from] = (edgeCountById[e.from] || 0) + 1;
      edgeCountById[e.to] = (edgeCountById[e.to] || 0) + 1;
    });

    // 1. Nodes mapped
    if (nodes.length === 0) {
      checks.push({ pass: false, title: 'No nodes yet', detail: 'Your investigation needs entities — people, institutions, evidence gaps, locations.' });
    } else {
      checks.push({ pass: true, title: `${nodes.length} node${nodes.length !== 1 ? 's' : ''} mapped`, detail: 'Your investigation has entities on the map.' });
    }

    // 2. Gap nodes
    const gapNodes = nodes.filter(n => n.type === 'gap');
    if (gapNodes.length === 0) {
      checks.push({ pass: false, title: 'No Gap / Unknown nodes', detail: 'The methodology is built around documented absences. You need at least one gap node.' });
    } else {
      checks.push({ pass: true, title: `${gapNodes.length} Gap / Unknown node${gapNodes.length !== 1 ? 's' : ''} documented`, detail: 'Good. The methodology requires specific documented absences.' });
    }

    // 3. Sources
    const noSource = nodes.filter(n => !n.sources.length || n.sources.every(s => !s.label.trim()));
    if (noSource.length > 0) {
      checks.push({ pass: false, title: `${noSource.length} node${noSource.length !== 1 ? 's' : ''} missing sources`, detail: 'Every node needs a primary source behind it. Unsourced nodes: ' + noSource.map(n => n.label).join(', ') });
    } else if (nodes.length > 0) {
      checks.push({ pass: true, title: 'All nodes have sources', detail: 'Every entity on the map has at least one source attached.' });
    }

    // 4. Isolated nodes
    const isolated = nodes.filter(n => !edgeCountById[n.id]);
    if (isolated.length > 0) {
      checks.push({ pass: false, title: `${isolated.length} isolated node${isolated.length !== 1 ? 's' : ''} with no connections`, detail: 'Nodes with no connections suggest incomplete mapping. Isolated nodes: ' + isolated.map(n => n.label).join(', ') });
    } else if (nodes.length > 1) {
      checks.push({ pass: true, title: 'All nodes are connected', detail: 'No isolated entities. Your map is fully networked.' });
    }

    // 5. Convergence
    const convergenceNodes = nodes.filter(n => {
      const myEdges = edges.filter(e => e.from === n.id || e.to === n.id);
      const types = new Set(myEdges.map(e => e.type));
      return myEdges.length >= 3 && types.size >= 2;
    });
    if (convergenceNodes.length === 0 && nodes.length > 3) {
      checks.push({ pass: false, title: 'No convergence points detected', detail: 'The closed system finding requires convergence — multiple independent threads leading to the same people or organizations.' });
    } else if (convergenceNodes.length > 0) {
      checks.push({ pass: true, title: `${convergenceNodes.length} convergence point${convergenceNodes.length !== 1 ? 's' : ''} detected`, detail: 'These nodes show up across multiple relationship types.' });
    }

    return checks;
  };

  const results = runCheck();
  const passed = results.filter(r => r.pass).length;
  const total = results.length;
  const pct = total === 0 ? 0 : Math.round((passed / total) * 100);

  const handleGenerateInsight = async () => {
    setIsGeneratingInsight(true);
    try {
      const insight = await generateCaseNarrative(project);
      setLocalInsight(insight);
    } catch (error) {
      console.error(error);
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  const [localInsight, setLocalInsight] = useState<string | null>(project.aiInsight || null);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* View Switcher removed - single view now */}

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8 w-full">
          <div className="mbox mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3>Methodology Parameters</h3>
                  <div className="flex items-center gap-1.5 bg-surface border border-border px-2 py-1 rounded">
                    <Info size={10} className="text-muted" />
                    <span className="text-[9px] font-bold text-muted uppercase tracking-wider">Parameter-Driven Analysis</span>
                  </div>
                </div>
                <p className="mb-4">This check is powered by the <strong>ODEN Methodology Parameters</strong>. It measures your investigation against structural requirements like baseline definition, controller identification, and source anchoring. It is <strong>not</strong> an AI-generated opinion, but a self-check of your research integrity.</p>
                
                <div className="space-y-4 text-[13px] leading-relaxed">
                  <div className="font-bold text-accent uppercase tracking-[1px] text-[11px]">What it’s checking for:</div>
                  <ul className="space-y-3 list-none">
                    <li className="flex gap-3">
                      <span className="text-accent font-bold">•</span>
                      <span><strong className="text-text">The event is defined.</strong> Your case has a clear claim, date range, and location.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-accent font-bold">•</span>
                      <span><strong className="text-text">Controllers are identified.</strong> You’ve named the institutions that had authority over the environment, documentation, or narrative.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-accent font-bold">•</span>
                      <span><strong className="text-text">Expected records exist on paper.</strong> You’ve written down what should normally be generated (so absence is measurable).</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-accent font-bold">•</span>
                      <span><strong className="text-text">Requests are logged.</strong> You tracked who you contacted and what they returned (including denials and referrals).</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-accent font-bold">•</span>
                      <span><strong className="text-text">Gaps are specific.</strong> “No record” is tied to a repository + record type + time window, not a general feeling.</span>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-accent font-bold">•</span>
                      <span><strong className="text-text">Claims are anchored.</strong> Key conclusions link back to documents and sources you actually stored.</span>
                    </li>
                  </ul>
                  <div className="mt-6 p-4 bg-accent/5 border border-accent/20 text-[12px] italic">
                    Green means “covered.” Yellow means “worth tightening.” If you disagree with a flag, that’s fine — use it as a prompt to document your reasoning inside Context.
                  </div>
                </div>
              </div>

              {!hasRun ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed border-border bg-surface/30">
                  <CheckCircle size={48} className="text-muted mb-4 opacity-20" />
                  <p className="text-muted text-[13px] mb-6">Ready to analyze your investigation structure?</p>
                  <button 
                    className="btn btn-lg px-12"
                    onClick={() => setHasRun(true)}
                  >
                    RUN ANALYSIS
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-6">
                      <div className="text-[36px] font-bold font-mono" style={{ color: pct === 100 ? '#7a9e7e' : pct >= 70 ? '#c8923f' : '#a04040' }}>
                        {pct}%
                      </div>
                      <div>
                        <div className="font-serif text-[16px] text-text mb-1">{passed} of {total} checks passed</div>
                        <div className="text-[11px] text-muted">
                          {pct === 100 ? 'Your investigation meets all methodology requirements.' : pct >= 70 ? 'Solid foundation. Address the warnings below to strengthen your research.' : 'Several things need attention before your research is methodology-sound.'}
                        </div>
                      </div>
                    </div>
                    <button 
                      className="btn btn-sm"
                      onClick={() => setHasRun(false)}
                    >
                      RESET
                    </button>
                  </div>

                  <div className="space-y-4">
                    {results.map((r, i) => (
                      <div key={i} className={`border p-4 flex gap-4 ${r.pass ? 'border-border bg-surface/30' : 'border-[#5a3030] bg-[#5a3030]/10'}`}>
                        <div className="mt-1">
                          {r.pass ? <CheckCircle size={18} className="text-[#7a9e7e]" /> : <AlertTriangle size={18} className="text-[#a04040]" />}
                        </div>
                        <div>
                          <div className={`font-serif text-[14px] mb-1 ${r.pass ? 'text-text' : 'text-[#e09090]'}`}>{r.title}</div>
                          <div className="text-[12px] text-muted leading-relaxed">{r.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
        </div>
      </div>
    </div>
  );
}
