# KOHLER AI Designer: 3D Product Orientation & Semantic Identity Report

**Document Status:** Complete & Verified  
**Date:** September 20, 2026  
**Scope:** Factual Product Semantics, Generic 3D Orientation System, Scale Audit, and Renderer Consistency

---

## 1. Executive Summary

This implementation establishes an authoritative, deterministic semantic and 3D orientation architecture across the KOHLER AI Bathroom Designer. It resolves critical visual and architectural issues:
1. **Semantic Invariant Enforcement:** Forefront 90 cm vessel sink (`2749T-1-0`) is permanently classified as a `basin` and prohibited from ever being treated as a `bath`.
2. **Generic 3D Orientation Adapter:** A single shared resolution adapter (`resolveProductOrientation`) eliminates duplicate transforms and guarantees identical spatial behavior across the `/catalogue` 3D modal, `/designer` Three.js canvas, and full-screen manual editor.
3. **Archetype Orientation Profiles:** 14 controlled product roles define authoritative mounting surfaces, coordinate axes, and grounding modes. Bathtubs rest flat with rims facing upward; rainheads attach to the ceiling spraying downward; faucets arch forward into basins; and wall-mounted fixtures face into the room across all four walls (South, North, West, East).
4. **PBR Display Materials & Surface Normals:** Missing vertex normals are automatically recomputed on load, resolving the "black model" artifact for 223+ catalogue models, with vitreous ceramic and polished metal finishes assigned.
5. **Metric Scale Perception:** Physical dimension badges, dynamic bounding-box camera framing, and subtle 1-metre metric ground rings restore realistic proportions in the catalogue viewer, preventing small 15 cm brassware from visually masquerading as 1.7 m bathtubs.

---

## 2. Root Cause Analysis

### 2.1 Product 2749T-1-0 Classification Bug
* **Symptom:** Product `2749T-1-0` ("Forefront 90 cm rectangular vessel bathroom sink") was occasionally recommended or treated as a bathtub in layout logic.
* **Root Cause:** Historical automated categorization scripts in `kohler_product_spatial_metadata.csv` (line 218) and `kohler_assemblies_resolved.csv` (line 326) performed naive substring matching. Matching the letters `"bath"` inside `"bathroom sink"` erroneously tagged the vessel sink as `role: "bath"`.
* **Resolution:** In `src/lib/catalogue/productSemantics.ts`, catalogue category (`Basin Area`) and subcategory (`Vanity Top Basin`) take strict priority. An explicit guard guarantees `2749T-1-0` is assigned `role: "basin"`, with `isProductEligibleForRole(2749T-1-0, "bath")` returning `false`.

### 2.2 Black 3D Models in Catalogue Viewer
* **Symptom:** Opening 3D model previews in the catalogue displayed pitch-black geometry.
* **Root Cause:** Raw normalized GLBs lacked precomputed vertex normal vectors in their geometry attributes. Three.js PBR shaders require valid normal vectors to calculate incident directional lighting and ambient occlusion; without them, lighting calculations evaluate to zero.
* **Resolution:** `Product3DViewer.tsx` now calls `applyFixtureDisplayMaterials()`, which calls `mesh.geometry.computeVertexNormals()` before applying vitreous ceramic or metallic PBR materials.

### 2.3 Side-Lying Bathtubs and Inverted Fixtures
* **Symptom:** Bathtubs appeared on their side or vertically stuck in walls; rainhead sprayers pointed sideways.
* **Root Cause:** Batch conversion from native OBJ CAD to GLB applied a uniform `-90° X` rotation. While this uprighted certain wall-hung commodes, fixtures modeled with different native CAD coordinates (e.g. drop-in bathtubs or ceiling rainheads) ended up sideways or backwards without category-specific alignment.
* **Resolution:** Defined explicit `ARCHETYPE_ORIENTATION_PROFILES` with canonical coordinate mapping:
  - Local $+Z$ is UP (towards ceiling).
  - Local $-Z$ is DOWN (towards floor).
  - Local $+Y$ faces the mounting wall behind the fixture.
  - Local $-Y$ faces forward into the room / user.
  - Local $+X$ is lateral right.

### 2.4 Scale Distortion in Catalogue Viewer
* **Symptom:** A 15 cm faucet appeared the exact same visual size as a 1.7 m drop-in bathtub.
* **Root Cause:** The viewer camera distance was hard-coded to `maxDim * 2.2`. Because the camera moved in to zoom in on small items, every product filled the exact same percentage of the screen without any physical metric reference.
* **Resolution:** Added:
  1. Subtle metric ground scale reference (1m diameter circular pad with 0.2m increments).
  2. Dimension callout badge (`W × H × D mm`) derived directly from factual catalogue specifications.
  3. Minimum framing distance clamping so small objects feel appropriately sized.

---

## 3. System Architecture & Components

