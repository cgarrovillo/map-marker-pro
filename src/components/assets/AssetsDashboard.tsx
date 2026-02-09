import { useState } from 'react';
import { SignSummaryCards, StandSummaryCards, DesignSummaryCards } from './AssetSummaryCards';
import {
  SignFilterBar,
  StandFilterBar,
  DesignFilterBar,
  defaultSignFilters,
  defaultStandFilters,
  defaultDesignFilters,
} from './AssetFilters';
import { SignTable, StandTable, DesignTable } from './AssetTable';
import { useAssetStats } from '@/hooks/useAssetStats';
import type { SignFilters, StandFilters, DesignFilters } from '@/hooks/useAssetStats';
import { Download, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  exportSignTableCsv,
  exportDesignTableCsv,
  exportStandTableCsv,
} from '@/lib/csvExport';
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
  const [designFilters, setDesignFilters] = useState<DesignFilters>(defaultDesignFilters);

  const {
    signStats,
    standStats,
    designStats,
    signageTypeNames,
    filteredSignGroupRows,
    filteredDesignRows,
    filteredStandRows,
  } = useAssetStats(annotations, signFilters, standFilters, designFilters);

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

        <Tabs defaultValue="designs" className="space-y-6">
          <TabsList>
            <TabsTrigger value="designs">Designs</TabsTrigger>
            <TabsTrigger value="signs">Signs</TabsTrigger>
            <TabsTrigger value="stands">Stands</TabsTrigger>
          </TabsList>

          {/* ----- Designs tab ----- */}
          <TabsContent value="designs" className="space-y-6">
            <DesignSummaryCards stats={designStats} />

            <div className="flex items-start justify-between gap-4">
              <DesignFilterBar
                filters={designFilters}
                onFiltersChange={setDesignFilters}
                signageTypeNames={signageTypeNames}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={filteredDesignRows.length === 0}
                onClick={() => exportDesignTableCsv(filteredDesignRows)}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>

            <DesignTable
              rows={filteredDesignRows}
              onUpdateAnnotation={onUpdateAnnotation}
            />
          </TabsContent>

          {/* ----- Signs tab (order fulfillment) ----- */}
          <TabsContent value="signs" className="space-y-6">
            <SignSummaryCards stats={signStats} />

            <div className="flex items-start justify-between gap-4">
              <SignFilterBar
                filters={signFilters}
                onFiltersChange={setSignFilters}
                signageTypeNames={signageTypeNames}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={filteredSignGroupRows.length === 0}
                onClick={() => exportSignTableCsv(filteredSignGroupRows)}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>

            <SignTable
              rows={filteredSignGroupRows}
              onUpdateAnnotation={onUpdateAnnotation}
            />
          </TabsContent>

          {/* ----- Stands tab ----- */}
          <TabsContent value="stands" className="space-y-6">
            <StandSummaryCards stats={standStats} />

            <div className="flex items-start justify-between gap-4">
              <StandFilterBar
                filters={standFilters}
                onFiltersChange={setStandFilters}
              />
              <Button
                variant="outline"
                size="sm"
                disabled={filteredStandRows.length === 0}
                onClick={() => exportStandTableCsv(filteredStandRows)}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </div>

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
