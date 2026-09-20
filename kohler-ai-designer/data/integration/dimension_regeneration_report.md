# Dimension regeneration report

## Change scope

Only the confirmed structured-dimension extraction bug was fixed:

- centimetre `ProductOverall*Cm_d` fields remain preferred;
- complete `ProductOverall*Inches_s` fields are now parsed when centimetre
  fields are unavailable;
- mixed fractions such as `28-1/2"` are supported;
- inch values are converted with the exact factor `1 in = 2.54 cm`;
- shipping/package fields and malformed freeform text remain excluded from
  reliable product dimensions.

No recommendation, design, constraint, React, or Three.js code was changed.

## Regeneration source

The existing raw crawl output was updated from captured PDP/API responses in
`data/_debug/`; the KOHLER website was not re-crawled. The normalizer was then
run against the regenerated `data/kohler_products.csv`.

## Results

| Metric | Before | After |
|---|---:|---:|
| Products with complete dimensions | 0 | 174 |
| Products still missing dimensions | 264 | 112 |
| Products marked ambiguous by normalized status | 0 | 0 |
| Products with known ambiguous/malformed source evidence | 1 representative case | 1 representative case |
| Recovered from complete structured inch fields | — | 174 |

The “before” complete count uses the previous normalized catalogue's
`has_full_3d_dimensions` flag. The “after” count uses the regenerated
normalized catalogue. The known malformed/ambiguous source case is
`11160T-1-0`, whose captured PDP contains `Dimensions: 560*45.4 cm` without a
complete, unambiguous overall product triplet. It remains unparsed.

## Representative recovered products

| Product code | Product | Raw structured source | Normalized dimensions (mm) | Source / status |
|---|---|---|---:|---|
| `3983IN-S-0` | Reach one-piece toilet | `28-1/2"` × `14-3/8"` × `28-7/16"` | `723.90 × 365.12 × 722.31` | captured PDP inch fields → converted; complete |
| `28529IN-0` | Leap smart toilet | `26-3/4"` × `14-1/2"` × `19-5/16"` | `679.45 × 368.30 × 490.54` | captured PDP inch fields → converted; complete |
| `2211IN-0` | Caxton undercounter lavatory | `21-1/8"` × `17-1/4"` × `7-7/16"` | `536.58 × 438.15 × 188.91` | captured PDP inch fields → converted; complete |
| `9301IN-CL-CP` | ModernLife Edge rainhead | `15-1/8"` × `2-3/8"` × `15-1/8"` | `384.17 × 60.32 × 384.17` | captured PDP inch fields → converted; complete |
| `73037IN-CL-CP` | Rainduet Edge rainhead | `8"` × `8"` × `2-5/16"` | `203.20 × 203.20 × 58.74` | captured PDP inch fields → converted; complete |

The normalized dimension order follows the existing crawler convention:
length → width → height in the grouped source string, then the normalizer
stores those values in its existing width/depth/height columns.

## Validation

- Focused parser tests: 8 passed.
- Full JavaScript test suite: 29 passed.
- `npm run lint`: passed.
- `npm run build`: passed.
