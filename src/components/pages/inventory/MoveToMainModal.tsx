import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { Modal } from '../../molecules/Modal';
import { Button } from '../../atoms/Button';
import { QuantityInputModal } from './QuantityInputModal';
import { DB, InventoryItem } from '../../../types/models';
import { fmtUSD } from '../../../lib/utils';

interface PendingMove {
  itemId: string;
  quantity: number;
  item: InventoryItem;
}

interface MoveToMainModalProps {
  db: DB;
  sourceBranchId: string;
  // eslint-disable-next-line no-unused-vars
  onSave: (moves: PendingMove[]) => void;
  onClose: () => void;
}

function CompactItemCard({
  item,
  pendingMove,
  onDragStart,
}: {
  item: InventoryItem;
  pendingMove?: PendingMove;
  onDragStart: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: item.id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const availableStock = pendingMove ? item.stock - pendingMove.quantity : item.stock;
  const unitCost = item.costPostShipping ?? item.costPreShipping ?? 0;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        opacity: isDragging ? 0.5 : availableStock === 0 ? 0.5 : 1,
        cursor: availableStock > 0 ? 'grab' : 'not-allowed',
      }}
      {...listeners}
      {...attributes}
      onClick={availableStock > 0 ? onDragStart : undefined}
    >
      <div
        className="card"
        style={{
          padding: '0.75rem',
          marginBottom: '0.5rem',
          minHeight: 'auto',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>{item.name}</h4>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
              <div>Stock: {availableStock}</div>
              <div>Cost: {fmtUSD(unitCost)}</div>
              {item.category && <div>Category: {item.category}</div>}
            </div>
          </div>
          {pendingMove && (
            <div
              style={{
                background: '#4CAF50',
                color: 'white',
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.75rem',
                fontWeight: '600',
                marginLeft: '0.5rem',
              }}
            >
              {pendingMove.quantity}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DropZone({
  pendingMoves,
  onRemoveMove,
  branchItems,
}: {
  pendingMoves: PendingMove[];
  onRemoveMove: (_itemId: string) => void;
  branchItems: InventoryItem[];
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'drop-zone',
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        minHeight: '400px',
        maxHeight: '600px',
        overflowY: 'auto',
        border: isOver ? '3px dashed #4CAF50' : '2px solid #e5e7eb',
        borderRadius: '8px',
        padding: '1rem',
        background: isOver ? '#f0f8f0' : '#f9f9f9',
      }}
    >
      {pendingMoves.length === 0 ? (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            minHeight: '200px',
            color: '#999',
            textAlign: 'center',
          }}
        >
          <p>Drag items here or click to add</p>
        </div>
      ) : (
        <div>
          {pendingMoves.map(move => {
            const item = branchItems.find(i => i.id === move.itemId);
            if (!item) return null;

            const originalCost = (item.costPostShipping ?? item.costPreShipping ?? 0) - 1;

            return (
              <div
                key={move.itemId}
                className="card"
                style={{
                  padding: '0.75rem',
                  marginBottom: '0.5rem',
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>{item.name}</h4>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      <div>Qty: {move.quantity}</div>
                      <div>Original Unit Cost: {fmtUSD(originalCost)}</div>
                    </div>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => onRemoveMove(move.itemId)}
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                  >
                    ✕
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MoveToMainModal({ db, sourceBranchId, onSave, onClose }: MoveToMainModalProps) {
  const [pendingMoves, setPendingMoves] = useState<PendingMove[]>([]);
  const [draggedItem, setDraggedItem] = useState<InventoryItem | null>(null);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [quantityModalItem, setQuantityModalItem] = useState<InventoryItem | null>(null);

  const sensors = useSensors(useSensor(PointerSensor));

  const branchItems = db.items.filter(item => item.branchId === sourceBranchId && item.stock > 0);
  const branchName = db.branches?.find(b => b.id === sourceBranchId)?.name || 'Branch';

  const handleDragStart = (event: DragStartEvent) => {
    const itemId = event.active.id as string;
    const item = branchItems.find(i => i.id === itemId);
    if (item) {
      setDraggedItem(item);
    }
  };

  const handleItemClick = (item: InventoryItem) => {
    const existingMove = pendingMoves.find(m => m.itemId === item.id);
    const availableStock = existingMove ? item.stock - existingMove.quantity : item.stock;

    if (availableStock <= 0) {
      alert('No available stock for this item');
      return;
    }

    // Show quantity input modal
    setQuantityModalItem(item);
    setShowQuantityModal(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggedItem(null);
    const { active, over } = event;

    if (!over || over.id !== 'drop-zone') {
      return;
    }

    const itemId = active.id as string;
    const item = branchItems.find(i => i.id === itemId);

    if (!item || item.stock === 0) {
      return;
    }

    handleItemClick(item);
  };

  const handleQuantityConfirm = (quantity: number) => {
    if (!quantityModalItem) return;

    const existingMoveIndex = pendingMoves.findIndex(m => m.itemId === quantityModalItem.id);
    const item = branchItems.find(i => i.id === quantityModalItem.id);

    if (!item) return;

    const currentPendingQty = existingMoveIndex >= 0 ? pendingMoves[existingMoveIndex].quantity : 0;
    const newTotalQty = currentPendingQty + quantity;

    if (newTotalQty > item.stock) {
      alert(`Cannot move more than available stock (${item.stock} units)`);
      return;
    }

    const newMove: PendingMove = {
      itemId: quantityModalItem.id,
      quantity: newTotalQty,
      item: quantityModalItem,
    };

    if (existingMoveIndex >= 0) {
      const updated = [...pendingMoves];
      updated[existingMoveIndex] = newMove;
      setPendingMoves(updated);
    } else {
      setPendingMoves([...pendingMoves, newMove]);
    }

    setShowQuantityModal(false);
    setQuantityModalItem(null);
  };

  const handleRemovePendingMove = (itemId: string) => {
    setPendingMoves(pendingMoves.filter(m => m.itemId !== itemId));
  };

  const handleReset = () => {
    if (pendingMoves.length === 0) return;
    if (
      // eslint-disable-next-line quotes
      window.confirm("Reset all pending moves? This will clear all items you've selected to move.")
    ) {
      setPendingMoves([]);
    }
  };

  const handleSave = () => {
    if (pendingMoves.length === 0) {
      alert('No items selected to move');
      return;
    }

    onSave(pendingMoves);
  };

  const totalPendingUnits = pendingMoves.reduce((sum, m) => sum + m.quantity, 0);

  return (
    <>
      <Modal title={`Move Items from ${branchName} to Main Inventory`} onClose={onClose}>
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1.5rem',
              marginTop: '1rem',
            }}
          >
            {/* Left Column - Available Items */}
            <div>
              <div className="section-title" style={{ marginBottom: '0.75rem' }}>
                Branch Inventory ({branchItems.length} items)
              </div>
              <div
                style={{
                  maxHeight: '500px',
                  overflowY: 'auto',
                  paddingRight: '0.5rem',
                }}
              >
                {branchItems.length === 0 ? (
                  <div className="empty">
                    <p>No items available in branch inventory to move.</p>
                  </div>
                ) : (
                  branchItems.map(item => {
                    const pendingMove = pendingMoves.find(m => m.itemId === item.id);
                    return (
                      <CompactItemCard
                        key={item.id}
                        item={item}
                        pendingMove={pendingMove}
                        onDragStart={() => handleItemClick(item)}
                      />
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column - Pending Moves */}
            <div>
              <div className="section-title" style={{ marginBottom: '0.75rem' }}>
                Moving to Main ({totalPendingUnits} units)
              </div>
              <DropZone
                pendingMoves={pendingMoves}
                onRemoveMove={handleRemovePendingMove}
                branchItems={branchItems}
              />
            </div>
          </div>

          <DragOverlay>
            {draggedItem ? (
              <div
                className="card"
                style={{
                  opacity: 0.8,
                  transform: 'rotate(5deg)',
                  padding: '0.75rem',
                  maxWidth: '200px',
                }}
              >
                <h4 style={{ margin: '0 0 0.25rem 0', fontSize: '0.9rem' }}>{draggedItem.name}</h4>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                  Stock: {draggedItem.stock}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>

        <div className="row gap end" style={{ marginTop: '2rem' }}>
          {pendingMoves.length > 0 && (
            <Button variant="secondary" onClick={handleReset}>
              Reset
            </Button>
          )}
          <Button variant="primary" onClick={handleSave} disabled={pendingMoves.length === 0}>
            Save ({totalPendingUnits} units)
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </Modal>

      {showQuantityModal && quantityModalItem && (
        <QuantityInputModal
          item={quantityModalItem}
          maxQuantity={(() => {
            const existingMove = pendingMoves.find(m => m.itemId === quantityModalItem.id);
            const item = branchItems.find(i => i.id === quantityModalItem.id);
            return existingMove && item
              ? item.stock - existingMove.quantity
              : quantityModalItem.stock;
          })()}
          onConfirm={handleQuantityConfirm}
          onCancel={() => {
            setShowQuantityModal(false);
            setQuantityModalItem(null);
          }}
        />
      )}
    </>
  );
}
