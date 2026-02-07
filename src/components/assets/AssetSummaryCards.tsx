import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, ShoppingCart, Truck, CheckCircle, CircleDashed, Columns2 } from 'lucide-react';
import type { AssetStats } from '@/hooks/useAssetStats';

interface AssetSummaryCardsProps {
  stats: AssetStats;
}

export function AssetSummaryCards({ stats }: AssetSummaryCardsProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Signs</CardTitle>
          <Package className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Not Ordered</CardTitle>
          <CircleDashed className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.byStatus.not_ordered}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Ordered</CardTitle>
          <ShoppingCart className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-500">{stats.byStatus.ordered}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Shipped</CardTitle>
          <Truck className="h-4 w-4 text-amber-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-500">{stats.byStatus.shipped}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Installed</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-500">{stats.byStatus.installed}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pedestals</CardTitle>
          <Columns2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">1-sided</span>
              <span className="font-semibold">{stats.byHolder['sign-pedestal-1']}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">2-sided</span>
              <span className="font-semibold">{stats.byHolder['sign-pedestal-2']}</span>
            </div>
            {stats.byHolder.unassigned > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Unassigned</span>
                <span className="font-semibold">{stats.byHolder.unassigned}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
