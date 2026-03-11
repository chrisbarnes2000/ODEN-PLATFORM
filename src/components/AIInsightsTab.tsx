import React, { useState, useEffect } from 'react';
import { BrainCircuit, Sparkles, RefreshCw, MessageSquare, Send, Bot, User, Info, Download, AlertTriangle, Layers } from 'lucide-react';
import { ProjectData, Contradiction } from '../types';
import { generateCaseNarrative, chatInvestigation, detectContradictions, structuralSynthesis } from '../services/geminiService';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AIInsightsTabProps {
  project: ProjectData;
  onUpdateBriefing: (briefing: string) => void;
  onUpdateContradictions: (contradictions: Contradiction[]) => void;
  onUpdateStructuralSynthesis: (synthesis: any) => void;
}

export default function AIInsightsTab({ project, onUpdateBriefing, onUpdateContradictions, onUpdateStructuralSynthesis }: AIInsightsTabProps) {
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [synthesizing, setSynthesizing] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'model', content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  const narrative = project.briefing || '';

  const fetchNarrative = async () => {
    setLoading(true);
    try {
      const res = await generateCaseNarrative(project);
      onUpdateBriefing(res);
    } catch (error) {
      console.error('Failed to generate briefing', error);
    } finally {
      setLoading(false);
    }
  };

  const scanContradictions = async () => {
    setScanning(true);
    try {
      const results = await detectContradictions(project);
      onUpdateContradictions(results);
      if (results.length > 0) {
        setChatHistory(prev => [...prev, { 
          role: 'model', 
          content: `⚠️ **CONTRADICTION SCAN COMPLETE**\n\nI've identified ${results.length} potential inconsistencies in your data. You can review them in the list below.` 
        }]);
      } else {
        setChatHistory(prev => [...prev, { 
          role: 'model', 
          content: `✅ **CONTRADICTION SCAN COMPLETE**\n\nNo major inconsistencies were detected in the current data set.` 
        }]);
      }
    } catch (error) {
      console.error('Failed to scan contradictions', error);
    } finally {
      setScanning(false);
    }
  };

  const synthesizeStructure = async () => {
    setSynthesizing(true);
    try {
      const res = await structuralSynthesis(project);
      onUpdateStructuralSynthesis(res);
      setChatHistory(prev => [...prev, { 
        role: 'model', 
        content: `🧩 **STRUCTURAL SYNTHESIS COMPLETE**\n\nI've analyzed the underlying structure of your investigation. I've identified ${res.themes.length} core themes that organize your current data.` 
      }]);
    } catch (error) {
      console.error('Failed to synthesize structure', error);
    } finally {
      setSynthesizing(false);
    }
  };

  const downloadBriefing = () => {
    if (!narrative) return;
    const blob = new Blob([narrative], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ODEN-Briefing-${project.caseName || 'Case'}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!narrative && project.nodes.length > 0) {
      fetchNarrative();
    }
  }, [project.nodes.length]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || chatLoading) return;

    const userMsg = chatMessage;
    setChatMessage('');
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatLoading(true);

    try {
      const historyForApi = chatHistory.map(h => ({
        role: h.role,
        parts: [{ text: h.content }]
      }));
      const res = await chatInvestigation(project, userMsg, historyForApi);
      setChatHistory(prev => [...prev, { role: 'model', content: res }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'model', content: "I'm sorry, I encountered an error processing your request." }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col md:flex-row gap-6 p-6 overflow-hidden">
      {/* Narrative Section */}
      <div className="flex-1 flex flex-col min-h-0 bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-panel flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit size={18} className="text-accent" />
            <h3 className="text-[14px] font-bold uppercase tracking-wider">Case Briefing</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={downloadBriefing}
              disabled={!narrative || loading}
              className="p-1.5 text-muted hover:text-accent transition-colors disabled:opacity-50"
              title="Download Briefing"
            >
              <Download size={16} />
            </button>
            <button 
              onClick={fetchNarrative}
              disabled={loading}
              className="p-1.5 text-muted hover:text-accent transition-colors disabled:opacity-50"
              title="Refresh Briefing"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button 
              onClick={synthesizeStructure}
              disabled={synthesizing}
              className="p-1.5 text-muted hover:text-accent transition-colors disabled:opacity-50"
              title="Synthesize Hidden Structure"
            >
              <Layers size={16} className={synthesizing ? 'animate-spin text-accent' : ''} />
            </button>
            <button 
              onClick={scanContradictions}
              disabled={scanning}
              className="p-1.5 text-muted hover:text-accent transition-colors disabled:opacity-50"
              title="Scan for Contradictions"
            >
              <AlertTriangle size={16} className={scanning ? 'animate-pulse text-accent' : ''} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {/* Structural Synthesis Display */}
          {project.structuralSynthesis && (
            <div className="mb-8 space-y-4">
              <div className="flex items-center gap-2 text-accent text-[11px] font-bold uppercase tracking-widest mb-2">
                <Layers size={14} />
                Structural Synthesis
              </div>
              <div className="p-5 bg-accent/5 border border-accent/20 rounded-xl">
                <p className="text-[13px] text-text font-serif italic mb-4 leading-relaxed">
                  "{project.structuralSynthesis.overview}"
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {project.structuralSynthesis.themes.map((theme, i) => (
                    <div key={i} className="p-4 bg-surface border border-border rounded-lg shadow-sm">
                      <div className="text-[12px] font-bold text-accent uppercase tracking-wider mb-1">{theme.title}</div>
                      <div className="text-[12px] text-text mb-2 leading-relaxed">{theme.description}</div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {theme.nodeLabels.map((label, li) => (
                          <span key={li} className="text-[9px] px-1.5 py-0.5 bg-bg border border-border text-muted rounded uppercase font-bold">
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {project.contradictions && project.contradictions.length > 0 && (
            <div className="mb-8 space-y-3">
              <div className="flex items-center gap-2 text-accent text-[11px] font-bold uppercase tracking-widest mb-2">
                <AlertTriangle size={14} />
                Detected Contradictions ({project.contradictions.length})
              </div>
              {project.contradictions.map(c => (
                <div key={c.id} className="p-4 bg-[#a04040]/5 border border-[#a04040]/20 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-[9px] px-1.5 py-0.5 border uppercase tracking-widest font-bold",
                      c.severity === 'high' ? "border-[#a04040] text-[#a04040]" : "border-muted text-muted"
                    )}>
                      {c.severity} severity
                    </span>
                    <span className="text-[10px] text-muted font-bold uppercase">{c.type}</span>
                  </div>
                  <div className="text-[13px] text-text font-medium mb-1">{c.description}</div>
                  <div className="text-[11px] text-muted italic leading-relaxed">{c.justification}</div>
                </div>
              ))}
            </div>
          )}

          <div className="mb-6 p-5 bg-accent/5 border border-accent/10 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <Info size={18} className="text-accent shrink-0 mt-0.5" />
              <div className="text-[12px] text-muted leading-relaxed">
                <span className="font-bold text-accent uppercase tracking-wider block mb-1">About AI Insights</span>
                This tab provides a high-level analytical briefing of your investigation. It uses AI to synthesize all your recorded data—nodes, connections, narrative context, and uploaded evidence—to help you spot patterns and gaps.
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-accent/10">
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-accent/70">Capabilities</div>
                <ul className="text-[11px] text-muted list-disc pl-4 space-y-1">
                  <li>Synthesizes disparate threads into a briefing</li>
                  <li>Identifies "Structural Silence" (missing data)</li>
                  <li>Flags "Crossovers" between independent threads</li>
                </ul>
              </div>
              <div className="space-y-1">
                <div className="text-[10px] uppercase font-bold text-accent/70">Constraints & Privacy</div>
                <ul className="text-[11px] text-muted list-disc pl-4 space-y-1">
                  <li>Analyzes <span className="text-text font-medium">only</span> your provided research</li>
                  <li>No external web searching or data leaks</li>
                  <li>Will <span className="text-text font-medium">never</span> auto-modify your map</li>
                </ul>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-muted gap-4">
              <RefreshCw size={32} className="animate-spin opacity-20" />
              <p className="text-[12px] animate-pulse">Analyzing investigation patterns...</p>
            </div>
          ) : narrative ? (
            <div className="markdown-body prose prose-invert prose-sm max-w-none">
              <Markdown>{narrative}</Markdown>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8">
              <Bot size={48} className="text-muted mb-4 opacity-10" />
              <p className="text-muted text-[13px]">Add more nodes to your investigation to generate a narrative briefing.</p>
              <button 
                onClick={fetchNarrative}
                className="mt-4 px-4 py-2 bg-accent/10 border border-accent/20 rounded text-accent text-[12px] font-bold uppercase hover:bg-accent/20 transition-colors"
              >
                Generate Initial Briefing
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chat Section */}
      <div className="w-full md:w-[400px] flex flex-col min-h-0 bg-surface border border-border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-panel flex items-center gap-2">
          <MessageSquare size={18} className="text-accent" />
          <h3 className="text-[14px] font-bold uppercase tracking-wider">Talk to Analyst</h3>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {chatHistory.length === 0 && (
            <div className="text-center p-6 bg-accent/5 border border-accent/10 rounded-lg">
              <p className="text-[11px] text-muted leading-relaxed italic">
                "I am your investigative partner. Ask me about specific entities, suggest leads, or request a summary of the structural silence in your case."
              </p>
            </div>
          )}
          
          <AnimatePresence initial={false}>
            {chatHistory.map((msg, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`p-2 rounded-full h-8 w-8 flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-accent/20 text-accent' : 'bg-surface border border-border text-muted'
                }`}>
                  {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                </div>
                <div className={`p-3 rounded-lg text-[12px] leading-relaxed max-w-[85%] ${
                  msg.role === 'user' ? 'bg-accent text-white' : 'bg-panel border border-border text-text'
                }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {chatLoading && (
            <div className="flex gap-3">
              <div className="p-2 rounded-full h-8 w-8 flex items-center justify-center bg-surface border border-border text-muted">
                <Bot size={14} />
              </div>
              <div className="p-3 rounded-lg bg-panel border border-border flex gap-1">
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-accent rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-panel">
          <div className="relative">
            <input 
              className="w-full bg-surface border border-border rounded-lg pl-4 pr-12 py-3 text-[13px] outline-none focus:border-accent transition-colors"
              placeholder="Ask about the case..."
              value={chatMessage || ''}
              onChange={e => setChatMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            />
            <button 
              onClick={handleSendMessage}
              disabled={!chatMessage.trim() || chatLoading}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-accent hover:bg-accent/10 rounded-md transition-colors disabled:opacity-30"
            >
              <Send size={18} />
            </button>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[9px] text-muted uppercase font-bold tracking-tighter">
            <Info size={10} /> AI Analyst is aware of all mapped nodes and edges.
          </div>
        </div>
      </div>
    </div>
  );
}
