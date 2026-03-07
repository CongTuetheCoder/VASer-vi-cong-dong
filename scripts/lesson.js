const lessonID = sessionStorage.getItem("lessonID");
const isActivity = lessonID.indexOf(".") === -1;
const isCaseStudy = isActivity && Number(lessonID) % 2 === 0;
const jsonURL = "data/content.json";
const dataUrl = "data/lessons.json";

const lessonContainer = document.getElementById("lesson-content");
const codeContainer = document.getElementById("code-container");
const body = document.getElementsByTagName("body")[0];
const lesson = sessionStorage.getItem("lesson");
const isEn = localStorage.getItem("lang") === "en";
lessonContainer.style.height = codeContainer.style.height;

async function fetchLessonData() {
	try {
		const response = await fetch(dataUrl);
		if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);
		const data = await response.json();

		const lang = localStorage.getItem("lang") || "en";
		let chapter = Number(lessonID.split(".")[0]);

		if (isCaseStudy) chapter *= 2;

		chapter = chapter.toString();

		let lessonIdx;
		if (!isActivity && !isCaseStudy) lessonIdx = lessonID.split(".")[1];
		else lessonIdx = data.lessonsData[chapter].length.toString();

		const code = data.lessons[chapter][lessonIdx]["code" + lang];
		const correctOutputs =
			data.lessons[chapter][lessonIdx]["correct" + lang];

		return { codeList: code || [], correctOutputs: correctOutputs || [] };
	} catch (err) {
		console.error("Failed to fetch lesson data:", err);
		return { codeList: [], correctOutputs: [] };
	}
}

if (lesson === null) window.location.href = "home.html";
else document.title = lesson;

let lessonCounter = 0;
let correctCount = 0;
let wrongCount = 0;
let codeList = [];
let correctOutputs = [];
let activities = 0;

(async function initLesson() {
	try {
		const data = await fetchLessonData();
		codeList = data.codeList || [];
		correctOutputs = data.correctOutputs || [];
		activities = codeList.length || 0;

		if (document.readyState !== "loading") {
			const textarea = document.getElementById("editor");
			const highlight = document.getElementById("highlight");
			if (textarea && highlight) {
				const pre = highlight.parentElement;

				function updateHighlight() {
					let code = textarea.value;
					const html = code
						.replace(/&/g, "&amp;")
						.replace(/</g, "&lt;")
						.replace(/>/g, "&gt;");

					highlight.innerHTML = html;
					Prism.highlightElement(highlight);

					pre.scrollTop = textarea.scrollTop;
					pre.scrollLeft = textarea.scrollLeft;
				}

				textarea.addEventListener("input", updateHighlight);
				textarea.addEventListener("scroll", updateHighlight);

				textarea.addEventListener("keydown", (event) => {
					// Tab: indent/unindent for multi-line selections; support Shift+Tab
					if (event.key === "Tab") {
						event.preventDefault();
						const start = textarea.selectionStart;
						const end = textarea.selectionEnd;
						const value = textarea.value;

						const getLineStart = (pos) =>
							value.lastIndexOf("\n", pos - 1) + 1;
						const getLineEnd = (pos) => {
							const idx = value.indexOf("\n", pos);
							return idx === -1 ? value.length : idx;
						};

						const selHasNewline =
							value.substring(start, end).indexOf("\n") !== -1;

						if (event.shiftKey) {
							// Unindent
							const lineStart = getLineStart(start);
							const lineEnd = getLineEnd(end);
							const block = value.substring(lineStart, lineEnd);
							const lines = block.split("\n");
							const newLines = lines.map((ln) => {
								if (ln.startsWith("\t")) return ln.substring(1);
								if (ln.startsWith("    "))
									return ln.substring(4);
								return ln;
							});
							const newBlock = newLines.join("\n");

							textarea.value =
								value.substring(0, lineStart) +
								newBlock +
								value.substring(lineEnd);

							textarea.selectionStart = lineStart;
							textarea.selectionEnd = lineStart + newBlock.length;
							updateHighlight();
						} else {
							// Indent
							if (selHasNewline) {
								const lineStart = getLineStart(start);
								const lineEnd = getLineEnd(end);
								const block = value.substring(
									lineStart,
									lineEnd,
								);
								const lines = block.split("\n");
								const newBlock = lines
									.map((ln) => "\t" + ln)
									.join("\n");

								textarea.value =
									value.substring(0, lineStart) +
									newBlock +
									value.substring(lineEnd);

								textarea.selectionStart = lineStart;
								textarea.selectionEnd =
									lineStart + newBlock.length;
								updateHighlight();
							} else {
								// single caret or single-line selection: insert tab at caret
								textarea.value =
									value.substring(0, start) +
									"\t" +
									value.substring(end);
								const pos = start + 1;
								textarea.selectionStart =
									textarea.selectionEnd = pos;
								updateHighlight();
							}
						}
					} else if (event.key === "Enter") {
						event.preventDefault();

						const start = textarea.selectionStart;
						const end = textarea.selectionEnd;

						const currentLine = textarea.value
							.substring(0, start)
							.split("\n")
							.pop();

						const indentMatch = currentLine.match(/^\s*/);
						const indent = indentMatch ? indentMatch[0] : "";

						const insert = "\n" + indent;

						textarea.value =
							textarea.value.substring(0, start) +
							insert +
							textarea.value.substring(end);

						textarea.selectionStart = textarea.selectionEnd =
							start + insert.length;
						updateHighlight();
					}
				});

				textarea.value =
					localStorage.getItem("lang") === "vi"
						? "# Nhập mã ở đây\n"
						: "# Enter code here\n";
				textarea.value += codeList[lessonCounter] || "";
				textarea.focus();
				updateHighlight();
			}
		}

		fetchAndUpdateContent();
	} catch (err) {
		console.error("Initialization failed:", err);
	}
})();

