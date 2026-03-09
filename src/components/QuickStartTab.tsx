import React from 'react';
import { 
  Info, 
  Layers, 
  Plus, 
  Map as MapIcon, 
  FileText, 
  Database, 
  CheckCircle, 
  Save, 
  FileUp,
  Sparkles,
  Clock,
  Flame,
  BrainCircuit
} from 'lucide-react';

export default function QuickStartTab() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-8 w-full">
        <div className="bp-intro border-l-4 border-accent bg-surface p-6 mb-12 font-serif text-[14px] leading-relaxed">
        <strong className="text-[16px] text-accent">Getting Started with ODEN</strong><br /><br />
        ODEN is a workspace designed to help you visualize the structural landscape of an investigation. It focuses on mapping what the record can and cannot tell you. Whether you are working on a <strong>cold case</strong>, tracing <strong>genealogy</strong>, or investigating <strong>institutional silence</strong>, this tool provides a framework for organizing your findings.<br /><br />
        The goal is to map the context <em>around</em> an event: how records are created, who controlled the information, and where the record remains silent. Everything runs locally in your browser — your data never leaves your machine.
      </div>

      <div className="mb-12 bg-accent/5 border border-accent/20 p-4 rounded text-[11px] text-accent/80 flex gap-3">
        <Sparkles size={16} className="flex-shrink-0" />
        <div>
          <span className="font-bold uppercase mr-2">AI is Optional:</span>
          ODEN is a human-first tool. All AI features—including Smart Import, Proposals, and Insights—are entirely optional. They are designed to act as an "Investigative Partner" that suggests patterns, but you maintain 100% authority over your map.
        </div>
      </div>

      <div className="space-y-12 mb-12">
        <section>
          <h3 className="font-serif text-[18px] text-accent mb-4 flex items-center gap-2">
            <Layers size={20} /> 1. The Blueprint (Optional Guidance)
          </h3>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            The <strong className="text-text uppercase">Blueprint</strong> tab is your structural roadmap. You can define custom categories for your investigation here. If you use it, the AI will learn your system and suggest nodes that match your specific categories. If you don't, the AI defaults to standard investigative types.
          </p>
        </section>

        <section>
          <h3 className="font-serif text-[18px] text-accent mb-4 flex items-center gap-2">
            <FileText size={20} /> 2. Evidence & Traceability
          </h3>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            In the <strong className="text-text uppercase">Docs</strong> tab, you can upload evidence. ODEN focuses on <strong>Traceability</strong>: when you link a document to a node, you can extract specific snippets of text. These snippets are then displayed directly on the node's panel, creating a clear "Web of Proof" for every claim in your investigation.
          </p>
        </section>

        <section>
          <h3 className="font-serif text-[18px] text-accent mb-4 flex items-center gap-2">
            <FileUp size={20} /> 2. Importing Data
          </h3>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            The <strong className="text-text uppercase">Smart Import</strong> tab offers two ways to bring data into ODEN:
          </p>
          <ul className="space-y-3 text-[12px] text-muted mb-6 ml-4">
            <li><strong className="text-text">Smart Extract (AI):</strong> Uses AI to analyze your text/files and suggest nodes, edges, and a summary. This is an "Investigative Partner" that helps you find patterns quickly.</li>
            <li><strong className="text-text">Simple Upload (No AI):</strong> Directly uploads your document to the Documents tab without any AI processing. Use this if you want to manually map your data from scratch.</li>
          </ul>
        </section>

        <section>
          <h3 className="font-serif text-[18px] text-accent mb-4 flex items-center gap-2">
            <Plus size={20} /> 3. Building the Network
          </h3>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            Nodes and Edges are the core components of your map. You can categorize nodes using specific colors to help visualize the nature of your investigation:
          </p>
          <ul className="space-y-4 text-[12px] text-muted mb-6 ml-4">
            <li className="flex gap-3">
              <div className="w-4 h-4 rounded-full bg-[#a04040] mt-0.5 flex-shrink-0 shadow-[0_0_10px_rgba(160,64,64,0.3)]" />
              <div>
                <strong className="text-text uppercase block mb-1">Red Nodes (Case, Event, Suspect)</strong>
                These represent the "Anchors" — the primary claims, incidents, or individuals at the center of your research.
              </div>
            </li>
            <li className="flex gap-3">
              <div className="w-4 h-4 rounded-full bg-[#5a8fc4] mt-0.5 flex-shrink-0 shadow-[0_0_10px_rgba(90,143,196,0.3)]" />
              <div>
                <strong className="text-text uppercase block mb-1">Blue Nodes (Gaps)</strong>
                These mark "Structural Silence" — records or information that <em className="italic">should</em> exist according to institutional logic but are missing.
              </div>
            </li>
            <li className="flex gap-3">
              <div className="w-4 h-4 rounded-full bg-[#7a9e7e] mt-0.5 flex-shrink-0 shadow-[0_0_10px_rgba(122,158,126,0.3)]" />
              <div>
                <strong className="text-text uppercase block mb-1">Green Nodes (Institutions)</strong>
                These represent the "Controllers" — the organizations that had the power to create or hold records.
              </div>
            </li>
          </ul>
          <div className="bg-surface border border-border p-4 rounded mt-4">
            <h4 className="text-[11px] font-bold uppercase text-accent mb-2 flex items-center gap-2">
              <Plus size={14} /> Merge Tool
            </h4>
            <p className="text-[12px] text-muted leading-relaxed">
              If you find redundant nodes (e.g., the same person with two different names), use the <strong className="text-text">MERGE TOOL</strong> in the Nodes tab. This combines their data and redirects all connections to a single "Target" node.
            </p>
          </div>
        </section>

        <section>
          <h3 className="font-serif text-[18px] text-accent mb-4 flex items-center gap-2">
            <BrainCircuit size={20} /> 4. AI Insights & Briefings
          </h3>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            The <strong className="text-text uppercase">✧ AI Insights</strong> tab synthesizes your entire investigation into a narrative briefing. It identifies "Crossovers" between independent threads and highlights missing evidence. You can also talk directly to the "AI Analyst" to ask questions about your case data.
          </p>
        </section>

        <section>
          <h3 className="font-serif text-[18px] text-accent mb-4 flex items-center gap-2">
            <MapIcon size={20} /> 3. Visualizing Patterns
          </h3>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            The <strong className="text-text uppercase">Map</strong> tab allows you to see how your investigation is connected. 
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-surface border border-border p-4 rounded">
              <h4 className="text-[11px] font-bold uppercase text-accent mb-2 flex items-center gap-2">
                <Flame size={14} /> Heatmap Mode
              </h4>
              <p className="text-[12px] text-muted leading-relaxed">
                Use the <strong className="text-text">HEATMAP</strong> toggle to dim verified data and highlight "Placeholder" nodes. This helps you quickly identify which parts of your investigation are still based on leads or hunches.
              </p>
            </div>
            <div className="bg-surface border border-border p-4 rounded">
              <h4 className="text-[11px] font-bold uppercase text-accent mb-2 flex items-center gap-2">
                <Clock size={14} /> Temporal Playback
              </h4>
              <p className="text-[12px] text-muted leading-relaxed">
                If your nodes include dates, a timeline slider will appear. This allows you to visualize how the investigation or the events themselves unfolded over time.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-serif text-[18px] text-accent mb-4 flex items-center gap-2">
            <Sparkles size={20} /> 4. Working with AI Proposals
          </h3>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            ODEN uses a <strong className="text-text">Proposal-only model</strong>. The AI suggests structural additions based on your data, but nothing is added to your map without your approval.
          </p>
          <div className="bg-surface border border-border p-4 rounded mb-6">
            <h4 className="text-[11px] font-bold uppercase text-accent mb-2 flex items-center gap-2">
              <BrainCircuit size={14} /> Smart Import & Pattern Recognition
            </h4>
            <p className="text-[12px] text-muted leading-relaxed mb-3">
              When you import documents, the AI analyzes the text to find:
            </p>
            <ul className="space-y-2 text-[11px] text-muted list-disc pl-4">
              <li><strong className="text-text">Potential Gaps:</strong> Missing records mentioned in the text.</li>
              <li><strong className="text-text">Key Events:</strong> Turning points or critical claims.</li>
              <li><strong className="text-text">Suggested Merges:</strong> Redundant entities that might be the same person or organization.</li>
            </ul>
          </div>
        </section>

        <section>
          <h3 className="font-serif text-[18px] text-accent mb-4 flex items-center gap-2">
            <CheckCircle size={20} /> 5. Methodology Check
          </h3>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            The <strong className="text-text uppercase">Methodology Check</strong> tab provides an automated analysis of your investigation's structural integrity. It measures your research against the core ODEN parameters:
          </p>
          <ul className="space-y-2 text-[12px] text-muted mb-6 ml-4 list-disc">
            <li><strong className="text-text">Baseline Definition:</strong> Ensuring the event title, date, and location are set.</li>
            <li><strong className="text-text">Controller Identification:</strong> Verifying that institutions with authority are mapped.</li>
            <li><strong className="text-text">Traceability:</strong> Checking that nodes are anchored to primary sources and blueprint sections.</li>
            <li><strong className="text-text">Network Integrity:</strong> Identifying isolated nodes or missing convergence points.</li>
            <li><strong className="text-text">Process Logging:</strong> Tracking FOIA/Archive requests and their outcomes (denials, referrals).</li>
          </ul>
        </section>
      </div>

      <div className="mbox border-l-4 border-accent">
        <h3 className="font-serif text-accent mb-4">Methodology Overview</h3>
        <ul className="space-y-4 text-[12px] text-muted leading-relaxed">
          <li><strong className="text-text">Evidence-First:</strong> The workspace is designed to facilitate linking nodes to sources or documents.</li>
          <li><strong className="text-text">Mapping Silence:</strong> Identifying what is missing is treated with the same importance as identifying what is present.</li>
          <li><strong className="text-text">Local Privacy:</strong> Investigations are stored entirely in your browser's local storage for privacy.</li>
        </ul>
      </div>
      </div>
    </div>
  );
}
