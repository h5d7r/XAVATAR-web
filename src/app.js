import { MAX_BYTES, validateInput } from "./core.js";

const $ = (id) => document.getElementById(id);
const cards = [],
	pending = new Map(),
	template = $("image-template");
let worker,
	busy = false,
	nextId = 0,
	requestId = 0,
	downloadUrl;
const MAX_FILES = 50,
	MAX_TOTAL = 200 * 1024 * 1024;
function message(text, type = "info") {
	$("status").hidden = false;
	$("status").className = `status ${type}`;
	$("status").textContent = text;
}
function invalidateDownload() {
	if (downloadUrl) URL.revokeObjectURL(downloadUrl);
	downloadUrl = undefined;
	$("download").hidden = true;
	$("step3").classList.remove("active");
	$("progress-panel").hidden = true;
}
function sync() {
	const valid = cards.filter((card) => card.ready);
	$("drop-zone").disabled = busy;
	$("convert").disabled = busy || !valid.length;
	$("convert-label").textContent = busy
		? "Processing your images…"
		: valid.length > 1
			? `Convert & download AVATARS.zip (${valid.length})`
			: "Convert & download .xavatar";
	$("file-selected").textContent = cards.length
		? `${cards.length} image${cards.length === 1 ? "" : "s"} selected — add more anytime`
		: "";
	$("preview-section").hidden = !cards.length;
	$("image-count").textContent =
		`${cards.length} IMAGE${cards.length === 1 ? "" : "S"}`;
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
		if (data.type === "error") job.reject(new Error(data.error));
		else job.resolve(data.result);
	};
	worker.onerror = () =>
		stopWorker(
			new Error(
				"The conversion engine stopped. Please try again with fewer or smaller images.",
			),
		);
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
		const fail = () =>
			stopWorker(new Error("Processing timed out. Please try smaller images."));
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
	card.element.classList.add("has-error");
	card.element.querySelector(".image-state").textContent = error.message;
	card.element.querySelector(".image-state").className =
		"image-state error-text";
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
	card.element.querySelector(".image-meta").textContent =
		`${result.width} × ${result.height} · ${(card.file.size / 1024 / 1024).toFixed(2)} MB`;
	card.element.querySelector(".image-state").textContent = "Ready";
	card.element.querySelector(".image-state").className = "image-state";
	card.element.classList.remove("has-error");
	card.ready = true;
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
	element.querySelector(".image-name").textContent = file.name;
	element.querySelector("img").alt = `Avatar preview for ${file.name}`;
	element
		.querySelector("button")
		.setAttribute("aria-label", `Remove ${file.name}`);
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
			message(
				`${cards.filter((item) => item.ready).length} image(s) ready.`,
				"ok",
			);
	};
	select.onchange = async () => {
		if (busy) return;
		busy = true;
		card.fit = select.value;
		invalidateDownload();
		sync();
		try {
			await preview(card);
			message("Preview updated.", "ok");
		} catch (error) {
			cardError(card, error);
			message(
				"Could not update this image. Remove it and add it again.",
				"error",
			);
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
			message(`Reading image ${index + 1} of ${fileList.length}: ${file.name}`);
			try {
				if (file.size > MAX_BYTES) throw new Error("File exceeds 20 MB.");
				await preview(card);
			} catch (error) {
				cardError(card, error);
			}
		}
		const ready = cards.filter((card) => card.ready).length,
			failed = cards.length - ready;
		message(
			`${ready} image(s) ready.${failed ? ` ${failed} could not be read; remove the marked cards.` : ""}${rejected ? ` ${rejected} skipped: limit is 50 files / 200 MB total.` : ""}`,
			failed || rejected ? "error" : "ok",
		);
	} finally {
		busy = false;
		sync();
	}
}
function updateProgress(value) {
	const percent = Math.max(0, Math.min(100, Math.floor(value.percent)));
	$("progress").value = percent;
	$("progress-percent").textContent = `${percent}%`;
	$("progress-label").textContent =
		value.phase === "zip"
			? "Packing AVATARS.zip…"
			: `Converting ${value.current || Math.min(value.completed + 1, value.total)} / ${value.total}: ${value.name}`;
	$("progress-count").textContent =
		`${value.completed} / ${value.total} images processed`;
}
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
	message("Converting your images locally. Please keep this tab open.");
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
			if (card) cardError(card, new Error(error.message));
		}
		downloadUrl = URL.createObjectURL(
			new Blob([result.bytes], {
				type: selected.length === 1 ? "application/octet-stream" : "application/zip",
			}),
		);
		$("download").href = downloadUrl;
		$("download").download = result.filename;
		$("download").textContent = `Download ${result.filename} again ↗`;
		$("download").hidden = false;
		$("download").click();
		$("step3").classList.add("active");
		$("progress").value = 100;
		$("progress-percent").textContent = "100%";
		$("progress-label").textContent =
			`${result.filename} ready — ${result.count} avatar(s)`;
		$("progress-count").textContent =
			`${result.count} converted${result.errors.length ? ` · ${result.errors.length} failed (marked below)` : ""}`;
		message(
			selected.length === 1
				? `Downloaded ${result.filename}.`
				: `Downloaded ${result.filename} with ${result.count} .xavatar file(s).${result.errors.length ? ` ${result.errors.length} failed; see marked cards.` : ""}`,
			result.errors.length ? "error" : "ok",
		);
	} catch (error) {
		message(error.message, "error");
		$("progress-label").textContent = "Conversion stopped — try again.";
	} finally {
		busy = false;
		sync();
	}
};
window.addEventListener("pagehide", () => {
	for (const card of cards) if (card.url) URL.revokeObjectURL(card.url);
	if (downloadUrl) URL.revokeObjectURL(downloadUrl);
});
sync();
