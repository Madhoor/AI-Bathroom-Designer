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
- Selected product codes: 21060IN-0, 24470IN-CP, 28529IN-0
- Product total: 496897
- Remaining budget: 3103
- Score: 84.87588
- Considered valid designs: 202
- Rejections: 90011T-0, 9301IN-CL-CP, 17629T-NS-0 failed spatial validation. | 90011T-0, 9301IN-CL-CP, 28529IN-0 exceeds budget or has incomplete price data. | 90011T-0, 9301IN-CL-CP, 3983IN-S-0 failed spatial validation. | 90011T-0, 9301IN-CL-CP, 8688T-S-0 failed spatial validation. | 90011T-0, 9301IN-ZX-RGD, 1381T-S-0 failed spatial validation. | 90011T-0, 9301IN-ZX-RGD, 17629T-NS-0 failed spatial validation. | 90011T-0, 9301IN-ZX-RGD, 28529IN-0 exceeds budget or has incomplete price data. | 90011T-0, 9301IN-ZX-RGD, 29777IN-0 exceeds budget or has incomplete price data. | 90011T-0, 9301IN-ZX-RGD, 3983IN-S-0 failed spatial validation. | 90011T-0, 9301IN-ZX-RGD, 8688T-S-0 failed spatial validation.

## Products and placements
### 21060IN-0 — Brazn™ 58.4 cm rectangular vessel bathroom sink
- Price: 16799 INR
- 3D asset: no normalized GLB in integration output
- Source OBJ URL: https://techcomm.kohler.com/techcomm/cad/21060IN.obj
- Placement: (-0.877, -0.661, 0.000) m; rotation (0, 0, 0)°; surface unknown; host none

### 24470IN-CP — ModernLife™ Rectangular 33 cm x 23 cm two-function rainhead, 12.0 lpm
- Price: 33599 INR
- 3D asset: no normalized GLB in integration output
- Source OBJ URL: https://techcomm.kohler.com/techcomm/cad/24470IN.obj
- Placement: (0.750, -0.434, 2.680) m; rotation (0, 0, 0)°; surface ceiling; host none

### 28529IN-0 — Leap™ One-piece round-front smart toilet, dual-flush
- Price: 446499 INR
- 3D asset: no normalized GLB in integration output
- Source OBJ URL: https://techcomm.kohler.com/techcomm/cad/28529IN.obj
- Placement: (0.000, 0.000, 0.000) m; rotation (0, 0, 0)°; surface unknown; host none

## Constraint validation
- Valid: true
- Errors: none
- Warnings: Optional vanity assembly is currently unavailable from verified catalogue relationships; no vanity was selected. | Products are closer than the generic design clearance of 0.60 m. | Products are closer than the generic design clearance of 0.60 m.

## Integration limitations
- The shower requirement is represented by the factual `rainhead` role because the current controlled role vocabulary has shower-zone roles but no generic `shower` product role.
- The normalized 3D output directory is checked as-is; missing GLBs are reported and never fabricated.
- No compatibility is inferred from names or proximity. Unresolved required relations remain warnings and do not become product selections.