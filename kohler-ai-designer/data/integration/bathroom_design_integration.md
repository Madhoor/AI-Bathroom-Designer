# KOHLER deterministic bathroom integration proof

## Result: SUCCESS
The deterministic engines produced a budget-compliant, spatially valid design from real catalogue records.

## Brief
- Room: 2.4384 m × 1.8288 m × 2.7432 m (8 ft × 6 ft × 9 ft)
- Budget: INR 500000
- Style: Luxury Modern
- Required zones: toilet, basin/vanity, shower

## Recommendation
- Recommendation generated: yes
- Selected product codes: 29777IN-0, 29961IN-CP, 90011T-0
- Product total: 480797
- Remaining budget: 19203
- Score: 84.23188
- Considered valid designs: 43
- Rejections: 90011T-0, 9301IN-CL-CP, 17629T-NS-0 failed spatial validation. | 90011T-0, 9301IN-CL-CP, 28529IN-0 exceeds budget or has incomplete price data. | 90011T-0, 9301IN-CL-CP, 3983IN-S-0 failed spatial validation. | 90011T-0, 9301IN-CL-CP, 8688T-S-0 failed spatial validation. | 90011T-0, 9301IN-ZX-RGD, 1381T-S-0 failed spatial validation. | 90011T-0, 9301IN-ZX-RGD, 17629T-NS-0 failed spatial validation. | 90011T-0, 9301IN-ZX-RGD, 28529IN-0 exceeds budget or has incomplete price data. | 90011T-0, 9301IN-ZX-RGD, 29777IN-0 exceeds budget or has incomplete price data. | 90011T-0, 9301IN-ZX-RGD, 3983IN-S-0 failed spatial validation. | 90011T-0, 9301IN-ZX-RGD, 8688T-S-0 failed spatial validation.

## Products and placements
### 29777IN-0 — Innate™ One-piece elongated smart toilet, dual-flush
- Price: 379999 INR
- 3D asset: no normalized GLB in integration output
- Source OBJ URL: https://techcomm.kohler.com/techcomm/cad/29777IN.obj
- Placement: (0.964, -0.650, 0.000) m; rotation (0, 0, 0)°; surface unknown; host none

### 29961IN-CP — ModernLife Edge™ 42.5 cm x 33 cm two-function rainhead, 2.0 and 11.5 lpm
- Price: 83999 INR
- 3D asset: no normalized GLB in integration output
- Source OBJ URL: https://techcomm.kohler.com/techcomm/cad/29961IN.obj
- Placement: (0.000, 0.000, 2.638) m; rotation (0, 0, 0)°; surface ceiling; host none

### 90011T-0 — Mica™ Vessel sink
- Price: 16799 INR
- 3D asset: no normalized GLB in integration output
- Source OBJ URL: https://techcomm.kohler.com/techcomm/cad/90011T.obj
- Placement: (-0.972, -0.790, 0.000) m; rotation (0, 0, 0)°; surface floor; host none

## Constraint validation
- Valid: true
- Errors: none
- Warnings: Optional vanity assembly is currently unavailable from verified catalogue relationships; no vanity was selected.

## Integration limitations
- The shower requirement is represented by the factual `rainhead` role because the current controlled role vocabulary has shower-zone roles but no generic `shower` product role.
- The normalized 3D output directory is checked as-is; missing GLBs are reported and never fabricated.
- No compatibility is inferred from names or proximity. Unresolved required relations remain warnings and do not become product selections.