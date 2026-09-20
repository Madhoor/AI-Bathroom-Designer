# KOHLER AI Bathroom Designer

A template-driven AI bathroom design experience built around real KOHLER catalogue data, deterministic spatial reasoning, 3D product assets, an interactive bathroom renderer, and a manual layout editor.

> **Important:** The repository uses real KOHLER catalogue data collected and normalized for the project. Product prices, dimensions, finishes, compatibility, and specifications should not be invented or approximated.

---

# 1. START HERE: RUN THE PROJECT NOW

## Project Links

- **GitHub Repository:** https://github.com/Madhoor/Kohler
- **Google Drive:**https://drive.google.com/drive/folders/1eBxJZsjufuaTgcwoMJtpp9ARANzxaSJi?usp=sharing

The Google Drive link can be used for the supporting project files/assets or any files that are too large to keep in the GitHub repository.

This is the only section you need for a normal demo/development start.

## Prerequisites

Install:

- Node.js
- npm
- Python 3
- Git

A current Node.js LTS release is recommended.

## Start the website

From the project folder:

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Main routes:

```text
/             → main AI Bathroom Designer
/designer     → generated bathroom / 3D design
/catalogue    → KOHLER 3D product catalogue
```

Stop the server with:

```text
Ctrl + C
```

## Check that everything works

Run:

```bash
npm test
npm run lint
npm run build
```

For a normal demo, you do **not** need to rebuild the catalogue or 3D assets every time.

The repository already contains the normalized catalogue and production 3D catalogue used by the current application.

## Quick demo flow

1. Open `http://localhost:3000`
2. Click **Start Designing**
3. Choose a template or enter your own bathroom dimensions
4. Set budget, style, and required fixtures
5. Generate the design
6. Explore the 3D reveal
7. Open **Edit Layout** for manual 3D/floor-plan editing
8. Inspect the selected KOHLER products and budget
9. Open `/catalogue` to browse the available 3D products

---

# 2. FOR DEVELOPERS: PROJECT DETAILS, DATA, PIPELINES & TROUBLESHOOTING

## What this project does

The intended product flow is:

```text
Landing
   ↓
Design Brief
   ↓
Design Generation
   ↓
3D Bathroom Reveal
   ↓
Product Breakdown + Budget
   ↓
Manual 3D / Floor Plan Editing
   ↓
Design History / Restore
```

The project is designed so that:

- factual KOHLER catalogue data is the source of product information
- the recommendation engine selects products deterministically
- the constraint engine validates spatial feasibility
- `DesignState` is the single source of truth for a generated layout
- Three.js / React Three Fiber renders the generated design
- manual editing changes the same `DesignState`
- normalized GLB assets are reused in both the catalogue and bathroom renderer

The AI modification layer is still an area for future refinement. The current stable build should be treated as the baseline.

## Tech stack

- Next.js 16.3.5
- React
- TypeScript
- Tailwind CSS
- React Three Fiber
- Three.js
- `@react-three/drei`
- Zustand
- Zod
- Vitest
- Python scripts for catalogue and 3D asset processing

The project uses the Next.js App Router.

## Production build

Check the application with:

```bash
npm run lint
npm run build
```

Run the production server after a successful build with:

```bash
npm run start
```

## Tests

Run the full automated test suite:

```bash
npm test
```

The repository contains unit and integration coverage for areas including:

- spatial constraints
- recommendation
- DesignState
- placement
- manual editing
- product semantics
- product orientation
- renderer behavior
- catalogue behavior
- design variants
- editor state
- AI command/parsing infrastructure

A passing test suite confirms the deterministic logic is behaving according to its tests. Always perform browser verification for visual/interaction changes.

## Project structure

```text
kohler-ai-designer/
├── src/
│   ├── app/
│   │   ├── page.tsx
│   │   ├── designer/
│   │   └── api/
│   ├── components/
│   │   ├── BathroomCanvas/
│   │   ├── editor/
│   │   ├── experience/
│   │   └── ...
│   ├── data/
│   └── lib/
│       ├── catalogue/
│       ├── constraints/
│       ├── design/
│       ├── editor/
│       ├── recommendation/
│       ├── renderer/
│       ├── templates/
│       └── ai/
├── data/
│   ├── master/
│   ├── integration/
│   └── 3d_catalogue/
├── scripts/
├── docs/
├── public/
└── AGENTS.md
```

`AGENTS.md` is the main project-level guidance document for agent-assisted development.

## Important data files

### Normalized product catalogue

```text
data/master/kohler_products_normalized.csv
```

Related files:

```text
data/master/kohler_variants_normalized.csv
data/master/kohler_assets_normalized.csv
data/master/kohler_asset_links.csv
data/master/kohler_categories_normalized.csv
data/master/kohler_catalogue.json
```

