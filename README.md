# XAVATAR-web

A client-side web tool to create and convert to `.xavatar` directly in your browser.

> [!NOTE]
> This tool is provided for educational and customization purposes. Please ensure you have the right to use and modify the images you convert. The author is not responsible for any issues arising from the use of generated files on modified hardware.

## Run

Requires Node.js 22.12+ or 24+.

```sh
npm install
npm run dev
npm test
npm run build
```

## Features

- **Batch Processing:** Convert up to 50 images at once.
- **100% Local Processing:** Everything happens on your device. No images are sent or uploaded to any external website, server, or third-party service.
- **Strict Privacy:** Nothing is recorded or stored.
- **Zero Tracking:** Does not log your IP address, email, visit counts, or any other personal data. No external analytics are used.

## Usage

1. Open the web page in your browser.
2. Select your image ( supports up to 50 images ).
3. Convert and download your ready-to-use .xavatar file(s).

## Contributing

Pull requests are welcome.

## License

[MIT](LICENSE)

## Provenance and licensing

- Visual tokens, typography, grid, and base CSS adapted from [m2k7m/re-region-web](https://github.com/m2k7m/re-region-web).
- Archive structure, dimensions, DXT5 setting, and online.json from [m2k7m/PS4-AVATAR-MAKER](https://github.com/m2k7m/PS4-AVATAR-MAKER).
- Inspired by the ImageMagick WASM approach in [p2r3/convert](https://github.com/p2r3/convert).
- ImageMagick WASM: Apache-2.0; JSZip: MIT/GPL dual license, used under MIT.
