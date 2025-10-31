# Inventory Management System Migration Guide

## Project Overview

This document outlines the migration strategy for converting the NANIS Essentials inventory management system from a local-first SPA (localStorage-based) to a networked application accessible from multiple devices.

**Current Architecture:** React + TypeScript + localStorage
**Target Users:** 2 users, occasional access, not concurrent
**Goal:** Multi-device access without high cloud hosting costs

## Current System Analysis

### Architecture Strengths

- **Clean TypeScript implementation** with full type safety
- **Service layer separation** (`revenueService.ts`) for business logic
- **Atomic design pattern** for component organization
- **Comprehensive domain model** with complex business relationships
- **Image processing capabilities** with client-side compression
- **Well-structured data models** in `types/models.ts`

### Data Models

- **InventoryItem**: Products with cost tracking, pricing, stock management
- **Purchase**: Complex purchase records with shipping allocation, tax calculations
- **Sale**: Sales transactions with payment methods, buyer info, channel tracking
- **Transaction**: Business expenses with payment source tracking
- **RevenueWithdrawal**: Revenue re-investment tracking linked to purchases

### Current Limitations

- **Storage constraints**: localStorage ~5-10MB limit
- **Single user**: No multi-user support
- **No backup strategy**: Risk of data loss
- **Performance**: Full DB serialization on every save

## Recommended Migration Strategy

### Technology Stack

#### Backend: Node.js + Express + SQLite

```javascript
// Minimal Express server with SQLite
const express = require('express');
const Database = require('better-sqlite3');
const app = express();
const db = new Database('inventory.db');
```

**Why SQLite:**

- Zero administration overhead
- ACID compliance for financial data
- Perfect for 2-user scenarios
- File-based backups
- No server processes to manage

#### Database Schema

```sql
-- Store existing models as JSON blobs initially
CREATE TABLE inventory_items (
  id TEXT PRIMARY KEY,
  data TEXT  -- JSON of existing InventoryItem
);

CREATE TABLE sales (
  id TEXT PRIMARY KEY,
  data TEXT  -- JSON of existing Sale
);

-- Image storage in database
CREATE TABLE images (
  id TEXT PRIMARY KEY,
  data BLOB,        -- Compressed image data
  mime_type TEXT,
  filename TEXT,
  created_at DATETIME
);
```

### Implementation Phases

#### Phase 1: Backend API (1 weekend)

1. Create Express server with SQLite
2. Implement endpoints matching current data structure:
   - `GET /api/database` - Return complete DB
   - `POST /api/database` - Save complete DB
3. Test with existing data export

#### Phase 2: Frontend Updates (1 day)

1. Replace `storage.ts` with API client
2. Update `useAppData` hook for async operations
3. Add loading states and error handling
4. Maintain same component interfaces

```typescript
// New API storage class
export class APIStorage {
  private baseUrl = 'http://192.168.1.100:3001/api';

  async load(): Promise<DB> {
    const response = await fetch(`${this.baseUrl}/database`);
    return response.json();
  }

  async save(db: DB): Promise<void> {
    await fetch(`${this.baseUrl}/database`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(db),
    });
  }
}
```

#### Phase 3: Deployment & Access

1. Set up local PC hosting
2. Configure network access solution
3. Implement backup strategy

## Hosting Options

### Local PC Hosting

**Hardware Requirements:**

- Any PC with 4GB+ RAM
- Windows/Mac/Linux compatible
- Stable internet connection

**Setup:**

```bash
npm install
npm run build
npm start
# Server accessible at http://192.168.1.100:3001
```

### Alternative Hardware:

- **Raspberry Pi ($35)**: 24/7 low-power operation
- **Old laptop/desktop**: Repurpose existing hardware
- **Mini PC**: Dedicated device for hosting

## Network Access Solutions

### Option 1: Tailscale (Recommended)

**Benefits:**

- Military-grade encryption (WireGuard)
- Zero configuration networking
- Free for personal use (up to 20 devices)
- Works behind NAT/firewall
- Cross-platform support

**Setup:**

```bash
# On hosting PC
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Install Tailscale app on phone/other devices
# Access via: http://100.x.x.x:3001
```

### Option 2: Cloudflare Tunnel

**Benefits:**

- Professional HTTPS URL
- No port forwarding required
- Free tier available
- Built-in DDoS protection

**Setup:**