const NORMAL_XP = 5;
const ACTIVITY_XP = 10;
const CASE_STUDY_XP = 20;

let pythonWorker;

function getCookie(cname) {
	let name = cname + "=";
	let decodedCookie = decodeURIComponent(document.cookie);
	let ca = decodedCookie.split(";");
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) == " ") {
			c = c.substring(1);
		}
		if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		}
	}
	return "";
}

function fetchAndUpdateContent() {
	fetch(jsonURL)
		.then((response) => {
			if (!response.ok) {
				console.error(`HTTP error: Status: ${response.status}`);
			}
			return response.json();
		})
		.then((data) => {
			const lang = localStorage.getItem("lang") || "en";
			const idx = lang === "en" ? 1 : 0;

			const body = data[idx][lessonID][lessonCounter];

			lessonContainer.innerHTML = `<p id="title">${lesson}</p>`;

			body.forEach((element) => {
				let type = element.type;
				if (type === undefined) type = "p";

				let elem = `<${type}`;
				if (type === "div") elem += ' class="div-code"';
				else if (type === "i") elem += ' class="muted-inline"';

				elem += `>${element.body}</${type}>`;
				lessonContainer.innerHTML += elem;
			});
		});
}

async function fetchLessonConfig(currentUnit) {
	try {
		const response = await fetch("data/lessons.json");
		if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
		const data = await response.json();

		return data.lessonsData[currentUnit];
	} catch (err) {
		console.error("Failed to fetch lessons:", err);
		return []; // fallback
	}
}

async function updateXP() {
	try {
		const data = await getUserData(auth.currentUser.uid);
		let storedXP = Number(data.xp);

		storedXP += isCaseStudy
			? CASE_STUDY_XP
			: isActivity
				? ACTIVITY_XP
				: NORMAL_XP;
		console.log(storedXP);
		await window.updateUserXP(auth.currentUser.uid, storedXP);
	} catch (err) {
		console.error("Failed to fetch user progress:", err);
		return null;
	}
}

async function updateProgress(currentUnit, currentLesson, lessonsData) {
	try {
		const data = await getUserData(auth.currentUser.uid);
		console.log(data);
		await updateXP();

		const storedUnit = Number(data.data.currentUnit);
		const storedLesson = Number(data.data.currentLesson);

		if (
			storedUnit > currentUnit ||
			(storedUnit === currentUnit && storedLesson > currentLesson)
		)
			return null;
	} catch (err) {
		console.error("Failed to fetch user progress:", err);
		return null;
	}

	let nextUnit = currentUnit;
	let nextLesson = currentLesson + 1;
	console.log(lessonsData);

	if (nextLesson > lessonsData.length) {
		nextUnit++;
		nextLesson = 1;
	}

	if (nextUnit > 9) {
		console.log("Reached end of course");
		return null;
	}

	try {
		await window.updateUserProgress(auth.currentUser.uid, {
			currentUnit: String(nextUnit),
			currentLesson: String(nextLesson),
		});
		window.location.href = "home.html";
	} catch (err) {
		console.error("Failed to update user progress:", err);
		return null;
	}
}

function initWorker() {
	if (!pythonWorker) {
		pythonWorker = new Worker("scripts/worker.js");
	}
}

