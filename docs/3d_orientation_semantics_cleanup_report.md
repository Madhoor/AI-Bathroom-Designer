# 3D Axis Calibration, Fixture Semantics & Mirror/Faucet Placement Cleanup Report

**Date:** 2026-09-21  
**Platform:** KOHLER AI Bathroom Designer (Antigravity 2.0 / Next.js)  
**Status:** Complete & Fully Verified  

---

## 1. Executive Summary

This cleanup pass resolved key visual and semantic alignment issues across the 3D catalogue, manual editor, and bathroom scene renderer without mutating source CAD/GLB assets or altering core constraint engine rules.

### Key Systems Preserved:
- **Zero GLB Mutation**: All 229 normalized GLBs in `data/3d_catalogue/normalized_glb/` remain 100% untouched.
- **DesignState Integrity**: Canonical metric coordinates, product spatial metadata, and host relationships remain the single source of truth.
- **Centralized Coordinate Contracts**: Clearly demarcated Normalized GLB Space, Canonical Bathroom World Space, and Catalogue Studio Preview Space.

---

## 2. Catalogue Preview Axis Calibration ($Z = -90^\circ$)

### Observation & Mathematical Root Cause:
In the studio 3D catalogue preview (`Product3DViewer.tsx`), models are rendered in an isolated studio setting where Three.js camera defaults use $+Y$ Up and $+Z$ Front. In normalized GLB space, rotation applied at export was `-90deg_X`. When canonical fixture rotation (`Math.PI / 2` around $X$) was applied, models appeared rotated $90^\circ$ laterally relative to the expected architectural frontal perspective.

### Solution Applied:
- **Centralized Preview Transform**:
  $$\text{Catalogue Preview Space} = \text{Normalized GLB Space} \times \text{Preview Axis Correction}$$
  $$\text{CATALOGUE\_PREVIEW\_AXIS\_CORRECTION} = [0, 0, -\pi/2] \text{ radians } (Z = -90^\circ)$$
- **Scope of Correction**:
  - Implemented inside `resolveProductOrientation` in `productOrientationAdapter.ts` as `previewRotation`.
  - Consumed strictly by `Product3DViewer.tsx`.
  - **Not applied** to source GLBs, **not applied** to production asset files, **not applied** to bathroom scene `localRotation`, and **not applied** to `DesignState` or constraint layout solvers.

### Documented Coordinate Contracts:
1. **Normalized GLB Space**: Raw normalized asset coordinate frame ($X=\text{width}$, $Y=\text{height}$, $Z=\text{depth}$ with metadata `rotationApplied: "-90deg_X"`).
2. **Canonical World Space**: Bathroom coordinate system ($X=\text{width}$, $Y=\text{depth}$, $Z=\text{vertical height}$, floor at $Z=0$, Up = $+Z$). Fixtures: Local $+Y$ points toward mounting wall, Local $-Y$ points forward into the room.
3. **Catalogue Preview Space**: Studio preview coordinate system ($+Y$ is Up, $+X$ is Right, $+Z$ is Front, with Preview Axis Correction $Z = -90^\circ$ applied to present the architectural front face to the studio camera).

---

## 3. Product Preview Scale & Ground Reference

### Issue Identified:
In the previous preview implementation, camera distance scaled directly with `maxDim * 2.2`, zooming in excessively on small items like single-hole faucets ($0.2\text{m}$) and making them appear visually identical in size to a $1.7\text{m}$ freestanding bathtub.

### Solution Implemented:
- **1 Three.js Unit = 1 Metre**: Maintained strict 1:1 metric scale.
- **Dynamic Bounded Camera Distance**:
  $$d = \max(\text{maxDim} \times 1.6 + 0.5, 1.25\text{m})$$
  - Faucets ($0.2\text{m}$): Camera sits at $1.25\text{m}$, displaying them as compact brassware fittings occupying $\sim 20\%$ of the viewport.
  - Bathtubs ($1.7\text{m}$): Camera sits at $3.22\text{m}$, allowing the tub to span the scene.
- **Metric Ground Reference**:
  - Minimum pad radius established at $0.75\text{m}$ ($1.5\text{m}$ diameter).
  - Concentric metric calibration rings at $0.25\text{m}$ ($0.5\text{m}$ diameter) and $0.50\text{m}$ ($1.0\text{m}$ diameter) provide an immediate, physically grounded visual reference.