### Production 3D catalogue

```text
data/3d_catalogue/
```

Important files:

```text
data/3d_catalogue/manifest.csv
data/3d_catalogue/validation_report.csv
data/3d_catalogue/normalized_glb/
```

The current production asset pipeline successfully converted 229 OBJ assets into normalized GLBs. Products without an OBJ asset remain unavailable for that 3D path and should not be fabricated.

## Rebuilding the 3D catalogue

The production 3D pipeline is handled by:

```bash
python scripts/build_3d_catalogue.py
```

### Preview first

```bash
python scripts/build_3d_catalogue.py --dry-run
```

### Small sample

```bash
python scripts/build_3d_catalogue.py --sample
```

### Full production conversion

```bash
python scripts/build_3d_catalogue.py
```

This downloads/caches product-linked OBJ assets, converts them to GLB, applies the validated metric normalization pipeline, and writes the production manifest/report.

Do not edit generated GLBs manually.

## Catalogue data pipeline

Relevant scripts include:

```text
scripts/crawl_kohler_api.py
scripts/normalize_kohler_catalogue.py
```

The crawler extracts structured product information, including dimensions where available.

The pipeline uses:

```text
1 inch = 2.54 cm
1 inch = 0.0254 m
```

Shipping/package dimensions are intentionally excluded from product dimensions.

## Design generation architecture

```text
User Brief
   ↓
DesignRequirements
   ↓
Recommendation Engine
   ↓
DesignState / Placement
   ↓
Constraint Validation
   ↓
3D Asset Resolution
   ↓
React Three Fiber Renderer
```

### Recommendation engine

Located under:

```text
src/lib/recommendation/
```

### Constraint engine

Located under:

```text
src/lib/constraints/
```

Generic clearance values are application heuristics, not official KOHLER installation requirements.

### Design state

Located under:

```text
src/lib/design/
```

`DesignState` is the authoritative representation of:

- room
- selected products
- assemblies
- placements
- total product cost
- budget
- style
- warnings
- validation

## 3D coordinate system

Canonical bathroom world:

```text
X = room width
Y = room depth
Z = vertical
Units = metres
Finished floor = Z = 0
```

Keep normalized GLBs separate from world placement logic.

Do not add arbitrary product-specific offsets to fix orientation or grounding problems.

## Manual bathroom editor

The generated bathroom can be opened in a dedicated full-screen editor.

It supports:

```text
3D Perspective
Architectural Floor Plan
```

and:

```text
Move
Rotate
Replace
Remove
Undo
Redo
Save Layout
Exit
```

Movement:

```text
Select product
   ↓
Move
   ↓
Preview follows pointer
   ↓
Click to place
   ↓
Position freezes
   ↓
Validate
   ↓
Done
```

3D and floor plan both represent the same `DesignState`.

## Product relationships

The application distinguishes:

```text
Vanity
  ↓ supports
Basin
  ↓ may host
Faucet
```

Product identity comes from factual catalogue/semantic data, not mesh shape or substring matching.

## Development API routes

```text
/api/design-state
/api/asset-manifest
/api/3d-assets/[productCode]
```

These should serve the production normalized catalogue/3D catalogue, not the old 10-model sample directory.

## Working with real catalogue data

When changing catalogue-driven behavior:

1. Use the normalized catalogue.
2. Preserve the original product code.
3. Use the actual price.
4. Use factual dimensions when present.
5. Preserve known finish/specification data.
6. Do not invent compatibility.
7. Do not use shipping dimensions as physical dimensions.
8. Do not fabricate a 3D asset.
9. Keep uncertain data explicitly uncertain.

## Browser verification

For UI/3D changes, do not rely only on automated tests.

Start the app:

```bash
npm run dev
```

Then verify the actual browser flow.

For 3D:

```text
- model loads
- model orientation
- model scale
- floor contact
- wall/ceiling attachment
- camera behavior
- lighting
- material readability
- no visible z-fighting
```

For editor:

```text
- select
- move
- click-to-place
- rotate
- replace
- remove
- invalid placement
- cancel
- apply/save
- undo
- redo
- 3D ↔ floor plan synchronization
```

## Safe agent workflow

Recommended workflow:

```text
Inspect
  ↓
Make one focused change
  ↓
Run tests
  ↓
Run lint/build
  ↓
Open browser
  ↓
Interact with the feature
  ↓
Visually verify
  ↓
Continue
```

For visual 3D tasks, verify the running application rather than relying only on source-code reasoning.

## Troubleshooting

### Page does not start

```bash
npm install
npm run dev
```

