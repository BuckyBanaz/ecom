import { ENDPOINTS } from "../utils/endpoints";

export interface InventoryItem {
  id: string;
  warehouseId: string;
  variantId: string;
  quantityOnHand: number;
  quantityDamaged: number;
  quantityReserved: number;
  webshopAllocated: number;
  binLocation: string | null;
  reorderPoint: number;
  reorderQuantity: number;
  customBarcode: string | null;
  qrCodePayload: string | null;
  isPublishedWebshop: boolean;
  createdAt: string;
  updatedAt: string;
  variant: {
    id: string;
    sku: string;
    stock: number;
    price: number | null;
    product: {
      id: string;
      name: string;
      slug: string;
      image: string;
      price: number;
      inStock: boolean;
      category?: { id: string; name: string };
    };
  };
  warehouse: {
    id: string;
    name: string;
    code: string;
  };
}

export interface InventorySummary {
  totalOnHand: number;
  totalWebshop: number;
  totalReserved: number;
  totalReserveBuffer: number;
  totalDamaged: number;
  totalSkus: number;
  totalProducts?: number;
  lowStockCount: number;
}

export interface InventoryListResponse {
  success: boolean;
  data: {
    items: InventoryItem[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    summary: InventorySummary;
  };
}

export interface StockMovement {
  id: string;
  inventoryItemId: string;
  type: string;
  quantityChange: number;
  previousOnHand: number;
  newOnHand: number;
  previousWebshop: number | null;
  newWebshop: number | null;
  reason: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  inventoryItem: InventoryItem;
  performedByUser?: { id: string; name: string; email: string };
}

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem("admin_token") || localStorage.getItem("customer_token") || "";
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export const inventoryRepository = {
  async getList(params: {
    page?: number;
    limit?: number;
    search?: string;
    view?: 'all' | 'storage' | 'webshop';
    lowStock?: boolean;
    warehouseId?: string;
  }): Promise<InventoryListResponse> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.view) query.set('view', params.view);
    if (params.lowStock) query.set('lowStock', 'true');
    if (params.warehouseId) query.set('warehouseId', params.warehouseId);

    const res = await fetch(`${ENDPOINTS.INVENTORY_ADMIN_LIST}?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch inventory list');
    }
    return res.json();
  },

  async getBySku(sku: string): Promise<{ success: boolean; data: InventoryItem }> {
    const res = await fetch(`${ENDPOINTS.INVENTORY}/admin/by-sku/${encodeURIComponent(sku)}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Product/SKU not found in inventory');
    }
    return res.json();
  },

  async adjustStorage(data: {
    inventoryItemId: string;
    quantityChange?: number;
    setExactCount?: number;
    reason?: string;
    binLocation?: string;
  }): Promise<{ success: boolean; data: InventoryItem; message: string }> {
    const res = await fetch(ENDPOINTS.INVENTORY_ADJUST_STORAGE, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to adjust storage count');
    }
    return res.json();
  },

  async allocateWebshop(data: {
    inventoryItemId: string;
    webshopAllocated?: number;
    isPublishedWebshop?: boolean;
    reason?: string;
  }): Promise<{ success: boolean; data: InventoryItem; message: string }> {
    const res = await fetch(ENDPOINTS.INVENTORY_ALLOCATE_WEBSHOP, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to allocate webshop quota');
    }
    return res.json();
  },

  async updateLocation(id: string, binLocation: string): Promise<{ success: boolean; data: InventoryItem }> {
    const res = await fetch(`${ENDPOINTS.INVENTORY}/admin/items/${id}/location`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify({ binLocation }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to update location');
    }
    return res.json();
  },

  async getQrCode(id: string): Promise<{
    success: boolean;
    data: { qrDataUrl: string; payload: string; sku: string; productName: string; binLocation: string | null };
  }> {
    const res = await fetch(`${ENDPOINTS.INVENTORY}/admin/qr-code/${id}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate QR code');
    }
    return res.json();
  },

  async downloadLabelsPdf(data: {
    layout: 'THERMAL_50x30' | 'A4_GRID_24' | 'A4_GRID_30';
    items: Array<{ inventoryItemId: string; copies: number }>;
    includePrice?: boolean;
    includeBin?: boolean;
  }): Promise<Blob> {
    const token = localStorage.getItem("admin_token") || localStorage.getItem("customer_token") || "";
    const res = await fetch(ENDPOINTS.INVENTORY_LABELS_PDF, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to generate PDF labels');
    }
    return res.blob();
  },

  async getMovements(params: { inventoryItemId?: string; page?: number; limit?: number }): Promise<{
    success: boolean;
    data: { movements: StockMovement[]; pagination: { page: number; limit: number; total: number; totalPages: number } };
  }> {
    const query = new URLSearchParams();
    if (params.inventoryItemId) query.set('inventoryItemId', params.inventoryItemId);
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));

    const res = await fetch(`${ENDPOINTS.INVENTORY_MOVEMENTS}?${query.toString()}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch stock movements');
    }
    return res.json();
  },
};