```bash
npm install -g cloudflared
cloudflare tunnel login
cloudflare tunnel create inventory-app
cloudflare tunnel run --url http://localhost:3001 inventory-app
# Access via: https://your-app.your-domain.workers.dev
```

### Option 3: Traditional Port Forwarding

**Setup:**

1. Forward port 3001 on router to hosting PC
2. Use dynamic DNS service (DuckDNS, No-IP)
3. Access via public IP or domain

**Security Considerations:**

- Exposes service to entire internet
- Requires additional security measures
- Dynamic IP management needed

## File Storage Strategy

### Current Approach: Keep It Simple

Your existing image compression and base64 storage works perfectly for this scale:

```typescript
// Store images directly in SQLite as BLOBs
// No external file storage needed
// Automatic backup with database backups
// Efficient for compressed images under 1MB
```

**Why no external file storage needed:**

- You already compress images efficiently
- SQLite handles BLOBs up to 1GB per row
- Simpler backup and deployment
- No additional service dependencies

## Cost Analysis

### Self-Hosted Solution

- **Hardware**: $0 (existing PC) or $35 (Raspberry Pi)
- **Software**: $0 (open source stack)
- **Network**: $0 (existing internet) + $12/year (optional domain)
- **Total**: $0-47 one-time cost

### Cloud Alternative (for comparison)

- **Database**: $25-50/month
- **Backend hosting**: $20-40/month
- **File storage**: $10-30/month
- **Authentication**: $0-25/month
- **Total**: $55-165/month ($660-1,980/year)

**ROI**: Self-hosting pays for itself immediately

## Backup Strategy

### Database Backups

```bash
#!/bin/bash
# Daily backup script
DATE=$(date +%Y%m%d)
cp inventory.db backups/inventory-$DATE.db

# Optional: Upload to cloud storage
# rclone copy backups/ dropbox:inventory-backups/
```

### Migration Safety

1. Export current localStorage data before starting
2. Run parallel systems during transition
3. Gradual cutover rather than big bang approach
4. Keep localStorage version as fallback

## Security Considerations

### Authentication (Optional)

For basic security, consider simple HTTP Basic Auth:

```javascript
// Simple auth middleware
app.use((req, res, next) => {
  const auth = req.headers.authorization;
  if (auth === 'Basic ' + Buffer.from('user:password').toString('base64')) {
    next();
  } else {
    res.status(401).send('Authentication required');
  }
});
```

### Network Security

- Use Tailscale for zero-trust networking
- Keep hosting PC updated
- Consider firewall rules for port forwarding approach
- Regular backup testing

## Migration Checklist

### Pre-Migration

- [ ] Export current data from localStorage
- [ ] Set up development environment
- [ ] Choose hosting hardware
- [ ] Select network access method

### Development

- [ ] Create SQLite database and schema
- [ ] Build Express API server
- [ ] Update frontend storage layer
- [ ] Test with existing data
- [ ] Implement basic error handling

### Deployment

- [ ] Set up hosting PC/device
- [ ] Configure network access (Tailscale/Cloudflare)
- [ ] Import production data
- [ ] Test multi-device access
- [ ] Set up backup automation

### Post-Migration

- [ ] Monitor system performance
- [ ] Document access procedures for users
- [ ] Create recovery procedures
- [ ] Plan future enhancements

## Future Enhancement Opportunities

### Phase 4+ Potential Features

- Real-time updates via WebSockets
- Audit trail and change history
- Advanced search and filtering
- Data export/import improvements
- Mobile-optimized interface
- Offline capability with sync

## Technical Notes

### Why This Approach Works

1. **Scale-appropriate**: Perfect for 2-user scenario
2. **Cost-effective**: Minimal ongoing expenses
3. **Maintainable**: Simple stack, minimal dependencies
4. **Flexible**: Easy to enhance or migrate later
5. **Secure**: Private network access options

### Migration Benefits

- Keep existing UI unchanged
- Gradual migration possible
- Easy rollback to localStorage
- Complete data ownership
- No vendor lock-in

## Conclusion

The recommended SQLite + Express + Tailscale approach provides:

- **Professional functionality** without enterprise complexity
- **Multi-device access** without cloud hosting costs
- **Data ownership** and privacy
- **Future flexibility** for scaling or cloud migration

This solution leverages your existing well-architected codebase while providing the network access you need at minimal cost and complexity.

---

_Document created: $(date)
Project: NANIS Essentials Inventory Management
Migration Target: Self-hosted networked application_
