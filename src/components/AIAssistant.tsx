import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, X, Send, Loader2, BrainCircuit, User } from 'lucide-react';
import { ProjectData } from '../types';
import { chatInvestigation } from '../services/geminiService';
import Markdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

export default function AIAssistant({ project }: { project: ProjectData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hello. I am your ODEN Investigation Assistant. How can I help you with your research today?" }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      const response = await chatInvestigation(project, userMessage, history);
      setMessages(prev => [...prev, { role: 'model', text: response }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: "I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-accent text-bg rounded-full shadow-2xl flex items-center justify-center z-50 hover:scale-110 transition-transform active:scale-95"
      >
        {isOpen ? <X size={24} /> : <Sparkles size={24} />}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-[350px] h-[500px] bg-panel border border-border shadow-2xl rounded-xl flex flex-col z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-border bg-surface flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit size={18} className="text-accent" />
                <span className="text-[11px] font-bold uppercase tracking-[2px] text-accent">Investigation Assistant</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted hover:text-text">
                <X size={16} />
              </button>
            </div>

            {/* Messages */}
            <div 
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar"
            >
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-lg text-[13px] leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-accent/10 border border-accent/20 text-text' 
                      : 'bg-surface border border-border text-muted'
                  }`}>
                    <div className="flex items-center gap-2 mb-1 opacity-50">
                      {m.role === 'user' ? <User size={10} /> : <BrainCircuit size={10} />}
                      <span className="text-[9px] font-bold uppercase tracking-wider">
                        {m.role === 'user' ? 'Investigator' : 'ODEN AI'}
                      </span>
                    </div>
                    <div className="markdown-body">
                      <Markdown>{m.text}</Markdown>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface border border-border p-3 rounded-lg">
                    <Loader2 size={16} className="animate-spin text-accent" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 border-t border-border bg-surface">
              <div className="relative">
                <input
                  type="text"
                  value={input || ''}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about your case..."
                  className="w-full bg-bg border border-border rounded-lg py-2 pl-3 pr-10 text-[13px] outline-none focus:border-accent"
                />
                <button 
                  onClick={handleSend}
                  disabled={isLoading || !input.trim()}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-accent disabled:text-muted"
                >
                  <Send size={18} />
                </button>
              </div>
              <div className="mt-2 text-[9px] text-muted text-center italic">
                Powered by Gemini 3.1 Pro • Analyzes current case data
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