const runPython = async () => {
	const code = document.getElementById("editor").value;
	const out = document.getElementById("output");
	const runBtn = document.getElementById("runBtn");
	const stopBtn = document.getElementById("stopBtn");

	initWorker();

	pythonWorker.postMessage({ cancel: true });

	out.innerText = "";
	out.style.color = "white";

	runBtn.disabled = true;
	stopBtn.disabled = false;

	return new Promise((resolve, reject) => {
		const handler = async (event) => {
			const { type, text, error, vars } = event.data;

			switch (type) {
				case "output":
					out.innerText += text;
					break;

				case "error":
					out.style.color = "red";
					out.innerText = error;
					cleanup();
					reject(error);
					break;

				case "done":
					window.lastPythonVars = vars || {};
					cleanup();
					resolve(out.innerText);
					break;
				case "cancelled":
					cleanup();
					resolve(out.innerText);
					break;

				case "input_request":
					const userInput = await getUserInputFromOutput(text);

					// Move cursor to end
					const sel = window.getSelection();
					const range = document.createRange();
					range.selectNodeContents(out);
					range.collapse(false);
					sel.removeAllRanges();
					sel.addRange(range);

					pythonWorker.postMessage({ type: "run", input: userInput });
					break;
			}
		};

		function cleanup() {
			pythonWorker.removeEventListener("message", handler);
			runBtn.disabled = false;
			stopBtn.disabled = true;
		}

		pythonWorker.addEventListener("message", handler);
		pythonWorker.postMessage({ type: "run", code });
	});
};

const stopPython = () => {
	if (pythonWorker) {
		pythonWorker.terminate();
		pythonWorker = null;

		const out = document.getElementById("output");
		const runBtn = document.getElementById("runBtn");
		const stopBtn = document.getElementById("stopBtn");

		runBtn.disabled = false;
		stopBtn.disabled = true;
	}
};

const getUserInputFromOutput = (promptText = "") => {
	const out = document.getElementById("output");
	return new Promise((resolve) => {
		out.contentEditable = "true";
		out.scrollTop = out.scrollHeight;
		out.innerText += promptText || "\n"; // mark the prompt start
		let promptStart = out.innerText.length;
		if (promptText === "") promptStart--;

		function moveCaretToEnd() {
			const sel = window.getSelection();
			const range = document.createRange();
			range.selectNodeContents(out);
			range.collapse(false);
			sel.removeAllRanges();
			sel.addRange(range);
		}

		function handler(e) {
			const caretPos =
				out.innerText.length - window.getSelection().toString().length;

			if (e.key === "Enter") {
				e.preventDefault();
				let text = out.innerText.slice(promptStart);

				// Remove the last newline only if promptText is not empty and user pressed Enter
				if (text.indexOf("\n") !== -1) {
					text = text.slice(0, -1);
				}

				if (promptText === "" && !out.innerText.endsWith("\n")) {
					out.innerText += "\n";
				}

				out.scrollTop = out.scrollHeight;
				out.contentEditable = "false";
				out.removeEventListener("keydown", handler);
				resolve(text);
				moveCaretToEnd();
				return;
			}

			if (e.key === "Backspace" && caretPos <= promptStart) {
				e.preventDefault();
				return;
			}

			if (caretPos < promptStart) {
				e.preventDefault();
				moveCaretToEnd();
			}
		}

		out.addEventListener("keydown", handler);
		moveCaretToEnd();
		out.focus();
	});
};

const step = () => {
	const percentage = ((lessonCounter + 1) / activities) * 100;
	const bar = document.getElementById("bar");
	bar.style.setProperty("--progress-width", `${percentage}%`);
};

