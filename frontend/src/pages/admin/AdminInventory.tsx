import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Warehouse,
  ShoppingBag,
  ShieldCheck,
  AlertTriangle,
  Search,
  RefreshCw,
  Printer,
  QrCode,
  Sliders,
  Check,
  Edit2,
  ChevronLeft,
  ChevronRight,
  EyeOff,
  Package,
  ArrowRightLeft,
  CheckSquare,
  Square,
  X,
  Camera,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SafeImage } from '@/components/ui/SafeImage';
import { InventoryItem, InventorySummary, inventoryRepository } from '@/client/inventoryRepository';
import { StockAdjustmentModal } from '@/components/admin/inventory/StockAdjustmentModal';
import { AllocateWebshopModal } from '@/components/admin/inventory/AllocateWebshopModal';
import { QrCodePreviewModal } from '@/components/admin/inventory/QrCodePreviewModal';
import { LabelPrintModal } from '@/components/admin/inventory/LabelPrintModal';
import { WarehouseScannerModal } from '@/components/admin/inventory/WarehouseScannerModal';
import { toast } from 'sonner';

export default function AdminInventory() {
  const { t } = useTranslation();

  // State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<InventorySummary>({
    totalOnHand: 0,
    totalWebshop: 0,
    totalReserved: 0,
    totalReserveBuffer: 0,
    totalDamaged: 0,
    totalSkus: 0,
    lowStockCount: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [viewMode, setViewMode] = useState<'all' | 'storage' | 'webshop'>('all');
  const [lowStockFilter, setLowStockFilter] = useState<boolean>(false);

  // Selected items for batch operations
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Modals state
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [allocateItem, setAllocateItem] = useState<InventoryItem | null>(null);
  const [qrItem, setQrItem] = useState<InventoryItem | null>(null);
  const [isLabelModalOpen, setIsLabelModalOpen] = useState<boolean>(false);
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // Inline location edit state
  const [editingBinId, setEditingBinId] = useState<string | null>(null);
  const [tempBinValue, setTempBinValue] = useState<string>('');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch inventory
  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await inventoryRepository.getList({
        page,
        limit: 20,
        search: debouncedSearch,
        view: viewMode,
        lowStock: lowStockFilter,
      });

      setItems(res.data.items);
      setSummary(res.data.summary);
      setTotalPages(res.data.pagination.totalPages);
      setTotalItems(res.data.pagination.total);
    } catch (error: any) {
      toast.error(error.message || t('inventory.fetch_error', 'Failed to load inventory data'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [page, debouncedSearch, viewMode, lowStockFilter]);

  // Selected items array
  const selectedItemsList = useMemo(() => {
    return items.filter((item) => selectedIds.has(item.id));
  }, [items, selectedIds]);

  const toggleSelectAll = () => {
    if (selectedIds.size === items.length && items.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map((i) => i.id)));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSaveBinLocation = async (item: InventoryItem) => {
    try {
      await inventoryRepository.updateLocation(item.id, tempBinValue);
      toast.success(t('inventory.location_saved', 'Shelf location updated'));
      setEditingBinId(null);
      fetchInventory();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update location');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {t('inventory.title', 'Inventory & Storage Management')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('inventory.subtitle', 'Dual-layer stock control for warehouse storage & webshop live quota')}
          </p>
        </div>

        {/* Global Header Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setIsScannerOpen(true)}
            className="gap-2 font-medium"
          >
            <Camera className="h-4 w-4" />
            <span>{t('inventory.btn_open_scanner', 'Camera & Laser Scanner')}</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsLabelModalOpen(true)}
            className="gap-2 font-medium"
          >
            <Printer className="h-4 w-4" />
            <span>{t('inventory.print_labels_btn', 'Print Labels')}</span>
            {selectedIds.size > 0 && (
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0 h-4">
                {selectedIds.size}
              </Badge>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchInventory()}
            title={t('common.refresh', 'Refresh')}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Physical Storage */}
        <Card className="p-5 relative overflow-hidden bg-card border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('inventory.metric_total_onhand', 'Physical Storage Stock')}
            </span>
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Warehouse className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {summary.totalOnHand.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground font-medium">{t('inventory.units', 'units')}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.totalProducts
              ? t('inventory.across_skus_products', 'Across {{skus}} SKUs ({{products}} Products)', { skus: summary.totalSkus, products: summary.totalProducts })
              : t('inventory.across_skus', 'Across {{count}} total SKUs in warehouse', { count: summary.totalSkus })}
          </p>
        </Card>

        {/* Card 2: Webshop Live Quota */}
        <Card className="p-5 relative overflow-hidden bg-card border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('inventory.metric_webshop_live', 'Webshop Live Quota')}
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShoppingBag className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600">
              {summary.totalWebshop.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground font-medium">{t('inventory.units', 'units')}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('inventory.for_online_sale', 'Available for online customer checkout')}
          </p>
        </Card>

        {/* Card 3: Storage Safety Reserve */}
        <Card className="p-5 relative overflow-hidden bg-card border shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('inventory.metric_safety_reserve', 'Storage Reserve Buffer')}
            </span>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {summary.totalReserveBuffer.toLocaleString()}
            </span>
            <span className="text-xs text-muted-foreground font-medium">{t('inventory.units', 'units')}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('inventory.offline_buffer_desc', 'Protected in godown (Offline/B2B reserve)')}
          </p>
        </Card>

        {/* Card 4: Low Stock Warnings */}
        <Card className={`p-5 relative overflow-hidden bg-card border shadow-xs ${summary.lowStockCount > 0 ? 'border-amber-500/30' : ''}`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {t('inventory.metric_low_stock', 'Low Stock Warnings')}
            </span>
            <div className={`p-2.5 rounded-xl ${summary.lowStockCount > 0 ? 'bg-amber-500/15 text-amber-600' : 'bg-muted text-muted-foreground'}`}>
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-1.5">
            <span className={`text-2xl sm:text-3xl font-bold tracking-tight ${summary.lowStockCount > 0 ? 'text-amber-600' : 'text-foreground'}`}>
              {summary.lowStockCount}
            </span>
            <span className="text-xs text-muted-foreground font-medium">{t('inventory.items', 'items')}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {summary.lowStockCount > 0
              ? t('inventory.needs_reorder', 'Items below threshold (≤ 5 units)')
              : t('inventory.stock_healthy', 'All items have healthy inventory')}
          </p>
        </Card>
      </div>

      {/* View Tabs & Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3">
          {/* Shadcn UI Standard Tabs */}
          <Tabs
            value={viewMode}
            onValueChange={(val) => {
              setViewMode(val as any);
              setPage(1);
            }}
            className="w-full sm:w-auto"
          >
            <TabsList className="bg-muted">
              <TabsTrigger value="all" className="gap-1.5 text-xs">
                <Package className="h-3.5 w-3.5" />
                <span>{t('inventory.tab_all', 'All Inventory (Master)')}</span>
              </TabsTrigger>
              <TabsTrigger value="storage" className="gap-1.5 text-xs">
                <Warehouse className="h-3.5 w-3.5" />
                <span>{t('inventory.tab_storage', 'Storage Only')}</span>
              </TabsTrigger>
              <TabsTrigger value="webshop" className="gap-1.5 text-xs">
                <ShoppingBag className="h-3.5 w-3.5" />
                <span>{t('inventory.tab_webshop', 'Webshop Channel')}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Search & Low-stock toggle */}
          <div className="flex items-center gap-2 w-full sm:w-auto flex-1 sm:justify-end">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('inventory.search_placeholder', 'Search SKU, product, shelf bin...')}
                className="pl-9 h-9 text-xs"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <Button
              variant={lowStockFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setLowStockFilter(!lowStockFilter);
                setPage(1);
              }}
              className="h-9 gap-1.5 text-xs font-medium shrink-0"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{t('inventory.low_stock_only', 'Low Stock Only')}</span>
            </Button>
          </div>
        </div>

        {/* Batch Selected Action Bar */}
        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-primary/10 border border-primary/20 animate-fadeIn">
            <div className="flex items-center gap-2 text-xs font-semibold text-primary">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span>{t('inventory.selected_count', '{{count}} items selected for batch operations', { count: selectedIds.size })}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsLabelModalOpen(true)}
                className="h-8 gap-1.5 text-xs bg-background"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>{t('inventory.print_selected_labels', 'Print Selected Labels ({{count}})', { count: selectedIds.size })}</span>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                className="h-8 text-xs text-muted-foreground hover:text-foreground"
              >
                {t('common.clear', 'Clear')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Main Inventory Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/50 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              <tr>
                <th className="p-3.5 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.size === items.length}
                    onChange={toggleSelectAll}
                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                  />
                </th>
                <th className="p-3.5 min-w-[220px]">{t('inventory.col_product', 'Product & SKU')}</th>
                <th className="p-3.5">{t('inventory.col_bin', 'Storage Bin / Shelf')}</th>
                <th className="p-3.5 text-center">{t('inventory.col_storage_onhand', 'Storage On-Hand')}</th>
                <th className="p-3.5 text-center">{t('inventory.col_webshop_quota', 'Webshop Quota')}</th>
                <th className="p-3.5 text-center">{t('inventory.col_reserve_buffer', 'Storage Reserve')}</th>
                <th className="p-3.5 text-center">{t('inventory.col_status', 'Webshop Status')}</th>
                <th className="p-3.5 text-right">{t('inventory.col_actions', 'Quick Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
                    <p className="text-xs font-medium">{t('common.loading', 'Loading inventory...')}</p>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-muted-foreground">
                    <Warehouse className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm font-semibold text-foreground">{t('inventory.no_items_found', 'No inventory records found')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search ? t('inventory.try_different_search', 'Try adjusting your search filters') : t('inventory.all_synced', 'All warehouse items are up to date')}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((item) => {
                  const isSelected = selectedIds.has(item.id);
                  const isOutOfStock = item.quantityOnHand <= 0 || item.webshopAllocated <= 0;
                  const isLowStock = !isOutOfStock && item.webshopAllocated <= item.lowStockThreshold;
                  const storageReserve = Math.max(0, item.quantityOnHand - item.webshopAllocated);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-muted/40 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="p-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectItem(item.id)}
                          className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        />
                      </td>

                      {/* Product Name & SKU */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-lg border bg-muted/30 overflow-hidden shrink-0 flex items-center justify-center p-0.5">
                            {((item.variant.product as any).image || item.variant.product.images?.[0]) ? (
                              <SafeImage
                                src={(item.variant.product as any).image || item.variant.product.images[0]}
                                alt={item.variant.product.name}
                                className="h-full w-full object-contain"
                              />
                            ) : (
                              <Package className="h-5 w-5 text-muted-foreground/60" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-sm truncate max-w-[200px] sm:max-w-xs">
                              {item.variant.product.name}
                            </p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-[11px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                {item.variant.sku}
                              </span>
                              {item.variant.product.category && (
                                <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                                  {typeof item.variant.product.category === 'object'
                                    ? item.variant.product.category.name
                                    : item.variant.product.category}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Shelf / Bin Location (Inline editable) */}
                      <td className="p-3.5">
                        {editingBinId === item.id ? (
                          <div className="flex items-center gap-1.5 max-w-[150px]">
                            <Input
                              value={tempBinValue}
                              onChange={(e) => setTempBinValue(e.target.value)}
                              placeholder="e.g. A-01-2"
                              className="h-7 text-xs font-mono"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveBinLocation(item);
                                if (e.key === 'Escape') setEditingBinId(null);
                              }}
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => handleSaveBinLocation(item)}
                              className="h-7 w-7 text-primary hover:bg-primary/10"
                            >
                              <Check className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setEditingBinId(null)}
                              className="h-7 w-7 text-muted-foreground"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            onClick={() => {
                              setEditingBinId(item.id);
                              setTempBinValue(item.binLocation || '');
                            }}
                            className="group flex items-center gap-1.5 cursor-pointer py-1 px-2 rounded-md hover:bg-muted/70 transition-colors w-fit"
                            title={t('inventory.click_to_edit_bin', 'Click to edit shelf location')}
                          >
                            <span className={`font-mono text-xs ${item.binLocation ? 'text-foreground font-medium' : 'text-muted-foreground italic'}`}>
                              {item.binLocation || t('inventory.unassigned_bin', 'Unassigned')}
                            </span>
                            <Edit2 className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        )}
                      </td>

                      {/* Physical Storage Stock */}
                      <td className="p-3.5 text-center">
                        <span className="font-bold text-foreground text-sm">
                          {item.quantityOnHand}
                        </span>
                      </td>

                      {/* Webshop Quota */}
                      <td className="p-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span className={`font-bold text-sm ${isOutOfStock ? 'text-destructive' : isLowStock ? 'text-amber-600' : 'text-emerald-600'}`}>
                            {item.webshopAllocated}
                          </span>
                          {isLowStock && (
                            <span className="text-[10px] text-amber-600 font-medium">
                              {t('inventory.low_badge', 'Low')}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Storage Reserve */}
                      <td className="p-3.5 text-center">
                        <span className="font-semibold text-muted-foreground text-sm">
                          {storageReserve}
                        </span>
                      </td>

                      {/* Webshop Status */}
                      <td className="p-3.5 text-center">
                        {!item.isPublishedWebshop ? (
                          <Badge variant="outline" className="text-[11px] gap-1 bg-muted text-muted-foreground border-border font-medium">
                            <EyeOff className="h-3 w-3" />
                            {t('inventory.status_offline', 'Offline')}
                          </Badge>
                        ) : isOutOfStock ? (
                          <Badge variant="outline" className="text-[11px] gap-1 bg-destructive/10 text-destructive border-destructive/20 font-medium">
                            <AlertTriangle className="h-3 w-3" />
                            {t('inventory.status_out_of_stock', 'Out of Stock (0)')}
                          </Badge>
                        ) : isLowStock ? (
                          <Badge variant="outline" className="text-[11px] gap-1 bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                            {t('inventory.status_low_stock', 'Low Stock')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[11px] gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20 font-medium">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {t('inventory.status_live', 'Online Live')}
                          </Badge>
                        )}
                      </td>

                      {/* Quick Actions */}
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Adjust Storage Stock */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setAdjustItem(item)}
                            title={t('inventory.action_adjust_storage', 'Adjust Warehouse Storage Stock')}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <Sliders className="h-4 w-4" />
                          </Button>

                          {/* Allocate Webshop Stock */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setAllocateItem(item)}
                            title={t('inventory.action_allocate_webshop', 'Allocate Webshop Stock Quota')}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <ArrowRightLeft className="h-4 w-4" />
                          </Button>

                          {/* View QR Code */}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => setQrItem(item)}
                            title={t('inventory.action_view_qr', 'View / Print QR Code')}
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer & Pagination */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t bg-muted/20 text-xs text-muted-foreground">
          <div>
            {t('inventory.showing_records', 'Showing {{count}} of {{total}} inventory items', {
              count: items.length,
              total: totalItems,
            })}
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 px-2 text-xs"
            >
              <ChevronLeft className="h-3.5 w-3.5 mr-1" />
              {t('common.previous', 'Previous')}
            </Button>
            <span className="px-3 font-semibold text-foreground">
              {page} / {Math.max(1, totalPages)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => p + 1)}
              className="h-8 px-2 text-xs"
            >
              {t('common.next', 'Next')}
              <ChevronRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <StockAdjustmentModal
        item={adjustItem}
        isOpen={Boolean(adjustItem)}
        onClose={() => setAdjustItem(null)}
        onSuccess={fetchInventory}
      />

      <AllocateWebshopModal
        item={allocateItem}
        isOpen={Boolean(allocateItem)}
        onClose={() => setAllocateItem(null)}
        onSuccess={fetchInventory}
      />

      <QrCodePreviewModal
        item={qrItem}
        isOpen={Boolean(qrItem)}
        onClose={() => setQrItem(null)}
      />

      <LabelPrintModal
        isOpen={isLabelModalOpen}
        onClose={() => setIsLabelModalOpen(false)}
        selectedItems={selectedItemsList}
        allItems={items}
      />

      <WarehouseScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onSuccess={fetchInventory}
      />
    </div>
  );
}
