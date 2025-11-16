// Setup

const lessonContainer = document.getElementById("lesson-content");
const codeContainer = document.getElementById("code-container");
const body = document.getElementsByTagName("body")[0];
const lesson = sessionStorage.getItem("lesson");

lessonContainer.style.height = codeContainer.style.height;

const usersAPI = "https://68ce57d06dc3f350777eb8f9.mockapi.io/users";

const COLOURS = {
	base: {
		dark: "#1a1b27",
		base: "#3c3069",
		light: "#bca9f2",
	},
	correct: {
		dark: "#1a271a",
		base: "#30694c",
		light: "#88e1b3",
	},
	wrong: {
		dark: "#271a1a",
		base: "#693030",
		light: "#d97a7a",
	},
};

if (lesson === null) window.location.href = "home.html";
else document.title = lesson;

let lessonCounter = 0;
const correctOutputs = JSON.parse(sessionStorage.getItem("correct") || "[]");
const codeList = JSON.parse(sessionStorage.getItem("filledcode") || "[]");

const lessonID = sessionStorage.getItem("lessonID");

const activities = codeList.length;

const jsonURL = "https://68ce57d06dc3f350777eb8f9.mockapi.io/content";
const backupURL = "data/content.json";

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
	fetch(backupURL)
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

	if (nextUnit > 4) {
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

async function runPython() {
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
}

function stopPython() {
	if (pythonWorker) {
		pythonWorker.terminate();
		pythonWorker = null;

		const out = document.getElementById("output");
		const runBtn = document.getElementById("runBtn");
		const stopBtn = document.getElementById("stopBtn");

		runBtn.disabled = false;
		stopBtn.disabled = true;
	}
}

function getUserInputFromOutput(promptText = "") {
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
}

function changeBgGradient(property = "base") {
	const gradient = document.getElementsByClassName("gradient")[0];
	const col1 = COLOURS[property].dark;
	const col2 = COLOURS[property].base;

	gradient.style.setProperty("--color-stop-1", col1);
	gradient.style.setProperty("--color-stop-2", col2);
}

function changeLessonGradient(property = "base") {
	const col1 = COLOURS[property]["light"];
	const col2 = COLOURS[property][property === "base" ? "base" : "dark"];

	lessonContainer.style.setProperty("--bg-stop-1", col1);

	const spans = lessonContainer.querySelectorAll("span");
	spans.forEach((span) => {
		span.style.backgroundColor = col2;
	});

	const divs = lessonContainer.querySelectorAll("div");
	divs.forEach((div) => {
		div.style.backgroundColor = col2;
	});
}

function step() {
	const percentage = ((lessonCounter + 1) / activities) * 100;
	const bar = document.getElementById("bar");
	bar.style.setProperty("--progress-width", `${percentage}%`);
}

function validateOutput(output, pattern) {
	const out = document.getElementById("output");
	if (out.style.color === "red") return false; // Error

	const normalize = (str) => str.replace(/\r\n/g, "\n").trim();
	const outLines = normalize(output).split("\n");
	const userInputs = [];
	const vars = {};
	const skipTypes = ["reference", "var"];

	let index = 0;

	function matchLine(line, pat) {
		if (pat.type === "prompt") {
			// capture user input after prompt
			if (!line.startsWith(pat.text)) return false;

			const input = line.slice(pat.text.length).trim();
			userInputs.push(input);

			if (pat.captureAs) vars[pat.captureAs] = input;
			return true;
		}

		if (pat.type === "dynamic") {
			if (!line.startsWith(pat.text)) return false;
			if (pat.captureAs) vars[pat.captureAs] = line;
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
			} else {
				if (skipTypes.includes(pattern.type)) idx--;
				if (idx >= lines.length || !matchLine(lines[idx], pattern)) {
					console.log("Failed at pattern", pattern);
					return -1;
				}
				idx++;
			}
		}

		return idx;
	}

	const result = matchPattern(outLines, pattern, index);
	return result !== -1;
}

function validator(outputText) {
	if (validateOutput(outputText, correctOutputs[lessonCounter])) {
		changeBgGradient("correct");
		changeLessonGradient("correct");
		timeout = 2500;
		step();

		setTimeout(() => {
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
				const backArrow = document.getElementById("back");
				backArrow.innerHTML =
					'<i class="fa-solid fa-arrow-left fa-beat"></i>';
				backArrow.style.color = "aqua";
				backArrow.style.textShadow = "0 0 5px aqua";

				document.getElementById("runBtn").disabled = false;
			}
		}, 3500);
	} else {
		changeBgGradient("wrong");
		changeLessonGradient("wrong");
		timeout = 1250;

		setTimeout(() => {
			document.getElementById("runBtn").disabled = false;
		}, timeout + 1000);
	}

	setTimeout(() => {
		changeBgGradient();
		changeLessonGradient();
	}, timeout);
}

// Listeners
document.getElementById("runBtn").addEventListener("click", async () => {
	const btn = document.getElementById("runBtn");
	btn.disabled = true;
	changeBgGradient();
	const outputText = await runPython();
	validator(outputText);
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

document.getElementById("back").addEventListener("click", async () => {
	if (lessonCounter >= activities - 1) {
		const uid = await fetchUID();
		const currentUnit = Number(
			sessionStorage.getItem("lessonID").split(".")[0]
		);
		const currentLesson = Number(
			sessionStorage.getItem("lessonID").split(".")[1]
		);
		const lessonsData = await fetchLessonConfig(Number(currentUnit));

		await updateUserProgress(uid, currentUnit, currentLesson, lessonsData);
	}

	window.location.href = "home.html";
});

fetchAndUpdateContent();