- **Accurate Dimensional Badges**: Retained live dimensional readouts (`W × H × D mm`) on all catalogue preview cards.

---

## 4. Architectural Mirror & Backlight Presentation

### Issues Fixed:
1. **Floating Offset**: Previously, the mirror was embedded within `FloatingVanityUnit` at a local offset that positioned it over $0.5\text{m}$ into the room away from the South wall.
2. **Floating Horizontal Slab / Light Bar**: The mirror light previously rendered as an extruded horizontal box in front of the mirror, visually reading like a floating shelf.

### Solution Implemented:
- **Dedicated Component**: Created `WallMountedArchitecturalMirror` in `BathroomCanvas.tsx`.
- **Target-Wall Flush Attachment**:
  - Derives target wall from `arch.mountingWall`.
  - Places mirror flush against the plaster ($0.012\text{m}$ plaster standoff) at standard architectural eye-level ($Z = 1.60\text{m}$).
  - Automatically aligns with wall normals across South ($Z=0$), North ($Z=\pi$), West ($Z=-\pi/2$), and East ($Z=\pi/2$) walls.
  - When the basin/vanity relocates to another wall, the mirror automatically tracks and re-attaches flush to the new wall.
- **Concealed Ambient Backlight**:
  - Removed floating horizontal front bar.
  - Added an integrated warm halo glow plane ($0.28$ opacity) mounted directly flush behind the mirror against the wall face.
  - Backlight point light ($0.7$ intensity, $1.3\text{m}$ reach) casts gentle ambient illumination across the wall plaster and vanity area.
- **Removed Fake Faucet**: Eliminated the hardcoded generic cylinder faucet from `FloatingVanityUnit`, ensuring only authentic KOHLER catalogue GLBs are rendered.

---

## 5. Host Hierarchy & Basin $\to$ Faucet Attachment

### Architectural Hierarchy Formalized:
$$\text{VANITY} \xrightarrow{\text{hosts}} \text{BASIN} \xrightarrow{\text{may host}} \text{FAUCET}$$

- **Roles Kept Separate**: Vanity, Basin, and Faucet are distinct architectural roles with no semantic collapsing.
- **Generic Basin-Host Transform**:
  - In `productOrientationAdapter.ts` and `hostAttachments.ts`:
  - When a faucet is hosted by a basin, it attaches to the basin's rear mounting deck:
    $$Z = 0.72\text{m} \quad (\text{countertop deck level})$$
    $$\text{Local Offset } Y = \text{basin.depth} \times 0.35 \quad (\text{behind bowl cavity})$$
    $$\text{Functional Direction} = \text{facing forward into basin bowl } (-Y)$$
- **Manual Editor Synchronization (`syncHostedPlacements`)**:
  - Moving the basin automatically translates the hosted faucet by the exact same $(\Delta x, \Delta y)$ in real-time.
  - Rotating the basin automatically orbits the hosted faucet around the basin center by $\Delta \theta$.
  - Replacing the basin recomputes the faucet's deck elevation and rear offset based on the new basin's depth and height.

---

## 6. Factual Product Replacement Semantics

### Issue Fixed:
Previously, `getEligibleReplacementCandidates` in `replacementEngine.ts` used fuzzy category substring matching (`candidateCat.includes("basin")`), which caused faucets (categorized as "Basin Faucets") to show up when attempting to replace a washbasin.

### Solution Implemented:
- Replaced category substring filtering with authoritative role classification using `resolveProductSemantics` and `isProductEligibleForRole`.
- **Strict Role Boundaries Guaranteed**:
  - Selecting a **Basin** $\to$ Replacement candidates contain **ONLY Basins**.
  - Selecting a **Faucet** $\to$ Replacement candidates contain **ONLY Faucets**.
  - Selecting a **Toilet** $\to$ Replacement candidates contain **ONLY Toilets**.
  - Selecting a **Bathtub** $\to$ Replacement candidates contain **ONLY Bathtubs**.
- Verified in the browser subagent: Exactly 30 genuine sanitary basins listed in the Basin replacement modal; 0 faucets, 0 bathtubs, 0 toilets.

---

## 7. Vanity + Basin + Faucet UI Communication

### Updates Implemented:
- **Contextual Hierarchy Breadcrumb**: Added live hierarchy navigation to `EditorContextualMenu.tsx`:
  $$\text{Hierarchy: Vanity } \rightarrow \mathbf{Basin} \rightarrow \text{Faucet}$$
