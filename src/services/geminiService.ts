import { GoogleGenAI, Type } from "@google/genai";
import { ProjectData } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface SmartImportResult {
  nodes: any[];
  edges: any[];
  context: string;
}


export interface SuggestionResult {
  suggestions: Array<{
    from: string;
    to: string;
    relationship: string;
    reason: string;
    evidence?: string;
  }>;
  missingNodes: Array<{
    label: string;
    reason: string;
  }>;
  meta?: {
    note?: string;
  };
}

const SUGGEST_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          from: { type: Type.STRING },
          to: { type: Type.STRING },
          relationship: { type: Type.STRING },
          reason: { type: Type.STRING },
          evidence: { type: Type.STRING }
        },
        required: ["from", "to", "relationship", "reason"]
      }
    },
    missingNodes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING },
          reason: { type: Type.STRING }
        },
        required: ["label", "reason"]
      }
    }
  },
  required: ["suggestions", "missingNodes"]
};

export async function suggestConnections(input: { text: string; guidance?: string }): Promise<SuggestionResult> {
  const model = "gemini-3-flash-preview";
  const prompt = `You are assisting an investigation graph tool.

Rules:
- ONLY propose suggestions. Do not assert truth.
- Keep suggestions concrete and evidence-aware.
- Prefer "reported", "mentioned", "associated with", "occurred near", "contradicts", "supports", etc.
- If unsure, still suggest but explain why and keep it cautious.
- Provide missing nodes that should exist to connect the narrative.

${input.guidance ? `Guidance: ${input.guidance}

` : ''}TEXT:
${input.text}`;
  const response = await ai.models.generateContent({
    model,
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseMimeType: "application/json",
      responseSchema: SUGGEST_SCHEMA
    }
  });

  return JSON.parse(response.text);
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
          placeholder: { type: Type.BOOLEAN }
        },
        required: ["label", "type", "description"]
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
          type: { type: Type.STRING }
        },
        required: ["from", "to", "label"]
      }
    },
    context: { type: Type.STRING }
  },
  required: ["nodes", "edges", "context"]
};

export async function extractEntitiesFromText(text: string): Promise<SmartImportResult> {
  const model = "gemini-3-flash-preview";
  const prompt = `Extract entities and relationships from this text for an investigation. Focus on people, institutions, locations, and events. Also provide a summary context body. Text: ${text}`;
  
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

export async function extractEntitiesFromDocument(file: { data: string, mimeType: string }): Promise<SmartImportResult> {
  const model = "gemini-3-flash-preview";
  const prompt = "Extract entities and relationships from this document for an investigation. Focus on people, institutions, locations, and events. Also provide a summary context body.";
  
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
