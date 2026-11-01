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

## Where can I get avatars?

You can find high-quality avatars to convert at the following websites:

* [PS Prices](https://psprices.com/region-us/collection/avatars)
* [PSN Tools](https://www.psntools.com/avatars?page=1)

## How to Apply the Avatar

Once you have generated your `.xavatar` file, transfer it to your console via FTP or USB. You can apply it using one of the following methods:

### Method 1: PSX-Xplorer

1. Navigate to the file location using **[PS4-Xplorer 2.0](https://pkg-zone.com/details/LAPY20009)** (or **[PS5-Xplorer](https://pkg-zone.com/details/LAPY20011)**).
2. Simply press the <img src="https://raw.githubusercontent.com/bucanero/pkgi-ps3/master/data/CROSS.png" width="20" height="20" style="vertical-align: middle;"> button on the `.xavatar` file to install it.

### Method 2: Avatar Changer App

1. Move the `.xavatar` file to the following path on your console: `/data/AVATARS/`
2. Open **[Avatar Changer](https://pkg-zone.com/details/LAPY20015)** (or **[Avatar Changer PS5](https://pkg-zone.com/details/LAPY20016)**).
3. Select and apply the image from within the application.

## Credits

* **[LAPY](https://x.com/Lapy05575948):** For creating the `.xavatar` format.
* **[m2k7m](https://github.com/m2k7m):** For creating this utility.

## Contributing

Pull requests are welcome.

## License

[MIT](LICENSE)

## Provenance and licensing

- Visual tokens, typography, grid, and base CSS adapted from [m2k7m/re-region-web](https://github.com/m2k7m/re-region-web).
- Archive structure, dimensions, DXT5 setting, and online.json from [m2k7m/PS4-AVATAR-MAKER](https://github.com/m2k7m/PS4-AVATAR-MAKER).
- Inspired by the ImageMagick WASM approach in [p2r3/convert](https://github.com/p2r3/convert).
- ImageMagick WASM: Apache-2.0; JSZip: MIT/GPL dual license, used under MIT.