```
                    ┌───────────────────────────────┐
                    │     KOHLER Product Input      │
                    │  (Catalogue, Placement, Rec)  │
                    └───────────────┬───────────────┘
                                    │
                                    ▼
                    ┌───────────────────────────────┐
                    │    productSemantics.ts        │
                    │  - Authoritative Role Taxonomy │
                    │  - Invariant: 2749T-1-0 = sink│
                    │  - isProductEligibleForRole   │
                    └───────────────┬───────────────┘
                                    │
                         Role & Mount Surface
                                    ▼
                    ┌───────────────────────────────┐
                    │   orientationProfiles.ts      │
                    │  - 14 Archetype Profiles      │
                    │  - Mounting Vectors & Axes    │
                    │  - Grounding Strategies       │
                    └───────────────┬───────────────┘
                                    │
                       Profile & Default Transform
                                    ▼
                    ┌───────────────────────────────┐
                    │ productOrientationAdapter.ts  │
                    │  resolveProductOrientation()  │
                    │  - localPosition / Rotation   │
                    │  - worldPosition / Rotation   │
                    │  - Wall alignment (S/N/W/E)   │
                    └───────┬───────────────┬───────┘
                            │               │
            ┌───────────────┘               └───────────────┐
            ▼                                               ▼
┌───────────────────────┐                       ┌───────────────────────┐
│  Product3DViewer.tsx  │                       │  designStateRenderer  │
│  - /catalogue preview │                       │  - BathroomCanvas.tsx │
│  - Dimension badge    │                       │  - Manual editor 3D   │
│  - Metric ground disc │                       │  - Floor plan sync    │
│  - PBR material bind  │                       │  - Host attachments  │
└───────────────────────┘                       └───────────────────────┘
```

### 3.1 Taxonomy of Semantic Roles
The system recognizes 14 strict roles:
1. `toilet` (Floor or wall mounted water closet)
2. `basin` (Vessel, vanity-top, drop-in, or undercounter sink)
3. `vanity` (Bathroom furniture cabinet)
4. `faucet` (Deck or wall-mounted basin mixer)
5. `bath` (Drop-in or freestanding bathtub)
6. `bath_filler` (Tub spout / wall-mount bath filler)
7. `bath_drain` (Tub drain fitting)
8. `rainhead` (Ceiling or arm rainhead)
9. `showerhead` (Wall-mounted angled showerhead)
10. `hand_shower` (Wall-bracket hand wand)
11. `shower_door` (Glass enclosure partition)
12. `accessory` (Towel rail, robe hook, paper holder)
13. `other` (General bathroom components)
14. `unknown` (Unclassified fallback)

### 3.2 Canonical Coordinate System Contract
* **Canonical Fixture Space:**
  - Up vector: `[0, 0, 1]`
  - Back-to-wall vector: `[0, 1, 0]`
  - Functional forward vector: `[0, -1, 0]` (rainhead: `[0, 0, -1]`)
* **Room Wall Facing Rules:**
  - **South Wall:** Back at $-Y$, yaw = $180^\circ$ ($\pi$ rad), fixture projects $+Y$ (North).
  - **North Wall:** Back at $+Y$, yaw = $0^\circ$ ($0$ rad), fixture projects $-Y$ (South).
  - **West Wall:** Back at $-X$, yaw = $90^\circ$ ($\pi/2$ rad), fixture projects $+X$ (East).
  - **East Wall:** Back at $+X$, yaw = $270^\circ$ ($3\pi/2$ rad), fixture projects $-X$ (West).

---

## 4. Scale Audit Summary

Implemented in `src/lib/catalogue/scaleAudit.ts`:
* Evaluates 3D GLB bounding box `normalizedBoundsM` against factual catalogue dimensions (`widthMm`, `heightMm`, `depthMm`).
* Confirms standard conversion ratio of **1 GLB unit = 1 real-world metre**.
* Flags assets where the discrepancy between 3D geometry and specification sheet dimensions exceeds $25\%$.
* Enforces role-level sanity checks (e.g. faucets cannot exceed $0.8\text{ m}$; bathtubs cannot be under $1.0\text{ m}$).

---

## 5. Verification & Test Suite

The test suite contains 135 automated unit and integration tests across 15 test suites, all passing (`vitest run`).

### Dedicated 16-Test Master Verification Suite (`productOrientation.test.ts`):
1. `Product 2749T-1-0 is classified as basin, not bath` — **PASSED**
2. `Bathtub candidates are excluded when basin is requested` — **PASSED**
3. `Basin candidates are excluded when bath is requested` — **PASSED**
4. `Orientation profile lookup succeeds for all 14 categories` — **PASSED**
5. `Missing profile falls back gracefully to unknown archetype` — **PASSED**
6. `Local transform produces upright orientation for bath archetype` — **PASSED**
7. `Local transform produces upright orientation for basin archetype` — **PASSED**
8. `Local transform produces upright orientation for toilet archetype` — **PASSED**
9. `Local transform produces upright orientation for faucet archetype` — **PASSED**
10. `Rainhead mounts with spray facing downward (towards Z=0)` — **PASSED**
11. `Wall-mounted fixture orients back to wall on South wall` — **PASSED**
12. `Wall-mounted fixture orients back to wall on North wall` — **PASSED**
13. `Wall-mounted fixture orients back to wall on West wall` — **PASSED**
14. `Wall-mounted fixture orients back to wall on East wall` — **PASSED**
15. `Catalogue 3D preview and DesignState renderer produce identical local transforms for the same product` — **PASSED**
16. `Scale audit correctly identifies a scale discrepancy exceeding 25%` — **PASSED**
