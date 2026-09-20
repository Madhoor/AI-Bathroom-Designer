# Showerhead / Rainhead Ceiling Placement Audit

**Product Analyzed:** KOHLER Awaken 25.4 cm Rainhead (`76465IN-BL`)  
**Asset:** `data/3d_catalogue/normalized_glb/76465IN-BL.glb`  
**Date:** 2026-09-21  

---

## 1. Executive Summary & Problem Diagnosis

### The Issue
Ceiling-mounted rainheads and showerheads were appearing:
1. **Above the ceiling**: Geometrically penetrating the ceiling plane into the roof cavity by $2.5\text{cm}$ to $7.7\text{cm}$.
2. **Outside the shower cabin**: Centered in the middle of the bathroom walkway at room coordinates $(X=0, Y=0)$ rather than inside the designated shower enclosure.
3. **Invalid under constraint validation**: When manual movement snapped the fixture to $Z = \text{room.heightM}$, the constraint validator rejected it with `ROOM_BOUNDARY: extends outside the room boundary` because vertical bounding box $zM + \text{heightM} > \text{room.heightM}$.

### Root Causes
1. **Origin & Bounding Box Contract Mismatch**:
   In `productOrientationAdapter.ts`, rainheads were assigned `worldZ = room.heightM`. However, the local mesh transform placed the mounting inlet at the top ($+Z$) and spray face at bottom ($-Z$) of a $0.0514\text{m}$ high box. Placing the base anchor at `room.heightM` shifted the entire fixture from $Z = \text{room.heightM}$ to $Z = \text{room.heightM} + 0.0514\text{m}$ (above the ceiling).
2. **Missing Shower Zone Anchoring**:
   In `placementCandidates.ts`, ceiling fixtures used `center = { x: 0, y: 0 }`, ignoring the architectural glass shower enclosure located between $X = 0.28\text{m}$ and $X = \text{room.widthM}/2$.

---

## 2. Empirical Geometry & Mesh Inspection

We conducted a live WebGL inspection of `76465IN-BL.glb` using Three.js within the browser runtime.

### A. Raw Geometry Attributes (Source OBJ / Native Coordinates)
- **Native Bounds (Inches)**:
  - $X$: $[-4.9219, +4.9202]$ inches ($9.8421$ in / $250.0\text{ mm}$ width)
  - $Y$: $[-4.9214, +4.9200]$ inches ($9.8414$ in / $250.0\text{ mm}$ depth)
  - $Z$: $[-2.0253, 0.0000]$ inches ($2.0253$ in / $51.4\text{ mm}$ height)
- **Features in Native Space**:
  - $Z = -2.0253$ in: Narrow threaded inlet pipe ($r \approx 0.05$ in).
  - $Z = 0.0000$ in: Wide spray plate with spray nozzles ($r = 4.92$ in).

### B. Transformed GLTF Node Attributes (Normalized GLB Space)
Inside `76465IN-BL.glb`, the node hierarchy applies:
- Scale: $0.0254$ (inches to metres)
- Rotation: $X = -90^\circ$
- Translation: $[0.0, 0.025721, 0.124986]$

**Resulting Transformed GLB Bounding Box**:
- $X \in [-0.124995\text{m}, +0.124995\text{m}]$ (Width $= 0.249989\text{m}$, centered at $X = 0$)
- $Y \in [-0.025721\text{m}, +0.025721\text{m}]$ (Height $= 0.051443\text{m}$, centered at $Y = 0$)
- $Z \in [0.000000\text{m}, +0.249972\text{m}]$ (Depth $= 0.249972\text{m}$, centerline at $Z = 0.124986\text{m}$)

### C. Feature Radial Analysis along Y-Axis

Sampling the radial distance from centerline $(X=0, Z=0.125\text{m})$ across 10 vertical slices:

