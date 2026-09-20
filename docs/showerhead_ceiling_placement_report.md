# Final Report: Generic Showerhead / Rainhead Ceiling Placement & Shower Zone Anchoring

**Author:** Antigravity AI Engineering  
**Project:** KOHLER AI Bathroom Designer  
**Scope:** Generic ceiling fixture mounting, mesh bounding box orientation calibration, architectural shower zone synchronization, constraint validation, manual editing, and 2D floor plan rendering.  
**Date:** 2026-09-21  

---

## 1. Executive Summary

Ceiling-mounted showerheads and rainheads (e.g. KOHLER Awaken 25.4 cm Rainhead `76465IN-BL` and Statement Rainhead `29961IN-CP`) previously exhibited three critical spatial defects:
1. **Vertical Penetration Above Ceiling:** The fixture body protruded into the ceiling / roof cavity rather than hanging down into the bathroom volume.
2. **Spatial Misplacement Outside the Shower Cabin:** The placement candidate generator defaulted ceiling fixtures to room center $(0, 0)$ in the primary circulation aisle rather than inside the designated glass shower cabin.
3. **Constraint Engine Violation:** When manual editing constrained fixtures to $Z = \text{room.heightM}$, the vertical bounding box $[zM, zM + \text{heightM}]$ violated the ceiling boundary constraint ($zM + \text{heightM} \le \text{room.heightM}$).

We implemented a generic, physics-based ceiling mounting engine and architectural zone system without touching or regenerating any of the 229 normalized GLB assets, and without using any product-code-specific conditional hacks (`if (productCode === "...")`).

---

## 2. Empirical Geometry & Asset Mesh Findings

### A. Raw Mesh Analysis (`76465IN-BL.glb`)
An empirical vertex and bounding volume audit was executed directly against `76465IN-BL.glb` loaded into Three.js:

- **Source Dimensions (Inches to Metres):**
  - Physical Width ($X$): $0.250\text{ m}$ ($9.84\text{ in}$)
  - Physical Depth ($Y$): $0.250\text{ m}$ ($9.84\text{ in}$)
  - Physical Height ($Z$): $0.0514\text{ m}$ ($2.03\text{ in}$)
- **Internal GLTF Node Transforms:**
  - Scale: $0.0254$
  - Rotation: $X = -90^\circ$
  - Translation: $[0.0, 0.025721, 0.124986]$
- **Mesh Radial Slicing Along Local Y-Axis:**
  - $Y \in [+0.0206\text{m}, +0.0257\text{m}]$: Max radius $0.01255\text{m}$ ($1.25\text{cm}$) $\rightarrow$ **Narrow ceiling inlet ball-joint / pipe connector**
  - $Y \in [-0.0257\text{m}, -0.0206\text{m}]$: Max radius $0.12504\text{m}$ ($12.50\text{cm}$) $\rightarrow$ **Wide spray face plate with water nozzles**
  - Geometric Center: Located at $Y = 0.0000\text{m}$.

### B. Transformed Bounds & Base Rotation
Under canonical base rotation $R = [+\pi/2, 0, 0]$ with local grounding offset $Z_{\text{local}} = \text{assetHeight} / 2$:
- Spray face ($Y_{\text{local}} = -0.0257\text{m}$) maps to $Z = 0$ (lowest point of fixture).
- Top inlet ($Y_{\text{local}} = +0.0257\text{m}$) maps to $Z = +\text{assetHeight}$ ($0.0514\text{m}$, highest point of fixture).
- Spray direction vector points straight down: $\vec{v}_{\text{spray}} = [0, 0, -1] = -Z$.

---

## 3. Generic Mathematical Anchoring Formulas

### A. Ceiling Contact Formula
To ensure the top mounting inlet touches the ceiling plane at $Z = \text{room.heightM}$ without penetrating into the roof:
$$\text{worldZ} = \text{room.heightM} - \text{assetHeight}$$

**Vertical Bounds Verification:**
- Top plane of fixture:
  $$\text{Top} = \text{worldZ} + \text{assetHeight} = (\text{room.heightM} - \text{assetHeight}) + \text{assetHeight} = \text{room.heightM} \quad (\text{exact flush contact})$$
