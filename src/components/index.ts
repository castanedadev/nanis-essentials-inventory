// Atomic Design System Exports

// Atoms - Basic UI elements
export * from './atoms';

// Molecules - Simple component combinations
export * from './molecules';

// Organisms - Complex UI components
export * from './organisms';

// Templates - Page layouts without data
export * from './templates';

// Page Components
export { InventoryPage, InventoryForm } from './pages/inventory';
export { PurchasesPage, PurchaseForm, QuickAddItemForm } from './pages/purchases';
export { SalesPage, SaleForm, SearchSection, CustomerGroup } from './pages/sales';
export type { CustomerGroupType } from './pages/sales';
export { AnalyticsPage } from './pages/analytics';
export { ImportExportPage } from './pages/import-export';

// Legacy components (to be gradually migrated)
export { ItemCardImage } from './ItemImageDisplay';
export { RevenueManager, RevenueSummaryCard } from './RevenueManager';
export { RevenueWithdrawals } from './RevenueWithdrawals';

// Layout Components (deprecated - use organisms/NavigationBar)
export { TopBar } from './layout/TopBar';
export type { Tab } from './layout/TopBar';
