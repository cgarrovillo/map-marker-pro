import { useRef, useState } from 'react';
import { Upload, X, ArrowUp, ImageIcon, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
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
  SIGNAGE_TYPES,
  SIGN_DIRECTIONS,
  SIGN_HOLDERS,
  SignageType,
} from '@/types/annotations';
import { useSignImageUpload } from '@/hooks/useSignImageUpload';
import { cn } from '@/lib/utils';

interface SignDetailsPanelProps {
  annotation: Annotation;
  onUpdate: (updates: Partial<Annotation>) => void;
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

function ImageSection({
  imageUrl,
  uploading,
  onUpload,
  onRemove,
}: {
  imageUrl: string | undefined;
  uploading: boolean;
  onUpload: (file: File) => void;
  onRemove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">Sign Image</Label>
      
      {imageUrl ? (
        <div className="relative group">
          <img
            src={imageUrl}
            alt="Sign preview"
            className="w-full h-32 object-cover rounded-md border border-border"
          />
          <button
            type="button"
            onClick={onRemove}
            className={cn(
              'absolute top-2 right-2 p-1 rounded-full',
              'bg-destructive text-destructive-foreground',
              'opacity-0 group-hover:opacity-100 transition-opacity'
            )}
            title="Remove image"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="w-full h-32 rounded-md border border-dashed border-border flex flex-col items-center justify-center bg-muted/30">
          <ImageIcon className="w-8 h-8 text-muted-foreground/50 mb-2" />
          <span className="text-xs text-muted-foreground">No image</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        <Upload className="w-4 h-4 mr-2" />
        {uploading ? 'Uploading...' : imageUrl ? 'Change Image' : 'Upload Image'}
      </Button>
    </div>
  );
}

// Side-specific details component (image + direction)
interface SideDetailsProps {
  sideNumber: 1 | 2;
  sideData: SignSide | undefined;
  annotationId: string;
  uploading: boolean;
  onImageUpload: (file: File) => void;
  onImageRemove: () => void;
  onDirectionChange: (direction: SignDirection | undefined) => void;
}

function SideDetails({
  sideData,
  uploading,
  onImageUpload,
  onImageRemove,
  onDirectionChange,
}: SideDetailsProps) {
  return (
    <div className="space-y-4 pt-2">
      {/* Image Section */}
      <ImageSection
        imageUrl={sideData?.imageUrl}
        uploading={uploading}
        onUpload={onImageUpload}
        onRemove={onImageRemove}
      />

      <Separator />

      {/* Direction Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-1">
          <Label className="text-xs text-muted-foreground">Direction</Label>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground/70 cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-center">
              <p className="text-xs">
                Direction is from the viewer's perspective in real life, not the map orientation. 
                The arrow on the canvas may appear different from the actual direction.
              </p>
            </TooltipContent>
          </Tooltip>
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
    // If side1 exists, use it; otherwise fall back to legacy fields
    if (annotation.side1) return annotation.side1;
    if (annotation.imageUrl || annotation.direction) {
      return {
        imageUrl: annotation.imageUrl,
        direction: annotation.direction,
      };
    }
    return undefined;
  }
  return annotation.side2;
}

export function SignDetailsPanel({ annotation, onUpdate }: SignDetailsPanelProps) {
  const { uploading, uploadSignImage, deleteSignImage } = useSignImageUpload();
  const [activeTab, setActiveTab] = useState<string>('side1');
  
  const signageConfig = SIGNAGE_TYPES[annotation.type as SignageType];
  const signLabel = signageConfig?.label || annotation.type;

  // Get current holder config (default to 2-sided pedestal)
  const currentHolder = annotation.signHolder || 'sign-pedestal-2';
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

  const handleSideImageUpload = async (side: 1 | 2, file: File) => {
    const url = await uploadSignImage(annotation.id, side, file);
    if (url) {
      const sideKey = side === 1 ? 'side1' : 'side2';
      const currentSideData = side === 1 ? side1Data : side2Data;
      
      // Delete old image if exists
      if (currentSideData?.imageUrl) {
        await deleteSignImage(currentSideData.imageUrl);
      }
      
      onUpdate({
        [sideKey]: {
          ...currentSideData,
          imageUrl: url,
        },
      });
    }
  };

  const handleSideImageRemove = async (side: 1 | 2) => {
    const sideKey = side === 1 ? 'side1' : 'side2';
    const currentSideData = side === 1 ? side1Data : side2Data;
    
    if (currentSideData?.imageUrl) {
      await deleteSignImage(currentSideData.imageUrl);
      onUpdate({
        [sideKey]: {
          ...currentSideData,
          imageUrl: undefined,
        },
      });
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

  return (
    <div className="border-t border-border">
      <div className="p-4 border-b border-border">
        <h3 className="text-sm font-semibold">Sign Details</h3>
        <p className="text-xs text-muted-foreground mt-0.5">{signLabel}</p>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Sign Holder Section - Now at the top */}
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
              sideNumber={1}
              sideData={side1Data}
              annotationId={annotation.id}
              uploading={uploading}
              onImageUpload={(file) => handleSideImageUpload(1, file)}
              onImageRemove={() => handleSideImageRemove(1)}
              onDirectionChange={(dir) => handleSideDirectionChange(1, dir)}
            />
          </TabsContent>

          <TabsContent value="side2" className="mt-0">
            <SideDetails
              sideNumber={2}
              sideData={side2Data}
              annotationId={annotation.id}
              uploading={uploading}
              onImageUpload={(file) => handleSideImageUpload(2, file)}
              onImageRemove={() => handleSideImageRemove(2)}
              onDirectionChange={(dir) => handleSideDirectionChange(2, dir)}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
