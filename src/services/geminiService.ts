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
  existingSources: any[] = []
): Promise<SmartImportResult> {
  const model = "gemini-3-flash-preview";
  
  const contextSummary = `
    Existing Entities: ${existingNodes.map(n => n.label).join(', ')}
    Existing Context Summary: ${projectContext.substring(0, 1000)}...
    Existing Documents: ${existingDocs.map(d => d.title).join(', ')}
    Existing Sources: ${existingSources.map(s => s.title).join(', ')}
  `;

  const prompt = `Extract entities and relationships from this text for an investigation using the ODEN methodology. 
  
  ODEN Methodology Focus:
  - RED 'event' nodes: High-stakes occurrences, critical claims, or pivotal moments.
  - BLUE 'gap' nodes: Documented absences of expected records or missing evidence.
  - GREEN 'institution' nodes: Controllers of records.
  - GOLD 'actor' nodes: People or individuals.
  
  IMPORTANT: 
  1. Compare the new information with the existing investigation context.
  2. If an entity already exists, use its EXACT label.
  3. Provide a 'reasoning' field for each node, explaining why it was flagged (especially for RED events or BLUE gaps).
  4. Assign a 'confidence' score (high, medium, low).
  5. Extract all URLs, website links, and email metadata (sender, recipient, subject, date, url if available).
  
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
  existingSources: any[] = []
): Promise<SmartImportResult> {
  const model = "gemini-3-flash-preview";
  
  const contextSummary = `
    Existing Entities: ${existingNodes.map(n => n.label).join(', ')}
    Existing Context Summary: ${projectContext.substring(0, 1000)}...
    Existing Documents: ${existingDocs.map(d => d.title).join(', ')}
    Existing Sources: ${existingSources.map(s => s.title).join(', ')}
  `;

  const prompt = `Extract entities and relationships from this document for an investigation using the ODEN methodology. 
  
  ODEN Methodology Focus:
  - RED 'event' nodes: High-stakes occurrences, critical claims, or pivotal moments.
  - BLUE 'gap' nodes: Documented absences of expected records or missing evidence.
  - GREEN 'institution' nodes: Controllers of records.
  - GOLD 'actor' nodes: People or individuals.
  
  IMPORTANT: 
  1. Compare the new information with the existing investigation context.
  2. If an entity already exists, use its EXACT label.
  3. Provide a 'reasoning' field for each node, explaining why it was flagged (especially for RED events or BLUE gaps).
  4. Assign a 'confidence' score (high, medium, low).
  5. Extract all URLs, website links, and email metadata (sender, recipient, subject, date, url if available).
  
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

export async function generateInvestigationInsight(project: ProjectData): Promise<string> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    You are an expert investigative analyst. Analyze the following investigative project data and provide a concise, high-level insight.
    
    Project Name: ${project.caseName}
    
    Nodes (Entities):
    ${project.nodes.map(n => `- ${n.label} (${n.type})${n.placeholder ? ' [UNVERIFIED]' : ''}: ${n.description}`).join('\n')}
    
    Connections:
    ${project.edges.map(e => {
      const from = project.nodes.find(n => n.id === e.from)?.label;
      const to = project.nodes.find(n => n.id === e.to)?.label;
      return `- ${from} -> ${to} (${e.type}: ${e.label})`;
    }).join('\n')}
    
    Blueprint Progress:
    ${Object.entries(project.blueprint).map(([k, v]) => `- ${k}: ${v ? 'Documented' : 'Missing'}`).join('\n')}
    
    TASK:
    1. Identify the strongest lead or most critical entity.
    2. Highlight a potential "Gap" or "Contradiction" in the current network.
    3. Suggest a specific next step for the investigator (e.g., "Find a source for Entity X" or "Verify the connection between Y and Z").
    
    Keep the response professional, investigative, and under 200 words. Use Markdown.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
    });
    return response.text || "Unable to generate insight at this time.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error generating insight. Please check your connection.";
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
          type: { type: Type.STRING, enum: ['create_node', 'create_edge', 'merge_nodes', 'attach_evidence', 'promote_placeholder', 'update_node'] },
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
    
    Current Nodes: 
    ${project.nodes.map(n => `- [${n.id}] ${n.label} (${n.type}): ${n.description}`).join('\n')}
    
    Current Edges: ${project.edges.length} connections.
    
    New Context: ${contextText || 'None provided'}
    
    ODEN Methodology Rules:
    - RED nodes ('case', 'event', 'suspect'): Core claims or high-stakes entities.
    - BLUE nodes ('gap'): Documented absences of expected records.
    - GREEN nodes ('institution'): Controllers of records.
    - DASHED/PLACEHOLDER: Unverified leads.
    
    CRITICAL: 
    1. Look for redundant nodes that should be merged (e.g., "John Doe" and "J. Doe").
    2. Suggest RED 'event' nodes for critical occurrences found in context.
    3. Suggest BLUE 'gap' nodes where records are missing or expected but not found.
    4. Suggest updates to existing nodes if new context provides more detail.
    5. Assign a 'confidence' score (high, medium, low) to each proposal.
    
    PROPOSAL TYPES:
    1. 'create_node': Suggest new entities found in context. Data: { label, type, description, placeholder }.
    2. 'create_edge': Suggest connections. Data: { fromLabel, toLabel, label, type }.
    3. 'merge_nodes': If two nodes represent the same entity. Data: { nodeAId, nodeBId, mergedLabel, mergedDescription }.
    4. 'update_node': If an existing node needs more detail. Data: { nodeId, label, description, type }.
    5. 'attach_evidence': Link a document to a node. Data: { nodeLabel, docTitle }.
    6. 'promote_placeholder': If context verifies a placeholder. Data: { nodeId }.
    
    For each proposal, provide a 'justification' explaining WHY based on the methodology.
    If context is provided, include a 'sourceSnippet' from the text.
    
    DISCLAIMER: AI suggestions are for guidance only and require human authorization.
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
