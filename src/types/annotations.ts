export type AnnotationCategory = 'signage' | 'barrier' | 'flow';

export type SignageType = 'ticket' | 'vip' | 'alcohol' | 'accessibility' | 'washroom' | 'area';
export type BarrierType = 'stanchion' | 'drape';
export type FlowType = 'ingress' | 'egress';

export type AnnotationType = SignageType | BarrierType | FlowType;

// Sign-specific types
export type SignDirection = 
  | 'up' 
  | 'down' 
  | 'left' 
  | 'right'
  | 'up-left' 
  | 'up-right' 
  | 'down-left' 
  | 'down-right';

export type SignHolderType = 'sign-pedestal-1' | 'sign-pedestal-2';

// Interface for side-specific sign data
export interface SignSide {
  imageUrl?: string;
  direction?: SignDirection;
}

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
  // Sign-specific optional properties
  signHolder?: SignHolderType;
  side1?: SignSide;  // Side 1 details
  side2?: SignSide;  // Side 2 details (only used if holder is 2-sided)
  // Deprecated - kept for backwards compatibility, use side1/side2 instead
  imageUrl?: string;
  direction?: SignDirection;
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

// Sign direction configuration with rotation degrees for arrow display
export const SIGN_DIRECTIONS: Record<SignDirection, { label: string; rotation: number }> = {
  'up': { label: 'Up', rotation: 0 },
  'up-right': { label: 'Up-Right', rotation: 45 },
  'right': { label: 'Right', rotation: 90 },
  'down-right': { label: 'Down-Right', rotation: 135 },
  'down': { label: 'Down', rotation: 180 },
  'down-left': { label: 'Down-Left', rotation: 225 },
  'left': { label: 'Left', rotation: 270 },
  'up-left': { label: 'Up-Left', rotation: 315 },
};

// Sign holder configuration with number of sides
export const SIGN_HOLDERS: Record<SignHolderType, { label: string; sides: 1 | 2 }> = {
  'sign-pedestal-1': { label: 'Sign Pedestal (1-sided)', sides: 1 },
  'sign-pedestal-2': { label: 'Sign Pedestal (2-sided)', sides: 2 },
};

export interface FloorPlanEvent {
  id: string;
  name: string;
  image: string | null;
  annotations: Annotation[];
  createdAt: number;
  updatedAt: number;
}
