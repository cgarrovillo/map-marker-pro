import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowUp, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  Annotation,
  SignDirection,
  SignHolderType,
  SignSide,
  SIGN_DIRECTIONS,
  SIGN_HOLDERS,
  DEFAULT_SIGN_HOLDER,
  WASHROOM_SUB_TYPES,
  COMPOUND_DIRECTIONS,
} from '@/types/annotations';
import { cn } from '@/lib/utils';
import { Tables } from '@/integrations/supabase/types';

type SignageTypeRow = Tables<'signage_types'>;
type SignageSubTypeRow = Tables<'signage_sub_types'>;

interface SignDetailsPanelProps {
  annotation: Annotation;
  onUpdate: (updates: Partial<Annotation>) => void;
  signageTypes?: SignageTypeRow[];
  subTypesByParent?: Record<string, SignageSubTypeRow[]>;
}

// Direction button positions in a 3x3 grid compass layout
const DIRECTION_POSITIONS: Record<SignDirection, { row: number; col: number }> = {
  'up-left': { row: 0, col: 0 },
  'up': { row: 0, col: 1 },
  'up-right': { row: 0, col: 2 },
  'left': { row: 1, col: 0 },
  'right': { row: 1, col: 2 },
  'down-left': { row: 2, col: 0 },
  'down': { row: 2, col: 1 },
  'down-right': { row: 2, col: 2 },
};

// --- Orientation Dial (annotation-level compass for stand orientation) ---

const DIAL_SIZE = 120;
const DIAL_RADIUS = 48;
const HANDLE_RADIUS = 7;
const CENTER = DIAL_SIZE / 2;

function computeAngleFromEvent(
  e: React.MouseEvent | MouseEvent,
  svgRect: DOMRect,
): number {
  const cx = svgRect.left + CENTER;
  const cy = svgRect.top + CENTER;
  const dx = e.clientX - cx;
  const dy = e.clientY - cy;
  // atan2 gives angle from positive X-axis (East). We want 0 = North (top), clockwise.
  let angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  if (angle < 0) angle += 360;
  return Math.round(angle) % 360;
}

function OrientationDial({
  value,
  onChange,
}: {
  value: number | undefined;
  onChange: (orientation: number | undefined) => void;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  const angleDeg = value ?? 0;
  // Compute handle position on the circle (0° = North = top)
  const handleX = CENTER + DIAL_RADIUS * Math.sin((angleDeg * Math.PI) / 180);
  const handleY = CENTER - DIAL_RADIUS * Math.cos((angleDeg * Math.PI) / 180);

  const setAngleFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const angle = computeAngleFromEvent(e, rect);
      onChange(angle);
    },
    [onChange],
  );

  // Global mouse-move / mouse-up for drag — always registered so the ref check works
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      setAngleFromEvent(e);
    };
    const onUp = () => {
      dragging.current = false;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [setAngleFromEvent]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    setAngleFromEvent(e);
  };

  const hasValue = value !== undefined;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg
        ref={svgRef}
        width={DIAL_SIZE}
        height={DIAL_SIZE}
        className="cursor-pointer select-none"
        onMouseDown={handleMouseDown}
      >
        {/* Outer track ring */}
        <circle
          cx={CENTER}
          cy={CENTER}
          r={DIAL_RADIUS}
          fill="none"
          className="stroke-muted-foreground/20"
          strokeWidth={2}
        />

        {/* Cardinal direction labels */}
        <text x={CENTER} y={8} textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium select-none">Up</text>
        <text x={DIAL_SIZE - 4} y={CENTER + 3} textAnchor="end" className="fill-muted-foreground text-[10px] font-medium select-none">Right</text>
        <text x={CENTER} y={DIAL_SIZE - 2} textAnchor="middle" className="fill-muted-foreground text-[10px] font-medium select-none">Down</text>
        <text x={6} y={CENTER + 3} textAnchor="start" className="fill-muted-foreground text-[10px] font-medium select-none">Left</text>

        {/* Center dot */}
        <circle cx={CENTER} cy={CENTER} r={3} className="fill-muted-foreground/40" />

        {hasValue && (
          <>
            {/* Line from center to handle */}
            <line
              x1={CENTER}
              y1={CENTER}
              x2={handleX}
              y2={handleY}
              className="stroke-primary"
              strokeWidth={2}
              strokeLinecap="round"
            />

            {/* Handle circle */}
            <circle
              cx={handleX}
              cy={handleY}
              r={HANDLE_RADIUS}
              className="fill-primary stroke-background"
              strokeWidth={2}
            />
          </>
        )}
      </svg>

      {/* Degrees readout + clear */}
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted-foreground tabular-nums">
          {hasValue ? `${angleDeg}°` : 'Not set'}
        </p>
        {hasValue && (
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5"
            onClick={() => onChange(undefined)}
            title="Clear orientation"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// --- Direction selector components (per-face) ---

function DirectionButton({
  direction,
  isSelected,
  onClick,
}: {
  direction: SignDirection;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = SIGN_DIRECTIONS[direction];
  
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-8 h-8 rounded flex items-center justify-center transition-colors',
        'hover:bg-secondary border border-transparent',
        isSelected && 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
      )}
      title={config.label}
    >
      <ArrowUp
        className="w-4 h-4"
        style={{ transform: `rotate(${config.rotation}deg)` }}
      />
    </button>
  );
}

