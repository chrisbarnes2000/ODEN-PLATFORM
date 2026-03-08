import { GoogleGenAI, Type } from "@google/genai";
import { ProjectData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface SmartImportResult {
  nodes: any[];
  edges: any[];
  context: string;
  urls: string[];
  emails: { sender: string, recipient: string, subject: string, date: string, url: string }[];
}

const IMPORT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    nodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          type: { type: Type.STRING },
          description: { type: Type.STRING },
          placeholder: { type: Type.BOOLEAN },
          confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          reasoning: { type: Type.STRING, description: "Why this entity was extracted, specifically for RED events or BLUE gaps." }
        },
        required: ["label", "type", "description", "confidence", "reasoning"]
      }
    },
    edges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          from: { type: Type.STRING },
          to: { type: Type.STRING },
          label: { type: Type.STRING },
          type: { type: Type.STRING },
          confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] },
          reasoning: { type: Type.STRING }
        },
        required: ["from", "to", "label", "confidence", "reasoning"]
      }
    },
    context: { type: Type.STRING },
    urls: {
      type: Type.ARRAY,
      items: { type: Type.STRING }
    },
    emails: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sender: { type: Type.STRING },
          recipient: { type: Type.STRING },
          subject: { type: Type.STRING },
          date: { type: Type.STRING },
          url: { type: Type.STRING }
        },
        required: ["sender", "recipient", "subject", "date", "url"]
      }
    }
  },
  required: ["nodes", "edges", "context", "urls", "emails"]
};

export async function extractEntitiesFromText(
  text: string, 
  existingNodes: any[] = [],
  projectContext: string = "",
  existingDocs: any[] = [],
  existingSources: any[] = [],
  blueprint: Record<string, string> = {}
): Promise<SmartImportResult> {
  const model = "gemini-3-flash-preview";
  
  const contextSummary = `
    Existing Entities: ${existingNodes.map(n => n.label).join(', ')}
    Existing Context Summary: ${projectContext.substring(0, 1000)}...
    Existing Documents: ${existingDocs.map(d => d.title).join(', ')}
    Existing Sources: ${existingSources.map(s => s.title).join(', ')}
    Blueprint Categories: ${Object.entries(blueprint).map(([id, label]) => `${id}: ${label}`).join(', ')}
  `;

  const prompt = `Extract entities and relationships from this text for an investigation using the ODEN methodology. 
  
  ODEN Methodology Focus:
  - RED 'event' nodes: High-stakes occurrences, critical claims, or pivotal moments.
  - BLUE 'gap' nodes: Documented absences of expected records or missing evidence.
  - GREEN 'institution' nodes: Controllers of records.
  - GOLD 'actor' nodes: People or individuals.
  
  IMPORTANT: 
  1. HOLISTIC ANALYSIS: Compare the new information with the ENTIRE existing investigation context (nodes, documents, sources, and narrative).
  2. If an entity already exists, use its EXACT label.
  3. Use the 'Blueprint Categories' provided below to determine the 'type' of each node. If a category matches the entity's role, use that category ID as the type. 
  4. FLEXIBILITY: If an entity clearly belongs to a type not listed in the blueprint (e.g., location, media, financial, object), you may suggest a standard investigative type that best fits. Prioritize the blueprint, but do not be limited by it.
  5. Provide a 'reasoning' field for each node, explaining why it was flagged (especially for RED events or BLUE gaps).
  6. Assign a 'confidence' score (high, medium, low).
  7. Extract all URLs, website links, and email metadata (sender, recipient, subject, date, url if available).
  
  Existing Investigation Context:
  ${contextSummary}
  
  New Text to Analyze:
  ${text}`;
  
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: IMPORT_SCHEMA
    }
  });
  
  return JSON.parse(response.text);
}

