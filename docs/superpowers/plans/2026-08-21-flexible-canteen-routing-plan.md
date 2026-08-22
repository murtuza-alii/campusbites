# Flexible Canteen & Multi-Campus Direct Link Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade CampusBites backend database and frontend routing to support flexible multi-campus/diner configurations, clean direct links (`/c/:slug`), dynamic hiding of canteen selectors for single diners, and staff direct link sharing.

**Architecture:** Database schema addition of `slug` and `group_name` in PostgreSQL/Supabase, REST API endpoints for slug lookups, React Router route `/c/:slug`, conditional UI rendering in `StudentView.tsx`, and direct link copy feature in staff components.

**Tech Stack:** Node.js, Express, TypeScript, PostgreSQL (`pg`), React 18, React Router v6, Tailwind CSS.

## Global Constraints
- Target route format: `/c/:slug`
- Hide canteen selector completely when outlet count in group <= 1 or when standalone
- Maintain backward compatibility with legacy `canteen_id` logic
- Strict TypeScript types and zero broken tests

---

### Task 1: Database Schema & Seeding Extensions

**Files:**
- Modify: `backend/src/db.ts`

**Interfaces:**
- Consumes: PostgreSQL connection pool
- Produces: Updated `canteen` table schema with `slug` (UNIQUE TEXT) and `group_name` (TEXT) columns, plus seeded default canteen records.

- [ ] **Step 1: Inspect and update `db.ts` table creation query**

Update `initDb()` in `backend/src/db.ts`:
```typescript
await db.query(`
  CREATE TABLE IF NOT EXISTS canteen (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    image TEXT,
    slug TEXT UNIQUE,
    group_name TEXT
  )
`);

try {
  await db.query('ALTER TABLE canteen ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE');
  await db.query('ALTER TABLE canteen ADD COLUMN IF NOT EXISTS group_name TEXT');
} catch (e) {
  console.log('Columns slug and group_name already exist or alter failed');
}
```

- [ ] **Step 2: Update seed canteens in `db.ts`**

Update seed data to include unique slugs and group names:
```typescript
const canteens = [
  { id: 'c1', name: 'Canteen A', slug: 'canteen-a', group_name: 'Main Campus', description: 'Independent student dining hall serving full meals, snacks, and drinks.', image: 'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=150&auto=format&fit=crop&q=60' },
  { id: 'c2', name: 'Canteen B', slug: 'canteen-b', group_name: 'Main Campus', description: 'Self-contained student canteen with its own custom kitchen and menu.', image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=150&auto=format&fit=crop&q=60' },
  { id: 'c3', name: 'Canteen C', slug: 'canteen-c', group_name: 'Main Campus', description: 'Separate dining lounge offering independent meals, beverages, and desserts.', image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=150&auto=format&fit=crop&q=60' },
  { id: 'c4', name: 'Canteen D', slug: 'canteen-d', group_name: 'Main Campus', description: 'Independent dining pavilion serving a full variety of dishes and quick bites.', image: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?w=150&auto=format&fit=crop&q=60' },
  { id: 'c5', name: 'Downtown Diner', slug: 'downtown-diner', group_name: null, description: 'Standalone premium gourmet diner with fresh meals made to order.', image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=60' }
];

for (const c of canteens) {
  await db.query(
    `INSERT INTO canteen (id, name, slug, group_name, description, image) VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, group_name = EXCLUDED.group_name, description = EXCLUDED.description, image = EXCLUDED.image`,
    [c.id, c.name, c.slug, c.group_name, c.description, c.image]
  );
}
```

- [ ] **Step 3: Test database migration & seed**

Run: `npm run build` inside `backend` and execute `node dist/server.js` briefly to verify `initDb()` executes cleanly.

- [ ] **Step 4: Commit DB changes**

```bash
git add backend/src/db.ts
git commit -m "db: extend canteen table with slug and group_name columns"
```

---

