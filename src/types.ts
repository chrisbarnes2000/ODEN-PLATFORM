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
  sectionId?: string;
  placeholder?: boolean;
  sentiment?: string;
  eventType?: string;
  date?: string; // For temporal playback
  phaseId?: string; // Linked to Blueprint phase
  confidence?: 'high' | 'medium' | 'low';
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
  confidence?: 'high' | 'medium' | 'low';
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
}

export interface SourceData {
  id: string;
  title: string;
  institution: string;
  date: string;
  rg: string;
  url: string;
  notes: string;
  type: 'url' | 'email' | 'document' | 'other';
  sender?: string;
  recipient?: string;
  subject?: string;
}

export interface Proposal {
  id: string;
  type: 'create_node' | 'create_edge' | 'merge_nodes' | 'attach_evidence' | 'promote_placeholder' | 'update_node';
  data: any; // Specific to the proposal type
  justification: string;
  reasoning?: string; // Detailed methodology reasoning
  sourceSnippet?: string;
  sourceDocId?: string;
  status: 'pending' | 'approved' | 'dismissed';
  confidence?: 'high' | 'medium' | 'low';
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
  proposals: Proposal[];
}
