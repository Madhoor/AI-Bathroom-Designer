# KOHLER AI Bathroom Designer

## Vision

Build a premium AI-powered bathroom design experience for the KOHLER hackathon.

The product should feel less like a traditional bathroom planner and more like a
premium product experience.

The visual benchmark is the level of polish, simplicity, spatial design, animation,
and attention to detail found in premium Apple product experiences.

The goal is:

"Apple-level presentation + Three.js spatial experience + AI-powered bathroom design."

The interface should make the user think:

"How is a bathroom planner doing THIS?"

---

# Core User Experience

User
→ Enter bathroom information
→ AI understands requirements
→ Generate multiple bathroom concepts
→ Explore the design in 3D
→ Interact with products
→ Modify the design using natural language
→ See price/compatibility changes instantly
→ Finalize and explore the recommended products

The 3D environment is not just a visualization at the end.

It is a central part of the product experience.

---

# Visual & UX Direction

## Design Philosophy

Prioritize:

- Minimalism
- Large visual spaces
- Strong typography
- High-quality imagery
- Smooth transitions
- Subtle animations
- Depth
- Sophisticated spacing
- Clear hierarchy
- Restrained use of color
- Premium materials
- Intuitive interactions

Avoid:

- Generic SaaS dashboards
- Crowded interfaces
- Excessive cards
- Excessive borders
- Random gradients
- Huge amounts of text
- Developer-looking UI
- Cluttered control panels
- UI that makes the 3D scene feel secondary

Every element should have a reason to exist.

---

# Visual Language

The interface should feel:

- Premium
- Architectural
- Calm
- Sophisticated
- Modern
- Spatial
- Editorial

Use generous whitespace.

Prefer large typography and visual storytelling over dense information.

Use neutral tones and let the bathroom/product materials provide most
of the visual character.

The UI should complement the 3D environment rather than compete with it.

---

# Motion

Motion is an important part of the experience.

Use animation for:

- Page transitions
- Entering the 3D designer
- Product selection
- Camera transitions
- Product replacement
- Material/finish changes
- Opening panels
- AI-generated design states
- Loading/generation states

Animations should feel intentional and physically coherent.

Avoid unnecessary animation.

Prefer subtle, smooth transitions over flashy effects.

---

# 3D Experience

Three.js / React Three Fiber is a core part of the application.

The bathroom should feel like a real spatial environment rather than a
collection of floating models.

Support:

- Orbit controls
- Smooth camera movement
- Realistic lighting
- Shadows
- Materials
- Product placement
- Product selection
- Product highlighting
- Finish changes
- Room dimensions
- Doors/windows where applicable
- Responsive camera behavior

The user should be able to understand the physical relationship between
products and the room.

The 3D scene should remain visually impressive even when placeholder
geometry is being used.

---

# Core Architecture

User Request
→ Input Analysis
→ AI Design Engine
→ Structured DesignCommand
→ Recommendation Engine
→ Constraint Engine
→ Design State
→ Three.js Renderer

The LLM must NOT directly manipulate Three.js.

The LLM produces structured commands.

Example:

{
  "type": "change_finish",
  "target": "faucets",
  "finish": "matte_black"
}

The application then validates the command and updates the design state.

---

# Recommendation Engine

Recommendations should consider:

- Bathroom dimensions
- Available space
- Product dimensions
- Product compatibility
- Budget
- Style
- Finish
- Product category
- Required accessories/components
- Catalogue availability

Separate recommendation logic from UI and Three.js.

Never hardcode product recommendations inside visual components.

---

# Product Data

Product information should be structured.

Example:

{
  "code": "K-XXXX",
  "name": "Product Name",
  "category": "toilet",
  "price": 100000,
  "dimensions": {
    "width": 700,
    "depth": 750,
    "height": 500
  },
  "styles": ["modern", "minimal"],
  "finishes": ["white"],
  "compatibleWith": [],
  "model": "/models/product.glb"
}

Product catalogue data must remain separate from rendering logic.

---

# Development Strategy

## Phase 1: Visual MVP

Build the experience first.

The initial MVP should allow a user to:

1. Enter bathroom dimensions
2. Select budget
3. Select style
4. Generate a design
5. Enter an interactive 3D bathroom
6. See placeholder bathroom products
7. Orbit around the scene
8. Select products
9. View a design summary

The first version should already look polished.

Do NOT build an ugly functional prototype and postpone design until the end.

Functionality and visual quality should develop together.

---

## Phase 2: Real KOHLER Products

Add real catalogue products.

Use official KOHLER product data and official 3D assets where available.

Preferred pipeline:

KOHLER Product Code
→ Official Product Page
→ 3D Asset
→ Optimized GLB
→ /public/models/

Do not block development waiting for the full catalogue.

Start with a small representative set of products.

---

## Phase 3: AI Design Engine

Add:

- Natural-language requirements
- Structured design commands
- Product recommendations
- Budget optimization
- Spatial constraints
- Compatibility checking
- Multiple generated concepts

Example:

"I want a luxury hotel-style bathroom under ₹5 lakh."

The system should translate this into structured requirements and generate
a coherent bathroom design.

---

## Phase 4: Conversational Modification

Allow users to modify the current design naturally.

Examples:

"Make the vanity wider."

"Change everything to matte black."

"Make this more luxurious."

"Bring it under ₹4 lakh."

"Replace the toilet with a smart toilet."

The AI should modify the existing design state rather than regenerate
everything unnecessarily.

---

# Interface Structure

The application should NOT resemble a traditional admin dashboard.

Possible experience:

Landing Page
→ Immersive introduction
→ Bathroom input
→ AI generation
→ Full-screen 3D designer
→ Minimal contextual controls
→ AI conversation
→ Product exploration
→ Final design summary

Controls should appear when needed rather than permanently filling the screen.

Use progressive disclosure.

---

# UI Principles

Prefer:

Large visual sections
over
dense grids.

Prefer:

Floating contextual controls
over
permanent sidebars.

Prefer:

Direct manipulation
over
forms.

Prefer:

Visual product selection
over
text-heavy lists.

Prefer:

One strong action
over
many competing buttons.

---

# Performance

Visual quality must not destroy performance.

Use:

- GLB assets
- Optimized meshes
- Texture compression where appropriate
- Level of detail where useful
- Lazy loading
- Dynamic imports for heavy 3D components
- Efficient React state management

Avoid unnecessarily large models and textures.

---

# Code Principles

- TypeScript
- Reusable components
- Clean separation of concerns
- Product data separate from UI
- Recommendation engine separate from UI
- AI layer separate from renderer
- Design state as the source of truth
- Avoid unnecessary dependencies
- Keep components understandable
- Optimize only where necessary

---

# Demo Priority

This is a hackathon project.

Prioritize features that create a strong live demonstration.

The ideal demo moment is:

User enters:

"8 × 6 ft bathroom, ₹5 lakh budget, luxury modern."

AI generates a design.

The camera smoothly transitions into the bathroom.

The user walks/orbits through the space.

Products are visibly selected and positioned.

The user says:

"Make it more luxurious and change the faucets to French Gold."

The bathroom changes live.

The user then says:

"Bring it under ₹4 lakh."

The system intelligently swaps products while preserving the overall design.

That interaction should be the centerpiece of the demo.

---

# Guiding Principle

Do not build a bathroom configurator with AI added to it.

Build an AI design experience where the bathroom itself becomes interactive.