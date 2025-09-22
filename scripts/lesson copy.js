const lesson = sessionStorage.getItem("lesson");

if (lesson === null) window.location.href = "home.html";
else document.title = lesson;

let lessonCounter = 0;
const correctOutputs = JSON.parse(sessionStorage.getItem("correct") || "[]");
const codeList = JSON.parse(sessionStorage.getItem("filledcode") || "[]");

const activities = codeList.length;

async function runPython() {
	const code = document.getElementById("editor").value;
	const out = document.getElementById("output");
	document.getElementById("runBtn").disabled = true;

	out.innerText = "";
	out.style.color = "white";

	Sk.configure({
		output: (text) => {
			out.innerText += text;
			out.contentEditable = "false";
		},
		read: (x) => {
			if (
				Sk.builtinFiles === undefined ||
				Sk.builtinFiles["files"][x] === undefined
			) {
				throw "File not found: '" + x + "'";
			}
			return Sk.builtinFiles["files"][x];
		},
		inputfun: (promptText) => {
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
						out.innerText.length -
						window.getSelection().toString().length;

					if (e.key === "Enter") {
						e.preventDefault();
						let text = out.innerText.slice(promptStart);
						// Remove the last newline only if promptText is not empty and user pressed Enter
						if (text.indexOf("\n") !== -1) {
							text = text.slice(0, -1);
						}

						if (
							promptText === "" &&
							!out.innerText.endsWith("\n")
						) {
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
		},
	});

	await Sk.misceval
		.asyncToPromise(() =>
			Sk.importMainWithBody("<stdin>", false, code, true)
		)
		.catch((err) => {
			out.style.color = "red";
			document.getElementById("output").innerHTML = err.toString();
			out.contentEditable = "false";
		});
}

function changeBgGradient(col1 = "#1a1b2700", col2 = "#3c3069") {
	const gradient = document.getElementsByClassName("gradient")[0];
	gradient.style.setProperty("--color-stop-1", col1);
	gradient.style.setProperty("--color-stop-2", col2);
}

function step() {
	const percentage = Math.round(((lessonCounter + 1) / activities) * 100);
	const bar = document.getElementById("bar");
	bar.style.setProperty("--progress-width", `${percentage}%`);
}

function validateOutput(output, pattern) {
	const normalize = (str) => str.replace(/\r\n/g, "\n").trim();
	const outLines = normalize(output).split("\n");
	const userInputs = [];

	let index = 0;

	function matchLine(line, pat) {
		if (pat.type === "prompt") {
			// capture user input after prompt
			if (!line.startsWith(pat.text)) return false;

			const input = line.slice(pat.text.length).trim();
			userInputs.push(input);
			return true;
		}

		if (pat.type === "dynamic") {
			return line.startsWith(pat.text);
		}

		if (pat.type === "static") {
			return line === pat.text;
		}

		return false;
	}

	function matchPattern(lines, p, idx = 0) {
		for (let k = 0; k < p.length; k++) {
			const pat = p[k];

			if (pat.type === "repeat") {
				let reps = pat.times;
				if (pat.timesInputIndex !== undefined) {
					reps = parseInt(userInputs[pat.timesInputIndex], 10);
				}

				if (pat.untilInput !== undefined) {
					while (idx < lines.length) {
						const lastInput = userInputs[userInputs.length - 1];
						if (lastInput === pat.until) break;

						const startIdx = idx;
						idx = matchPattern(lines, pat.body, idx);
						if (idx === -1 || idx === startIdx) break;
					}
				} else if (pat.untilValue !== undefined) {
					while (idx < lines.length) {
						const currentLine = lines[idx];
						if (currentLine === undefined) break;

						if (lines[idx].trim() === pat.until) {
							idx++;
							break;
						}
						const startIdx = idx;
						idx = matchPattern(lines, pat.body, idx);
						if (idx == startIdx) break;
					}
				} else if (reps !== undefined) {
					for (let r = 0; r < reps; r++) {
						idx = matchPattern(lines, pat.body, idx);
						if (idx === -1) return -1;
					}
				} else {
					while (true) {
						const startIdx = idx;
						idx = matchPattern(lines, pat.body, idx);
						if (idx === -1 || idx === startIdx) break;
					}
				}
			} else {
				if (idx >= lines.length || !matchLine(lines[idx], pat))
					return -1;
				idx++;
			}
		}

		return idx;
	}

	const result = matchPattern(outLines, pattern, index);
	return result !== -1;
}

document.getElementById("runBtn").addEventListener("click", async () => {
	changeBgGradient();
	await runPython();

	const out = document.getElementById("output");
	const outputText = out.innerText;

	let timeout;

	if (validateOutput(outputText, correctOutputs[lessonCounter])) {
		changeBgGradient("#1a271a00", "#30694cff");
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

				textarea.value =
					localStorage.getItem("lang") === "vi"
						? "# Nhập mã ở đây\n"
						: "# Enter code here\n";
				textarea.value += codeList[lessonCounter];
				textarea.focus();
				updateHighlight();

				document.getElementById("runBtn").disabled = false;
			}
		}, 3500);
	} else {
		changeBgGradient("#271a1a00", "#693030ff");
		timeout = 1250;

		setTimeout(() => {
			document.getElementById("runBtn").disabled = false;
		}, timeout + 1000);
	}

	setTimeout(() => {
		changeBgGradient();
	}, timeout);
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