- **Direct Selection Switching**: Users can click "Basin" or "Faucet" in the hierarchy breadcrumb to immediately focus and manipulate connected fixtures without hunting across the 3D scene.
- **Architectural Floor Plan 2D Symbol**: Added dedicated SVG symbol rendering for faucets (base flange + forward spout + aerator nozzle) distinct from the countertop basin footprint.

---

## 8. Cutaway / Open Wall Behavior

### Decision & Behavior:
- **Presentation-Only Invariant**: Wall cutaway and visibility is strictly presentation behavior and **never mutates `DesignState`**.
- Fixed architectural opening on the North entrance wall allows unobstructed sightlines into the room.
- Single-sided wall geometries ensure interior viewing angles remain clear while keeping exterior perspectives natural and consistent across fixture movements.

---

## 9. Automated Test Suite (20 / 20 Verified)

Implemented comprehensive test suite in `src/lib/renderer/orientationSemanticsCleanup.test.ts`:

| # | Test Case | Status |
|---|---|---|
| 1 | Catalogue preview applies centralized Z=-90° axis correction in preview mode | ✅ PASS |
| 2 | Preview transform is not applied to source GLB | ✅ PASS |
| 3 | Preview and bathroom coordinate contracts remain separate | ✅ PASS |
| 4 | Factual toilet semantics resolves to toilet role | ✅ PASS |
| 5 | Factual basin semantics resolves to basin role | ✅ PASS |
| 6 | Factual faucet semantics resolves to faucet role | ✅ PASS |
| 7 | Factual bath semantics resolves to bath role | ✅ PASS |
| 8 | Bathtubs are NEVER eligible for basin role | ✅ PASS |
| 9 | Basins are NEVER eligible for faucet role and vice versa | ✅ PASS |
| 10 | Basin replacement returns only basin candidates | ✅ PASS |
| 11 | Faucet replacement returns only faucet candidates | ✅ PASS |
| 12 | Mirror wall attachment transform aligns flush to wall | ✅ PASS |
| 13 | Mirror attachment provides concealed mounting metadata | ✅ PASS |
| 14 | Basin-faucet host transform places faucet on countertop behind basin bowl | ✅ PASS |
| 15 | Faucet follows basin translation in syncHostedPlacements | ✅ PASS |
| 16 | Faucet follows basin rotation in syncHostedPlacements | ✅ PASS |
| 17 | Toilet attachments follow toilet wall movement | ✅ PASS |
| 18 | Rainhead faces downward towards floor | ✅ PASS |
| 19 | Bathtub remains upright with rim opening upward (+Z) | ✅ PASS |
| 20 | Preview scale fitting preserves physically meaningful dimensions | ✅ PASS |

---

## 10. Live Browser Verification Summary

### 1. `/catalogue` (Verified via `browser_subagent`):
- **Toilet** (`29777IN-0`): Upright, seated flat on ground circle ($411 \times 619 \times 428\text{ mm}$).
- **Basin** (`5373IN-0`): Upright, cavity facing upward, resting flat on ground plane ($575 \times 175 \times 410\text{ mm}$).
- **Faucet** (`73158T-4-RGD`): Upright, spout facing forward, base flat on 1m ground reference ($213 \times 195 \times 51\text{ mm}$).
- **Bathtub** (`1800T-0`): Upright, tub opening upward, resting flat on floor ($1676 \times 724 \times 813\text{ mm}$).
- **Rainhead** (`76465IN-BL`): Upright horizontal position, connector pointing up ($250 \times 51 \times 250\text{ mm}$).

### 2. `/designer` (Verified via `browser_subagent`):
- **3D Scene**: Rendered cleanly without runtime error overlays.
- **Mirror**: Mounted flush against feature wall plaster; soft warm ambient halo glow without floating shelf/slab artifacts.
- **Basin & Faucet**: Real KOHLER Composed faucet sitting cleanly on vanity deck behind the vessel basin bowl; fake cylinder faucet completely removed.
- **Manual Editor**: Hierarchy indicator (`Vanity → Basin → Faucet`) active and functional.
- **Movement & Rotation**: Faucet follows basin translation and rotation in real-time across both 3D perspective and 2D floor plan.
- **Replacement Modal**: Confirmed 100% role-pure replacement filtering for washbasins.