export async function extractEntitiesFromDocument(
  file: { data: string, mimeType: string }, 
  existingNodes: any[] = [],
  projectContext: string = "",
  existingDocs: any[] = [],
  existingSources: any[] = [],
  blueprint: Record<string, string> = {}
): Promise<SmartImportResult> {
  const model = "gemini-3-flash-preview";
  
  const contextSummary = `
    Existing Entities: ${existingNodes.map(n => n.label).join(', ')}
    Existing Context Summary: ${projectContext.substring(0, 1000)}...
    Existing Documents: ${existingDocs.map(d => d.title).join(', ')}
    Existing Sources: ${existingSources.map(s => s.title).join(', ')}
    Blueprint Categories: ${Object.entries(blueprint).map(([id, label]) => `${id}: ${label}`).join(', ')}
  `;

  const prompt = `Extract entities and relationships from this document for an investigation using the ODEN methodology. 
  
  ODEN Methodology Focus:
  - RED 'event' nodes: High-stakes occurrences, critical claims, or pivotal moments.
  - BLUE 'gap' nodes: Documented absences of expected records or missing evidence.
  - GREEN 'institution' nodes: Controllers of records.
  - GOLD 'actor' nodes: People or individuals.
  
  IMPORTANT: 
  1. HOLISTIC ANALYSIS: Compare the new information with the ENTIRE existing investigation context (nodes, documents, sources, and narrative).
  2. If an entity already exists, use its EXACT label.
  3. Use the 'Blueprint Categories' provided below to determine the 'type' of each node. If a category matches the entity's role, use that category ID as the type.
  4. FLEXIBILITY: If an entity clearly belongs to a type not listed in the blueprint (e.g., location, media, financial, object), you may suggest a standard investigative type that best fits. Prioritize the blueprint, but do not be limited by it.
  5. Provide a 'reasoning' field for each node, explaining why it was flagged (especially for RED events or BLUE gaps).
  6. Assign a 'confidence' score (high, medium, low).
  7. Extract all URLs, website links, and email metadata (sender, recipient, subject, date, url if available).
  
  Existing Investigation Context:
  ${contextSummary}`;
  
  const response = await ai.models.generateContent({
    model,
    contents: [
      { parts: [
        { inlineData: { data: file.data, mimeType: file.mimeType } },
        { text: prompt }
      ]}
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: IMPORT_SCHEMA
    }
  });
  
  return JSON.parse(response.text);
}

export async function generateCaseNarrative(project: ProjectData): Promise<string> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are an expert investigative analyst. Provide a narrative "Case Briefing" based on the current investigation data.
    
    Project Name: ${project.caseName}
    
    Investigation Blueprint (User-defined categories):
    ${Object.entries(project.blueprint).map(([id, label]) => `- ${id}: ${label}`).join('\n')}

    Investigation Summary:
    - Total Entities: ${project.nodes.length}
    - Total Connections: ${project.edges.length}
    - Documents Uploaded: ${project.documents.length}
    - Sources Cited: ${project.sources.length}
    - Gaps Identified: ${project.nodes.filter(n => n.type === 'gap').length}
    - Unverified Leads: ${project.nodes.filter(n => n.placeholder).length}
    
    Context Sections:
    ${project.sections.map(s => `- ${s.heading} (${s.category})`).join('\n')}

    Documents & Sources:
    ${project.documents.map(d => `- Document: ${d.title} (${d.category})`).join('\n')}
    ${project.sources.map(s => `- Source: ${s.title} (${s.institution})`).join('\n')}

    Entities & Descriptions:
    ${project.nodes.map(n => `- ${n.label} (${n.type}): ${n.description}`).join('\n')}
    
    Connections:
    ${project.edges.map(e => {
      const from = project.nodes.find(n => n.id === e.from)?.label;
      const to = project.nodes.find(n => n.id === e.to)?.label;
      return `- ${from} -> ${to} (${e.label})`;
    }).join('\n')}
    
    TASK:
    Write a narrative briefing that "talks" to the investigator. 
    1. Summarize the current state of the investigation.
    2. Identify the "Critical Path" (the most important sequence of connections).
    3. Highlight "Structural Silence" (where the map is missing data or institutions are unresponsive).
    4. Suggest the most impactful next move.
    
    Tone: Professional, cinematic, and analytical. Use Markdown. Keep it under 400 words.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "No narrative available.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating briefing.";
  }
}

export interface ProposalResult {
  proposals: any[];
}

const PROPOSAL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    proposals: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          type: { type: Type.STRING, enum: ['create_node', 'create_edge', 'merge_nodes', 'attach_evidence', 'promote_placeholder', 'update_node', 'create_context'] },
          data: { type: Type.OBJECT },
          justification: { type: Type.STRING },
          reasoning: { type: Type.STRING, description: "Detailed methodology reasoning for this proposal." },
          sourceSnippet: { type: Type.STRING },
          confidence: { type: Type.STRING, enum: ['high', 'medium', 'low'] }
        },
        required: ["type", "data", "justification", "confidence", "reasoning"]
      }
    }
  },
  required: ["proposals"]
};

