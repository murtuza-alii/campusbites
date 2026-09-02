# CampusBites — High-Density Mobile-First Design System & Guidelines

> **Standard:** Awwwards-Tier High-Density Agency UI / Operational Efficiency  
> **Scope:** All CampusBites pages (Customer Ordering, Live Tracker, Kitchen Terminal, Counter Handover, Menu Management, Admin Dashboard)

---

## 1. Core Philosophy: The High-Density & Anti-Slop Mentality

1. **Information Density with Zero Claustrophobia**:
   - Optimize every vertical pixel. Screen real estate on mobile devices is precious; users should see actionable data immediately without endless scrolling.
   - Dense layout $\neq$ messy layout. Use hairline borders, micro-gap grids, and strict typographic hierarchy to keep information organized and legible.

2. **Absolute Zero-Emoji & Anti-Tacky Directive**:
   - **Banned**: All emojis (`🔥`, `🍳`, `📦`, `🏢`, `👨‍🍳`, `🚫`, `🕒`, `📜`, `🛑`, `🚀`, `ℹ️`, `👑`, `👔`, `🌐`, `🏫`, `🍽️`, etc.).
   - **Banned**: 2px/3px thick colored borders, heavy opaque drop shadows (`shadow-lg`, `rgba(0,0,0,0.3)`), full-bleed neon-orange gradient banners, and redundant text tags like `[NEW ORDER]`.
   - **Mandatory**: Use clean, lightweight [Lucide](https://lucide.dev) vector icons (`12px` to `14px`) with hairline borders (`border-slate-200/90`) and subtle micro-shadows (`shadow-2xs`).

3. **High-End Tactile Depth ("Double-Bezel" & Layering)**:
   - Outer shell container (`bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs`).
   - Inner core backing (`bg-slate-50 border border-slate-100/80 rounded-md p-1.5`).
   - Active tactile physics (`active:scale-[0.98]` on buttons and clickable cards).

---

## 2. Master Typography Scale & Font Ratio

| UI Role | Tailwind Classes | Exact Size | Font Weight | Family / Tracking |
|---|---|---|---|---|
| **Page / Outlet Title** | `text-xs sm:text-[13px]` | `12px – 13px` | `font-bold` | `tracking-tight text-slate-900` |
| **Card / Order Number** | `text-xs sm:text-[13px]` | `12px – 13px` | `font-bold` | `font-mono tracking-tight text-slate-900` |
| **Dish / Item Title** | `text-[11px]` | `11px` | `font-medium` | `text-slate-800` |
| **Quantity Badge** | `text-[10px]` | `10px` | `font-bold` | `font-mono text-amber-800 bg-amber-100/90 px-1 py-0.2 rounded` |
| **Price Display** | `text-[11px]` | `11px` | `font-bold` | `font-mono text-slate-900` |
| **Secondary Metadata** | `text-[10px]` | `10px` | `font-normal` | `text-slate-500` |
| **Timestamps / Elapsed** | `text-[10px]` | `10px` | `font-normal` | `font-mono text-slate-400` |
| **Status / Slot Badges** | `text-[9px] - text-[10px]`| `9px – 10px` | `font-semibold` | `uppercase tracking-wider px-1.5 py-0.2 rounded` |
| **Button Text** | `text-[11px]` | `11px` | `font-semibold` | `text-white / text-slate-700` |
| **Input Text / Placeholders** | `text-[11px]` | `11px` | `font-medium` | `placeholder:text-slate-400` |

---

## 3. Mobile Phone Specific Design Mentality

### A. Viewport & Navigation Optimization
- **Header Height**:
  - Operational / Staff / Admin routes: `h-[48px]` to `h-[52px]` (`px-3 sm:px-6`).
  - Customer routes: `h-[56px]` to `h-[60px]`.
- **Top Content Padding**:
  - Always match the reduced header: `pt-[56px]` for staff routes, `pt-[68px]` for customer views.
- **Dedicated Footers**:
  - **Do NOT render public legal/e-commerce footers** on operational, kitchen terminal, or admin pages. Kitchen staff and counter operators require 100% vertical viewport for orders.

### B. Multi-Ticket Grid & Viewport Budget
- Responsive auto-layout:
  ```tsx
  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
  ```
- **Single-Screen Target**: On mobile (360px–420px width), at least **2 to 3 tickets** must be visible simultaneously without excessive scrolling.
- **Card Padding**: Use `p-2.5` (10px) on ticket cards and `p-2` on item rows. Avoid `p-4` or `p-6` on data cards.

### C. Touch Target & Input Ergonomics
- **Action Buttons**: Sized to `h-7` (28px) or `h-8` (32px).
- **Code / PIN Verification Inputs**: Sized to `w-20 h-7 text-[11px] font-mono font-bold tracking-wider text-center`. Auto-trigger verification once character count hits the required length (e.g. 4 characters).
- **Search Inputs**: Sized to `h-7 text-[11px]` with left icon at `w-3 h-3 text-slate-400 left-2.5`.

---

## 4. Color Palette & Semantic Tokens

```
Backgrounds:
  - Slate Canvas:      bg-[#F8FAFC] or bg-slate-50
  - Surface Card:      bg-white border border-slate-200/90 shadow-2xs
  - Inner Core:        bg-slate-50 border border-slate-100/80
  - Dark Accent/Pill:  bg-slate-900 border border-slate-800 text-slate-100

Status Accents:
  - Cooking / Prep:    text-amber-600 bg-amber-50 border-amber-200/60
                       Button: bg-amber-500 hover:bg-amber-600 text-white
  - Ready / Handover:  text-emerald-700 bg-emerald-50 border-emerald-200/80
                       Button: bg-emerald-600 hover:bg-emerald-700 text-white
  - Primary / Brand:   text-indigo-600 bg-indigo-50 border-indigo-200/80
                       Button: bg-indigo-600 hover:bg-indigo-700 text-white
  - Cancel / Destruct: text-rose-600 bg-rose-50 border-rose-200/80
                       Button: bg-rose-600 hover:bg-rose-700 text-white
```

---

## 5. Copy-Paste Ready Component Recipes

### 1. High-Density Ticket Card (Kitchen / Student)
```tsx
<div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between gap-2">
  <div className="space-y-1.5">
    {/* Card Header */}
    <div className="flex items-center justify-between gap-1.5">
      <div className="flex items-center gap-1 flex-wrap">
        <span className="font-mono font-bold text-[13px] text-slate-900 tracking-tight">
          {order.order_number}
        </span>
        <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
          Slot {order.slot_number}
        </span>
        <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center gap-0.5">
          <Building2 className="w-2 h-2 text-amber-600" />
          <span>{order.building}</span>
        </span>
      </div>
      <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5 shrink-0">
        <Clock className="w-2.5 h-2.5 text-slate-400" />
        <span>{elapsed}</span>
      </span>
    </div>

    {/* Dishes List */}
    <div className="space-y-0.5 pt-0.5">
      {order.items.map((item, idx) => (
        <div key={idx} className="flex items-center justify-between text-[11px] py-0.5 px-1.5 rounded bg-slate-50 border border-slate-100/80">
          <span className="font-medium text-slate-800">{item.name}</span>
          <span className="font-mono font-bold text-amber-800 bg-amber-100/90 px-1 py-0.2 rounded text-[10px]">
            ×{item.quantity}
          </span>
        </div>
      ))}
    </div>
  </div>

  {/* Actions */}
  <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
    <button className="h-7 px-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors text-[10px] font-medium flex items-center gap-0.5">
      <Ban className="w-3 h-3" />
      <span className="hidden sm:inline">Cancel</span>
    </button>
    <button className="flex-1 h-7 px-2.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-1">
      <ChefHat className="w-3 h-3" />
      <span>Start Cooking</span>
    </button>
  </div>
</div>
```

---

### 2. Segmented Mode Switcher / Tab Bar
```tsx
<div className="inline-flex p-0.5 bg-slate-200/70 rounded-lg select-none">
  <button
    onClick={() => setActiveTab('TAB_1')}
    className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
      activeTab === 'TAB_1'
        ? 'bg-white text-slate-900 shadow-2xs'
        : 'text-slate-600 hover:text-slate-900'
    }`}
  >
    <ChefHat className={`w-3 h-3 ${activeTab === 'TAB_1' ? 'text-amber-600' : 'text-slate-400'}`} />
    <span>Kitchen Queue</span>
    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900">
      {count1}
    </span>
  </button>

  <button
    onClick={() => setActiveTab('TAB_2')}
    className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
      activeTab === 'TAB_2'
        ? 'bg-white text-slate-900 shadow-2xs'
        : 'text-slate-600 hover:text-slate-900'
    }`}
  >
    <PackageCheck className={`w-3 h-3 ${activeTab === 'TAB_2' ? 'text-emerald-600' : 'text-slate-400'}`} />
    <span>Counter Pickup</span>
    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-900">
      {count2}
    </span>
  </button>
</div>
```

