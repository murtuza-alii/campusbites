# Staff Menu Add/Edit Modal Overlay View

![Staff Menu Add/Edit Modal View](Screenshot%202026-07-01%20192236.png)

## Page Details
- **Route:** `/staff/menu` (Menu Management with Modal Open)
- **Component:** [StaffMenu.tsx](file:///d:/college%20menu%20selector/frontend/src/components/StaffMenu.tsx) (Modal Dialog overlay)
- **Screenshot:** `Screenshot 2026-07-01 192236.png`

## 1. Functional Requirements
This view represents the modal form for creating or modifying menu records:
1. **Backdrop Blur & Dimming:** A dark backdrop overlay (`bg-black/75 backdrop-blur-xs`) that prevents interaction with underlying table items.
2. **Form Validation Controls:** Enforce non-empty name and positive numeric prices before enabling saving.
3. **Dropdown Selection:** Populate dropdown with valid category items (Meals, Snacks, Beverages, Desserts).
4. **Availability Switch:** Set starting availability flag (`isAvailable`) to true or false.

## 2. UI Layout Structure
- **Modal Centered Container:** Structured glass card centered in the viewport.
- **Form Controls:** Vertical stack of inputs: Name field, Price field, Category selector, Image URL field, and Availability switch.
- **Action Buttons Footer:** Grouped "Cancel" and "Save Changes" / "Create Dish" buttons.

## 3. Button & Control Behaviors

| Button / UI Control | Event / Action | Navigates To / Result |
|:---|:---|:---|
| Cancel Button | Click | Discards modifications and closes the modal view |
| Save Button | Submit | Validates entries, sends POST/PUT request, and refreshes the parent menu table |
