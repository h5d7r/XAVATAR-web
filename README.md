# XAVATAR Maker

Browser-only image → `.xavatar` converter. No API, upload service, or backend.

## Run

Requires Node.js 22.12+ or 24+.

```sh
npm install
npm run dev
npm test
npm run build
```

Deploy the `dist` folder to any static host (GitHub Pages, Cloudflare Pages, etc.). Serve over HTTP/HTTPS, not file://. For subfolder hosting, build with `npm run build -- --base=./`.

## Output

A standard ZIP with `.xavatar` extension, containing exactly 11 root-level files:

- `avatar.png`, `picture.png` (440 × 440)
- `avatar440.dds`, `picture440.dds`
- `avatar260.dds`, `picture260.dds`
- `avatar128.dds`, `picture128.dds`
- `avatar64.dds`, `picture64.dds`
- `online.json`

DDS uses DXT5 with no mipmaps. Default framing stretches to square, center crop and transparent contain are optional. EXIF orientation is applied. Multi-frame images use the first frame. Input is limited to 20 MiB and 40 megapixels (resolution checked after decoding). Unsupported or corrupt formats report errors. Not literally every image codec is supported by the WASM build; SVG external delegates are not included.

The ~15 MB ImageMagick engine is bundled locally and runs inside a Web Worker to keep the interface responsive. Google Fonts requests contain no image data; system-font fallback works without them. Images are never sent to a server. There are no analytics or remote conversion calls.

## Provenance and licensing

- Visual tokens, typography, grid, and base CSS adapted from [m2k7m/re-region-web](https://github.com/m2k7m/re-region-web).
- Archive structure, dimensions, DXT5 setting, and online.json from [m2k7m/PS4-AVATAR-MAKER](https://github.com/m2k7m/PS4-AVATAR-MAKER).
- Inspired by the ImageMagick WASM approach in [p2r3/convert](https://github.com/p2r3/convert).
- ImageMagick WASM: Apache-2.0; JSZip: MIT/GPL dual license, used under MIT.
