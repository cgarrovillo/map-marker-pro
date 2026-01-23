import { MousePointer2, MapPin, Spline, Trash2, Eye, Edit3, Download, Upload, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { EditorMode, ToolMode } from '@/types/annotations';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  mode: EditorMode;
  toolMode: ToolMode;
  onModeChange: (mode: EditorMode) => void;
  onToolChange: (tool: ToolMode) => void;
  onExport: () => void;
  onImport: () => void;
  onClear: () => void;
  hasImage: boolean;
}

export function Toolbar({
  mode,
  toolMode,
  onModeChange,
  onToolChange,
  onExport,
  onImport,
  onClear,
  hasImage,
}: ToolbarProps) {
  const tools = [
    { id: 'select' as ToolMode, icon: MousePointer2, label: 'Select' },
    { id: 'marker' as ToolMode, icon: MapPin, label: 'Place Marker' },
    { id: 'line' as ToolMode, icon: Spline, label: 'Draw Line/Flow' },
    { id: 'delete' as ToolMode, icon: Trash2, label: 'Delete' },
  ];

  return (
    <div className="h-14 bg-card border-b border-border flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-secondary rounded-lg p-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onModeChange('edit')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  mode === 'edit'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Edit3 className="w-4 h-4" />
                Edit
              </button>
            </TooltipTrigger>
            <TooltipContent>Edit annotations</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onModeChange('view')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  mode === 'view'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Eye className="w-4 h-4" />
                View
              </button>
            </TooltipTrigger>
            <TooltipContent>View only mode</TooltipContent>
          </Tooltip>
        </div>

        {mode === 'edit' && hasImage && (
          <>
            <Separator orientation="vertical" className="h-8 mx-2" />
            <div className="flex items-center gap-1">
              {tools.map((tool) => (
                <Tooltip key={tool.id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => onToolChange(tool.id)}
                      className={cn(
                        'toolbar-button',
                        toolMode === tool.id && 'toolbar-button-active'
                      )}
                    >
                      <tool.icon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{tool.label}</TooltipContent>
                </Tooltip>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onImport}>
              <Upload className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Import annotations</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onExport}>
              <Download className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Export annotations</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onClear}>
              <RotateCcw className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Clear all annotations</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
