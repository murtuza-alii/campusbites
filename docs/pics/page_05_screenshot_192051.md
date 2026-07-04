# Student Menu Filtered & Search State

![Student Menu Search State](Screenshot%202026-07-01%20192051.png)

## Page Details
- **Route:** `/` (Student view)
- **Component:** [StudentView.tsx](file:///d:/college%20menu%20selector/frontend/src/components/StudentView.tsx)
- **Screenshot:** `Screenshot 2026-07-01 192051.png`

## 1. Functional Requirements
This view represents the student catalog search and active category filtering workflow:
1. **Interactive Text Filtering:** Match user-provided input with dish names in real time (client-side).
2. **Category Toggle Pills:** Highlight active categories (e.g. Snacks, Meals, Beverages, Desserts) and filter the grid dynamically.
3. **Empty Results State:** If search or filter returns zero matches, display an illustration banner stating "No dishes found matching your criteria".

## 2. UI Layout Structure
- **Filter Row:** Horizontal scrollable row containing category badges (All, Meals, Snacks, Beverages, Desserts).
- **Search Bar Container:** Floating slate glassmorphic input container containing the query text.
- **Search Results Grid:** Lists matching cards.

## 3. Button & Control Behaviors

| Button / UI Control | Event / Action | Navigates To / Result |
|:---|:---|:---|
| Category Pill | Click | Filters matching food items, updates active badge styling |
| Search Input | Text Change | Filters the list matching substring of dish names |
| Add to Cart | Click | Updates cart count and reveals quantity adjusters |
