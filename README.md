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

- **Direct Image Links:** Import an image using its HTTP(S) URL, preview it, and convert it to `.xavatar`.
- **Arabic & English:** The URL input, loading status, and error messages follow the selected language.
- **Batch Processing:** Convert up to 50 images at once.
- **100% Local Processing:** Conversion happens on your device. Local images are not uploaded. URL imports contact the image host directly, without a proxy.
- **Privacy:** Images are processed in your browser. A cookie remembers your selected language.
- **Zero Tracking:** Does not log your IP address, email, visit counts, or any other personal data. No external analytics are used.

## Usage

### From your device

1. Drop images onto the upload area or click **browse files**.
2. Check the previews and choose the image fit for each image.
3. Click **Convert & download**. One image produces a `.xavatar` file; multiple images produce `AVATARS.zip`.

### From a link

1. Paste a direct image URL into **Or use a direct image link**.
2. Click **Load image** and wait for the preview.
3. Adjust the image fit if needed, then click **Convert & download**.

You can add more links one at a time and combine linked images with local files in the same batch.

### Link requirements and limits

- Use a public HTTP(S) link to the image itself, not a gallery, webpage, or sharing page. Links containing login credentials are rejected.
- The image host must allow cross-origin requests (**CORS**). On an HTTPS website, use HTTPS image links to avoid mixed-content blocking.
- Maximum input size: **20 MB per image**, **50 images**, and **200 MB total**. URL downloads enforce the remaining batch capacity while streaming.
- URL downloads time out after **60 seconds**. Empty files, server errors, and text/webpage responses show an error; the existing conversion engine checks image compatibility.
- If a link fails because its host blocks access, download the image manually and select it from your device.

Conversion remains local. Importing a URL makes a request directly to the image host, which can see normal request information such as your IP address. No proxy is used; the request omits browser credentials and the referrer.

## Contributing

Pull requests are welcome.

See [Add a language](i18n/README.md) to contribute a translation.

## License

[MIT](LICENSE)

## Provenance and licensing

- Visual tokens, typography, grid, and base CSS adapted from [m2k7m/re-region-web](https://github.com/m2k7m/re-region-web).
- Archive structure, dimensions, DXT5 setting, and online.json from [m2k7m/PS4-AVATAR-MAKER](https://github.com/m2k7m/PS4-AVATAR-MAKER).
- Inspired by the ImageMagick WASM approach in [p2r3/convert](https://github.com/p2r3/convert).
- ImageMagick WASM: Apache-2.0; JSZip: MIT/GPL dual license, used under MIT.