### Task 2: Backend API Endpoints for Slug Resolution

**Files:**
- Modify: `backend/src/repositories/MenuRepository.ts`
- Modify: `backend/src/routes/canteenRoutes.ts`
- Modify: `backend/src/routes/menuRoutes.ts`

**Interfaces:**
- Consumes: Canteen table and Menu table
- Produces:
  - `GET /api/canteens/by-slug/:slug` -> returns target canteen + `sister_canteens` array
  - `GET /api/menu?slug=:slug` -> returns menu items for given canteen slug

- [ ] **Step 1: Add slug query methods to `canteenRoutes.ts`**

In `backend/src/routes/canteenRoutes.ts`, add:
```typescript
router.get('/by-slug/:slug', async (req, res) => {
  try {
    const db = await getDb();
    const { slug } = req.params;
    const canteenRes = await db.query('SELECT * FROM canteen WHERE slug = $1 OR id = $1', [slug]);
    
    if (canteenRes.rows.length === 0) {
      return res.status(404).json({ error: 'Canteen not found' });
    }

    const canteen = canteenRes.rows[0];
    let sisterCanteens: any[] = [];
    if (canteen.group_name) {
      const sistersRes = await db.query('SELECT * FROM canteen WHERE group_name = $1', [canteen.group_name]);
      sisterCanteens = sistersRes.rows;
    } else {
      sisterCanteens = [canteen];
    }

    res.json({ canteen, sisterCanteens });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch canteen by slug' });
  }
});
```

- [ ] **Step 2: Allow menu filtering by slug in `menuRoutes.ts`**

In `backend/src/routes/menuRoutes.ts`, update `GET /api/menu` handler to resolve `canteenId` from `slug` if `slug` query param is supplied:
```typescript
if (req.query.slug) {
  const canteenRes = await db.query('SELECT id FROM canteen WHERE slug = $1', [req.query.slug]);
  if (canteenRes.rows.length > 0) {
    canteenId = canteenRes.rows[0].id;
  }
}
```

- [ ] **Step 3: Test API endpoint**

Run API build and query GET `http://localhost:5000/api/canteens/by-slug/downtown-diner`. Verify expected JSON structure with single diner and empty/single `sisterCanteens`.

- [ ] **Step 4: Commit backend API changes**

```bash
git add backend/src/routes/canteenRoutes.ts backend/src/routes/menuRoutes.ts
git commit -m "feat(api): add by-slug canteen endpoint and menu query by slug"
```

---

### Task 3: Frontend Routing & Clean URL Handling (`App.tsx` & `StudentView.tsx`)

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/StudentView.tsx`

**Interfaces:**
- Consumes: `/c/:slug` route parameter from React Router `useParams`
- Produces: Direct link resolution, menu loading for targeted outlet, and URL navigation.

- [ ] **Step 1: Add `/c/:slug` route in `App.tsx`**

In `frontend/src/App.tsx`:
```tsx
<Routes>
  <Route path="/" element={<StudentView />} />
  <Route path="/c/:slug" element={<StudentView />} />
  <Route path="/staff" element={<StaffView />}>
    <Route index element={<StaffOrders />} />
    <Route path="menu" element={<StaffMenu />} />
  </Route>
  <Route path="/staff/login" element={<StaffLogin />} />
