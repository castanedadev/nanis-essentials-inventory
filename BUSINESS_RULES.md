# Business Rules

## Pricing

- Min Price = costPostShipping + 20%
- Max Price = costPostShipping + 30%
- Rounding: values with decimal < .50 → floor; ≥ .50 → ceil
- Auto-update prices when costPostShipping changes; user can override

## Inventory Updates

- Purchase: increase stock, update costPreShipping/costPostShipping, recalc min/max price and revenues
- Sale: decrease stock (never below 0)

## Shipping & Tax (Purchases)

- Allocate per unit: tax, US shipping, Intl shipping
- Intl shipping default = weight × weightCost (configurable in settings)

## Sales Grouping & Search

- Group sales by buyer name; use "Anonymous" when buyerName is empty
- Searchable by: buyer name, sale id, payment method, amount, date
- Expand/Collapse per buyer and global expand/collapse controls

## Buyer Name

- Free text input with autocomplete suggestions from previous buyers

## Images

- Client-side compression; thumbnail generation
- Choose primary image; fallback to category-based placeholder when no image is available

## Backups

- Export/Import JSON
- Legacy imports auto-converted to the current schema
