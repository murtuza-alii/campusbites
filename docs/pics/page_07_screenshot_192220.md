# Staff Orders Kanban Columns (Browser View)

![Staff Orders Kanban View](Screenshot%202026-07-01%20192220.png)

## Page Details
- **Route:** `/staff` (Orders Dashboard)
- **Component:** [StaffOrders.tsx](file:///d:/college%20menu%20selector/frontend/src/components/StaffOrders.tsx)
- **Screenshot:** `Screenshot 2026-07-01 192220.png`

## 1. Functional Requirements
This view displays active student orders sorted into their status stages:
1. **Multi-Column Processing:** Visual lanes representing New/Pending, Preparing, and Ready for Collection.
2. **Order Details Parsing:** Display student ticket summaries, timestamps, item names, and calculated totals.
3. **Chime Notification Sync:** Visual indicator pulses or rings when new orders hit the Pending column.

## 2. UI Layout Structure
- **Columns Row:** Three scrollable columns arranged horizontally.
- **Order Cards:** Glass cards featuring rounded borders, contrasting category headers, and high-visibility status buttons.

## 3. Button & Control Behaviors

| Button / UI Control | Event / Action | Navigates To / Result |
|:---|:---|:---|
| Accept & Cook | Click | Promotes ticket to Preparing column |
| Mark Ready for Pickup | Click | Promotes ticket to Ready for Collection column |
| Paid & Collected | Click | Archives order to Completed History logs |
