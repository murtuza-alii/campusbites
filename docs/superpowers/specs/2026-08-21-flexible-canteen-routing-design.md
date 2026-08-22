# Flexible Canteen & Multi-Campus Direct Link Routing Architecture

**Date:** 2026-08-21  
**Status:** Approved  
**Target System:** CampusBites Backend & Frontend  

---

## 1. Overview

CampusBites originally defaulted to a single hardcoded campus model with four fixed canteens ("Canteen A", "Canteen B", "Canteen C", "Canteen D"). 

This design upgrades the architecture to support:
1. **Flexible Outlet Models**: Colleges or independent venues can configure either a single standalone diner/restaurant or a multi-canteen campus cluster.
2. **Short, Clean Direct Links**: Students access a specific eatery via simple URLs like `/c/:slug` (e.g. `/c/main-diner`, `/c/canteen-a`).
3. **Clutter-Free UI**: When visiting a standalone diner or single-canteen outlet, the top canteen selector is **completely hidden**, displaying only the diner's brand header and menu.
4. **Multi-Canteen Switching**: When visiting an outlet that belongs to a campus cluster with sister canteens, a sleek animated pill switcher lets students pivot between canteens without re-entering URLs.
5. **Staff Direct Link & QR Management**: Staff and administrators can copy the clean direct link directly from the staff portal.

---

## 2. System Architecture & Routing

### 2.1 URL & Frontend Routing Schema
- `/c/:slug` — Direct link route loading student view for the canteen matching `:slug`.
- `/?canteen=:slug` — Legacy query parameter fallback that auto-redirects to `/c/:slug`.
- `/` — Default landing route that automatically resolves to the first available active canteen or saved preference.
- `/staff` & `/staff/menu` — Staff dashboard updated to select and filter by `slug` or `id`.

### 2.2 Data Flow & Component Interaction
```
[User Request: /c/main-diner]
           │
           ▼
   [App.tsx Router]
           │
           ▼
  [StudentView.tsx] ──GET /api/canteens/by-slug/main-diner──► [Backend / Supabase]
           │                                                       │
           │◄──────────────── Canteen Data & Group Outlets ────────┘
           │
   ┌───────┴────────────────────────┐
   │ Check sister outlets count     │
   └───────┬────────────────────────┘
           ├── Count <= 1 (Standalone) ──► Hide Canteen Selector UI
           └── Count > 1 (Cluster)    ──► Show Sister Outlet Pill Switcher
```

---

## 3. Database Schema Extensions (PostgreSQL / Supabase)

### 3.1 `canteen` Table Extensions
The `canteen` table is extended with `slug` and `group_name`:

```sql
ALTER TABLE canteen 
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS group_name TEXT;
```

### 3.2 Seed & Default Data Structure
| id | name | slug | group_name | description |
|---|---|---|---|---|
| `c1` | Canteen A | `canteen-a` | `Main Campus` | Independent student dining hall serving full meals. |
| `c2` | Canteen B | `canteen-b` | `Main Campus` | Self-contained student canteen with custom kitchen. |
| `c3` | Canteen C | `canteen-c` | `Main Campus` | Separate dining lounge offering beverages & desserts. |
| `c4` | Canteen D | `canteen-d` | `Main Campus` | Independent dining pavilion serving a variety of dishes. |
| `c5` | Downtown Diner | `downtown-diner` | `NULL` | Standalone gourmet diner (Selector hidden). |

---

## 4. API Specification

### 4.1 `GET /api/canteens`
Returns list of all active canteens with `id`, `name`, `slug`, `group_name`, `description`, and `image`.

### 4.2 `GET /api/canteens/by-slug/:slug`
Returns specific canteen details along with `sister_canteens` array (other canteens belonging to the same `group_name`).

### 4.3 `GET /api/menu?canteenId=:id` or `GET /api/menu?slug=:slug`
Fetches menu items filtered by canteen ID or slug.

---

## 5. UI/UX Design System (High-End Visual Design)

1. **Header & Brand Pill**:
   - Detached floating glass header (`backdrop-blur-md bg-white/70`).
   - Clean double-bezel card structure for diner header.
2. **Conditional Selector Visibility**:
   - If `sister_canteens.length <= 1`: Render a static, clean Diner Name badge (`"Downtown Diner"`). Hide dropdown selector completely.
   - If `sister_canteens.length > 1`: Render high-end animated pill tabs to switch between canteens in the cluster.
3. **Staff Share Action**:
   - A **"Copy Direct Link"** button in `StaffOrders.tsx` / `StaffMenu.tsx` that copies `https://<host>/c/<slug>` to clipboard with toast notification.

---

## 6. Verification Plan

### Automated Tests / API Verification
- Verify GET `/api/canteens/by-slug/main-diner` returns 200 with canteen details.
- Verify menu items return accurately for both standalone and cluster canteens.

### Manual Verification
- Open `/c/canteen-a` -> Check that Canteen A loads with sister canteens (B, C, D) tab switcher.
- Open `/c/downtown-diner` -> Check that Downtown Diner loads and canteen selector is **completely hidden**.
- Test Staff Dashboard link copy button.
