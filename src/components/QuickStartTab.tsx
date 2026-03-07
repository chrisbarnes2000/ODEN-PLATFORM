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
        <strong className="text-[16px] text-accent">Welcome to ODEN</strong><br /><br />
        ODEN is a standalone research tool for investigating what the historical, institutional, or archival record can and cannot tell you about a question. Whether you are working on a <strong>cold case</strong>, tracing <strong>genealogy</strong>, or investigating <strong>institutional silence</strong>, ODEN helps you map the structural landscape of your research.<br /><br />
        Instead of just focusing on proof, it helps you map what was happening <em>around</em> the event: how records are created, who controlled the narrative, what should exist, and where the record remains silent. It runs entirely in your browser — no account, no server, no internet required after the first load.
      </div>

      <div className="mb-12 bg-accent/5 border border-accent/20 p-4 rounded text-[11px] text-accent/80 flex gap-3">
        <Sparkles size={16} className="flex-shrink-0" />
        <div>
          <span className="font-bold uppercase mr-2">AI Disclaimer:</span>
          The Smart Import feature uses AI to help distribute your information into the ODEN methodology structure. The AI does not "interpret" your research or store your data; it simply assists in mapping entities and relationships according to the site's structural framework. Your data remains private and local to your browser.
        </div>
      </div>

      <div className="space-y-12 mb-12">
        <section>
          <h3 className="font-serif text-[18px] text-accent mb-4 flex items-center gap-2">
            <Layers size={20} /> 1. Work the Blueprint (Dossier)
          </h3>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            The <strong className="text-text uppercase">Blueprint</strong> tab is your research roadmap, now redesigned as a <strong className="text-text">Living Case File</strong>. It walks you through a series of phases — each one asks structural questions that help you think about your case. 
          </p>
        </section>

        <section>
          <h3 className="font-serif text-[18px] text-accent mb-4 flex items-center gap-2">
            <Plus size={20} /> 2. Add Your First Nodes
          </h3>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            Go to the <strong className="text-text uppercase">Nodes & Edges</strong> tab. Nodes are the building blocks of your investigation. 
          </p>
          <div className="bg-surface border border-border p-4 rounded mb-6">
            <h4 className="text-[11px] font-bold uppercase text-accent mb-2 flex items-center gap-2">
              <Layers size={14} /> Linking to the Blueprint
            </h4>
            <p className="text-[12px] text-muted leading-relaxed">
              When adding or editing a node, use the <strong className="text-text">"Link to Investigation Phase"</strong> dropdown. This anchors that entity to a specific step in your methodology. Linked nodes will automatically appear in the corresponding folder in the <strong className="text-text uppercase">Blueprint</strong> tab, allowing you to see exactly which evidence supports each phase of your work.
            </p>
          </div>
          <ul className="space-y-3 text-[12px] text-muted mb-4 ml-4">
            <li className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#a04040] mt-0.5 flex-shrink-0" />
              <span><strong className="text-text uppercase">Case & Event Nodes (Red):</strong> These represent the core claims, people, or events you are investigating. They are the "anchors" of your map.</span>
            </li>
            <li className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#5a8fc4] mt-0.5 flex-shrink-0" />
              <span><strong className="text-text uppercase">Gap Nodes (Blue):</strong> These mark a specific record or piece of information that <em className="italic">should</em> exist but doesn't. Mapping these helps shape the case by showing where the system is silent.</span>
            </li>
            <li className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-[#7a9e7e] mt-0.5 flex-shrink-0" />
              <span><strong className="text-text uppercase">Institutions (Green):</strong> The "Controllers" who had the power to create or hold records.</span>
            </li>
          </ul>
        </section>

        <section>
          <h3 className="font-serif text-[18px] text-accent mb-4 flex items-center gap-2">
            <MapIcon size={20} /> 3. Explore the Map
          </h3>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            The <strong className="text-text uppercase">Map</strong> tab provides a spatial view of your investigation. Use these advanced tools to find patterns:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-surface border border-border p-4 rounded">
              <h4 className="text-[11px] font-bold uppercase text-accent mb-2 flex items-center gap-2">
                <Flame size={14} /> Heatmap Mode
              </h4>
              <p className="text-[12px] text-muted leading-relaxed">
                Toggle <strong className="text-text">HEATMAP</strong> to dim all verified data and highlight "Placeholder" nodes. This instantly reveals where your investigation is built on hunches or leads that still need verification.
              </p>
            </div>
            <div className="bg-surface border border-border p-4 rounded">
              <h4 className="text-[11px] font-bold uppercase text-accent mb-2 flex items-center gap-2">
                <Clock size={14} /> Temporal Playback
              </h4>
              <p className="text-[12px] text-muted leading-relaxed">
                If your nodes have dates, a <strong className="text-text">Timeline Slider</strong> will appear. Slide it to see how your investigation grew over time, or to visualize the chronological sequence of events.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="font-serif text-[18px] text-accent mb-4 flex items-center gap-2">
            <Sparkles size={20} /> 4. AI Proposals & Smart Import
          </h3>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            ODEN uses a <strong className="text-text">Proposal-only authority model</strong>. The AI suggests, but you decide.
          </p>
          <div className="bg-surface border border-border p-4 rounded mb-6">
            <h4 className="text-[11px] font-bold uppercase text-accent mb-2 flex items-center gap-2">
              <BrainCircuit size={14} /> Detecting "Gaps" and "Red Events"
            </h4>
            <p className="text-[12px] text-muted leading-relaxed mb-3">
              The <strong className="text-text uppercase">Smart Import</strong> engine is specifically tuned to identify ODEN methodology elements:
            </p>
            <ul className="space-y-2 text-[11px] text-muted list-disc pl-4">
              <li><strong className="text-text">Red Events:</strong> Critical claims, incidents, or turning points that anchor the investigation.</li>
              <li><strong className="text-text">Blue Gaps:</strong> Missing records, silences, or information that <em className="italic">should</em> be present based on institutional logic but is absent.</li>
            </ul>
            <p className="text-[11px] text-muted mt-3 italic">
              During import, the AI provides <strong className="text-text">Methodology Reasoning</strong> for every suggested node, explaining why it was classified as a Gap or Event.
            </p>
          </div>
          <ul className="space-y-2 text-[12px] text-muted mb-4 ml-4 list-disc">
            <li><strong>Smart Import:</strong> Upload documents or paste text. ODEN will save the file to your <strong className="text-text uppercase">Documents</strong> tab, create a summary in <strong className="text-text uppercase">Context</strong>, and generate structural proposals.</li>
            <li><strong>Proposals Tab:</strong> Review AI suggestions for new nodes, connections, or merges. Each proposal includes a <strong className="text-text">Justification</strong> and <strong className="text-text">Methodology Reasoning</strong>.</li>
            <li><strong>Full User Control:</strong> You can include/exclude any suggested node or edge, and edit all details (label, type, description, connections) before committing to your map.</li>
          </ul>
        </section>

        <section>
          <h3 className="font-serif text-[18px] text-accent mb-4 flex items-center gap-2">
            <FileText size={20} /> 5. Write Your Findings
          </h3>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            The <strong className="text-text uppercase">Context</strong> tab is where your actual writing lives. Create sections — these are the chapters of your investigation. You can link nodes to your sections so you can always trace a claim back to the evidence on your map.
          </p>
        </section>

        <section>
          <h3 className="font-serif text-[18px] text-accent mb-4 flex items-center gap-2">
            <CheckCircle size={20} /> 6. Methodology Check
          </h3>
          <p className="text-[13px] text-muted leading-relaxed mb-4">
            The <strong className="text-text uppercase">Methodology Check</strong> tab asks hard questions about your own research. Are you finding real gaps or just missing things? This is what separates research from belief.
          </p>
        </section>
      </div>

      <div className="mbox border-l-4 border-accent">
        <h3 className="font-serif text-accent mb-4">Key Principles</h3>
        <ul className="space-y-4 text-[12px] text-muted leading-relaxed">
          <li><strong className="text-text">Nothing goes on the map without a source.</strong> If you can't point to a document or verified piece of evidence, it doesn't get a node.</li>
          <li><strong className="text-text">Gaps are findings, not proof.</strong> A missing record might mean suppression, bad filing, or that the system was never capable of producing it.</li>
          <li><strong className="text-text">Everything stays on your computer.</strong> ODEN runs entirely in your browser. Your investigation is private until you choose to share it.</li>
        </ul>
      </div>
      </div>
    </div>
  );
}
