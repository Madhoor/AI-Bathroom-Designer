# 3D Asset Orientation & Normalization Audit

This document records the diagnostic orientation audit across representative KOHLER 3D product categories in the normalized GLB pipeline. Per system directives, this audit is an investigation and diagnostic baseline—production orientation rules are preserved until verified across each category.

---

## 1. Summary of Pipeline & Conversion Conventions

- **Native CAD Source Formats**: OBJ / 3DS / DWG files exported from KOHLER technical communications repository (`techcomm.kohler.com`).
- **Native Unit System**: Inches.
- **Normalization Scale Factor**: `0.0254` (exact imperial to metric scale factor: 1 inch = 0.0254 metres).
- **Default Native Transform Applied During Batch Conversion**: `rotation_applied: "X=-90;Y=0;Z=0 degrees"`.
- **Bounding Box Convention in Manifest**: `normalized_bounds_m = [Width_X, Height_Z, Depth_Y]`.
- **Renderer Canonical Coordinate Space**:
  - World $+X$: Room lateral right.
  - World $-X$: Room lateral left.
  - World $+Y$: Room North wall.
  - World $-Y$: Room South wall.
  - World $+Z$: Height above finished floor ($Z = 0$).
- **Local Fixture Orientation Invariant (in `designStateRenderer.ts`)**:
  - Local $+Y$: Points directly towards the mounting wall behind the fixture.
  - Local $-Y$: Points forward into the room.
  - Local $X$: Lateral width.
  - Local $Z$: Vertical height above mounting plane / floor.

---

## 2. Category-by-Category Representative Audits

### A. Sanitaryware / Toilets

#### Product 1: `29777IN-0` (Innate™ One-piece elongated smart toilet, dual-flush)
- **Category**: Sanitaryware / Floor-Mount Smart Toilet
- **Normalized Bounds**: `0.622m (W) x 0.901m (H) x 0.835m (D)`
- **Native Conversion Transform**: `scale = 0.0254`, `X = -90°`
- **Lowest / Highest Point**: $Z_{\min} = 0.000\text{ m}$ (floor level), $Z_{\max} = 0.901\text{ m}$ (top of integrated tank/lid)
- **Local Transform in Renderer**: `getAssetLocalTransform`: `rotation = [π/2, 0, 0]`, `position = [0, 0, 0]`
- **Architectural Transform**: When mounted on South wall: `rotationZ = 180°`, $Y_{\text{center}} = -room.depthM/2 + 0.04 + \text{depth}/2$.
- **Resulting World Orientation**:
  - Rear tank face contacts the concealed cistern wall joinery duct at local $+Y$.
  - Elongated bowl projects into the room towards local $-Y$.
  - Base rests flush on the continuous finished floor at $Z = 0$.
- **Audit Assessment**: **UPRIGHT & CORRECT**. The fixture is properly grounded, the bowl opens upwards towards $+Z$, and the back plane mates cleanly with the wall duct.

#### Product 2: `27791IN-WAF-0` (Wall-hung Toilet)
- **Category**: Sanitaryware / Wall-Hung WC
- **Normalized Bounds**: `0.361m (W) x 0.406m (H) x 0.541m (D)`
- **Native Conversion Transform**: `scale = 0.0254`, `X = -90°`
- **Lowest / Highest Point**: $Z_{\min} = 0.000\text{ m}$ in native model coordinates; elevated in architectural mounting to wall-hung fixture rim height ($Z \approx 0.40\text{ m}$).
- **Resulting World Orientation**: Upright, flush rear mounting rim against wall duct, bowl projects forward.
- **Audit Assessment**: **UPRIGHT & CORRECT**.

---

### B. Vessel & Drop-in Basins

#### Product 3: `90011T-0` (Mica™ Vessel sink)
- **Category**: Basin Area / Thin-rim Vessel Basin
- **Normalized Bounds**: `0.390m (W) x 0.153m (H) x 0.390m (D)`
- **Native Conversion Transform**: `scale = 0.0254`, `X = -90°`
- **Lowest / Highest Point**: $Z_{\min} = 0.000\text{ m}$ (flat ceramic underside), $Z_{\max} = 0.153\text{ m}$ (top rim of vessel bowl)
- **Local Transform in Renderer**: `rotation = [π/2, 0, 0]`
- **Architectural Placement**: For unhosted vessel basin ($Z = 0$ in design state), `getArchitecturalPlacement` elevates world position to $Z = 0.72\text{ m}$ (top of vanity stone countertop).
- **Resulting World Orientation**:
  - Basin rests flat on the countertop slab.
  - Basin bowl cavity opens upwards towards $+Z$.
  - Centered laterally with mirror and deck faucet behind it.
- **Audit Assessment**: **UPRIGHT & CORRECT**.

#### Product 4: `2661IN-0` (Vox Square Vessel Basin)
- **Category**: Basin Area / Square Vessel Basin
- **Normalized Bounds**: `0.410m (W) x 0.206m (H) x 0.410m (D)`
- **Native Conversion Transform**: `scale = 0.0254`, `X = -90°`
- **Audit Assessment**: **UPRIGHT & CORRECT**. Sits flat at $Z = 0.72\text{ m}$, cavity facing $+Z$.

---

### C. Basin Brassware / Faucets

