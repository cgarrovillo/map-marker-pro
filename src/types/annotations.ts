export type AnnotationCategory = 'signage' | 'barrier' | 'flow';

export type SignageType = 'ticket' | 'alcohol' | 'accessibility' | 'washroom';

// Washroom sub-types
export type WashroomSubType = 'men' | 'women' | 'all';
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

// Asset tracking — per-sign-face order statuses (no "in_design"; that lives in DesignStatus)
export type SignStatus = 'not_ordered' | 'ordered' | 'shipped' | 'delivered' | 'installed';

// Asset tracking — per-stand statuses
export type StandStatus = 'not_ordered' | 'ordered' | 'shipped' | 'delivered';

// Asset tracking — design workflow statuses (Designs tab)
export type DesignStatus = 'not_started' | 'in_design' | 'completed';

// Interface for side-specific sign data
// NOTE: Images are stored on signage_types / signage_sub_types, not per-annotation.
export interface SignSide {
  direction?: SignDirection;
  signageTypeName?: string;
  signageSubTypeName?: string;
  // Per-face sign order status
  signStatus?: SignStatus;
  // Per-face design status
  designStatus?: DesignStatus;
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
  // Stand orientation in degrees (0-360), 0 = North. Annotation-level (shared across faces).
  orientation?: number;
  side1?: SignSide;  // Side 1 details
  side2?: SignSide;  // Side 2 details (only used if holder is 2-sided)
  // Signage type - parent category name like "Tickets", "Washroom", "Elevators"
  // (Updated in migration 20260205000000 to support two-level hierarchy)
  signageTypeName?: string;
  // Signage sub-type - specific type within a category like "VIP", "Men", "Wheelchair"
  signageSubTypeName?: string;
  // Deprecated - washroom sub-types are now handled via signageSubTypeName
  // Kept for backwards compatibility with old annotations
  washroomSubType?: WashroomSubType;
  // Deprecated - kept for backwards compatibility, use side1/side2 instead
  imageUrl?: string;
  direction?: SignDirection;
  // Annotation-specific notes
  notes?: string;
  // Annotation-specific color (resolved from signage type/sub-type at creation)
  color?: string;
  // Asset tracking - order status for signage annotations (legacy)
  orderStatus?: OrderStatus;
  // Per-stand status (new asset tracking)
  standStatus?: StandStatus;
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

export type EditorMode = 'edit' | 'view' | 'assets';

// Asset tracking (legacy — kept for backward compatibility with existing annotation data)
export type OrderStatus = 'not_ordered' | 'ordered' | 'shipped' | 'installed';

export const ORDER_STATUSES: Record<OrderStatus, { label: string }> = {
  not_ordered: { label: 'Not Ordered' },
  ordered: { label: 'Ordered' },
  shipped: { label: 'Shipped' },
  installed: { label: 'Installed' },
};

export const SIGN_STATUSES: Record<SignStatus, { label: string }> = {
  not_ordered: { label: 'Not Ordered' },
  ordered: { label: 'Ordered' },
  shipped: { label: 'Shipped' },
  delivered: { label: 'Delivered' },
  installed: { label: 'Installed' },
};

export const STAND_STATUSES: Record<StandStatus, { label: string }> = {
  not_ordered: { label: 'Not Ordered' },
  ordered: { label: 'Ordered' },
  shipped: { label: 'Shipped' },
  delivered: { label: 'Delivered' },
};

export const DESIGN_STATUSES: Record<DesignStatus, { label: string }> = {
  not_started: { label: 'Not Started' },
  in_design: { label: 'In Design' },
  completed: { label: 'Completed' },
};

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

// Static signage types (legacy - kept for layer visibility and backwards compatibility)
export const SIGNAGE_TYPES: Partial<Record<SignageType, { label: string; icon: string }>> = {
  alcohol: { label: 'No Alcohol', icon: '🚫' },
  accessibility: { label: 'Elevators', icon: '♿' },
  washroom: { label: 'Washroom', icon: '🚻' },
};

// Washroom sub-type configuration
export const WASHROOM_SUB_TYPES: Record<WashroomSubType, { label: string }> = {
  all: { label: 'Washrooms' },
  men: { label: 'Men' },
  women: { label: 'Women' },
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

// Default sign holder when not explicitly set
export const DEFAULT_SIGN_HOLDER: SignHolderType = 'sign-pedestal-2';

export interface FloorPlanEvent {
  id: string;
  name: string;
  image: string | null;
  annotations: Annotation[];
  createdAt: number;
  updatedAt: number;
}