- Bottom spray face:
  $$\text{Bottom} = \text{worldZ} = \text{room.heightM} - \text{assetHeight} \quad (\text{inside room volume})$$
- Constraint Engine Satisfaction:
  $$zM \ge 0 \quad \text{and} \quad zM + \text{heightM} = \text{room.heightM} \le \text{room.heightM} \quad (\text{0 errors})$$

### B. Centralized Architectural Shower Zone Anchoring
Rather than hardcoding arbitrary coordinates, all spatial modules now import from [`src/lib/design/showerZone.ts`](file:///d:/Kohler/Kohler/kohler-ai-designer/src/lib/design/showerZone.ts):
- **Glass Partition**: $X_{\text{screen}} = 0.28\text{m}$ (rendered in both 3D WebGL and 2D floor plan).
- **Shower Enclosure Bounds**:
  $$X \in [X_{\text{screen}} + \text{margin}, \, \text{room.widthM}/2 - \text{margin}]$$
  $$Y \in [-\text{room.depthM}/2 + \text{margin}, \, -\text{room.depthM}/2 + \text{screenDepth} - \text{margin}]$$
- **Anchor Position**: Geometric center of the wet zone footprint:
  $$X_{\text{anchor}} = \frac{X_{\text{screen}} + \text{room.widthM}/2}{2}$$
  $$Y_{\text{anchor}} = -\frac{\text{room.depthM}}{2} + \frac{\text{screenDepth}}{2}$$

For standard room dimensions ($2.4\text{m} \times 2.8\text{m}$):
- $X_{\text{anchor}} = (0.28 + 1.20) / 2 = 0.74\text{m}$
- $Y_{\text{anchor}} = -1.40 + 0.48 = -0.92\text{m}$

---

## 4. Architectural System Integrations

### 1. Centralized Module (`src/lib/design/showerZone.ts`)
Provides:
- `getShowerZoneDefinition(room)`: Canonical geometric bounds, glass partition location, screen depth, and clear margins.
- `getShowerZoneAnchor(room)`: Coordinates $(X, Y)$ for fixture placement inside the shower wet zone.
- `isInsideShowerZone(pos, dims, room)`: Boundary validation check.
- `resolveCeilingMountedPlacement(footprint, room)`: Shared calculation for $Z = \text{room.heightM} - \text{heightM}$.

### 2. Placement Candidates (`src/lib/design/placementCandidates.ts`)
- Wall-mounted fixtures remain wall-associated.
- Ceiling fixtures with role `showerhead`, `rainhead`, or zone `shower` automatically anchor to `getShowerZoneAnchor(room)`.
- Default ceiling elevation computes $Z = \text{room.heightM} - \text{dims.heightM}$.

### 3. Product Orientation Adapter (`src/lib/renderer/productOrientationAdapter.ts`)
- Case `"rainhead"`:
  - Functional forward vector: $[0, 0, -1]$ (pointing down to floor).
  - Rotation: Base rotation $[+\pi/2, 0, 0]$ with local grounding offset $+\text{assetHeight}/2$.
  - Elevation: $\text{worldZ} = \text{room.heightM} - \text{assetHeight}$.
  - Fallback positioning: Anchors to `getShowerZoneAnchor(room)`.

### 4. Manual Editor Constraint Engine (`src/lib/design/manualEditing.ts`)
- In `constrainPositionToSurface`:
  - Fixtures with role `rainhead` / `showerhead` or ceiling mounting are locked to $Z = \text{room.heightM} - \text{footprint.heightM}$.
  - $X$ and $Y$ are clamped within `getShowerZoneDefinition(room).bounds`.
  - When dragged or committed, position freezes cleanly without jumping or floating.

### 5. Architectural 2D Floor Plan (`src/components/editor/ArchitecturalFloorPlan.tsx`)
- Renders the glass shower partition (cyan/blue tinted line at $X = 0.28\text{m}$) and the wet zone hatch.
- Renders rainheads with concentric shower ring symbology inside the shower cabin.
- Passes fixture context during drag operations to maintain zone boundaries.

### 6. 3D Architectural Canvas (`src/components/BathroomCanvas/BathroomCanvas.tsx`)
- `GlassShowerScreen` geometry now consumes `getShowerZoneDefinition(room)` so the glass screen and fixture anchors always match dynamically.

---

## 5. Automated Unit Test Verification

A dedicated unit test suite was added to [`src/lib/renderer/showerheadCeilingPlacement.test.ts`](file:///d:/Kohler/Kohler/kohler-ai-designer/src/lib/renderer/showerheadCeilingPlacement.test.ts):

| Test Case | Condition Tested | Result |
|---|---|---|
| **1** | `getShowerZoneAnchor` places anchor between glass screen and East wall | **PASS** |
| **2** | Ceiling candidate sets $Z = \text{room.heightM} - \text{heightM}$ inside shower zone | **PASS** |
| **3** | `productOrientationAdapter` mounts rainhead flush to ceiling ($\text{worldZ} + \text{height} = 2.40\text{m}$) | **PASS** |
| **4** | Rainhead functional forward faces downward toward floor ($[0, 0, -1]$) | **PASS** |
| **5** | Rainhead placement satisfies `validateBathroomLayout` with 0 boundary errors | **PASS** |
| **6** | `constrainPositionToSurface` locks ceiling fixtures to $Z = \text{room.heightM} - \text{heightM}$ | **PASS** |
| **7** | `constrainPositionToSurface` clamps shower fixtures within cabin boundaries | **PASS** |
| **8** | Wall-mounted showerhead stays on wall while ceiling rainhead stays on ceiling | **PASS** |
| **9** | Rainhead survives full manual drag and freeze cycle with valid placement | **PASS** |
| **10** | Dynamic room scaling ($3.0\text{m} \times 3.5\text{m} \times 2.7\text{m}$) updates anchor and elevation correctly | **PASS** |

All tests passed with 100% assertions green.

---

## 6. End-to-End Live Browser Verification

Using Playwright browser automation on `http://localhost:3000/designer`:

1. **Perspective 3D Verification:**
   - Switched to the **Rainhead Shower Suite** camera preset.
   - Rainhead `76465IN-BL` is visually mounted flush against the white plaster ceiling.
   - Ball-joint inlet connects to the ceiling plane; circular spray face hangs below inside the shower volume directly above the drain/wet floor.
   - Screenshot: `rainhead_camera_view_1789935044467.png`
2. **Fullscreen Manual Editor (3D Mode):**
   - Clicked "Edit Layout" to activate the fullscreen spatial editor.
   - Rainhead selected: Status bar displayed **"Rainhead (`76465IN-BL`)"**, **"Surface: ceiling"**, and badge **"Placement Valid"**.
   - Moved fixture along the ceiling plane: Elevation remained locked at $Z = 2.349\text{m}$ ($2.40\text{m} - 0.0514\text{m}$).
   - Click to freeze: Position locked immediately with zero jumping or boundary violations.
   - Screenshot: `rainhead_placement_valid_1789935113027.png`
3. **2D Architectural Floor Plan Verification:**
   - Toggled to 2D Floor Plan view.
   - Glass shower screen rendered prominently at $X = 0.28\text{m}$ with blue accent.
   - Rainhead rendered with architectural dual-concentric circle and water spray icon in the center of the wet zone ($X = 0.74\text{m}, Y = -0.92\text{m}$).
   - Fixture position in 2D perfectly matches 3D perspective ($X = 0.74\text{m}, Y = -0.92\text{m}, Z = 2.35\text{m}$).
   - Screenshot: `floor_plan_view_verification_1789935130892.png`

---

## 7. Architectural Integrity Statement

- **Normalized GLBs Untouched:** Zero changes made to any files in `data/3d_catalogue/normalized_glb/`.
- **Catalogue Preview Untouched:** Studio 3D preview ($Z = -90^\circ$ calibration) remains 100% preserved.
- **No Product-Code Hacks:** No conditional checks on `productCode === '76465IN-BL'` exist anywhere in the codebase. All ceiling fixtures automatically adhere to the same generic physics-based mounting contract.
