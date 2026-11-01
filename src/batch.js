import JSZip from "jszip";
import { safeName } from "./core.js";

export function uniqueAvatarNames(names) {
	const used = new Set();
	return names.map((name) => {
		const original = safeName(name),
			stem = original.slice(0, -8);
		let result = original,
			number = 2;
		while (used.has(result.toLowerCase()))
			result = `${stem} (${number++}).xavatar`;
		used.add(result.toLowerCase());
		return result;
	});
}
export async function createAvatarDownload(items, encode, progress = () => {}) {
	if (items.length !== 1)
		return {
			...(await createAvatarBatch(items, encode, progress)),
			filename: "AVATARS.zip",
		};
	const item = items[0];
	const report = (percent) =>
		progress({
			percent,
			completed: percent === 100 ? 1 : 0,
			current: 1,
			total: 1,
			name: item.name,
			phase: "convert",
		});
	report(0);
	const bytes = await encode(
		new Uint8Array(await item.file.arrayBuffer()),
		item.fit,
		report,
	);
	report(100);
	return { bytes, filename: safeName(item.name), count: 1, errors: [] };
}
export async function createAvatarBatch(items, encode, progress = () => {}) {
	if (!items.length) throw new Error("Choose at least one image.");
	const archive = new JSZip(),
		names = uniqueAvatarNames(items.map((item) => item.name)),
		errors = [];
	let count = 0;
	for (const [index, item] of items.entries()) {
		const report = (value) =>
			progress({
				percent: ((index + value / 100) / items.length) * 95,
				completed: index,
				current: index + 1,
				total: items.length,
				name: item.name,
				phase: "convert",
			});
		report(0);
		try {
			const bytes = new Uint8Array(await item.file.arrayBuffer());
			const avatar = await encode(bytes, item.fit, report);
			archive.file(`AVATARS/${names[index]}`, avatar);
			count++;
		} catch (error) {
			errors.push({
				id: item.id,
				name: item.name,
				message: error.message || "Unsupported image.",
			});
		}
		progress({
			percent: ((index + 1) / items.length) * 95,
			completed: index + 1,
			current: index + 1,
			total: items.length,
			name: item.name,
			phase: "convert",
		});
		await new Promise((resolve) => setTimeout(resolve, 0));
	}
	if (!count)
		throw new Error(
			"No images could be converted. Remove damaged files and try again.",
		);
	const bytes = await archive.generateAsync(
		{ type: "uint8array", compression: "STORE" },
		(metadata) =>
			progress({
				percent: 95 + metadata.percent * 0.05,
				completed: items.length,
				total: items.length,
				name: "AVATARS.zip",
				phase: "zip",
			}),
	);
	return { bytes, count, errors };
}
