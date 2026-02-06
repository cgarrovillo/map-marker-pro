

# Plan: Complete Signage Type System with Main/Sub Types and Color Customization

## Overview

This plan addresses three key needs:
1. **Fix current build errors** - The `useAnnotations.ts` and `useAuth.ts` files have type errors that need fixing
2. **Add all signage types** with a proper two-level hierarchy (main types and sub-types)
3. **Add color customization** for signage types

---

## Current State

Your database already has:
- **Main Types**: Tickets, No Alcohol, Accessibility, Washroom, Parking, VIP Entry
- **Sub-Types**: Men/Women/All Gender (Washroom), Elevators (Accessibility), General/Accessibility/Officials Parking

The UI supports adding/removing signage types and sub-types, but:
- Colors are hardcoded based on type name
- The annotation type system has outdated static types causing build errors

---

## Implementation Steps

### Phase 1: Fix Build Errors

**1.1 Fix `useAnnotations.ts`**
The file references old static signage types (`vip`, `area`) that no longer exist. Update `SubLayerVisibility` to only use valid `SignageType` values (`ticket`, `alcohol`, `accessibility`, `washroom`).

**1.2 Fix `useAuth.ts`**
The TypeScript types don't include `create_organization_for_user` function. This requires running a database migration to ensure the function is registered and types are regenerated.

### Phase 2: Database Changes - Add Color Column

**2.1 Add `color` column to `signage_types` table**
```text
signage_types
  + color (text, nullable) - stores HEX color like "#3B82F6"
```

**2.2 Add `color` column to `signage_sub_types` table**
```text
signage_sub_types  
  + color (text, nullable) - inherits from parent if null
```

### Phase 3: Update Hooks

**3.1 Update `useSignageTypes.ts`**
- Add `updateSignageTypeColor(id, color)` function
- Update type definitions to include color

**3.2 Update `useSignageSubTypes.ts`**
- Add `updateSubTypeColor(signageTypeId, subTypeId, color)` function

### Phase 4: Add Color Picker UI

**4.1 Create `ColorPicker` component**
- Preset color palette with common colors
- Optional custom hex input
- Small, inline picker that fits in the sidebar

**4.2 Update `AnnotationPanel.tsx`**
- Add color indicator swatch next to each signage type/sub-type
- Click swatch to open color picker popover
- Show current color or default color if not set

**4.3 Update `SignDetailsPanel.tsx`**
- Display the assigned color
- Allow color change from details panel as well

### Phase 5: Update Canvas Rendering

**5.1 Modify `Canvas.tsx` `getTypeColor()` function**
- Accept signage type ID and sub-type ID as parameters
- Look up the actual color from the signage types data
- Fall back to default category color if no custom color

**5.2 Pass signage types data to Canvas**
- Thread signage types through from `FloorPlanEditor` to `Canvas`
- Use the color from the matched signage type/sub-type

### Phase 6: Update CSS/Tailwind

**6.1 Remove hardcoded signage colors from CSS variables**
- Keep category-level defaults (signage-primary, barrier-primary, flow-primary)
- Individual type colors will come from database

---

## UI/UX Details

### Color Picker Design
```text
+---------------------------+
|  [Current Color Swatch]   |
|---------------------------|
| Preset Colors:            |
| [#3B82F6] [#EF4444] [#22C55E] |
| [#F59E0B] [#8B5CF6] [#EC4899] |
| [#06B6D4] [#84CC16] [#F97316] |
|---------------------------|
| Custom: [#______] [Apply] |
+---------------------------+
```

### Signage Item with Color
```text
[Color Dot] Tickets           [Expand Arrow]
   └─ [Color Dot] VIP
   └─ [Color Dot] General Admission
   └─ [+ Add Sub-Type]
```

---

## Technical Notes

- Colors stored as hex strings (`#3B82F6`) for simplicity
- Sub-types inherit parent color if not explicitly set
- Canvas uses dynamic color lookup at render time
- Preset palette uses 12 carefully chosen colors for accessibility
- Changes sync in real-time via Supabase subscriptions

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/hooks/useAnnotations.ts` | Fix SubLayerVisibility types |
| `src/hooks/useAuth.ts` | Fix RPC function call |
| `src/hooks/useSignageTypes.ts` | Add updateColor function |
| `src/hooks/useSignageSubTypes.ts` | Add updateColor function |
| `src/components/editor/AnnotationPanel.tsx` | Add color swatches and picker |
| `src/components/editor/Canvas.tsx` | Dynamic color lookup |
| `src/components/editor/FloorPlanEditor.tsx` | Pass signage types to Canvas |
| `src/components/ui/ColorPicker.tsx` | New component |
| `src/types/annotations.ts` | Update if needed |

## Database Migration Required
- Add `color` column to `signage_types`
- Add `color` column to `signage_sub_types`
- Ensure `create_organization_for_user` function exists in types

