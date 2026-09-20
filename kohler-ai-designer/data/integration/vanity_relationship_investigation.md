# Bathroom Vanity Relationship Investigation

## Scope and evidence policy

This is a factual data investigation only. It compares:

- normalized products, variants, assets, and relationship/assembly outputs;
- raw vanity crawl CSVs;
- captured vanity PDP/API responses in `data/_debug/`;
- product package contents, installation fields, features, and resource URLs.

No relationship is inferred from names, collection membership, dimensions,
visual similarity, catalogue proximity, or generic marketing language.

## Executive summary

The four recovered products are vanity **cabinets**, all wall-hung:

- `30460IN-MWF`
- `31601IN-E64`
- `30459IN-MWF`
- `30457IN-MWF`

All four have complete dimensions and an OBJ source asset. None has a
product-code-level relationship to a basin, vanity top, faucet, or other
catalogue product in the current resolved relationship or assembly outputs.
Their PDP records contain no structured required-accessory product codes.

Three products (`30460IN-MWF`, `30459IN-MWF`, and `30457IN-MWF`) explicitly say
that they pair with **any vanity top cut to size and a KOHLER vessel bathroom
sink, sold separately**. This is explicit category-level guidance, not a
specific product relationship. `31601IN-E64` says its rounded edges coordinate
with Forefront bathroom sinks; that is collection/category wording and does
not identify a compatible SKU.

Consequently, no complete vanity/basin assembly can currently be claimed as
factually resolved at product-code level.

## Product evidence table

| Vanity code | Vanity name | Dimensions | Explicit required components | Explicit compatible product codes | Compatible categories explicitly stated | Candidate products currently in catalogue | 3D asset | Confidence / evidence |
|---|---|---|---|---|---|---|---|---|
| `30460IN-MWF` | Luxe 90 cm wall-hung bathroom vanity cabinet | 57.9438 x 90.0113 x 43.0213 cm | Wall-mount cabinet; hardware kit; drawer mats; drawer trays; bottom basket; installation guide; warranty card | None | Vanity top cut to size; KOHLER vessel bathroom sink, sold separately | Vessel Basin products are category-level candidates only; no SKU is confirmed. `14031-BU-96` is a vanity-top product but does not cite this cabinet. | OBJ present; normalized asset rows present | High for cabinet facts; medium for category wording; no product-level compatibility. Raw CSV + captured PDP + spec PDF |
| `31601IN-E64` | Forefront 90 cm wall-hung bathroom vanity cabinet | 52.07 x 90.0113 x 52.07 cm | Wall-mount cabinet; hardware kit; installation guide; warranty card | None | Forefront bathroom sinks (worded as “coordinate with”); no explicit top or basin SKU | `2749T-1-0` is a Forefront 90 cm rectangular vessel sink, but the shared collection and matching nominal width do not prove compatibility. | OBJ present; normalized asset rows present | High for cabinet facts; low for SKU pairing. Raw CSV + captured PDP + spec PDF |
| `30459IN-MWF` | Luxe 75 cm wall-hung bathroom vanity cabinet | 57.9438 x 74.93 x 43.0213 cm | Wall-mount cabinet | None | Vanity top cut to size; KOHLER vessel bathroom sink, sold separately | Vessel Basin products are category-level candidates only; no SKU is confirmed. `14031-BU-96` states it fits industry-standard 30 in vanities, but does not identify this cabinet. | OBJ present; normalized asset rows present | High for cabinet facts; medium for category wording; no product-level compatibility. Raw CSV + captured PDP + spec PDF |
| `30457IN-MWF` | Prologue 75 cm wall-hung bathroom vanity cabinet | 57.9438 x 73.9775 x 43.0213 cm | Wall-mount cabinet; hardware kit; drawer mats; drawer trays; bottom basket; installation guide; warranty card | None | Vanity top cut to size; KOHLER vessel bathroom sink, sold separately | Vessel Basin products are category-level candidates only; no SKU is confirmed. `14031-BU-96` does not cite this cabinet. | OBJ present; normalized asset rows present | High for cabinet facts; medium for category wording; no product-level compatibility. Raw CSV + captured PDP + spec PDF |

## Detailed findings

### Package contents and required components

The `required_components` values are package contents, not compatible product
references:

- `30460IN-MWF`: wall-mount cabinet, hardware kit, drawer mats/trays, bottom
  basket, installation guide, warranty card.
- `31601IN-E64`: wall-mount cabinet, hardware kit, installation guide,
  warranty card.
- `30459IN-MWF`: wall-mount cabinet.
- `30457IN-MWF`: wall-mount cabinet, hardware kit, drawer mats/trays, bottom
  basket, installation guide, warranty card.

The captured PDP/API fields `RequiredAccessoryGroupName_ss`,
`RequiredAccessoryGroupProduct_ss`, `Recommended_Accessories_ss`,
`BundleList_ss`, and `relatedProduct_s` do not provide a resolved basin,
vanity-top, or faucet SKU for these four products. The normalized relationship
file has zero rows whose source is any of the four vanity codes. The normalized
assembly file also has zero rows for these codes.

