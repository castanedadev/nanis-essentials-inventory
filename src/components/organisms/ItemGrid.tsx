import React from 'react';
import { ItemCard } from '../molecules/ItemCard';
import { Text } from '../atoms/Typography';
import { InventoryItem, DB } from '../../types/models';

interface ItemGridProps {
  items: InventoryItem[];
  onEdit: (_item: InventoryItem) => void;
  onDelete: (_id: string) => void;
  emptyMessage?: string;
  noResultsMessage?: string;
  showEmptyState?: boolean;
  showNoResults?: boolean;
  testId?: string;
  columns?: 'two' | 'three';
  db?: DB; // Optional DB for branch name lookup
}

export function ItemGrid({
  items,
  onEdit,
  onDelete,
  emptyMessage = 'No items yet.',
  noResultsMessage = 'No items match your search.',
  showEmptyState = false,
  showNoResults = false,
  testId = 'inventory-cards',
  columns = 'three',
  db,
}: ItemGridProps) {
  const gridClass = columns === 'two' ? 'cards two-cols' : 'cards three-cols';

  return (
    <div className={gridClass} data-testid={testId}>
      {items.map(item => (
        <ItemCard key={item.id} item={item} onEdit={onEdit} onDelete={onDelete} db={db} />
      ))}

      {showEmptyState && (
        <div className="empty">
          <Text variant="muted">{emptyMessage}</Text>
        </div>
      )}

      {showNoResults && (
        <div className="empty">
          <Text variant="muted">{noResultsMessage}</Text>
        </div>
      )}
    </div>
  );
}
