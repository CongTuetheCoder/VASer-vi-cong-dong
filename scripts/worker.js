// pythonWorker.js
importScripts(
	"https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt.min.js",
	"https://cdn.jsdelivr.net/npm/skulpt@1.2.0/dist/skulpt-stdlib.js"
);

let currentAbort = null;
let pendingInputResolve = null;

self.onmessage = async (event) => {
	const { type, code, input, cancel } = event.data;

	if (cancel && currentAbort) {
		currentAbort.abort();
		currentAbort = null;
		self.postMessage({ type: "cancelled" });
		return;
	}

	if (type === "run") {
		if (pendingInputResolve && input !== undefined) {
			pendingInputResolve(input);
			pendingInputResolve = null;
			return;
		}

		currentAbort = new AbortController();
		const signal = currentAbort.signal;

		try {
			let output = "";

			Sk.configure({
				output: (text) => {
					output += text;
					self.postMessage({ type: "output", text });
				},
				read: (x) => {
					if (!Sk.builtinFiles || !Sk.builtinFiles["files"][x]) {
						throw "File not found: '" + x + "'";
					}
					return Sk.builtinFiles["files"][x];
				},
				inputfun: (promptText) => {
					self.postMessage({ type: "input_request", text: promptText || "" });
					return new Promise((resolve) => {
						pendingInputResolve = resolve;
					});
				},
			});

			await Sk.misceval.asyncToPromise(() =>
				Sk.importMainWithBody("<stdin>", false, code, true)
			);

			self.postMessage({ type: "done", output });
		} catch (err) {
			if (signal.aborted) {
				self.postMessage({ type: "cancelled" });
			} else {
				self.postMessage({ type: "error", error: err.toString() });
			}
		} finally {
			currentAbort = null;
		}
	}
};
