function failure(translationKey) {
	return Object.assign(new Error(translationKey), { translationKey });
}

export async function fetchImage(input, maxBytes, timeoutMs = 60000) {
	let url;
	try {
		url = new URL(input.trim());
		if (
			!["http:", "https:"].includes(url.protocol) ||
			url.username ||
			url.password
		)
			throw new Error();
	} catch {
		throw failure("url.invalid");
	}
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	try {
		const response = await fetch(url.href, {
			signal: controller.signal,
			mode: "cors",
			credentials: "omit",
			referrerPolicy: "no-referrer",
		});
		if (!response.ok) throw failure("url.http");
		if (Number(response.headers.get("content-length")) > maxBytes)
			throw failure("url.limit");
		const type = (response.headers.get("content-type") || "")
			.split(";")[0]
			.trim()
			.toLowerCase();
		if (
			type.startsWith("text/") ||
			type === "application/json" ||
			type === "application/xhtml+xml"
		)
			throw failure("url.notImage");
		if (!response.body) throw failure("errors.empty");
		const reader = response.body.getReader();
		const chunks = [];
		let size = 0;
		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				size += value.byteLength;
				if (size > maxBytes) throw failure("url.limit");
				chunks.push(value);
			}
		} finally {
			await reader.cancel().catch(() => {});
			reader.releaseLock();
		}
		if (!size) throw failure("errors.empty");
		let name = url.pathname.split("/").pop() || "avatar";
		try {
			name = decodeURIComponent(name);
		} catch {}
		name =
			name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").slice(0, 120) || "avatar";
		return new File(chunks, name, { type: type || "application/octet-stream" });
	} catch (error) {
		if (error.translationKey) throw error;
		throw failure(controller.signal.aborted ? "url.timeout" : "url.failed");
	} finally {
		clearTimeout(timer);
		controller.abort();
	}
}
