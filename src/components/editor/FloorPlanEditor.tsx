import { useCallback, useEffect } from 'react';
import { useMemo } from 'react';
import { AnnotationPanel } from './AnnotationPanel';
import { LayersPanel } from './LayersPanel';
import { Canvas } from './Canvas';
import { EventsPanel } from './EventsPanel';
import { useSupabaseEvents } from '@/hooks/useSupabaseEvents';
import { useVenueLayouts } from '@/hooks/useVenueLayouts';
import { useSignageTypes } from '@/hooks/useSignageTypes';
import { useSignageSubTypes } from '@/hooks/useSignageSubTypes';
import { useOrganization } from '@/hooks/useOrganization';
import { useAuthContext } from '@/components/auth/AuthProvider';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LogOut, Building2, Eye, Edit3, Download, Upload, RotateCcw, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { selectMode, selectIsAssetsMode, selectSelectedCategory, selectSelectedType, selectSelectedAnnotationId, selectSelectedSignageTypeId, selectSelectedSignageSubTypeId } from '@/store/selectors';
import { setMode, setSelectedAnnotationId } from '@/store/slices/uiSlice';
import { Annotation, EditorMode } from '@/types/annotations';
import { AssetsDashboard } from '@/components/assets/AssetsDashboard';

export function FloorPlanEditor() {
  const dispatch = useAppDispatch();
  const { signOut } = useAuthContext();
  const { organization, currentUser } = useOrganization();

  // Redux state
  const mode = useAppSelector(selectMode);
  const isAssetsMode = useAppSelector(selectIsAssetsMode);
  const selectedCategory = useAppSelector(selectSelectedCategory);
  const selectedType = useAppSelector(selectSelectedType);
  const selectedSignageTypeId = useAppSelector(selectSelectedSignageTypeId);
  const selectedSignageSubTypeId = useAppSelector(selectSelectedSignageSubTypeId);
  const selectedAnnotationId = useAppSelector(selectSelectedAnnotationId);

  const {
    events,
    activeEvent,
    activeEventId,
    setActiveEventId,
    loading: eventsLoading,
    createEvent,
    deleteEvent,
    renameEvent,
  } = useSupabaseEvents();

  const {
    layouts,
    activeLayout,
    activeLayoutId,
    loading: layoutsLoading,
    createLayout,
    uploadImage,
    addAnnotation,
    deleteAnnotation,
    updateAnnotation,
    clearAnnotations,
    getAnnotations,
    getImageUrl,
  } = useVenueLayouts(activeEventId);

  const {
    signageTypes,
    loading: signageTypesLoading,
    createSignageType,
    deleteSignageType,
    renameSignageType,
    updateSignageTypeNotes,
    updateSignageTypeColor,
    updateSignageTypeIcon,
    updateSignageTypeImage,
  } = useSignageTypes(activeLayoutId);

  // Memoize signage type IDs for sub-types hook
  const signageTypeIds = useMemo(
    () => signageTypes.map((t) => t.id),
    [signageTypes]
  );

  const {
    subTypesByParent,
    loading: subTypesLoading,
    createSubType,
    deleteSubType,
    renameSubType,
    updateSubTypeColor,
    updateSubTypeImage,
  } = useSignageSubTypes(activeLayoutId, signageTypeIds);

  // Auto-create a layout when selecting an event with no layouts
  useEffect(() => {
    if (activeEventId && !layoutsLoading && layouts.length === 0) {
      createLayout('Floor Plan').catch(console.error);
    }
  }, [activeEventId, layoutsLoading, layouts.length, createLayout]);

  const annotations = getAnnotations(activeLayout);
  const imageUrl = getImageUrl(activeLayout?.image_path ?? null);
  
  // Find the selected annotation
  const selectedAnnotation = selectedAnnotationId 
    ? annotations.find(a => a.id === selectedAnnotationId) ?? null 
    : null;

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!activeLayoutId) {
        toast.error('Please select or create an event first');
        return;
      }
      try {
        await uploadImage(activeLayoutId, file);
        toast.success('Floor plan uploaded successfully');
      } catch (error) {
        toast.error('Failed to upload floor plan');
        console.error(error);
      }
    },
    [activeLayoutId, uploadImage]
  );

  const handleAddAnnotation = useCallback(
    async (points: { x: number; y: number }[], label?: string) => {
      if (!activeLayoutId || !selectedType) return;
      
      // For signage annotations with the two-level hierarchy
      let signageTypeName: string | undefined;
      let signageSubTypeName: string | undefined;
      
      if (selectedType === 'ticket' && selectedSignageTypeId) {
        // Get the parent signage type name
        const selectedSignageType = signageTypes.find(t => t.id === selectedSignageTypeId);
        signageTypeName = selectedSignageType?.name;
        
        // Get the sub-type name if one is selected
        if (selectedSignageSubTypeId) {
          const parentSubTypes = subTypesByParent[selectedSignageTypeId] || [];
          const selectedSubType = parentSubTypes.find(st => st.id === selectedSignageSubTypeId);
          signageSubTypeName = selectedSubType?.name;
        }
      }
      
      try {
        const newAnnotation = await addAnnotation(
          activeLayoutId, 
          selectedCategory, 
          selectedType, 
          points, 
          label,
          signageTypeName,
          signageSubTypeName
        );
        // Auto-select the new annotation
        if (newAnnotation) {
          dispatch(setSelectedAnnotationId(newAnnotation.id));
        }
      } catch (error) {
        toast.error('Failed to add annotation');
        console.error(error);
      }
    },
    [activeLayoutId, selectedCategory, selectedType, selectedSignageTypeId, selectedSignageSubTypeId, signageTypes, subTypesByParent, addAnnotation, dispatch]
  );

  const handleDeleteAnnotation = useCallback(
    async (id: string) => {
      if (!activeLayoutId) return;
      try {
        await deleteAnnotation(activeLayoutId, id);
      } catch (error) {
        toast.error('Failed to delete annotation');
        console.error(error);
      }
    },
    [activeLayoutId, deleteAnnotation]
  );

  const handleUpdateAnnotation = useCallback(
    async (id: string, updates: Partial<Annotation>) => {
      if (!activeLayoutId) return;
      try {
        await updateAnnotation(activeLayoutId, id, updates);
      } catch (error) {
        toast.error('Failed to update annotation');
        console.error(error);
      }
    },
    [activeLayoutId, updateAnnotation]
  );

  const handleExport = useCallback(() => {
    if (!activeLayout || !activeEvent) {
      toast.error('Please select an event first');
      return;
    }
    const exportData = {
      event: activeEvent,
      layout: activeLayout,
      annotations: getAnnotations(activeLayout),
    };
    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeEvent.name}-floor-plan.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Event exported');
  }, [activeLayout, activeEvent, getAnnotations]);


  const handleClear = useCallback(async () => {
    if (!activeLayoutId || !activeLayout) {
      toast.error('Please select an event first');
      return;
    }
    const currentAnnotations = getAnnotations(activeLayout);
    if (currentAnnotations.length === 0) {
      toast.info('No annotations to clear');
      return;
    }
    if (confirm('Are you sure you want to clear all annotations?')) {
      try {
        await clearAnnotations(activeLayoutId);
        toast.success('Annotations cleared');
      } catch (error) {
        toast.error('Failed to clear annotations');
        console.error(error);
      }
    }
  }, [activeLayoutId, activeLayout, clearAnnotations, getAnnotations]);

  const handleCreateEvent = useCallback(
    async (name: string) => {
      try {
        const event = await createEvent(name);
        if (event) {
          toast.success('Event created');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to create event';
        toast.error(message);
        console.error(error);
      }
    },
    [createEvent]
  );

  const handleDeleteEvent = useCallback(
    async (id: string) => {
      if (confirm('Are you sure you want to delete this event?')) {
        try {
          await deleteEvent(id);
          toast.success('Event deleted');
        } catch (error) {
          toast.error('Failed to delete event');
          console.error(error);
        }
      }
    },
    [deleteEvent]
  );

  const handleRenameEvent = useCallback(
    async (id: string, name: string) => {
      try {
        await renameEvent(id, name);
        toast.success('Event renamed');
      } catch (error) {
        toast.error('Failed to rename event');
        console.error(error);
      }
    },
    [renameEvent]
  );

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Signed out');
    } catch (error) {
      toast.error('Failed to sign out');
      console.error(error);
    }
  };

  const handleSetMode = useCallback(
    (newMode: EditorMode) => {
      dispatch(setMode(newMode));
    },
    [dispatch]
  );

  const isLoading = eventsLoading || layoutsLoading;

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

        {/* Edit/View Mode Toggle */}
        <div className="ml-6 flex items-center bg-secondary rounded-lg p-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleSetMode('edit')}
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
                onClick={() => handleSetMode('view')}
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
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => handleSetMode('assets')}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                  mode === 'assets'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Package className="w-4 h-4" />
                Assets
              </button>
            </TooltipTrigger>
            <TooltipContent>Asset management dashboard</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex-1 flex items-center justify-center gap-4">
          {organization && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="w-4 h-4" />
              <span>{organization.name}</span>
            </div>
          )}
          {activeEvent && (
            <>
              <span className="text-muted-foreground/50">•</span>
              <span className="text-sm font-medium text-foreground">
                {activeEvent.name}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-mono mr-2">
            {annotations.length} annotation{annotations.length !== 1 && 's'}
          </span>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex">
                <Button variant="ghost" size="icon" disabled className="opacity-50 cursor-not-allowed">
                  <Upload className="w-4 h-4" />
                </Button>
              </span>
            </TooltipTrigger>
            <TooltipContent>Coming soon</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleExport}>
                <Download className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Export annotations</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleClear}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Clear all annotations</TooltipContent>
          </Tooltip>

          <div className="w-px h-6 bg-border mx-1" />

          {currentUser && (
            <span className="text-xs text-muted-foreground">
              {currentUser.email}
            </span>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" onClick={handleSignOut}>
                <LogOut className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <EventsPanel
          events={events}
          activeEventId={activeEventId}
          onSelectEvent={setActiveEventId}
          onCreateEvent={handleCreateEvent}
          onDeleteEvent={handleDeleteEvent}
          onRenameEvent={handleRenameEvent}
          loading={eventsLoading}
        />

        {isAssetsMode ? (
          <AssetsDashboard
            annotations={annotations}
            onUpdateAnnotation={handleUpdateAnnotation}
            activeLayout={activeLayout}
            activeEvent={activeEvent}
            signageTypes={signageTypes}
            subTypesByParent={subTypesByParent}
          />
        ) : (
          <>
            {activeEventId && (
              <AnnotationPanel
                annotations={annotations}
                signageTypes={signageTypes}
                signageTypesLoading={signageTypesLoading}
                subTypesByParent={subTypesByParent}
                subTypesLoading={subTypesLoading}
                onCreateSignageType={createSignageType}
                onDeleteSignageType={deleteSignageType}
                onCreateSubType={createSubType}
                onDeleteSubType={deleteSubType}
                onUpdateSignageTypeColor={updateSignageTypeColor}
                onUpdateSignageTypeIcon={updateSignageTypeIcon}
                onUpdateSubTypeColor={updateSubTypeColor}
                onRenameSignageType={renameSignageType}
                onUpdateSignageTypeNotes={updateSignageTypeNotes}
                onUpdateSignageTypeImage={updateSignageTypeImage}
                onUpdateSubTypeImage={updateSubTypeImage}
                onRenameSubType={renameSubType}
              />
            )}

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center canvas-grid">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground">Loading...</p>
                </div>
              </div>
            ) : activeEvent && activeLayout ? (
              <Canvas
                image={imageUrl}
                onImageUpload={handleImageUpload}
                annotations={annotations}
                onAddAnnotation={handleAddAnnotation}
                onDeleteAnnotation={handleDeleteAnnotation}
                onUpdateAnnotation={handleUpdateAnnotation}
                signageTypes={signageTypes}
                subTypesByParent={subTypesByParent}
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
              annotations={annotations}
              selectedAnnotation={selectedAnnotation}
              onUpdateAnnotation={handleUpdateAnnotation}
              signageTypes={signageTypes}
              subTypesByParent={subTypesByParent}
            />
          </>
        )}
      </div>
    </div>
  );
}