---

### 3. Metric / Batch Preparation Live Ticker
```tsx
<div className="bg-slate-900 text-white rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between gap-2.5 border border-slate-800">
  <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
    <Utensils className="w-3 h-3 text-amber-400 shrink-0" />
    <span className="font-semibold text-slate-300">To Cook</span>
    <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 font-mono font-bold text-[10px]">
      {totalCount}
    </span>
  </div>
  <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
    {items.map(({ name, qty }) => (
      <span 
        key={name} 
        className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap text-[11px] font-medium border border-slate-700/60 flex items-center gap-1"
      >
        <span>{name}</span>
        <span className="font-mono font-bold text-amber-400 text-[10px]">×{qty}</span>
      </span>
    ))}
  </div>
</div>
```

---

### 4. Ultra-Sleek Action Modal (320px Width)
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
  <div className="bg-white rounded-xl p-4 max-w-xs w-full shadow-xl border border-slate-200 flex flex-col space-y-2.5 text-left">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <div className="w-6 h-6 rounded bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
          <Ban className="w-3.5 h-3.5" />
        </div>
        <div>
          <h2 className="text-xs font-bold text-slate-900">Modal Title</h2>
          <p className="text-[10px] text-slate-500 font-medium">Sub-description</p>
        </div>
      </div>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-700 p-0.5 rounded">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>

    {/* Content */}
    <div className="text-[11px] text-slate-700">
      {/* Inputs / selections */}
    </div>

    {/* Buttons */}
    <div className="flex items-center gap-1.5 pt-0.5">
      <button onClick={onClose} className="flex-1 h-7.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px]">
        Cancel
      </button>
      <button onClick={onConfirm} className="flex-1 h-7.5 rounded-md bg-slate-900 hover:bg-black text-white font-semibold text-[11px] shadow-2xs active:scale-[0.98]">
        Confirm
      </button>
    </div>
  </div>
</div>
```

---

## 6. Pre-Flight Checklist for New Pages

Before declaring any page or component complete, verify:
- [ ] **Zero emojis**: No unicode emojis in code or text.
- [ ] **No chunky fonts**: Headers $\le$ `13px–14px`, items $\le$ `11px`, badges $\le$ `9px–10px`.
- [ ] **No bloated cards**: Padding $\le$ `p-2.5`, gaps $\le$ `gap-2`.
- [ ] **No thick borders**: Hairline borders only (`border-slate-200/90` or `border-slate-100/80`).
- [ ] **High-density mobile view**: At least 2–3 cards/rows visible on 360px viewport without scrolling.
- [ ] **Ergonomic buttons**: Action heights `h-7` (28px) or `h-7.5` (30px) with `active:scale-[0.98]`.
- [ ] **Vector icons**: [Lucide React](https://lucide.dev) icons sized to `12px – 14px` (`w-3 h-3` or `w-3.5 h-3.5`).
- [ ] **Footer isolation**: Public footer hidden on operational/staff routes.
- [ ] **Clean build**: `npm run build` passes with **0 TypeScript and Vite errors**.
