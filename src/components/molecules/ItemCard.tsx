import React from 'react';
import { Button } from '../atoms/Button';
import { Text, Badge } from '../atoms/Typography';
import { ItemCardImage } from '../ItemImageDisplay';
import { InventoryItem } from '../../types/models';
import { fmtUSD } from '../../lib/utils';

interface ItemCardProps {
  item: InventoryItem;
  onEdit: (_item: InventoryItem) => void;
  onDelete: (_id: string) => void;
  testId?: string;
}

export function ItemCard({ item, onEdit, onDelete, testId = 'item-card' }: ItemCardProps) {
  const isOutOfStock = item.stock === 0;
  const isLastItem = item.stock === 1;

  return (
    <div
      className={`card item-card ${isOutOfStock ? 'out-of-stock-card' : ''}`}
      data-testid={testId}
      data-name={item.name}
    >
      <div className="card-row">
        <div className="card-title">{item.name}</div>
        <Text variant="muted">{new Date(item.createdAt).toLocaleDateString()}</Text>
      </div>

      <div className="card-content-with-image">
        <div className="card-image-section">
          <ItemCardImage
            images={item.images || []}
            primaryImageId={item.primaryImageId}
            category={item.category}
            itemName={item.name}
          />
        </div>

        <div className="card-details-section">
          <div className="category-inline">
            <Text variant="label">Category:</Text>
            <Text>{item.category}</Text>
          </div>

          <div className="item-meta-row price-range-row">
            <Text variant="label">Price Range:</Text>
            <Text>
              {fmtUSD(item.minPrice ?? 0)}
              {'\u00A0-\u00A0'}
              {fmtUSD(item.maxPrice ?? 0)}
            </Text>
          </div>

          <div className="grid two meta-grid">
            <div className="item-meta-row">
              <Text variant="label">Unit Cost:</Text>
              <Text>{fmtUSD(item.costPostShipping ?? item.costPreShipping ?? 0)}</Text>
            </div>
            <div className="item-meta-row">
              <Text variant="label">Stock:</Text>
              <Text>
                {item.stock}
                {isOutOfStock && <Badge variant="danger">out of stock</Badge>}
                {isLastItem && <Badge variant="warning">last item</Badge>}
              </Text>
            </div>
          </div>

          {item.description && (
            <Text variant="muted" className="item-description">
              {item.description}
            </Text>
          )}
        </div>
      </div>

      <div className="row gap">
        <Button onClick={() => onEdit(item)}>Edit</Button>
        <Button variant="danger" onClick={() => onDelete(item.id)}>
          Delete
        </Button>
      </div>
    </div>
  );
}
