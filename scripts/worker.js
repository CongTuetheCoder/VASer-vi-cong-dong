importScripts("https://cdn.jsdelivr.net/pyodide/v0.25.0/full/pyodide.js");

let pyodide = null;
let pyodideReadyPromise = (async () => {
	pyodide = await loadPyodide();
	pyodide.setStdout({
		batched: (text) => self.postMessage({ type: "output", text }),
	});
	pyodide.setStderr({
		batched: (text) => self.postMessage({ type: "error", error: text }),
	});
})();

self.onmessage = async (event) => {
	const { type, code } = event.data;

	if (type === "run") {
		await pyodideReadyPromise;

		try {
			// FIX: Removed 'error: true' to resolve the conflict
			pyodide.setStdin({
				stdin: () => {
					// For a basic implementation, you can return a
					// pre-defined string or use a synchronous bridge.
					// Returning a Promise here will NOT work for input().
					self.postMessage({ type: "input_request" });
					return ""; // Placeholder: requires SharedArrayBuffer for real-time blocking
				},
			});

			await pyodide.runPythonAsync(code);

			// Extract globals safely
			const globals = pyodide.globals.toJs();
			const vars = {};

			for (const [key, value] of globals) {
				// Ignore internal Python variables
				if (typeof key === "string" && !key.startsWith("__")) {
					// Convert PyProxy objects to JS
					let jsValue =
						value instanceof pyodide.ffi.PyProxy
							? value.toJs()
							: value;

					// Structured Clone cannot handle functions (Python functions/classes become JS functions)
					if (typeof jsValue !== "function") {
						try {
							// Brute-force sanitization: Guarantees the object is strictly data
							// This strips out un-cloneable properties and handles Proxies safely
							vars[key] = JSON.parse(JSON.stringify(jsValue));
						} catch (e) {
							// If it still can't be serialized (e.g., circular reference), skip it
							console.warn(
								`Skipping variable '${key}': could not be serialized.`,
							);
						}
					}
				}
			}

			self.postMessage({ type: "done", vars });
		} catch (err) {
			self.postMessage({ type: "error", error: err.message });
		}
	}
};