// Diagnose why output didn't match a pattern using the same logic as validateOutput
function diagnoseOutput(output, pattern) {
	const normalize = (str) => str.replace(/\r\n/g, "\n").trim();
	const outLines = normalize(output).split("\n");
	const userInputs = [];
	const vars = {};

	function lineMsg(line, pat) {
		if (pat.type === "prompt") {
			if (!line.startsWith(pat.text))
				return `Expected prompt starting with "${pat.text}", but got: "${line || "<empty>"}"`;
			const input = line.slice(pat.text.length).trim();
			userInputs.push(input);
			if (pat.captureAs) vars[pat.captureAs] = input;
			return null;
		}

		if (pat.type === "dynamic") {
			if (!line.startsWith(pat.text))
				return `Expected a dynamic line starting with "${pat.text}", but got: "${line || "<empty>"}"`;
			if (pat.captureAs) {
				if (!pat.captureAppend) vars[pat.captureAs] = line;
				else {
					if (vars[pat.captureAs]) vars[pat.captureAs].push(line);
					else vars[pat.captureAs] = [line];
				}
			}
			return null;
		}

		if (pat.type === "static") {
			if (line !== pat.text)
				return `Expected exact text: "${pat.text}", but got: "${line || "<empty>"}"`;
			return null;
		}

		if (pat.type === "regex") {
			const re = new RegExp(pat.pattern);
			const m = line.match(re);
			if (m === null)
				return `Output line did not match expected pattern /${pat.pattern}/; got: "${line || "<empty>"}"`;
			const captured = m[1] !== undefined ? m[1] : m[0];
			if (pat.captureAs) {
				if (pat.captureOnce && vars[pat.captureAs] !== undefined) {
					if (
						String(vars[pat.captureAs]).trim() !==
						String(captured).trim()
					) {
						return `Captured value for ${pat.captureAs} differs from previous capture: "${captured}"`;
					}
				} else {
					if (Array.isArray(pat.captureAs)) {
						pat.captureAs.forEach(
							(name, i) => (vars[name] = m[i + 1]),
						);
					} else vars[pat.captureAs] = captured;
				}
			}
			return null;
		}

		if (pat.type === "reference") {
			const refVal = vars[pat.name];
			const args = Array.isArray(pat.from)
				? pat.from.map((v) => vars[v])
				: [vars[pat.from]];
			if (refVal === undefined)
				return `Missing captured value '${pat.name}' to compare against expected reference.`;
			if (args.includes(undefined))
				return `Missing argument(s) for reference transform: ${JSON.stringify(pat.from)}`;
			let expected = args;
			if (pat.transform) {
				try {
					const f = new Function(
						"args",
						`return (${pat.transform})(...args);`,
					);
					expected = f(args);
				} catch (e) {
					return `Reference transform failed: ${e && e.message ? e.message : e}`;
				}
			}
			if (refVal != expected)
				return `Reference mismatch: expected ${expected}, got ${refVal}`;
			return null;
		}

		if (pat.type === "var") {
			const varsFromPython = window.lastPythonVars || {};
			const value = varsFromPython[pat.name];
			if (value === undefined)
				return `Missing Python variable '${pat.name}' in runtime environment.`;
			if (pat.captureAs) vars[pat.captureAs] = value;
			if (pat.expected !== undefined) {
				if (String(value).trim() !== String(pat.expected).trim())
					return `Variable '${pat.name}' expected '${pat.expected}', got '${value}'`;
			}
			return null;
		}

		if (pat.type === "rollback" || pat.type === "set-error") return null;

		return `Unknown pattern type '${pat.type}'`;
	}

	function matchPattern(lines, patterns, idx = 0) {
		for (let k = 0; k < patterns.length; k++) {
			const pattern = patterns[k];
			if (pattern.type === "repeat") {
				let reps = pattern.times;
				if (pattern.timesInputIndex !== undefined)
					reps = parseInt(userInputs[pattern.timesInputIndex], 10);
				if (pattern.untilInput !== undefined) {
					while (idx < lines.length) {
						const lastInput = userInputs[userInputs.length - 1];
						if (lastInput === pattern.untilInput) break;
						const startIdx = idx;
						const res = matchPattern(lines, pattern.body, idx);
						if (res.ok === false) return res;
						idx = res.idx;
						if (idx === -1 || idx === startIdx) break;
					}
				} else if (pattern.untilValue !== undefined) {
					while (idx < lines.length) {
						const currentLine = lines[idx];
						if (currentLine === undefined) break;
						if (currentLine.trim() === pattern.untilValue) {
							idx++;
							break;
						}
						const startIdx = idx;
						const res = matchPattern(lines, pattern.body, idx);
						if (res.ok === false) return res;
						idx = res.idx;
						if (idx == startIdx) break;
					}
				} else if (reps !== undefined) {
					for (let r = 0; r < reps; r++) {
						const res = matchPattern(lines, pattern.body, idx);
						if (res.ok === false) return res;
						idx = res.idx;
						if (idx === -1)
							return {
								ok: false,
								message: "Repeat body did not match",
								idx: -1,
							};
					}
				} else {
					while (true) {
						const startIdx = idx;
						const res = matchPattern(lines, pattern.body, idx);
						if (res.ok === false) return res;
						idx = res.idx;
						if (idx === -1 || idx === startIdx) break;
					}
				}
			} else if (pattern.type === "conditional") {
				const conditionResult = (function evaluateCondition(condition) {
					if (condition.type === "var-equals") {
						const varValue = vars[condition.name];
						return (
							String(varValue).trim() ==
							String(condition.value).trim()
						);
					}
					if (condition.type === "var-gt") {
						const varValue = vars[condition.name];
						return Number(varValue) > Number(condition.value);
					}
					if (condition.type === "var-ge") {
						const varValue = vars[condition.name];
						return Number(varValue) >= Number(condition.value);
					}
					if (condition.type === "var-exists") {
						return vars[condition.name] !== undefined;
					}
					return false;
				})(pattern.condition);

				let nextIdx = idx;
				if (conditionResult && pattern.then !== undefined) {
					const res = matchPattern(lines, pattern.then, idx);
					if (res.ok === false) return res;
					nextIdx = res.idx;
				} else if (!conditionResult && pattern.else !== undefined) {
					const res = matchPattern(lines, pattern.else, idx);
					if (res.ok === false) return res;
					nextIdx = res.idx;
				}
				idx = nextIdx;
			} else {
				const skipTypes = ["reference", "var", "rollback", "set-error"];
				if (skipTypes.includes(pattern.type)) {
					// allow to proceed but still test for var/reference later
				}
				if (idx >= lines.length)
					return {
						ok: false,
						message: `Missing output line for expected pattern of type '${pattern.type}'`,
						idx: -1,
					};
				const line = lines[idx];
				const msg = lineMsg(line, pattern);
				if (msg) {
					return { ok: false, message: msg, idx };
				}
				idx++;
			}
		}
		return { ok: true, idx };
	}

	const res = matchPattern(outLines, pattern, 0);
	if (res.ok) return { ok: true };
	return {
		ok: false,
		message: res.message || "Output did not match expected pattern",
	};
}

