import { useState, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
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
        
        return (
          <div
            key={direction}
            style={{
              gridRow: pos.row + 1,
              gridColumn: pos.col + 1,
            }}
          >
            <DirectionButton
              direction={direction}
              isSelected={value === direction}
              onClick={() => handleClick(direction)}
            />
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

      <Separator />

      {/* Direction Section */}
      <div className="space-y-2">
        <div>
          <Label className="text-xs text-muted-foreground">Direction</Label>
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