### Installation and component semantics

All four PDP records state `Wall-hung`; three also explicitly say installation
hardware is included. The records do not say that a basin, vanity top, or
faucet is included in the cabinet package. The Luxe and Prologue records
explicitly say the vanity top and vessel sink are sold separately.

No faucet is named as a required or compatible product for any vanity. A
faucet must therefore not be attached to a vanity from this data.

### Variants

The seven captured variants are finish variants only:

- `30460IN-MWF`: `30460IN-MWF`, `30460IN-N21`
- `31601IN-E64`: `31601IN-E64`
- `30459IN-MWF`: `30459IN-MWF`, `30459IN-N21`
- `30457IN-MWF`: `30457IN-MWF`, `30457IN-PSH`

Variant records contain finish/color names and product URLs, but no basin,
top, faucet, or accessory relationship.

### Assets and documents

Each vanity has a captured OBJ, SKP, 3DS, and RFA source asset, plus CAD
drawings and a specification PDF. Installation PDFs were captured for three
of the four products; the current asset rows do not show a separate
installation PDF for `30459IN-MWF`. These resources establish the products'
existence and documentation, but no compatibility relationship was extracted
from their URLs.

## Existing catalogue candidates

The current 292-product catalogue includes:

- `14031-BU-96`: Marrakesh vanity-top with single faucet hole. Its own feature
  text says it fits industry-standard 30 in vanities and pairs with specific
  Marrakesh/Camber basin products (`K-14046-BU` or `K-2349`). It does not
  identify any of the four recovered vanity cabinets.
- `2749T-1-0`: Forefront 90 cm rectangular vessel bathroom sink. It shares
  “Forefront” wording and nominal width with `31601IN-E64`, but no explicit
  product-to-product relation was captured. Collection and dimensions alone are
  insufficient.
- `2349IN-FDL-96`: Quila Camber undermount basin. Its feature text says it
  fits industry-standard 30 in vanities and pairs with the `K-2447IN-FDL`
  Quila vanity top, not with any of the four recovered cabinet codes.
- Other vessel and basin products are present, but none is explicitly
  referenced by a recovered vanity PDP/API record.

These are acquisition leads, not valid pairings. The current relationship
layer correctly does not connect them to the vanity cabinets.

## Answers to the requested questions

### 1. Can any vanity be paired with a currently catalogued basin using explicit factual evidence?

**No, not at product-code level.** Three PDPs explicitly allow a KOHLER
vessel bathroom sink category, but they do not identify a SKU. The Forefront
PDP references Forefront sinks as a coordinating category/collection phrase,
not a compatible product code.

### 2. Can any vanity be paired with `2211IN-0`?

**No.** `2211IN-0` is a Caxton undercounter lavatory. The vanity PDPs do not
reference `2211IN-0`, Caxton, an undercounter basin, or an undercounter
installation. The Luxe and Prologue text explicitly names a vessel sink
category instead. No resolved relationship or assembly row connects
`2211IN-0` to any vanity.

### 3. If not, is another currently catalogued basin factually appropriate?

**No product-level pairing is currently proven.** `2749T-1-0` is an
interesting Forefront candidate for investigation, and `14031-BU-96` and
`2349IN-FDL-96` contain their own explicit basin/top relationships, but none
names one of the four vanity cabinets. They must remain unpaired until
product-level evidence is captured.

### 4. Is a vanity top missing and therefore blocking a complete assembly?

**A vanity-top category is not entirely missing**, because the catalogue
contains at least `14031-BU-96` and `2749T-1-0` under the current vanity-top
basin classification. However, the cabinet crawl did not provide a
cabinet-specific vanity-top SKU, and the current records do not establish a
complete cabinet → top → basin assembly for any of the four cabinets.
Therefore, a verified top relationship is still missing and blocks a
complete factual assembly.

### 5. What should be crawled next?

The next acquisition should be a focused **vanity-top / countertop PLP and
PDP crawl**, including all product-resource, installation, package-content,
and structured accessory/relationship fields. It should also follow every
explicit SKU or internal-ID reference found in those PDPs.

In particular, investigate:

1. vanity-top products associated with the 90 cm Forefront cabinet and the
   75/90 cm Luxe/Prologue cabinets;
2. the explicit basin/top references already present in the catalogue:
   `K-2447IN-FDL`, `K-14046-BU`, and `K-2349`;
3. the Forefront 90 cm sink candidate `2749T-1-0`, but only for direct PDP
   evidence linking it to `31601IN-E64`;
4. any KOHLER PLP category for vanity tops/countertops that is distinct from
   basin products.

Do not create compatibility from shared collection names, matching
dimensions, or generic “fits industry-standard vanity” text.

## Recommended next data acquisition step

**Crawl the dedicated vanity-top/countertop category and its PDPs, then
resolve every explicit basin/top/cabinet reference by SKU or internal ID.**
This is the smallest acquisition step likely to produce a legitimate,
product-level vanity assembly without changing recommendation or placement
logic.