Check that another process is not using port 3000.

### Products load but 3D is missing

Check:

```text
data/3d_catalogue/manifest.csv
data/3d_catalogue/normalized_glb/
```

and:

```text
/api/asset-manifest
/api/3d-assets/<productCode>
```

### Product missing from recommendation

Check:

- complete dimensions
- role
- price
- required host data
- compatibility information

The recommendation engine intentionally rejects candidates when required factual data is insufficient for safe spatial validation.

### 3D model looks wrong

Check:

- normalized asset orientation
- orientation profile
- mounting surface
- canonical world coordinates
- preview-space transform
- bounding-box scale

Keep orientation changes centralized.

## Known limitations

- Not every catalogue product has a usable GLB asset.
- Some catalogue records still lack complete physical dimensions.
- Some product relationships remain unresolved.
- Generic spatial clearances are application heuristics, not official KOHLER requirements.
- 3D model orientation/scale may still require further asset-by-asset review.
- AI modification behavior and budget-preserving edits are still areas for future refinement.

## Current project philosophy

```text
AI understands the user's intent
          ↓
Deterministic engine decides what is feasible
          ↓
DesignState becomes the source of truth
          ↓
3D renderer shows the result
          ↓
User can manually edit the layout
          ↓
Constraint engine validates the change
```

The renderer should never become the hidden source of truth.

The LLM should never directly manipulate Three.js objects.

The catalogue should remain factual.

The design experience should feel like a premium architectural service rather than a generic chatbot or CAD application.

## 20. Typical development workflow

For most feature work:

```bash
# 1. Start the app
npm run dev

# 2. Develop / test in browser

# 3. Run automated tests
npm test

# 4. Run lint
npm run lint

# 5. Run production build
npm run build
```

For catalogue/3D data changes, also run the relevant Python scripts and validation reports before testing the website.

---

## 21. Safe agent workflow

When using an agent such as GitHub Copilot or Antigravity:

### Good workflow

```text
Inspect
  ↓
Make one focused change
  ↓
Run tests
  ↓
Run lint/build
  ↓
Open browser
  ↓
Interact with the actual feature
  ↓
Take screenshots / verify visually
  ↓
Continue
```

For visual 3D work, browser verification should use the actual running application rather than relying only on source-code reasoning.

For large tasks, work in phases and keep the deterministic systems protected.

---

## 22. Current project philosophy

The intended architecture is:

```text
AI understands the user's intent
          ↓
Deterministic engine decides what is feasible
          ↓
DesignState becomes the source of truth
          ↓
3D renderer shows the result
          ↓
User can manually edit the layout
          ↓
Constraint engine validates the change
```

The renderer should never become the hidden source of truth.

The LLM should never directly manipulate Three.js objects.

The catalogue should remain factual.

The design experience should feel like a premium architectural service rather than a generic chatbot or CAD application.

---

## 23. Quick start

For someone cloning the repository for the first time:

```bash
git clone <repository-url>
cd kohler-ai-designer

npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Then:

```bash
npm test
npm run lint
npm run build
```

For a fresh 3D asset rebuild:

```bash
python scripts/build_3d_catalogue.py --dry-run
python scripts/build_3d_catalogue.py
```

---

## 24. Troubleshooting

### The page does not start

Check:

```bash
npm install
npm run dev
```

and confirm another process is not already using port 3000.

### Products load but 3D is missing

Check:

```text
data/3d_catalogue/manifest.csv
data/3d_catalogue/normalized_glb/
```

and verify the product has a usable GLB.

Also check:

```text
/api/asset-manifest
/api/3d-assets/<productCode>
```

### A product is missing from recommendation

Check its normalized record for:

- complete dimensions
- role
- price
- required host data
- compatibility information

The recommendation engine intentionally rejects candidates when required factual data is insufficient for safe spatial validation.

### A 3D model looks wrong

Do not immediately add a product-specific rotation.

Check:

- normalized asset orientation
- orientation profile
- mounting surface
- canonical world coordinates
- preview-space transform
- bounding-box scale

Keep orientation changes centralized.

---

## 25. Current known limitations

- Not every catalogue product has a usable GLB asset.
- Some catalogue records still lack complete physical dimensions.
- Some product relationships remain unresolved.
- Generic spatial clearances are application heuristics, not official KOHLER requirements.
- 3D model orientation/scale may still require further asset-by-asset review.
- AI modification behavior and budget-preserving edits are still areas for future refinement.

---

## 26. Final verification

Before pushing a meaningful change:

```bash
npm test
npm run lint
npm run build
```

Then open the relevant route in the browser and verify the actual user interaction.

For 3D/editor changes, browser verification is required before treating the change as complete.