const validateOutput = (output, pattern) => {
	const out = document.getElementById("output");
	if (out.style.color === "red" && pattern[0].type !== "set-error")
		return false; // Error

	const normalize = (str) => str.replace(/\r\n/g, "\n").trim();
	const outLines = normalize(output).split("\n");
	const userInputs = [];
	const vars = {};
	const skipTypes = ["reference", "var", "rollback", "set-error"];

	let index = 0;

	function matchLine(line, pat) {
		if (pat.type === "prompt") {
			if (!line.startsWith(pat.text)) return false;

			const input = line.slice(pat.text.length).trim();
			userInputs.push(input);

			if (pat.captureAs) vars[pat.captureAs] = input;
			return true;
		}

		if (pat.type === "dynamic") {
			if (!line.startsWith(pat.text)) return false;
			if (pat.captureAs) {
				if (!pat.captureAppend) vars[pat.captureAs] = line;
				else {
					if (vars[pat.captureAs]) vars[pat.captureAs].push(line);
					else vars[pat.captureAs] = [line];
					console.log(vars[pat.captureAs]);
				}
			}
			return true;
		}

		if (pat.type === "static") {
			return line === pat.text;
		}

		if (pat.type === "regex") {
			const re = new RegExp(pat.pattern);
			const m = line.match(re);

			if (m === null) return false;

			const captured = m[1] !== undefined ? m[1] : m[0];

			if (pat.captureAs) {
				if (pat.captureOnce && vars[pat.captureAs] !== undefined) {
					if (
						String(vars[pat.captureAs]).trim() !==
						String(captured).trim()
					) {
						return false; // different -> fail
					}
				} else {
					if (Array.isArray(pat.captureAs)) {
						pat.captureAs.forEach((name, i) => {
							vars[name] = m[i + 1];
						});
					} else vars[pat.captureAs] = captured;
				}
			}
			return true;
		}

		if (pat.type === "reference") {
			const refVal = vars[pat.name];
			const args = Array.isArray(pat.from)
				? pat.from.map((v) => vars[v])
				: [vars[pat.from]];

			if (refVal === undefined || args === undefined) return false;

			let expected = args;
			if (pat.transform) {
				try {
					// Wrap in function so `x` is available
					const f = new Function(
						"args",
						`return (${pat.transform})(...args);`,
					);
					expected = f(args);
				} catch (e) {
					console.error("Transform failed:", e);
					return false;
				}
			}

			return refVal == expected;
		}

		if (pat.type === "var") {
			const varsFromPython = window.lastPythonVars;
			const value = varsFromPython[pat.name];

			if (value === undefined) return false;

			if (pat.captureAs) vars[pat.captureAs] = value;

			if (pat.expected !== undefined) {
				return String(value).trim() === String(pat.expected).trim();
			}

			return true;
		}

		if (pat.type === "rollback" || pat.type === "set-error") return true;

		return false;
	}

	function evaluateCondition(condition) {
		if (condition.type === "var-equals") {
			const varValue = vars[condition.name];
			return String(varValue).trim() == String(condition.value).trim();
		}
		if (condition.type === "var-gt") {
			const varValue = vars[condition.name];
			return Number(varValue) > Number(condition.value);
		}
		if (condition.type === "var-ge") {
			const varValue = vars[condition.name];
			return Number(varValue) >= Number(condition.value);
		}
		if (condition.type === "var-exists") {
			return vars[condition.name] !== undefined;
		}

		console.error("Unknown condition type:", condition.type);
		return false;
	}

	function matchPattern(lines, patterns, idx = 0) {
		for (let k = 0; k < patterns.length; k++) {
			const pattern = patterns[k];

			if (pattern.type === "repeat") {
				let reps = pattern.times;

				if (pattern.timesInputIndex !== undefined) {
					reps = parseInt(userInputs[pattern.timesInputIndex], 10);
				}

				if (pattern.untilInput !== undefined) {
					while (idx < lines.length) {
						const lastInput = userInputs[userInputs.length - 1];
						if (lastInput === pattern.untilInput) break;

						const startIdx = idx;
						idx = matchPattern(lines, pattern.body, idx);
						if (idx === -1 || idx === startIdx) break;
					}
				} else if (pattern.untilValue !== undefined) {
					while (idx < lines.length) {
						const currentLine = lines[idx];
						if (currentLine === undefined) break;

						if (currentLine.trim() === pattern.untilValue) {
							idx++;
							break;
						}
						const startIdx = idx;
						idx = matchPattern(lines, pattern.body, idx);
						if (idx == startIdx) break;
					}
				} else if (reps !== undefined) {
					for (let r = 0; r < reps; r++) {
						idx = matchPattern(lines, pattern.body, idx);
						if (idx === -1) return -1;
					}
				} else {
					while (true) {
						const startIdx = idx;
						idx = matchPattern(lines, pattern.body, idx);
						if (idx === -1 || idx === startIdx) break;
					}
				}
			} else if (pattern.type === "conditional") {
				const conditionResult = evaluateCondition(pattern.condition);
				let nextIdx = idx;

				if (conditionResult && pattern.then !== undefined) {
					nextIdx = matchPattern(lines, pattern.then, idx);
				} else if (!conditionResult && pattern.else !== undefined) {
					nextIdx = matchPattern(lines, pattern.else, idx);
				}
				if (nextIdx === -1) return -1;
				idx = nextIdx;
			} else {
				if (skipTypes.includes(pattern.type)) idx--;
				if (idx >= lines.length || !matchLine(lines[idx], pattern)) {
					console.log("Failed at pattern", pattern);
					console.log(lines, idx);
					console.log("Found", lines[idx], "instead.");
					return -1;
				}
				idx++;
			}
		}

		return idx;
	}

	const result = matchPattern(outLines, pattern, index);
	return result !== -1;
};

