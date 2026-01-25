export type AnnotationCategory = 'signage' | 'barrier' | 'flow';

export type SignageType = 'ticket' | 'vip' | 'alcohol' | 'accessibility' | 'washroom' | 'area';
export type BarrierType = 'stanchion' | 'drape';
export type FlowType = 'ingress' | 'egress';

export type AnnotationType = SignageType | BarrierType | FlowType;

export interface Point {
  x: number;
  y: number;
}

export interface Annotation {
  id: string;
  category: AnnotationCategory;
  type: AnnotationType;
  points: Point[];
  label?: string;
  createdAt: number;
}

export interface LayerVisibility {
  signage: boolean;
  barrier: boolean;
  flow: boolean;
}

export interface SubLayerVisibility {
  signage: Record<SignageType, boolean>;
  barrier: Record<BarrierType, boolean>;
  flow: Record<FlowType, boolean>;
}

export type EditorMode = 'edit' | 'view';

// Helper to determine if an annotation type uses lines or markers
export const isLineAnnotation = (category: AnnotationCategory, type: AnnotationType): boolean => {
  if (category === 'flow') return true; // All flows are lines
  if (category === 'barrier' && type === 'drape') return true; // Pipe & drape is a line
  return false; // Everything else is a marker
};

export interface AnnotationConfig {
  category: AnnotationCategory;
  type: AnnotationType;
  label: string;
  icon: string;
}

export const SIGNAGE_TYPES: Record<SignageType, { label: string; icon: string }> = {
  ticket: { label: 'Ticket Line', icon: 'Ticket' },
  vip: { label: 'VIP', icon: 'Crown' },
  alcohol: { label: 'No Alcohol', icon: 'Wine' },
  accessibility: { label: 'Accessibility', icon: 'Accessibility' },
  washroom: { label: 'Washroom', icon: 'Bath' },
  area: { label: 'Area', icon: 'MapPin' },
};

export const BARRIER_TYPES: Record<BarrierType, { label: string; icon: string }> = {
  stanchion: { label: 'Stanchion', icon: 'Circle' },
  drape: { label: 'Pipe & Drape', icon: 'Minus' },
};

export const FLOW_TYPES: Record<FlowType, { label: string; icon: string }> = {
  ingress: { label: 'Ingress Flow', icon: 'ArrowRight' },
  egress: { label: 'Egress / Emergency', icon: 'LogOut' },
};

export interface FloorPlanEvent {
  id: string;
  name: string;
  image: string | null;
  annotations: Annotation[];
  createdAt: number;
  updatedAt: number;
}
