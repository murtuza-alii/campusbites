# Staff Menu List Table (Browser View)

![Staff Menu List Table](Screenshot%202026-07-01%20192113.png)

## Page Details
- **Route:** `/staff/menu` (Menu Management)
- **Component:** [StaffMenu.tsx](file:///d:/college%20menu%20selector/frontend/src/components/StaffMenu.tsx)
- **Screenshot:** `Screenshot 2026-07-01 192113.png`

## 1. Functional Requirements
This view displays the complete active food menu items within a structured inventory table on the admin panel:
1. **Interactive Checkbox Toggle:** Turn item availability on/off instantly via a slider checkbox.
2. **Row Opacity State:** When item is toggled off (out of stock), the row opacity diminishes (`opacity-65`) and shows a gray "OUT OF STOCK" indicator.
3. **Actions CRUD Menu:** Quick-access edit and delete trigger controls for each individual row.

## 2. UI Layout Structure
- **Menu Management Header:** Details subtitle and "+ Add Item" trigger button.
- **Inventory Grid Table:**
  - Header fields: Image, Dish Name, Category, Price, Stock Status, Actions.
  - Rows are bordered, styled with semi-transparent glass cards.

## 3. Button & Control Behaviors

| Button / UI Control | Event / Action | Navigates To / Result |
|:---|:---|:---|
| Add Item Button | Click | Launches menu item insertion modal |
| Edit Button | Click | Opens pre-populated modification modal |
| Delete Button | Click | Prompts deletion approval dialog |
| Stock Checkbox Toggle | Click | Commits live availability flag to database |
