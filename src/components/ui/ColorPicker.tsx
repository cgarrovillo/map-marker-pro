import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Preset colors - 12 carefully chosen colors for accessibility
const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#EF4444', // Red
  '#22C55E', // Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#14B8A6', // Teal
  '#A855F7', // Violet
];

interface ColorPickerProps {
  color: string | null;
  onChange: (color: string) => void;
  defaultColor?: string;
  disabled?: boolean;
}

export function ColorPicker({
  color,
  onChange,
  defaultColor = '#3B82F6',
  disabled = false,
}: ColorPickerProps) {
  const [customColor, setCustomColor] = React.useState('');
  const [open, setOpen] = React.useState(false);

  const currentColor = color || defaultColor;

  const handlePresetClick = (presetColor: string) => {
    onChange(presetColor);
    setOpen(false);
  };

  const handleCustomApply = () => {
    // Validate hex color
    const hexRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
    if (hexRegex.test(customColor)) {
      onChange(customColor.toUpperCase());
      setCustomColor('');
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          className={cn(
            'h-5 w-5 rounded-full border border-border shadow-sm transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1',
            disabled && 'cursor-not-allowed opacity-50'
          )}
          style={{ backgroundColor: currentColor }}
          aria-label="Choose color"
        />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="start">
        <div className="space-y-3">
          {/* Current color indicator */}
          <div className="flex items-center gap-2">
            <div
              className="h-6 w-6 rounded-md border border-border"
              style={{ backgroundColor: currentColor }}
            />
            <span className="text-xs text-muted-foreground font-mono">
              {currentColor}
            </span>
          </div>

          {/* Preset colors grid */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Preset Colors</p>
            <div className="grid grid-cols-6 gap-1.5">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  className={cn(
                    'h-6 w-6 rounded-md border transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ring',
                    currentColor === presetColor
                      ? 'border-foreground ring-2 ring-ring'
                      : 'border-border'
                  )}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => handlePresetClick(presetColor)}
                  aria-label={`Select color ${presetColor}`}
                />
              ))}
            </div>
          </div>

          {/* Custom color input */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Custom Color</p>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="#3B82F6"
                value={customColor}
                onChange={(e) => setCustomColor(e.target.value)}
                className="h-8 text-xs font-mono"
                maxLength={7}
              />
              <Button
                size="sm"
                variant="secondary"
                className="h-8 text-xs"
                onClick={handleCustomApply}
                disabled={!customColor}
              >
                Apply
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
