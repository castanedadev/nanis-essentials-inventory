export type Category =
  | 'Hair Care'
  | 'Body Care'
  | 'Makeup'
  | 'Fragrance'
  | 'Skin Care'
  | 'Other';

export type PaymentMethod = 'cash' | 'transfer' | 'installments';

export interface ItemImage {
  id: string;
  name: string;                  // Original filename
  dataUrl: string;               // Base64 encoded image data
  size: number;                  // File size in bytes  
  type: string;                  // MIME type (image/jpeg, image/png)
  uploadedAt: string;            // ISO timestamp
  isPrimary?: boolean;           // Primary image flag
}

export interface InventoryItem {
  id: string;
  name: string;
  description?: string;
  notes?: string;
  category: Category;
  stock: number;
  // Image support
  images: ItemImage[];           // Array of product images
  primaryImageId?: string;       // Main display image
  // Costs are per unit
  costPreShipping?: number;   // base unit cost, before any tax/shipping allocations
  costPostShipping?: number;  // cost after all allocations
  // Pricing
  minPrice?: number;
  maxPrice?: number;
  competitorAPrice?: number;
  competitorBPrice?: number;
  minRevenue?: number;
  maxRevenue?: number;
  createdAt: string; // ISO
  updatedAt?: string; // ISO
}

export interface PurchaseLine {
  id: string;
  itemId: string;
  quantity: number;           // number of parent units
  unitCost: number;           // base cost per parent unit (pre-shipping/tax)
  hasSubItems: boolean;
  subItemsQty?: number;       // only if hasSubItems === true
  // Derived per-unit allocations (post-save)
  perUnitTax?: number;
  perUnitShippingUS?: number;
  perUnitShippingIntl?: number;
  unitCostPostShipping?: number; // unitCost + allocations
}

export interface Purchase {
  id: string;
  createdAt: string; // ISO
  orderedDate?: string; // ISO - when the order was placed
  paymentDate?: string; // ISO - when this purchase is/will be paid
  lines: PurchaseLine[];
  // Footer fields
  subtotal: number; // editable, default sum(qty*unitCost)
  tax: number;
  shippingUS: number;
  shippingIntl: number; // default weight * weightCost
  weightLbs: number;
  // Derived
  totalUnits: number; // includes sub-items
  totalCost: number;  // subtotal + tax + shippingUS + shippingIntl
}

export interface SaleLine {
  id: string;
  itemId: string;
  quantity: number;
  unitPrice: number; // price per sold unit
}

export interface InstallmentPlan {
  numberOfPayments: number;
  amountPerPayment: number;
}

export interface Sale {
  id: string;
  createdAt: string; // ISO
  buyerName?: string; // Name of the buyer
  paymentMethod: PaymentMethod;
  installments?: InstallmentPlan;
  lines: SaleLine[];
  totalAmount: number;
}

export interface Settings {
  weightCostPerLb: number; // default 7.00, editable in code or via settings
  encryptionEnabled?: boolean; // placeholder for future
}

export interface DB {
  items: InventoryItem[];
  purchases: Purchase[];
  sales: Sale[];
  settings: Settings;
}

export const DEFAULT_SETTINGS: Settings = {
  weightCostPerLb: 7.0,
};