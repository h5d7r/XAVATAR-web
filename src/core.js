import {
	CompressionMethod,
	Gravity,
	ImageMagick,
	MagickColor,
	MagickFormat,
	MagickGeometry,
} from "@imagemagick/magick-wasm";
import JSZip from "jszip";

export const SIZES = [440, 260, 128, 64];
export const MAX_BYTES = 20 * 1024 * 1024;
export function validateInput(bytes) {
	if (!bytes?.length)
		throw new Error("This file is empty. Please choose an image.");
	if (bytes.length > MAX_BYTES)
		throw new Error("Image is too large. Please choose a file under 20 MB.");
}
export function safeName(name) {
	return `${
		name
			.replace(/\.[^.]+$/, "")
			// biome-ignore lint/suspicious/noControlCharactersInRegex: allow control chars for filename sanitization
			.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
			.slice(0, 100) || "avatar"
	}.xavatar`;
}

function square(image, size, fit) {
	const geometry = new MagickGeometry(size, size);
	if (fit === "stretch") geometry.ignoreAspectRatio = true;
	if (fit === "cover") geometry.fillArea = true;
	image.resize(geometry);
	if (fit !== "stretch") {
		image.backgroundColor = new MagickColor("transparent");
		image.extent(size, size, Gravity.Center);
	}
}

export function renderPreview(bytes, fit = "stretch") {
	validateInput(bytes);
	return ImageMagick.read(bytes, (image) => {
		if (image.width * image.height > 40_000_000)
			throw new Error(
				"Image resolution exceeds 40 megapixels. Resize it first.",
			);
		image.autoOrient();
		const width = image.width,
			height = image.height;
		square(image, 440, fit);
		return image.write(MagickFormat.Png, (data) => ({
			bytes: new Uint8Array(data),
			width,
			height,
		}));
	});
}

export async function createXavatar(
	bytes,
	fit,
	onlineJson,
	onProgress = () => {},
) {
	validateInput(bytes);
	const zip = new JSZip();
	ImageMagick.read(bytes, (image) => {
		if (image.width * image.height > 40_000_000)
			throw new Error(
				"Image resolution exceeds 40 megapixels. Resize it first.",
			);
		image.autoOrient();
		square(image, 440, fit);
		image.write(MagickFormat.Png, (data) => {
			const png = new Uint8Array(data);
			zip.file("avatar.png", png);
			zip.file("picture.png", png);
		});
		image.setCompression(CompressionMethod.DXT5);
		image.settings.setDefine(MagickFormat.Dds, "compression", "dxt5");
		image.settings.setDefine(MagickFormat.Dds, "mipmaps", "0");
		for (const [i, size] of SIZES.entries()) {
			square(image, size, "stretch");
			image.write(MagickFormat.Dds, (data) => {
				const dds = new Uint8Array(data);
				if (new TextDecoder().decode(dds.slice(84, 88)) !== "DXT5")
					throw new Error("DDS encoder did not produce DXT5.");
				zip.file(`avatar${size}.dds`, dds);
				zip.file(`picture${size}.dds`, dds);
			});
			onProgress(20 + i * 20);
		}
	});
	zip.file("online.json", onlineJson);
	const result = await zip.generateAsync({
		type: "uint8array",
		compression: "DEFLATE",
	});
	onProgress(100);
	return result;
}
