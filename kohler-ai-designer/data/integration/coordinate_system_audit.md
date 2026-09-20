# Coordinate-system audit

## Findings before this integration fix

| Layer | Units | Horizontal axes | Vertical axis | Origin/reference |
|---|---|---|---|---|
| Constraint engine | metres | `xM` = width, `zM` = depth | `yM` | room south-west floor corner; product position is footprint center in X/Z and bottom in Y |
| DesignState placement candidates | metres | `position.x` = width, `position.z` = depth | `position.y` | room corner; floor products used `y=0` |
| Existing room renderer | Three.js units/metres | X width, Z depth | Y | shell was translated to positive X/Z while camera/tiles mixed local and world coordinates |
| Normalized GLB local coordinates | metres | X = width, Z = depth | Y = height | X/Y centered by the production script; Z grounded at zero |
| Existing renderer asset transform | none beyond placement rotation | assumed GLB X/Y/Z matched renderer X/Y/Z | assumed Y | direct primitive under the placement group |

The normalized pipeline applies scale `0.0254`, then `X=-90°`, then centers
post-rotation X/Y and grounds post-rotation Z. Therefore a normalized GLB's
actual local bounds are `X=width, Y=height, Z=depth`; its local vertical
origin is centered, while its local depth origin is grounded. This is why
directly placing the GLB with a DesignState Y/Z convention made products look
underground or rotated relative to the room.

The generated state also had a separate issue: its room coordinates were
corner-origin (`0..width`, `0..depth`) while the renderer shell was partly
center-origin and partly translated into positive coordinates.

## Canonical contract after this fix

The application world is now:

- metres;
- X = room width;
- Y = room depth;
- Z = vertical;
- finished floor = `Z=0`;
- room floor origin = room center `(0, 0, 0)`;
- room bounds = `[-width/2, width/2] × [-depth/2, depth/2]`;
- DesignState placement position = footprint center in X/Y and bottom-center
  in Z;
- DesignState rotation = rotation around world Z;
- constraint footprints operate in the X/Y floor plane;
- vertical validation operates on `zM`;
- room shell, camera target, lights, floor, walls, and ceiling use the same
  origin and axes.

## GLB adapter contract

The existing production GLBs are not rewritten. Their validated local contract
is preserved:

- local X = width;
- local Y = height;
- local Z = depth;
- local X/Y are centered;
- local Z starts at zero;
- scale and `X=-90°` are already baked into the GLB.

The renderer applies one generic local adapter to every asset:

1. translate local Y by `height/2` so its centered vertical bounds become
   bottom-relative;
2. translate local Z by `-depth/2` so its grounded depth bounds become
   centered;
3. rotate local coordinates by `+90°` around X, mapping
   `(local X, local Y, local Z)` to canonical `(world X, world Z, -world Y)`;
4. apply the DesignState world Z rotation and world position once.

No product-specific offsets are used. The manifest normalized bounds provide
the generic local height/depth values.

## Verification targets

The contract is exercised against the generated products:

- `2211IN-0`
- `29777IN-0`
- `9301IN-ZX-RGD`

Their source GLBs remain the production files under
`data/3d_catalogue/normalized_glb`.
