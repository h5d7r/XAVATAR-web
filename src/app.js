import { fetchImage } from "./remote.js";
import { initLanguagePicker, isolate, t, translate } from "../i18n/index.js";
import { ConversionError, MAX_BYTES, validateInput } from "./core.js";

const $ = (id) => document.getElementById(id);
const cards = [],
	pending = new Map(),
	template = $("image-template");
let worker,
	busy = false,
	nextId = 0,
	requestId = 0,
	downloadUrl,
	statusParts = [],
	progress,
	conversionResult,
	conversionStopped = false;
const MAX_FILES = 50,
	MAX_TOTAL = 200 * 1024 * 1024;
function renderStatus() {
	$("status").textContent = statusParts
		.map(([key, values]) => t(key, values))
		.join(" ");
}
function showStatus(parts, type) {
	statusParts = parts;
	$("status").hidden = false;
	$("status").className = `status ${type}`;
	renderStatus();
}
function message(key, type = "info", values) {
	showStatus([[key, values]], type);
}
function invalidateDownload() {
	if (downloadUrl) URL.revokeObjectURL(downloadUrl);
	downloadUrl = undefined;
	$("download").hidden = true;
	$("step3").classList.remove("active");
	$("progress-panel").hidden = true;
	progress = undefined;
	conversionResult = undefined;
	conversionStopped = false;
}
function sync() {
	const valid = cards.filter((card) => card.ready);
	$("drop-zone").disabled = busy;
	$("image-url").disabled = busy;
	$("load-url").disabled = busy;
	$("convert").disabled = busy || !valid.length;
	$("convert-label").textContent = busy
		? t("convert.busy")
		: valid.length > 1
			? t("convert.batch", {
					name: isolate("AVATARS.zip"),
					count: valid.length,
				})
			: t("convert.single", { extension: isolate(".xavatar") });
	$("file-selected").textContent = cards.length
		? t("upload.selected", { count: cards.length })
		: "";
	$("preview-section").hidden = !cards.length;
	$("image-count").textContent = t("preview.count", { count: cards.length });
	$("step2").classList.toggle("active", !!valid.length);
	for (const card of cards) {
		card.element.querySelector("button").disabled = busy;
		card.element.querySelector("select").disabled = busy || !card.ready;
	}
}
function getWorker() {
	if (worker) return worker;
	worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module",
	});
	worker.onmessage = ({ data }) => {
		const job = pending.get(data.id);
		if (!job) return;
		if (data.type === "progress") {
			job.progress?.(data.value);
			return;
		}
		clearTimeout(job.timer);
		pending.delete(data.id);
		if (data.type === "error") job.reject(data.error);
		else job.resolve(data.result);
	};
	worker.onerror = () => stopWorker(new ConversionError("errors.stopped"));
	return worker;
}
function stopWorker(error) {
	worker?.terminate();
	worker = undefined;
	for (const job of pending.values()) {
		clearTimeout(job.timer);
		job.reject(error);
	}
	pending.clear();
}
function request(type, data, progress) {
	return new Promise((resolve, reject) => {
		const id = ++requestId;
		const fail = () => stopWorker(new ConversionError("errors.timeout"));
		const job = { resolve, reject, timer: setTimeout(fail, 120000) };
		job.progress = (value) => {
			clearTimeout(job.timer);
			job.timer = setTimeout(fail, 120000);
			progress?.(value);
		};
		pending.set(id, job);
		try {
			getWorker().postMessage({ id, type, ...data });
		} catch (error) {
			clearTimeout(job.timer);
			pending.delete(id);
			reject(error);
		}
	});
}
function cardError(card, error) {
	card.ready = false;
	card.error = error.translationKey ?? "errors.unsupported";
	card.element.classList.add("has-error");
	card.element.querySelector(".image-state").classList.add("error-text");
	renderCard(card);
}
function renderCard(card) {
	const { element } = card;
	const name = isolate(card.name);
	element.querySelector("img").alt = t("preview.alt", { name });
	element
		.querySelector("button")
		.setAttribute("aria-label", t("preview.remove", { name }));
	element.querySelector(".image-meta").textContent = card.metadata
		? t("preview.metadata", card.metadata)
		: t("preview.reading");
	element.querySelector(".image-state").textContent = t(
		card.error ?? (card.ready ? "preview.ready" : "preview.loading"),
	);
}
async function preview(card) {
	const bytes = new Uint8Array(await card.file.arrayBuffer());
	validateInput(bytes);
	const result = await request("preview", { bytes, fit: card.fit });
	if (card.url) URL.revokeObjectURL(card.url);
	card.url = URL.createObjectURL(
		new Blob([result.bytes], { type: "image/png" }),
	);
	card.element.querySelector("img").src = card.url;
	card.metadata = {
		width: result.width,
		height: result.height,
		size: Number((card.file.size / 1024 / 1024).toFixed(2)),
	};
	card.error = undefined;
	card.element.querySelector(".image-state").classList.remove("error-text");
	card.element.classList.remove("has-error");
	card.ready = true;
	renderCard(card);
}
function addCard(file) {
	const element = template.content.firstElementChild.cloneNode(true);
	const card = {
		id: ++nextId,
		file,
		name: file.name,
		fit: "stretch",
		element,
		ready: false,
	};
	element.querySelector(".image-name bdi").textContent = file.name;
	translate(element);
	renderCard(card);
	const select = element.querySelector("select");
	select.id = `framing-${card.id}`;
	element.querySelector("label").htmlFor = select.id;
	element.querySelector("button").onclick = () => {
		if (busy) return;
		invalidateDownload();
		if (card.url) URL.revokeObjectURL(card.url);
		cards.splice(cards.indexOf(card), 1);
		element.remove();
		sync();
		if (!cards.length) $("status").hidden = true;
		else
			message("upload.ready", "ok", {
				count: cards.filter((item) => item.ready).length,
			});
	};
	select.onchange = async () => {
		if (busy) return;
		busy = true;
		card.fit = select.value;
		invalidateDownload();
		sync();
		try {
			await preview(card);
			message("preview.updated", "ok");
		} catch (error) {
			cardError(card, error);
			message("preview.updateFailed", "error");
		} finally {
			busy = false;
			sync();
		}
	};
	cards.push(card);
	$("image-list").append(element);
	return card;
}
async function selectFiles(fileList) {
	if (busy || !fileList?.length) return;
	invalidateDownload();
	busy = true;
	sync();
	let total = cards.reduce((sum, card) => sum + card.file.size, 0),
		rejected = 0;
	try {
		for (const [index, file] of Array.from(fileList).entries()) {
			if (cards.length >= MAX_FILES || total + file.size > MAX_TOTAL) {
				rejected++;
				continue;
			}
			total += file.size;
			const card = addCard(file);
			sync();
			message("upload.reading", "info", {
				current: index + 1,
				total: fileList.length,
				name: isolate(file.name),
			});
			try {
				if (file.size > MAX_BYTES) throw new ConversionError("errors.tooLarge");
				await preview(card);
			} catch (error) {
				cardError(card, error);
			}
		}
		const ready = cards.filter((card) => card.ready).length,
			failed = cards.length - ready;
		const parts = [["upload.ready", { count: ready }]];
		if (failed) parts.push(["upload.failed", { count: failed }]);
		if (rejected) parts.push(["upload.skipped", { count: rejected }]);
		showStatus(parts, failed || rejected ? "error" : "ok");
	} finally {
		busy = false;
		sync();
	}
}
function updateProgress(value) {
	progress = value;
	renderProgress();
}
function renderProgress() {
	if (!progress) return;
	const percent = conversionResult
		? 100
		: Math.max(0, Math.min(100, Math.floor(progress.percent)));
	$("progress").value = percent;
	$("progress-percent").textContent = t("progress.percent", { percent });
	if (conversionResult) {
		const { filename, count, failed } = conversionResult;
		const name = isolate(filename);
		const summary = [t("progress.converted", { count })];
		if (failed) summary.push(t("progress.failed", { count: failed }));
		$("download").textContent = t("download.again", { name });
		$("progress-label").textContent = t("progress.ready", { name });
		$("progress-count").textContent = summary.join(" ");
		return;
	}
	const { phase, completed, total, current, name } = progress;
	$("progress-label").textContent = conversionStopped
		? t("progress.stopped")
		: phase === "zip"
			? t("progress.packing", { name: isolate(name) })
			: t("progress.converting", {
					current: current ?? Math.min(completed + 1, total),
					total,
					name: isolate(name),
				});
	$("progress-count").textContent = t("progress.processed", {
		completed,
		total,
	});
}
$("url-form").onsubmit = async (event) => {
	event.preventDefault();
	if (busy) return;
	const remaining = MAX_TOTAL - cards.reduce((sum, card) => sum + card.file.size, 0);
	if (cards.length >= MAX_FILES || remaining <= 0) {
		message("upload.skipped", "error", { count: 1 });
		return;
	}
	busy = true;
	sync();
	message("url.loading");
	let file;
	try {
		file = await fetchImage($("image-url").value, Math.min(MAX_BYTES, remaining));
	} catch (error) {
		message(error.translationKey ?? "url.failed", "error");
	} finally {
		busy = false;
		sync();
	}
	if (file) {
		$("image-url").value = "";
		await selectFiles([file]);
	}
};
$("drop-zone").onclick = () => {
	$("file-input").value = "";
	$("file-input").click();
};
$("file-input").onchange = (event) => selectFiles(event.target.files);
for (const type of ["dragenter", "dragover"])
	$("drop-zone").addEventListener(type, (event) => {
		event.preventDefault();
		if (!busy) $("drop-zone").classList.add("dragover");
	});
