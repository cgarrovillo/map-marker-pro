import { useState, useCallback } from 'react';
import { Toolbar } from './Toolbar';
import { AnnotationPanel } from './AnnotationPanel';
import { LayersPanel } from './LayersPanel';
import { Canvas } from './Canvas';
import { EventsPanel } from './EventsPanel';
import { useEvents } from '@/hooks/useEvents';
import { useAnnotationSettings } from '@/hooks/useAnnotationSettings';
import { toast } from 'sonner';

export function FloorPlanEditor() {
  const {
    events,
    activeEvent,
    activeEventId,
    setActiveEventId,
    createEvent,
    deleteEvent,
    renameEvent,
    setEventImage,
    addAnnotation,
    deleteAnnotation,
    clearAnnotations,
    exportEvent,
    importEvent,
  } = useEvents();

  const {
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
    isAnnotationVisible,
    pendingLine,
    setPendingLine,
  } = useAnnotationSettings();

  const handleImageUpload = useCallback(
    (file: File) => {
      if (!activeEventId) {
        toast.error('Please select or create an event first');
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => {
        setEventImage(activeEventId, e.target?.result as string);
        toast.success('Floor plan uploaded successfully');
      };
      reader.readAsDataURL(file);
    },
    [activeEventId, setEventImage]
  );

  const handleAddAnnotation = useCallback(
    (points: { x: number; y: number }[], label?: string) => {
      if (!activeEventId) return;
      addAnnotation(activeEventId, selectedCategory, selectedType, points, label);
    },
    [activeEventId, selectedCategory, selectedType, addAnnotation]
  );

  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      if (!activeEventId) return;
      deleteAnnotation(activeEventId, id);
    },
    [activeEventId, deleteAnnotation]
  );

  const handleExport = useCallback(() => {
    if (!activeEventId) {
      toast.error('Please select an event first');
      return;
    }
    const data = exportEvent(activeEventId);
    if (!data) return;
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeEvent?.name || 'event'}-floor-plan.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Event exported');
  }, [activeEventId, activeEvent, exportEvent]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = importEvent(e.target?.result as string);
          if (result) {
            toast.success('Event imported');
          } else {
            toast.error('Invalid event file');
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  }, [importEvent]);

  const handleClear = useCallback(() => {
    if (!activeEventId || !activeEvent) {
      toast.error('Please select an event first');
      return;
    }
    if (activeEvent.annotations.length === 0) {
      toast.info('No annotations to clear');
      return;
    }
    if (confirm('Are you sure you want to clear all annotations?')) {
      clearAnnotations(activeEventId);
      toast.success('Annotations cleared');
    }
  }, [activeEventId, activeEvent, clearAnnotations]);

  const handleDeleteEvent = useCallback(
    (id: string) => {
      if (confirm('Are you sure you want to delete this event?')) {
        deleteEvent(id);
        toast.success('Event deleted');
      }
    },
    [deleteEvent]
  );

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
        <div className="flex-1 flex items-center justify-center">
          {activeEvent && (
            <span className="text-sm font-medium text-muted-foreground">
              {activeEvent.name}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {activeEvent?.annotations.length || 0} annotation
          {(activeEvent?.annotations.length || 0) !== 1 && 's'}
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
        hasImage={!!activeEvent?.image}
      />

      <div className="flex-1 flex overflow-hidden">
        <EventsPanel
          events={events}
          activeEventId={activeEventId}
          onSelectEvent={setActiveEventId}
          onCreateEvent={createEvent}
          onDeleteEvent={handleDeleteEvent}
          onRenameEvent={renameEvent}
        />

        <AnnotationPanel
          selectedCategory={selectedCategory}
          selectedType={selectedType}
          onSelect={selectAnnotationType}
          isEditMode={mode === 'edit'}
        />

        {activeEvent ? (
          <Canvas
            image={activeEvent.image}
            onImageUpload={handleImageUpload}
            annotations={activeEvent.annotations}
            isAnnotationVisible={isAnnotationVisible}
            focusedCategory={focusedCategory}
            toolMode={toolMode}
            isEditMode={mode === 'edit'}
            onAddAnnotation={handleAddAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
            selectedCategory={selectedCategory}
            selectedType={selectedType}
            pendingLine={pendingLine}
            setPendingLine={setPendingLine}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center canvas-grid">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="w-8 h-8 text-muted-foreground"
                >
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </div>
              <p className="text-lg font-medium text-muted-foreground">
                Select or create an event
              </p>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Use the Events panel on the left to get started
              </p>
            </div>
          </div>
        )}

        <LayersPanel
          layerVisibility={layerVisibility}
          subLayerVisibility={subLayerVisibility}
          onToggleLayer={toggleLayerVisibility}
          onToggleSubLayer={toggleSubLayerVisibility}
          focusedCategory={focusedCategory}
          onFocusCategory={setFocusedCategory}
          annotations={activeEvent?.annotations || []}
        />
      </div>
    </div>
  );
}
