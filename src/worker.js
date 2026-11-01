import { initializeImageMagick } from "@imagemagick/magick-wasm";
import wasmUrl from "@imagemagick/magick-wasm/magick.wasm?url";
import { createAvatarDownload } from "./batch.js";
import { createXavatar, renderPreview } from "./core.js";
import onlineJson from "./online.json?raw";

let initialized;
async function ready() {
	if (!initialized)
		initialized = fetch(wasmUrl)
			.then((r) => {
				if (!r.ok)
					throw new Error(
						"Unable to load conversion engine. Reload the page and try again.",
					);
				return r.arrayBuffer();
			})
			.then((buffer) => initializeImageMagick(new Uint8Array(buffer)))
			.catch((error) => {
				initialized = null;
				throw error;
			});
	return initialized;
}
self.onmessage = async ({ data: { id, type, bytes, fit, items } }) => {
	try {
		await ready();
		if (type === "preview")
			self.postMessage({ id, type, result: renderPreview(bytes, fit) });
		else if (type === "batch") {
			const result = await createAvatarDownload(
				items,
				(input, framing, progress) =>
					createXavatar(input, framing, onlineJson, progress),
				(value) => self.postMessage({ id, type: "progress", value }),
			);
			self.postMessage({ id, type, result });
		} else {
			const result = await createXavatar(bytes, fit, onlineJson, (value) =>
				self.postMessage({ id, type: "progress", value }),
			);
			self.postMessage({ id, type, result });
		}
	} catch (error) {
		self.postMessage({
			id,
			type: "error",
			error: error.message || "Unsupported or damaged image.",
		});
	}
};