function CompoundDirectionButton({
  direction,
  isSelected,
  onClick,
}: {
  direction: SignDirection;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = SIGN_DIRECTIONS[direction];

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={cn(
        'w-8 h-8 rounded flex items-center justify-center transition-colors',
        'hover:bg-secondary border border-transparent',
        isSelected && 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
      )}
      title={config.label}
    >
      <svg
        className="w-4 h-4"
        viewBox="0 0 12 12"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d={config.svgPath ?? ''}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

function getCompoundPopoverPosition(
  direction: SignDirection,
): { style: React.CSSProperties; flexDirection: 'row' | 'column' } {
  switch (direction) {
    case 'up':
      return {
        style: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', paddingBottom: 4 },
        flexDirection: 'row',
      };
    case 'down':
      return {
        style: { top: '100%', left: '50%', transform: 'translateX(-50%)', paddingTop: 4 },
        flexDirection: 'row',
      };
    case 'left':
      return {
        style: { right: '100%', top: '50%', transform: 'translateY(-50%)', paddingRight: 4 },
        flexDirection: 'column',
      };
    case 'right':
      return {
        style: { left: '100%', top: '50%', transform: 'translateY(-50%)', paddingLeft: 4 },
        flexDirection: 'column',
      };
    default:
      return { style: {}, flexDirection: 'row' };
  }
}

function DirectionSelector({
  value,
  onChange,
}: {
  value: SignDirection | undefined;
  onChange: (direction: SignDirection | undefined) => void;
}) {
  const handleClick = (direction: SignDirection) => {
    // Toggle off if clicking the same direction
    if (value === direction) {
      onChange(undefined);
    } else {
      onChange(direction);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-1 w-fit mx-auto">
      {Object.entries(DIRECTION_POSITIONS).map(([dir, pos]) => {
        const direction = dir as SignDirection;
        // Skip center cell (row 1, col 1)
        if (pos.row === 1 && pos.col === 1) return null;

        const compounds = COMPOUND_DIRECTIONS[direction];

        return (
          <div
            key={direction}
            style={{
              gridRow: pos.row + 1,
              gridColumn: pos.col + 1,
            }}
          >
            {compounds ? (
              // Cardinal direction with compound sub-options on hover
              <div className="relative group/compound">
                <DirectionButton
                  direction={direction}
                  isSelected={
                    value === direction ||
                    compounds.includes(value as SignDirection)
                  }
                  onClick={() => handleClick(direction)}
                />
                {/* Compound popover — padding on the button-facing side acts as an
                    invisible hover bridge so the mouse can travel from button to popover. */}
                {(() => {
                  const { style: popoverStyle, flexDirection } =
                    getCompoundPopoverPosition(direction);
                  return (
                    <div
                      className="absolute z-10 hidden group-hover/compound:block"
                      style={popoverStyle}
                    >
                      <div
                        className="flex gap-1 bg-popover border rounded-md p-1 shadow-md"
                        style={{ flexDirection }}
                      >
                        {compounds.map((compDir) => (
                          <CompoundDirectionButton
                            key={compDir}
                            direction={compDir}
                            isSelected={value === compDir}
                            onClick={() => handleClick(compDir)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              // Diagonal direction — no compound sub-options
              <DirectionButton
                direction={direction}
                isSelected={value === direction}
                onClick={() => handleClick(direction)}
              />
            )}
          </div>
        );
      })}
      {/* Center placeholder */}
      <div
        className="w-8 h-8 rounded bg-muted/50 flex items-center justify-center"
        style={{ gridRow: 2, gridColumn: 2 }}
      >
        <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
      </div>
    </div>
  );
}

// Side-specific details component (type selectors + direction)
interface SideDetailsProps {
  sideData: SignSide | undefined;
  onDirectionChange: (direction: SignDirection | undefined) => void;
  signageTypes: SignageTypeRow[];
  subTypesByParent: Record<string, SignageSubTypeRow[]>;
  onTypeChange: (typeName: string | undefined, subTypeName: string | undefined) => void;
}

function SideDetails({
  sideData,
  onDirectionChange,
  signageTypes,
  subTypesByParent,
  onTypeChange,
}: SideDetailsProps) {
  // Resolve the currently-selected parent type row from the side's signageTypeName
  const selectedParentType = sideData?.signageTypeName
    ? signageTypes.find((t) => t.name === sideData.signageTypeName)
    : undefined;

  const availableSubTypes = selectedParentType
    ? subTypesByParent[selectedParentType.id] || []
    : [];

  const handleParentTypeChange = (value: string) => {
    if (value === '__none__') {
      onTypeChange(undefined, undefined);
    } else {
      // When parent changes, reset sub-type
      onTypeChange(value, undefined);
    }
  };

  const handleSubTypeChange = (value: string) => {
    if (value === '__none__') {
      onTypeChange(sideData?.signageTypeName, undefined);
    } else {
      onTypeChange(sideData?.signageTypeName, value);
    }
  };

  return (
    <div className="space-y-4 pt-2">
      {/* Signage Type Selectors */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Signage Type</Label>
        <Select
          value={sideData?.signageTypeName ?? '__none__'}
          onValueChange={handleParentTypeChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {signageTypes.map((st) => (
              <SelectItem key={st.id} value={st.name}>
                {st.icon ? `${st.icon} ${st.name}` : st.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {availableSubTypes.length > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Sub-Type</Label>
          <Select
            value={sideData?.signageSubTypeName ?? '__none__'}
            onValueChange={handleSubTypeChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select sub-type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {availableSubTypes.map((sst) => (
                <SelectItem key={sst.id} value={sst.name}>
                  {sst.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Sign Face Direction Section */}
      <div className="space-y-2">
        <div>
          <Label className="text-xs text-muted-foreground">Sign Face Direction</Label>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-snug">
            Direction is from the viewer&apos;s perspective in real life, not the map orientation. The arrow on the canvas may appear different from the actual direction.
          </p>
        </div>
        <DirectionSelector
          value={sideData?.direction}
          onChange={onDirectionChange}
        />
        <p className="text-xs text-center text-muted-foreground">
          {sideData?.direction 
            ? SIGN_DIRECTIONS[sideData.direction].label 
            : 'None selected'}
        </p>
      </div>
    </div>
  );
}

// Helper to get side data with backwards compatibility
function getSideData(annotation: Annotation, side: 1 | 2): SignSide | undefined {
  if (side === 1) {
    if (annotation.side1) {
      // side1 exists — fill in type fields from root-level if side1 doesn't carry its own yet
      return {
        ...annotation.side1,
        signageTypeName: annotation.side1.signageTypeName ?? annotation.signageTypeName,
        signageSubTypeName: annotation.side1.signageSubTypeName ?? annotation.signageSubTypeName,
      };
    }
    // No side1 at all — fall back entirely to legacy root-level fields
    if (annotation.direction || annotation.signageTypeName) {
      return {
        direction: annotation.direction,
        signageTypeName: annotation.signageTypeName,
        signageSubTypeName: annotation.signageSubTypeName,
      };
    }
    return undefined;
  }
  return annotation.side2;
}

export function SignDetailsPanel({
  annotation,
  onUpdate,
  signageTypes = [],
  subTypesByParent = {},
}: SignDetailsPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('side1');
  const [annotationNotes, setAnnotationNotes] = useState<string>(annotation.notes || '');
  
  // Sync notes when annotation changes
  useEffect(() => {
    setAnnotationNotes(annotation.notes || '');
  }, [annotation.notes, annotation.id]);
  
  const isWashroom = annotation.type === 'washroom';

  // Get current holder config (default to 2-sided pedestal)
  const currentHolder = annotation.signHolder || DEFAULT_SIGN_HOLDER;
  const holderConfig = SIGN_HOLDERS[currentHolder];
  const isTwoSided = holderConfig?.sides === 2;

  // Get side data with backwards compatibility
  const side1Data = getSideData(annotation, 1);
  const side2Data = getSideData(annotation, 2);

  const handleSignHolderChange = (value: string) => {
    const newHolder = value as SignHolderType;
    onUpdate({ signHolder: newHolder });
    
    // If switching to 1-sided and currently on Side 2 tab, switch to Side 1
    const newHolderConfig = SIGN_HOLDERS[newHolder];
    if (newHolderConfig?.sides === 1 && activeTab === 'side2') {
      setActiveTab('side1');
    }
  };

  const handleSideDirectionChange = (side: 1 | 2, direction: SignDirection | undefined) => {
    const sideKey = side === 1 ? 'side1' : 'side2';
    const currentSideData = side === 1 ? side1Data : side2Data;
    
    onUpdate({
      [sideKey]: {
        ...currentSideData,
        direction,
      },
    });
  };

  const handleSideTypeChange = (
    side: 1 | 2,
    signageTypeName: string | undefined,
    signageSubTypeName: string | undefined,
  ) => {
    const sideKey = side === 1 ? 'side1' : 'side2';
    const currentSideData = side === 1 ? side1Data : side2Data;

    const sideUpdate = {
      [sideKey]: {
        ...currentSideData,
        signageTypeName,
        signageSubTypeName,
      },
    };

    if (side === 1) {
      // Keep root-level fields synced with side 1 for backwards compat
      onUpdate({
        ...sideUpdate,
        signageTypeName,
        signageSubTypeName,
      });
    } else {
      onUpdate(sideUpdate);
    }
  };

  const handleAnnotationNotesBlur = () => {
    const trimmed = annotationNotes.trim();
    const newNotes = trimmed || undefined;
    if (newNotes !== annotation.notes) {
      onUpdate({ notes: newNotes });
    }
  };

  return (
    <div>
      <div className="p-4 space-y-4">
        {/* Washroom Sub-Type Display - Only for washroom signs (read-only, set from sidebar) */}
        {isWashroom && annotation.washroomSubType && (
          <>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Washroom Type
              </Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary/50">
                <span className="text-sm font-medium">
                  {WASHROOM_SUB_TYPES[annotation.washroomSubType]?.label || annotation.washroomSubType}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Set from the Annotations sidebar
              </p>
            </div>
            <Separator />
          </>
        )}

        {/* Sign Holder Section */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Sign Holder</Label>
          <Select
            value={currentHolder}
            onValueChange={handleSignHolderChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select sign holder" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(SIGN_HOLDERS).map(([key, config]) => (
                <SelectItem key={key} value={key}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sign Holder Orientation (annotation-level) */}
        <div className="space-y-2">
          <div>
            <Label className="text-xs text-muted-foreground">Sign Holder Orientation</Label>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-snug">
              How the physical sign holder is oriented in real life.
            </p>
          </div>
          <OrientationDial
            value={annotation.orientation}
            onChange={(orientation) => onUpdate({ orientation })}
          />
        </div>

        <Separator />

        {/* Tabs for Side 1 / Side 2 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={cn("w-full", !isTwoSided && "hidden")}>
            <TabsTrigger value="side1" className="flex-1">Side 1</TabsTrigger>
            <TabsTrigger value="side2" className="flex-1" disabled={!isTwoSided}>
              Side 2
            </TabsTrigger>
          </TabsList>
          
          {/* Show "Side 1" label when 1-sided (tabs are hidden) */}
          {!isTwoSided && (
            <Label className="text-xs text-muted-foreground">Side 1</Label>
          )}

          <TabsContent value="side1" className="mt-0">
            <SideDetails
              sideData={side1Data}
              onDirectionChange={(dir) => handleSideDirectionChange(1, dir)}
              signageTypes={signageTypes}
              subTypesByParent={subTypesByParent}
              onTypeChange={(typeName, subTypeName) => handleSideTypeChange(1, typeName, subTypeName)}
            />
          </TabsContent>

          <TabsContent value="side2" className="mt-0">
            <SideDetails
              sideData={side2Data}
              onDirectionChange={(dir) => handleSideDirectionChange(2, dir)}
              signageTypes={signageTypes}
              subTypesByParent={subTypesByParent}
              onTypeChange={(typeName, subTypeName) => handleSideTypeChange(2, typeName, subTypeName)}
            />
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Annotation-specific Notes */}
        <div className="space-y-2">
          <Label htmlFor="annotation-notes" className="text-xs text-muted-foreground">
            Sign Notes
          </Label>
          <Textarea
            id="annotation-notes"
            value={annotationNotes}
            onChange={(e) => setAnnotationNotes(e.target.value)}
            onBlur={handleAnnotationNotesBlur}
            placeholder="Notes specific to this sign..."
            className="min-h-[80px] resize-none text-sm"
          />
          <p className="text-xs text-muted-foreground">
            Specific to this annotation only
          </p>
        </div>
      </div>
    </div>
  );
}