for (const type of ["dragleave", "drop"])
	$("drop-zone").addEventListener(type, (event) => {
		event.preventDefault();
		$("drop-zone").classList.remove("dragover");
	});
$("drop-zone").addEventListener("drop", (event) =>
	selectFiles(event.dataTransfer.files),
);
window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", (event) => event.preventDefault());
$("convert").onclick = async () => {
	const selected = cards.filter((card) => card.ready);
	if (busy || !selected.length) return;
	invalidateDownload();
	busy = true;
	sync();
	$("progress-panel").hidden = false;
	updateProgress({
		percent: 0,
		completed: 0,
		total: selected.length,
		name: selected[0].name,
		phase: "convert",
	});
	message("convert.local");
	try {
		const result = await request(
			"batch",
			{
				items: selected.map(({ id, file, name, fit }) => ({
					id,
					file,
					name,
					fit,
				})),
			},
			updateProgress,
		);
		for (const error of result.errors) {
			const card = cards.find((card) => card.id === error.id);
			if (card) cardError(card, error);
		}
		downloadUrl = URL.createObjectURL(
			new Blob([result.bytes], {
				type:
					selected.length === 1
						? "application/octet-stream"
						: "application/zip",
			}),
		);

		$("download").href = downloadUrl;
		$("download").download = result.filename;
		conversionResult = {
			filename: result.filename,
			count: result.count,
			failed: result.errors.length,
		};
		renderProgress();
		$("download").hidden = false;
		$("download").click();
		$("step3").classList.add("active");
		const parts = [["download.done", { name: isolate(result.filename) }]];
		if (selected.length > 1)
			parts.push(["progress.converted", { count: result.count }]);
		if (result.errors.length)
			parts.push(["progress.failed", { count: result.errors.length }]);
		showStatus(parts, result.errors.length ? "error" : "ok");
	} catch (error) {
		message(error.translationKey ?? "errors.unsupported", "error");
		conversionStopped = true;
		renderProgress();
	} finally {
		busy = false;
		sync();
	}
};
window.addEventListener("pagehide", () => {
	for (const card of cards) if (card.url) URL.revokeObjectURL(card.url);
	if (downloadUrl) URL.revokeObjectURL(downloadUrl);
});
initLanguagePicker(() => {
	sync();
	for (const card of cards) renderCard(card);
	if (!$("status").hidden) renderStatus();
	if (!$("progress-panel").hidden) renderProgress();
});
