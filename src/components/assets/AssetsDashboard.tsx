import { useState } from 'react';
import { SignSummaryCards, StandSummaryCards } from './AssetSummaryCards';
import { SignFilterBar, StandFilterBar, defaultSignFilters, defaultStandFilters } from './AssetFilters';
import { SignTable, StandTable } from './AssetTable';
import { useAssetStats } from '@/hooks/useAssetStats';
import type { SignFilters, StandFilters } from '@/hooks/useAssetStats';
import { Package } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Annotation } from '@/types/annotations';
import type { Tables } from '@/integrations/supabase/types';

type SignageTypeRow = Tables<'signage_types'>;
type SignageSubTypeRow = Tables<'signage_sub_types'>;

interface AssetsDashboardProps {
  annotations: Annotation[];
  onUpdateAnnotation: (id: string, updates: Partial<Annotation>) => Promise<void>;
  activeLayout: Tables<'venue_layouts'> | null;
  activeEvent: Tables<'events'> | null;
  signageTypes?: SignageTypeRow[];
  subTypesByParent?: Record<string, SignageSubTypeRow[]>;
}

export function AssetsDashboard({
  annotations,
  onUpdateAnnotation,
  activeLayout,
  activeEvent,
  signageTypes = [],
  subTypesByParent = {},
}: AssetsDashboardProps) {
  const [signFilters, setSignFilters] = useState<SignFilters>(defaultSignFilters);
  const [standFilters, setStandFilters] = useState<StandFilters>(defaultStandFilters);

  const {
    signStats,
    standStats,
    signageTypeNames,
    filteredSignRows,
    filteredStandRows,
  } = useAssetStats(annotations, signFilters, standFilters);

  if (!activeEvent || !activeLayout) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
            <Package className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-lg font-medium text-muted-foreground">
            Select an event to manage assets
          </p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Use the Events panel on the left to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Asset Management</h2>
          <p className="text-muted-foreground">
            Track and manage signage for{' '}
            <span className="font-medium text-foreground">{activeEvent.name}</span>
            {activeLayout.name && (
              <>
                {' '}&mdash;{' '}
                <span className="font-medium text-foreground">{activeLayout.name}</span>
              </>
            )}
          </p>
        </div>

        <Tabs defaultValue="signs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="signs">Signs</TabsTrigger>
            <TabsTrigger value="stands">Stands</TabsTrigger>
          </TabsList>

          {/* ----- Signs tab ----- */}
          <TabsContent value="signs" className="space-y-6">
            <SignSummaryCards stats={signStats} />

            <SignFilterBar
              filters={signFilters}
              onFiltersChange={setSignFilters}
              signageTypeNames={signageTypeNames}
            />

            <SignTable
              rows={filteredSignRows}
              onUpdateAnnotation={onUpdateAnnotation}
              signageTypes={signageTypes}
              subTypesByParent={subTypesByParent}
            />
          </TabsContent>

          {/* ----- Stands tab ----- */}
          <TabsContent value="stands" className="space-y-6">
            <StandSummaryCards stats={standStats} />

            <StandFilterBar
              filters={standFilters}
              onFiltersChange={setStandFilters}
            />

            <StandTable
              rows={filteredStandRows}
              onUpdateAnnotation={onUpdateAnnotation}
              signageTypes={signageTypes}
              subTypesByParent={subTypesByParent}
            />
          </TabsContent>
        </Tabs>
      </div>
    </ScrollArea>
  );
}
