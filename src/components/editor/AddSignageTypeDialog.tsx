import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/ColorPicker';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface RecommendedSign {
  key: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  autoSubTypes?: string[];
}

export interface AddSignageTypeResult {
  name: string;
  icon?: string;
  color?: string;
  autoSubTypes?: string[];
}

interface AddSignageTypeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: AddSignageTypeResult) => void;
  existingNames: string[];
}

// ============================================================================
// Recommended signs gallery data (UI-only, not persisted)
// ============================================================================

const RECOMMENDED_SIGNS: RecommendedSign[] = [
  {
    key: 'washroom',
    name: 'Washroom',
    emoji: '🚻',
    color: '#06B6D4',
    description: 'Restroom signage. Automatically creates Men and Women sub-types.',
    autoSubTypes: ['Men', 'Women'],
  },
  {
    key: 'no-alcohol',
    name: 'No Alcohol',
    emoji: '🚫',
    color: '#EF4444',
    description: '"No alcohol beyond this point" signage for restricted areas.',
  },
  {
    key: 'tickets',
    name: 'Tickets',
    emoji: '🎫',
    color: '#3B82F6',
    description: 'Ticket check points. You can add sub-types for different ticket categories (VIP, GA, etc.).',
  },
  {
    key: 'accessibility',
    name: 'Accessibility',
    emoji: '♿',
    color: '#22C55E',
    description: 'Used for accessibility needs. For example, Elevators \u2B06\uFE0F.',
  },
  {
    key: 'staff-only',
    name: 'Staff Only',
    emoji: '🔒',
    color: '#F59E0B',
    description: 'Restricted areas for authorized staff only.',
  },
];

// ============================================================================
// Recommended sign card
// ============================================================================

function RecommendedSignCard({
  sign,
  isSelected,
  isDisabled,
  onSelect,
}: {
  sign: RecommendedSign;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={isDisabled}
      className={cn(
        'w-full text-left p-3 rounded-lg border transition-all',
        isSelected
          ? 'border-primary bg-primary/5 ring-1 ring-primary'
          : 'border-border hover:border-primary/50 hover:bg-secondary/50',
        isDisabled && 'opacity-40 cursor-not-allowed hover:border-border hover:bg-transparent'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: sign.color }}
        >
          {sign.emoji}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{sign.name}</span>
            {isDisabled && (
              <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                Already exists
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            {sign.description}
          </p>
        </div>
      </div>
    </button>
  );
}

// ============================================================================
// Main dialog component
// ============================================================================

export function AddSignageTypeDialog({
  open,
  onOpenChange,
  onSubmit,
  existingNames,
}: AddSignageTypeDialogProps) {
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('');
  const [color, setColor] = useState('#3B82F6');
  const [selectedRecommendation, setSelectedRecommendation] = useState<string | null>(null);

  const existingNamesLower = existingNames.map((n) => n.toLowerCase());
  const isDuplicate = name.trim() !== '' && existingNamesLower.includes(name.trim().toLowerCase());
  const canSubmit = name.trim() !== '' && !isDuplicate;

  // Get the auto sub-types from the selected recommendation
  const selectedSign = RECOMMENDED_SIGNS.find((s) => s.key === selectedRecommendation);
  const autoSubTypes = selectedSign?.autoSubTypes;

  const handleSelectRecommendation = (sign: RecommendedSign) => {
    setName(sign.name);
    setEmoji(sign.emoji);
    setColor(sign.color);
    setSelectedRecommendation(sign.key);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    onSubmit({
      name: name.trim(),
      icon: emoji.trim() || undefined,
      color: color || undefined,
      autoSubTypes,
    });

    // Reset form
    resetForm();
  };

  const resetForm = () => {
    setName('');
    setEmoji('');
    setColor('#3B82F6');
    setSelectedRecommendation(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      resetForm();
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Signage Type</DialogTitle>
          <DialogDescription>
            Create a new signage type or choose from recommended signs below.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Configuration Form */}
          <div className="space-y-4">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="signage-name">Name</Label>
              <Input
                id="signage-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  // Clear recommendation selection when manually typing
                  if (selectedRecommendation) {
                    const sign = RECOMMENDED_SIGNS.find((s) => s.key === selectedRecommendation);
                    if (sign && e.target.value !== sign.name) {
                      setSelectedRecommendation(null);
                    }
                  }
                }}
                placeholder="e.g., Food Court, Information"
                autoFocus
              />
              {isDuplicate && (
                <p className="text-xs text-destructive">
                  A signage type with this name already exists.
                </p>
              )}
            </div>

            {/* Emoji and Color row */}
            <div className="flex gap-4">
              {/* Emoji */}
              <div className="space-y-2">
                <Label htmlFor="signage-emoji">Emoji</Label>
                <div className="flex items-center gap-2">
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl border border-border"
                    style={{ backgroundColor: color }}
                  >
                    {emoji || '📍'}
                  </div>
                  <Input
                    id="signage-emoji"
                    value={emoji}
                    onChange={(e) => {
                      const val = e.target.value;
                      if ([...val].length <= 2) {
                        setEmoji(val);
                      }
                    }}
                    placeholder="📍"
                    className="w-20 text-center text-lg"
                  />
                </div>
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex items-center gap-2 h-10">
                  <ColorPicker
                    color={color}
                    onChange={setColor}
                    defaultColor="#3B82F6"
                  />
                  <span className="text-xs text-muted-foreground font-mono">
                    {color}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Recommended Signs Gallery */}
          <div className="space-y-3">
            <div>
              <Label className="text-sm font-medium">Recommended Signs</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click to pre-fill the form with a recommended configuration.
              </p>
            </div>
            <div className="space-y-2">
              {RECOMMENDED_SIGNS.map((sign) => {
                const alreadyExists = existingNamesLower.includes(sign.name.toLowerCase());
                return (
                  <RecommendedSignCard
                    key={sign.key}
                    sign={sign}
                    isSelected={selectedRecommendation === sign.key}
                    isDisabled={alreadyExists}
                    onSelect={() => !alreadyExists && handleSelectRecommendation(sign)}
                  />
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <DialogFooter>
            {autoSubTypes && autoSubTypes.length > 0 && (
              <p className="text-xs text-muted-foreground mr-auto self-center">
                Will also create {autoSubTypes.join(' and ')} sub-types
              </p>
            )}
            <Button type="submit" disabled={!canSubmit}>
              {autoSubTypes && autoSubTypes.length > 0 ? 'Create with Sub-types' : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