const validator = async (outputText) => {
	const body = document.body;

	// Helper: escape HTML for safe dialog insertion
	function escapeHtml(unsafe) {
		return unsafe
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/\"/g, "&quot;")
			.replace(/'/g, "&#039;");
	}

	// Small robot SVG used in the dialog
	const robotSVG = `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="none"><rect x="8" y="18" width="48" height="34" rx="4" fill="#e6eef8" stroke="#c6d8ee"/><rect x="22" y="8" width="20" height="10" rx="3" fill="#e6eef8" stroke="#c6d8ee"/><circle cx="24" cy="31" r="3" fill="#4caf50"/><circle cx="40" cy="31" r="3" fill="#4caf50"/><rect x="28" y="38" width="8" height="4" rx="1" fill="#c6d8ee"/></svg>`;

	// Show an error dialog with a friendly robot and a suggestion message
	function showErrorDialog(message) {
		return new Promise((resolve) => {
			const lang = localStorage.getItem("lang") === "vi" ? "vi" : "en";
			const titleText =
				lang === "vi"
					? "Ôi không — Tôi phát hiện một lỗi"
					: "Uh oh — I found a mistake";
			const dismissText = lang === "vi" ? "Đóng" : "Dismiss";
			const fixText = lang === "vi" ? "Chỉnh sửa" : "Focus editor";

			let dlg = document.getElementById("error-dialog");
			if (!dlg) {
				dlg = document.createElement("dialog");
				dlg.id = "error-dialog";
				document.body.appendChild(dlg);
			}

			// If message is the generic English fallback and user prefers Vietnamese, replace it
			let shownMessage = String(message || "");
			const englishDefault =
				"Output did not match expected result. Check logic and formatting.";
			const vietnameseDefault =
				"Kết quả không khớp với kết quả mong đợi. Kiểm tra logic và định dạng.";
			if (lang === "vi" && shownMessage === englishDefault)
				shownMessage = vietnameseDefault;

			dlg.innerHTML = `
					<div class="error-card">
						<div class="robot-illustration">${robotSVG}</div>
						<div class="error-content">
							<h4>${escapeHtml(titleText)}</h4>
							<p id="error-msg">${escapeHtml(shownMessage)}</p>
							<div class="error-actions">
								<button class="dismiss-btn">${escapeHtml(dismissText)}</button>
								<button class="fix-btn">${escapeHtml(fixText)}</button>
							</div>
						</div>
					</div>`;

			const dismiss = dlg.querySelector(".dismiss-btn");
			const fix = dlg.querySelector(".fix-btn");
			function cleanup() {
				try {
					if (typeof dlg.close === "function") dlg.close();
				} catch (e) {}
				try {
					if (
						dismiss &&
						typeof dismiss.removeEventListener === "function"
					)
						dismiss.removeEventListener("click", onDismiss);
					if (fix && typeof fix.removeEventListener === "function")
						fix.removeEventListener("click", onFix);
				} catch (e) {}
				try {
					if (dlg && dlg.parentNode) dlg.parentNode.removeChild(dlg);
				} catch (e) {}
				resolve();
			}

			function onDismiss() {
				cleanup();
			}
			function onFix() {
				cleanup();
				const ta = document.getElementById("editor");
				if (ta) {
					ta.focus();
					ta.scrollIntoView({ behavior: "smooth", block: "center" });
				}
			}

			dismiss.addEventListener("click", onDismiss);
			fix.addEventListener("click", onFix);

			try {
				dlg.showModal();
			} catch (e) {
				alert(shownMessage);
				resolve();
			}
		});
	}

	if (validateOutput(outputText, correctOutputs[lessonCounter])) {
		correctCount++;
		timeout = 2500;
		step();

		body.classList.add("correct");

		setTimeout(async () => {
			body.classList.remove("correct");
			if (lessonCounter < activities - 1) {
				lessonCounter++;

				const textarea = document.getElementById("editor");
				const highlight = document.getElementById("highlight");
				const pre = highlight.parentElement;

				function updateHighlight() {
					let code = textarea.value;

					const html = code
						.replace(/&/g, "&amp;")
						.replace(/</g, "&lt;")
						.replace(/>/g, "&gt;");

					highlight.innerHTML = html;
					Prism.highlightElement(highlight);

					pre.scrollTop = textarea.scrollTop;
					pre.scrollLeft = textarea.scrollLeft;
				}

				if (codeList[lessonCounter] !== "") {
					textarea.value =
						localStorage.getItem("lang") === "vi"
							? "# Nhập mã ở đây\n"
							: "# Enter code here\n";
					textarea.value += codeList[lessonCounter];
					textarea.focus();
					updateHighlight();
				}

				document.getElementById("runBtn").disabled = false;
				fetchAndUpdateContent();
			} else {
				await showResultsDialog();
				const currentUnit = Number(
					sessionStorage.getItem("lessonID").split(".")[0],
				);
				const currentLesson = Number(
					sessionStorage.getItem("lessonID").split(".")[1],
				);
				const lessonsData = await fetchLessonConfig(
					Number(currentUnit),
				);

				try {
					const totalAttempts = correctCount + wrongCount;
					const percentage =
						totalAttempts > 0
							? Math.round((correctCount / totalAttempts) * 100)
							: 0;

					const reportEntry = {
						lesson: currentLesson || lessonsData.length,
						unit: currentUnit,
						percentage: percentage,
						date: new Date(),
						correct: correctCount,
						total: totalAttempts,
					};

					const userId = window.auth?.currentUser?.uid;
					if (userId) {
						const userRef = window.doc(window.db, "users", userId);
						await window.updateDoc(userRef, {
							report: window.arrayUnion(reportEntry),
						});
					}
				} catch (e) {
					console.error("Failed to append report entry:", e);
				}

				await updateProgress(currentUnit, currentLesson, lessonsData);
				window.location.href = "home.html";
			}
		}, 3500);
	} else {
		wrongCount++;
		timeout = 1250;
		body.classList.add("wrong");

		try {
			const diag = diagnoseOutput(
				outputText,
				correctOutputs[lessonCounter],
			);
			const lang = localStorage.getItem("lang") === "vi" ? "vi" : "en";
			const defaultHint =
				lang === "vi"
					? "Kết quả không khớp với kết quả mong đợi. Kiểm tra logic và định dạng."
					: "Output did not match expected result. Check logic and formatting.";
			const hint = diag.ok ? defaultHint : diag.message;
			await showErrorDialog(hint);
		} catch (e) {
			console.error("Failed to produce diagnostic hint:", e);
		}

		setTimeout(() => {
			body.classList.remove("wrong");
			document.getElementById("runBtn").disabled = false;
			const textarea = document.getElementById("editor");
			textarea.focus();
		}, timeout + 1000);
	}
};

const showResultsDialog = () => {
	return new Promise((resolve) => {
		const dlg = document.getElementById("results");
		if (!dlg) {
			resolve();
			return;
		}

		const totalAttempts = correctCount + wrongCount;
		const percentage =
			totalAttempts > 0
				? Math.round((correctCount / totalAttempts) * 100)
				: 0;

		const title =
			localStorage.getItem("lang") === "vi" ? "Kết quả" : "Results";
		const correctLabel =
			localStorage.getItem("lang") === "vi" ? "Đúng" : "Correct";
		const wrongLabel =
			localStorage.getItem("lang") === "vi" ? "Sai" : "Wrong";
		const percentLabel =
			localStorage.getItem("lang") === "vi" ? "Tỷ lệ đúng" : "Percentage";
		const closeLabel =
			localStorage.getItem("lang") === "vi" ? "Tiếp tục" : "Continue";

		dlg.innerHTML = `
			<div class="results-card">
				<h3 class="results-title">${title}</h3>
				<div class="results-row"><span>${correctLabel}:</span><strong>${correctCount}</strong></div>
				<div class="results-row"><span>${wrongLabel}:</span><strong>${wrongCount}</strong></div>
				<div class="results-row"><span>${percentLabel}:</span><strong>${percentage}%</strong></div>
				<button id="results-continue">${closeLabel}</button>
			</div>
		`;

		const btn = dlg.querySelector("#results-continue");

		const cleanup = () => {
			try {
				dlg.removeEventListener("close", onClose);
				dlg.removeEventListener("cancel", onClose);
			} catch (e) {}
			btn?.removeEventListener("click", onBtn);
		};

		const onBtn = () => {
			try {
				if (typeof dlg.close === "function") dlg.close();
				else dlg.style.display = "none";
			} catch (e) {
				dlg.style.display = "none";
			}
		};

		const onClose = () => {
			cleanup();
			resolve();
		};

		btn?.addEventListener("click", onBtn);

		try {
			if (typeof dlg.showModal === "function") {
				dlg.addEventListener("close", onClose);
				dlg.addEventListener("cancel", onClose);
				dlg.showModal();
			} else {
				dlg.style.display = "block";
				btn?.addEventListener("click", () => {
					dlg.style.display = "none";
					onClose();
				});
			}
		} catch (e) {
			dlg.style.display = "block";
			btn?.addEventListener("click", () => {
				dlg.style.display = "none";
				onClose();
			});
		}
	});
};

// Listeners
document.getElementById("runBtn").addEventListener("click", async () => {
	const btn = document.getElementById("runBtn");
	btn.disabled = true;
	try {
		const outputText = await runPython();
		validator(outputText);
	} catch (error) {
		validator(document.getElementById("output").innerText);
	}
});

document.getElementById("stopBtn").addEventListener("click", () => {
	stopPython();
	const outputText = document.getElementById("output").innerText;
	validator(outputText);
});

document.addEventListener("DOMContentLoaded", () => {
	const textarea = document.getElementById("editor");
	const highlight = document.getElementById("highlight");
	const pre = highlight.parentElement;

	function updateHighlight() {
		let code = textarea.value;

		const html = code
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;");

		highlight.innerHTML = html;
		Prism.highlightElement(highlight);

		pre.scrollTop = textarea.scrollTop;
		pre.scrollLeft = textarea.scrollLeft;
	}

	textarea.addEventListener("input", updateHighlight);
	textarea.addEventListener("scroll", updateHighlight);

	textarea.value =
		localStorage.getItem("lang") === "vi"
			? "# Nhập mã ở đây\n"
			: "# Enter code here\n";
	textarea.value += codeList[lessonCounter];
	textarea.focus();
	updateHighlight();
});

document.getElementById("back").addEventListener("click", () => {
	window.location.href = "home.html";
});

fetchAndUpdateContent();