export async function generateProposals(project: ProjectData, contextText?: string): Promise<any[]> {
  const model = "gemini-3-flash-preview";
  
    const prompt = `
    You are an expert investigative analyst using the ODEN methodology. 
    Analyze the current project data and the provided context (if any) to suggest structural improvements.
    
    Current Nodes (Entities already in the investigation): 
    ${project.nodes.map(n => `- [${n.id}] ${n.label} (${n.type}): ${n.description}`).join('\n')}
    
    Current Edges (Connections): ${project.edges.length} connections mapped.
    
    Existing Documents: ${project.documents.map(d => d.title).join(', ')}
    Existing Sources: ${project.sources.map(s => s.title).join(', ')}
    
    Investigation Blueprint (User-defined categories):
    ${Object.entries(project.blueprint || {}).map(([id, label]) => `- ${id}: ${label}`).join('\n')}
    
    New Context to Analyze: ${contextText || 'None provided'}
    
    ODEN Methodology Rules:
    - RED nodes ('case', 'event', 'suspect'): Core claims or high-stakes entities.
    - BLUE nodes ('gap'): Documented absences of expected records.
    - GREEN nodes ('institution'): Controllers of records.
    - GOLD nodes ('actor'): Individuals.
    - DASHED/PLACEHOLDER: Unverified leads.
    
    CRITICAL TASKS:
    1. HOLISTIC ANALYSIS: Analyze the new context in relation to ALL existing data (nodes, edges, documents, and sources).
    2. CROSSOVER & CONVERGENCE: Look for "Crossovers" — nodes that appear in multiple independent threads or contexts. If a node links two disparate parts of the investigation, flag it as a critical crossover.
    3. PATTERN RECOGNITION: Look for redundant nodes that should be merged (e.g., "John Doe" and "J. Doe" or "The Bank" and "Bank of America").
    4. BLUEPRINT ALIGNMENT: Use the 'Blueprint Categories' provided above to determine the 'type' of each node. If a category matches the entity's role, use that category ID as the type.
    5. FLEXIBILITY: If an entity clearly belongs to a type not listed in the blueprint (e.g., location, media, financial, object), you may suggest a standard investigative type that best fits. Prioritize the blueprint, but do not be limited by it.
    6. GAP DETECTION: Suggest BLUE 'gap' nodes where records are missing or expected but not found based on the context.
    4. EVENT IDENTIFICATION: Suggest RED 'event' nodes for critical occurrences found in the new context.
    5. CONTEXTUAL ADDITIONS: Suggest new 'Context' sections (narrative summaries) if the new context provides a coherent story or background that isn't yet recorded.
    6. DATA ENRICHMENT: Suggest updates to existing nodes if the new context provides more detail than what is currently recorded.
    7. RELATIONSHIP MAPPING: Suggest new connections between existing or new nodes.
    
    PROPOSAL TYPES & DATA STRUCTURES:
    1. 'create_node': Data: { label, type, description, placeholder, reasoning }.
    2. 'create_edge': Data: { fromLabel, toLabel, label, type, reasoning }.
    3. 'merge_nodes': Data: { nodeAId, nodeBId, mergedLabel, mergedDescription, reasoning }.
    4. 'update_node': Data: { nodeId, label, description, type, reasoning }.
    5. 'attach_evidence': Data: { nodeLabel, docTitle, reasoning }.
    6. 'promote_placeholder': Data: { nodeId, reasoning }.
    7. 'create_context': Data: { heading, category, body, reasoning }.
    
    For each proposal:
    - Provide a 'justification' (short summary for the user).
    - Provide a 'reasoning' (detailed methodology explanation).
    - Include a 'sourceSnippet' if the suggestion comes from the new context.
    - Assign a 'confidence' score (high, medium, low).
    
    IMPORTANT: Be specific. Don't just say "Add node". Say "Add node: [Entity Name]".
    `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: PROPOSAL_SCHEMA
    }
  });

  const result = JSON.parse(response.text);
  return result.proposals;
}

export async function extractUrlsFromNodes(nodes: any[]): Promise<{ urls: string[], emails: any[] }> {
  const model = "gemini-3-flash-preview";
  const prompt = `Extract all unique URLs, website links, and email metadata from the following entity descriptions and sources. 
  For emails, look for patterns like "From: sender@example.com", "To: recipient@example.com", and "Subject: ...".
  
  Entities:
  ${nodes.map(n => `- ${n.label}: ${n.description} (Sources: ${n.sources.map((s: any) => s.url).join(', ')})`).join('\n')}
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          urls: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          emails: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sender: { type: Type.STRING },
                recipient: { type: Type.STRING },
                subject: { type: Type.STRING },
                date: { type: Type.STRING },
                url: { type: Type.STRING, description: "Optional link if the email is hosted online" }
              },
              required: ["sender", "recipient", "subject"]
            }
          }
        },
        required: ["urls", "emails"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function chatInvestigation(project: ProjectData, message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]): Promise<string> {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are ODEN's AI Investigation Assistant. Your goal is to help the user navigate their research, find patterns, and suggest leads based on their current case data.
    
    Current Case: ${project.caseName}
    
    Nodes: ${project.nodes.map(n => n.label).join(', ')}
    Edges: ${project.edges.length} connections mapped.
    
    Be concise, professional, and investigative. If the user asks about a specific entity, use the descriptions from the project data.
    If you suggest a lead, explain WHY based on the structural gaps (e.g., "This institution is mentioned but has no linked documents").
  `;

  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction,
    }
  });

  const response = await chat.sendMessage({ message });
  return response.text || "I'm sorry, I couldn't process that.";
}
