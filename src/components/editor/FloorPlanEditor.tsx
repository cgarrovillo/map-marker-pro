import { useState, useCallback } from 'react';
import { Toolbar } from './Toolbar';
import { AnnotationPanel } from './AnnotationPanel';
import { LayersPanel } from './LayersPanel';
import { Canvas } from './Canvas';
import { useAnnotations } from '@/hooks/useAnnotations';
import { toast } from 'sonner';

export function FloorPlanEditor() {
  const [image, setImage] = useState<string | null>(null);
  const {
    annotations,
    mode,
    setMode,
    toolMode,
    setToolMode,
    selectedCategory,
    selectedType,
    selectAnnotationType,
    focusedCategory,
    setFocusedCategory,
    layerVisibility,
    subLayerVisibility,
    toggleLayerVisibility,
    toggleSubLayerVisibility,
    addAnnotation,
    deleteAnnotation,
    isAnnotationVisible,
    clearAnnotations,
    exportAnnotations,
    importAnnotations,
    pendingLine,
    setPendingLine,
  } = useAnnotations();

  const handleImageUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
      toast.success('Floor plan uploaded successfully');
    };
    reader.readAsDataURL(file);
  }, []);

  const handleExport = useCallback(() => {
    const data = exportAnnotations();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'floor-plan-annotations.json';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Annotations exported');
  }, [exportAnnotations]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = importAnnotations(e.target?.result as string);
          if (result) {
            toast.success('Annotations imported');
          } else {
            toast.error('Invalid annotations file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [importAnnotations]);

  const handleClear = useCallback(() => {
    if (annotations.length === 0) {
      toast.info('No annotations to clear');
      return;
    }
    if (confirm('Are you sure you want to clear all annotations?')) {
      clearAnnotations();
      toast.success('Annotations cleared');
    }
  }, [annotations.length, clearAnnotations]);

  return (
    <div className="h-screen flex flex-col bg-background">
      <header className="h-12 bg-card border-b border-border flex items-center px-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="w-5 h-5 text-primary-foreground"
            >
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="font-semibold text-lg">FloorPlan Pro</span>
        </div>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground font-mono">
          {annotations.length} annotation{annotations.length !== 1 && 's'}
        </span>
      </header>

      <Toolbar
        mode={mode}
        toolMode={toolMode}
        onModeChange={setMode}
        onToolChange={setToolMode}
        onExport={handleExport}
        onImport={handleImport}
        onClear={handleClear}
        hasImage={!!image}
      />

      <div className="flex-1 flex overflow-hidden">
        <AnnotationPanel
          selectedCategory={selectedCategory}
          selectedType={selectedType}
          onSelect={selectAnnotationType}
          isEditMode={mode === 'edit'}
        />

        <Canvas
          image={image}
          onImageUpload={handleImageUpload}
          annotations={annotations}
          isAnnotationVisible={isAnnotationVisible}
          focusedCategory={focusedCategory}
          toolMode={toolMode}
          isEditMode={mode === 'edit'}
          onAddAnnotation={addAnnotation}
          onDeleteAnnotation={deleteAnnotation}
          selectedCategory={selectedCategory}
          selectedType={selectedType}
          pendingLine={pendingLine}
          setPendingLine={setPendingLine}
        />

        <LayersPanel
          layerVisibility={layerVisibility}
          subLayerVisibility={subLayerVisibility}
          onToggleLayer={toggleLayerVisibility}
          onToggleSubLayer={toggleSubLayerVisibility}
          focusedCategory={focusedCategory}
          onFocusCategory={setFocusedCategory}
          annotations={annotations}
        />
      </div>
    </div>
  );
}
