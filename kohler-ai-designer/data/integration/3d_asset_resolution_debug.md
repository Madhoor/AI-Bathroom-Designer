# 3D asset resolution debug

## Root cause

The renderer was resolving against the wrong catalogue. Both server routes used
the development sample paths:

- `data/3d_catalogue_sample/manifest.json`
- `data/3d_catalogue_sample/normalized_glb`

The generated DesignState product codes are present in the production
catalogue, not the 10-asset sample catalogue. Product-code matching was exact
and did not require URL decoding or normalization.

## Production manifest evidence

The exact rows in `data/3d_catalogue/manifest.csv` are:

| Product code | Output path | Status |
|---|---|---|
| `2211IN-0` | `data/3d_catalogue/normalized_glb/2211IN-0.glb` | success / valid |
| `29777IN-0` | `data/3d_catalogue/normalized_glb/29777IN-0.glb` | success / valid |
| `9301IN-ZX-RGD` | `data/3d_catalogue/normalized_glb/9301IN-ZX-RGD.glb` | success / valid |

All three files exist:

| Product code | Resolved filesystem path | Size |
|---|---|---:|
| `2211IN-0` | `D:\Kohler\Kohler\kohler-ai-designer\data\3d_catalogue\normalized_glb\2211IN-0.glb` | 373,892 bytes |
| `29777IN-0` | `D:\Kohler\Kohler\kohler-ai-designer\data\3d_catalogue\normalized_glb\29777IN-0.glb` | 822,184 bytes |
| `9301IN-ZX-RGD` | `D:\Kohler\Kohler\kohler-ai-designer\data\3d_catalogue\normalized_glb\9301IN-ZX-RGD.glb` | 452,100 bytes |

The manifest paths are relative filesystem paths using forward slashes. They
are not browser URLs and do not contain URL encoding.

## Endpoint results before the fix

| Endpoint | HTTP | Content type | GLB bytes | Manifest match |
|---|---:|---|---|---|
| `/api/asset-manifest` | 200 | `application/json` | no | sample manifest only |
| `/api/3d-assets/2211IN-0` | 404 | `text/plain` | no | no match in sample manifest |
| `/api/3d-assets/29777IN-0` | 404 | `text/plain` | no | no match in sample manifest |
| `/api/3d-assets/9301IN-ZX-RGD` | 404 | `text/plain` | no | no match in sample manifest |

The browser therefore received an asset manifest with no entries for its three
placements and reported `Assets loaded: 0` / `Assets missing: 3`.

## Fix

The two routes now read the existing production manifest and serve from the
existing production normalized GLB directory. No assets were regenerated,
redownloaded, or modified.
