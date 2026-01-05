// Setup

const lessonContainer = document.getElementById("lesson-content");
const codeContainer = document.getElementById("code-container");
const body = document.getElementsByTagName("body")[0];
const lesson = sessionStorage.getItem("lesson");

lessonContainer.style.height = codeContainer.style.height;

const usersAPI = "https://68ce57d06dc3f350777eb8f9.mockapi.io/users";

if (lesson === null) window.location.href = "home.html";
else document.title = lesson;

let lessonCounter = 0;
let correctCount = 0;
let wrongCount = 0;
const correctOutputs = JSON.parse(sessionStorage.getItem("correct") || "[]");
const codeList = JSON.parse(sessionStorage.getItem("filledcode") || "[]");

const lessonID = sessionStorage.getItem("lessonID");

const activities = codeList.length;

const jsonURL = "data/content.json";

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
				else if (type === "i") elem += ' style="color: #00000080"';

				elem += `>${element.body}</${type}>`;
				lessonContainer.innerHTML += elem;
			});
		});
}

async function fetchUID() {
	try {
		const response = await fetch(usersAPI);
		if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
		const data = await response.json();

		const username = getCookie("user");
		const user = data.find((u) => u.username === username);

		if (!user || !user.data) throw new Error("User data missing");

		return user.id;
	} catch (err) {
		console.error("Failed to fetch user ID:", err);
		return "0"; // fallback
	}
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

async function updateUserProgress(
	uid,
	currentUnit,
	currentLesson,
	lessonsData
) {
	try {
		const response = await fetch(`${usersAPI}/${uid}`);
		if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
		const data = await response.json();

		const storedUnit = Number(data.data.currentUnit);
		const storedLesson = Number(data.data.lesson);

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

	if (nextLesson > lessonsData.length) {
		nextUnit++;
		nextLesson = 1;
	}

	if (nextUnit > 9) {
		console.log("Reached end of course");
		return null;
	}

	try {
		const response = await fetch(`${usersAPI}/${uid}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				data: {
					currentUnit: String(nextUnit),
					lesson: String(nextLesson),
				},
			}),
		});
		if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
		const userProgress = await response.json();
		console.log("Updated user progress:", userProgress);
		return userProgress;
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
						`return (${pat.transform})(...args);`
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

const validator = (outputText) => {
	const body = document.body;

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
				showResultsDialog();
				const uid = await fetchUID();
				const currentUnit = Number(
					sessionStorage.getItem("lessonID").split(".")[0]
				);
				const currentLesson = Number(
					sessionStorage.getItem("lessonID").split(".")[1]
				);
				const lessonsData = await fetchLessonConfig(
					Number(currentUnit)
				);

				await updateUserProgress(
					uid,
					currentUnit,
					currentLesson,
					lessonsData
				);
				window.location.href = "home.html";
			}
		}, 3500);
	} else {
		wrongCount++;
		timeout = 1250;
		body.classList.add("wrong");

		setTimeout(() => {
			body.classList.remove("wrong");
			document.getElementById("runBtn").disabled = false;
			const textarea = document.getElementById("editor");
			textarea.focus();
		}, timeout + 1000);
	}
};

const showResultsDialog = () => {};

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

	textarea.addEventListener("keydown", (event) => {
		if (event.key === "Tab") {
			event.preventDefault();
			const start = textarea.selectionStart;
			const end = textarea.selectionEnd;

			textarea.value =
				textarea.value.substring(0, start) +
				"\t" +
				textarea.value.substring(end);
			textarea.selectionStart = textarea.selectionEnd = start + 1;

			updateHighlight();
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
	textarea.value += codeList[lessonCounter];
	textarea.focus();
	updateHighlight();
});

document.getElementById("back").addEventListener("click", () => {
	window.location.href = "home.html";
});

fetchAndUpdateContent();