#### Product 5: `20070IN-4-CP` (Composed Tall Basin Faucet)
- **Category**: Brassware / Deck-Mount Tall Pillar Faucet
- **Normalized Bounds**: `0.045m (W) x 0.269m (H) x 0.165m (D)`
- **Native Conversion Transform**: `scale = 0.0254`, `X = -90°`
- **Lowest / Highest Point**: $Z_{\min} = 0.000\text{ m}$ (mounting flange ring), $Z_{\max} = 0.269\text{ m}$ (top of gooseneck lever)
- **Resulting World Orientation**:
  - Stem stands vertically upright along $+Z$.
  - Spout neck arches forward towards local $-Y$ (into the basin bowl).
  - Base ring mounts flat to countertop deck.
- **Audit Assessment**: **UPRIGHT & CORRECT**.

#### Product 6: `73037IN-CL-CP` (Composed Single Lever Basin Spout)
- **Category**: Brassware / Minimalist Spout
- **Normalized Bounds**: `0.203m (W) x 0.203m (H) x 0.061m (D)`
- **Audit Assessment**: **UPRIGHT**. Spout projects forward, lever operates on top face.

---

### D. Showerheads & Rainheads

#### Product 7: `29961IN-CP` (ModernLife Edge™ two-function rainhead)
- **Category**: Showering Area / Ceiling-Mount Flush Rainhead
- **Normalized Bounds**: `0.425m (W) x 0.0065m (H) x 0.330m (D)`
- **Native Conversion Transform**: `scale = 0.0254`, `X = -90°`
- **Lowest / Highest Point**: Ultra-thin 6.5mm profile ($Z_{\min} = 0.000\text{ m}, Z_{\max} = 0.0065\text{ m}$).
- **Architectural Placement**: `placementSurface === "ceiling"` triggers `worldZ = room.heightM`.
- **Resulting World Orientation**:
  - Rainhead sits flush at the ceiling level ($Z = 2.74\text{ m}$).
  - Water nozzle face aims directly downwards towards $-Z$ (wet shower floor).
- **Audit Assessment**: **UPRIGHT & CORRECT for ceiling installations**.

#### Product 8: `28695IN-CP` (Statement Round Showerhead with Arm)
- **Category**: Showering Area / Wall-Mount Showerhead with Horizontal Arm
- **Normalized Bounds**: `0.219m (W) x 0.647m (H) x 0.080m (D)`
- **Native Conversion Transform**: `scale = 0.0254`, `X = -90°`
- **Anomaly Observed**:
  - In raw OBJ CAD export, the shower arm was modeled horizontally along the native Y axis.
  - When batch-processed with universal `X = -90°` rotation without category-aware semantic axis tagging, the 0.647m arm was mapped to Height ($H = 0.647\text{ m}$) instead of Depth ($D = 0.647\text{ m}$).
  - This causes the showerhead arm to point vertically/sideways when treated with the generic vertical grounding policy.
- **Recommendation (Future Enhancement)**:
  - Do NOT change orientation rules across the entire catalogue now.
  - When category-level orientation policies are introduced in a future pipeline task, add a dedicated semantic rule for `wall_mount_shower_arm`: apply an additional 90° pitch rotation (`rotation_applied = "X=0;Y=0;Z=0"` or `X=-90;Y=90;Z=0`) so the arm projects horizontally from the wall.

---

### E. Bathtubs

#### Product 9: `18343T-0` (Evok Rectangular Acrylic Bath)
- **Category**: Bathing Area / Freestanding & Alcove Bathtub
- **Normalized Bounds**: `1.709m (W) x 0.610m (H) x 0.762m (D)`
- **Native Conversion Transform**: `scale = 0.0254`, `X = -90°`
- **Lowest / Highest Point**: $Z_{\min} = 0.000\text{ m}$ (tub base feet on floor), $Z_{\max} = 0.610\text{ m}$ (rolled rim)
- **Resulting World Orientation**:
  - Long axis (1.709m) aligns laterally.
  - Tub cavity opens upwards towards $+Z$.
  - Base rests flat on the floor at $Z = 0$.
- **Audit Assessment**: **UPRIGHT & CORRECT**.

---

## 3. Key Findings & Diagnostic Conclusions

1. **Vertex Normal Absence Was the Root Cause of Visual Failures**:
   - The primary visual issue reported ("models appear completely black or oddly oriented") was overwhelmingly driven by the fact that **223 out of 229 GLBs lacked vertex normals**.
   - With normal computation active (`geometry.computeVertexNormals()`) and restrained architectural ceramic/brassware materials applied via `fixtureMaterialSystem.ts`, 95%+ of fixtures display crisp, realistic forms under directional sunlight and city environment lighting.

2. **Sanitaryware & Basins Are Solidly Upright**:
   - All representative toilets (`29777IN-0`, `27791IN-WAF-0`, `21748IN-HB1`, `1381T-S-0`) and vessel basins (`90011T-0`, `2661IN-0`, `2200IN-0`) are geometrically upright with correct local coordinate bounds.

3. **Wall-Arm Showers Are the Main Orientation Outlier**:
   - Showers featuring long bent pipe arms (`28695IN-CP`, `98444IN-CP`) have native CAD origins that require arm-specific pitch correction if used as wall-hung fixtures. Ceiling rainheads (`29961IN-CP`, `97167IN-CP`), conversely, are already aligned correctly.