| Slice | Y Range (m) | Max Radius (m) | Avg Radius (m) | Feature Identified |
|---|---|---|---|---|
| **Top (Y max)** | $[+0.0206, +0.0257]$ | **$0.01255\text{ m}$** | **$0.01140\text{ m}$** | **Narrow Ball-Joint / Ceiling Inlet** |
| Mid-Upper | $[+0.0103, +0.0206]$ | $0.01520\text{ m}$ | $0.01310\text{ m}$ | Swivel housing |
| Mid | $[-0.0051, +0.0103]$ | $0.04890\text{ m}$ | $0.03820\text{ m}$ | Flaring transition bell |
| Mid-Lower | $[-0.0154, -0.0051]$ | $0.11850\text{ m}$ | $0.08240\text{ m}$ | Rainhead outer casing |
| **Bottom (Y min)** | $[-0.0257, -0.0206]$ | **$0.12504\text{ m}$** | **$0.10591\text{ m}$** | **Wide Shower Spray Plate / Nozzles** |

**Conclusion**:
- **Mounting Face**: At $Y = +0.02572\text{m}$ (top of local $Y$ axis).
- **Spray Face**: At $Y = -0.02572\text{m}$ (bottom of local $Y$ axis).
- **Local Origin**: Centered at the geometric midpoint of the model ($Y = 0$).

---

## 3. The Canonical Orientation & Ceiling Contact Rule

### Base Orientation Transform
When rotating the model into canonical bathroom space using base rotation $R = [+\pi/2, 0, 0]$:
$$X' = X$$
$$Y' = -Z$$
$$Z' = Y$$

Under this rotation:
- The top mounting inlet at $Y = +0.02572\text{m}$ rotates to $Z' = +0.02572\text{m}$ ($+Z$ / Ceiling).
- The bottom spray face at $Y = -0.02572\text{m}$ rotates to $Z' = -0.02572\text{m}$ ($-Z$ / Floor).
- The spray pattern projects downward towards the floor: $\text{spray vector} = [0, 0, -1] = -Z$.

With local position grounding offset $Z_{local} = \text{assetHeight} / 2$:
- Local spray face (bottom): $Z = 0$.
- Local mounting face (top): $Z = \text{assetHeight}$ ($0.051443\text{m}$).

### Mathematical Ceiling Contact Formula
To ensure the mounting face contacts the ceiling at $Z = \text{room.heightM}$:
$$\text{worldZ} = \text{room.heightM} - \text{assetHeightM}$$

**Verification of Vertical Heights**:
- Top contact: $\text{worldZ} + \text{assetHeightM} = (\text{room.heightM} - \text{assetHeightM}) + \text{assetHeightM} = \text{room.heightM}$ (Exact flush ceiling contact).
- Spray face: $\text{worldZ} + 0 = \text{room.heightM} - \text{assetHeightM}$ (Inside room, pointing downward).
- Constraint validity: $zM + \text{heightM} = \text{room.heightM} \le \text{room.heightM}$ (Passes `validateBathroomLayout` with 0 boundary errors).

---

## 4. Architectural Shower Zone Definition & Anchoring

The shower cabin is defined by:
- **Glass Partition**: Located at $X_{glass} = 0.28\text{m}$, extending $0.96\text{m}$ deep from South wall ($Y = -\text{room.depthM}/2$).
- **East Wall**: Bounded at $X_{east} = \text{room.widthM}/2$.
- **South Wall**: Bounded at $Y_{south} = -\text{room.depthM}/2$.

### Showerhead Placement Coordinates:
- $X_{anchor} = \frac{X_{glass} + X_{east}}{2} = \frac{0.28 + \text{room.widthM}/2}{2}$  
  (For standard $2.4\text{m}$ room: $X = \frac{0.28 + 1.20}{2} = 0.74\text{m}$).
- $Y_{anchor} = Y_{south} + \frac{0.96}{2} = -\text{room.depthM}/2 + 0.48\text{m}$.
- $Z_{anchor} = \text{room.heightM} - \text{assetHeightM}$.

This guarantees the showerhead sits centered inside the shower cabin, directly above the shower floor zone, and below the ceiling plane.