</Routes>
```

- [ ] **Step 2: Add slug awareness and fetch logic in `StudentView.tsx`**

In `frontend/src/components/StudentView.tsx`:
Import `useParams`, `useNavigate` from `react-router-dom`.
Extract `const { slug } = useParams<{ slug?: string }>();`.
When `slug` is present:
- Fetch target canteen info from `${API_BASE_URL}/api/canteens/by-slug/${slug}`.
- Store `currentCanteen`, `sisterCanteens`, and `selectedCanteenId`.
- Fetch menu items for that canteen.

- [ ] **Step 3: Test direct route opening `/c/canteen-b` in browser**

Verify that navigating directly to `/c/canteen-b` loads Canteen B's menu immediately.

- [ ] **Step 4: Commit frontend routing changes**

```bash
git add frontend/src/App.tsx frontend/src/components/StudentView.tsx
git commit -m "feat(frontend): add /c/:slug direct link route support"
```

---

### Task 4: Dynamic Header & Conditional Selector Hiding

**Files:**
- Modify: `frontend/src/components/StudentView.tsx`

**Interfaces:**
- Consumes: `sisterCanteens` array state
- Produces: Conditional UI rendering (hides dropdown selector if `sisterCanteens.length <= 1`, shows sister pill tab switcher if `sisterCanteens.length > 1`).

- [ ] **Step 1: Implement conditional UI logic in `StudentView.tsx`**

In `StudentView.tsx`:
```tsx
{/* Canteen Selector / Header Banner */}
{sisterCanteens.length > 1 ? (
  <div className="flex items-center gap-2 overflow-x-auto py-2">
    {sisterCanteens.map((c) => (
      <button
        key={c.id}
        onClick={() => handleCanteenChange(c)}
        className={`px-4 py-2 rounded-full font-label-md transition-all ${
          c.id === selectedCanteenId
            ? 'bg-primary text-white shadow-md'
            : 'bg-surface-variant/40 text-on-surface-variant hover:bg-surface-variant'
        }`}
      >
        {c.name}
      </button>
    ))}
  </div>
) : (
  <div className="flex items-center justify-between p-4 bg-white/60 backdrop-blur-md rounded-2xl border border-white/40 shadow-sm">
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
        <span className="material-symbols-outlined">storefront</span>
      </div>
      <div>
        <h2 className="font-headline-sm font-bold text-primary">{currentCanteen?.name || 'Restaurant'}</h2>
        <p className="font-label-sm text-on-surface-variant">{currentCanteen?.description || 'Fresh meals served daily'}</p>
      </div>
    </div>
  </div>
)}
```

- [ ] **Step 2: Verify standalone diner behavior `/c/downtown-diner`**

Open `/c/downtown-diner` in browser. Verify:
- Selector tabs / dropdown are **completely hidden**.
- Clean header banner with "Downtown Diner" displays.

- [ ] **Step 3: Commit UI enhancements**

```bash
git add frontend/src/components/StudentView.tsx
git commit -m "feat(ui): conditionally hide canteen selector for single/standalone diners"
```

---

### Task 5: Staff Direct Link Sharing & QR Generator Button

**Files:**
- Modify: `frontend/src/components/StaffOrders.tsx`
- Modify: `frontend/src/components/StaffMenu.tsx`

**Interfaces:**
- Consumes: Canteen slug
- Produces: Interactive "Copy Student Direct Link" button in staff dashboard with clipboard feedback.

- [ ] **Step 1: Add "Copy Direct Link" button in `StaffOrders.tsx` & `StaffMenu.tsx`**

```tsx
const copyDirectLink = (slug: string) => {
  const directUrl = `${window.location.origin}/c/${slug}`;
  navigator.clipboard.writeText(directUrl);
  alert(`Copied direct link to clipboard: ${directUrl}`);
};
```
Render button next to canteen name in Staff Header:
```tsx
<button
  onClick={() => copyDirectLink(currentCanteenSlug)}
  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all"
  title="Copy Direct Link for Students"
>
  <span className="material-symbols-outlined text-[16px]">link</span>
  <span>Copy Student Link</span>
</button>
```

- [ ] **Step 2: Test link copy action in Staff Dashboard**

Click button, paste into new browser tab, verify it navigates directly to `/c/:slug`.

- [ ] **Step 3: Commit staff link sharing feature**

```bash
git add frontend/src/components/StaffOrders.tsx frontend/src/components/StaffMenu.tsx
git commit -m "feat(staff): add Copy Direct Link feature for staff dashboard"
```
