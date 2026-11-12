# Language fonts

1. Add a font file to this folder. Match the filename to the language file in `../JSON/`. For example, `ar.ttf` applies to `ar.json`, and `pt-BR.woff2` applies to `pt-BR.json`.
2. Use `.woff2`, `.woff`, `.ttf`, or `.otf`. If several files match the same language, the site uses the first format in that order. If no file matches, it uses its default fonts.
3. Before submitting a font, make sure its license permits redistribution. Include the original license and copyright notice alongside it. Add a row below with the filename, font name, source link, and license link.
4. Run `npm run dev` and switch to the language to check the font.

| File | Font | Source | License |
| --- | --- | --- | --- |
| Loaded from Google Fonts | Bricolage Grotesque | [Atelier Triay](https://github.com/ateliertriay/bricolage) | [SIL Open Font License 1.1](https://github.com/google/fonts/blob/main/ofl/bricolagegrotesque/OFL.txt) |
| Loaded from Google Fonts | Fira Code | [Fira Code project](https://github.com/tonsky/FiraCode) | [SIL Open Font License 1.1](https://github.com/tonsky/FiraCode/blob/master/LICENSE) |

Arabic uses the browser's installed fallback fonts until a matching file is added here.
