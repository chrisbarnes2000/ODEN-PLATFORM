export type NodeType = 
  | 'case' | 'actor' | 'institution' | 'gap' | 'location' | 'event' | 'media' 
  | 'document' | 'concept' | 'object' | 'relation' | 'financial' 
  | 'witness' | 'suspect' | 'law' | 'science' | 'family' 
  | 'network' | 'period' | 'alias' | 'rumor' | 'pattern';

export interface NodeSource {
  label: string;
  url?: string;
}

export interface NodeData {
  id: string;
  label: string;
  type: NodeType;
  description: string;
  tags: string[];
  sources: NodeSource[];
  /** Registry-backed sources attached to this node */
  sourceIds?: string[];
  /** Documents this node is derived from / linked to */
  documentIds?: string[];
  sectionId?: string;
  placeholder?: boolean;
  sentiment?: string;
  eventType?: string;
  date?: string; // For temporal playback
  phaseId?: string; // Linked to Blueprint phase
  x: number;
  y: number;
  fx?: number | null;
  fy?: number | null;
}

export interface EdgeData {
  from: string;
  to: string;
  type: string;
  label: string;
  weight: number;
  date?: string; // For temporal playback
}

export interface ContextSection {
  id: string;
  category: string;
  heading: string;
  body: string;
  linkedNodeIds: string[];
}

export interface DocumentData {
  id: string;
  title: string;
  category: string;
  status: 'received' | 'requested' | 'pending' | 'denied';
  institution?: string;
  date?: string;
  url?: string;
  description: string;
  nodeIds: string[];
  imageData?: string;
  fileName?: string;
  mimeType?: string;
  /** Original imported text (small imports stored inline) */
  originalText?: string;
  /** IndexedDB key for large imported text */
  originalTextKey?: string;
  /** Where the original text lives */
  originalTextStorage?: 'inline' | 'indexeddb' | 'none';
}

export interface SourceData {
  id: string;
  title: string;
  institution: string;
  date: string;
  rg: string;
  url: string;
  notes: string;
}

export interface ProjectData {
  caseName: string;
  nodes: NodeData[];
  edges: EdgeData[];
  sections: ContextSection[];
  documents: DocumentData[];
  sources: SourceData[];
  blueprint: Record<string, string>;
  completedPhases: string[];
  aiInsight?: string;
  /** Optional: a single central anchor node for the investigation */
  mainEventId?: string;
}
