
export interface GraphNode {
  id: string;
  label: string;
  type: string; // e.g., "Person", "Location", "Concept"
  group?: number;
  val?: number; // visual size
  
  // D3 force simulation properties (optional, added by D3)
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
  index?: number;
}

export interface GraphEdge {
  source: string | GraphNode;
  target: string | GraphNode;
  relation: string;
  id?: string;
  index?: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface GenerationConfig {
  maxNodes: number;
  focus: string;
}
