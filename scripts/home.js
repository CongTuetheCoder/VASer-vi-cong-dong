const container = document.getElementById("lessons-container");
const dialog = document.getElementsByClassName("lessonDialog")[0];
let clicked = false;

const createButtons = (unit, lessonsArrange, lessonsData) => {
	let lessonIdx = 1;
	const title = document.createElement("h4");
	title.innerText = lessonsData["name"];
	title.id = `section${unit}`;
	container.appendChild(title);

	for (let i = 0; i < lessonsArrange.length; i++) {
		if (lessonsArrange[i] > 4) {
			console.error(`Item ${unit} has more than 4 lessons!`);
		}

		const row = document.createElement("div");
		row.className = "row";

		// Styling
		if (lessonsArrange[i] === "r") row.style.paddingLeft = "80px";
		if (lessonsArrange[i] === "l") row.style.paddingRight = "80px";

		const button = document.createElement("button");
		const lesson = `${lessonsData[lessonIdx]["name"]}`;
		const isActivity =
			lesson.indexOf("Thực hành") !== -1 ||
			lesson.indexOf("Practice") !== -1;
		const title = !isActivity
			? `Bài ${unit}.${lessonIdx} - ${lesson}`
			: lesson;

		button.innerHTML = `<i class="${lessonsData[lessonIdx]["iconClasses"]}"></i>`;
		button.className = "lessonBtn";
		if (isActivity) button.classList.add("activityBtn");
		button.title = title;
		button.type = "button";
		button.id = `lesson${unit}${lessonIdx}`;
		button.dataset.unit = unit;
		button.dataset.idx = lessonIdx;

		button.addEventListener("click", () => {
			if (dialog.children.length === 0) {
				dialog.style.height = "fit-content";
				dialog.style.padding = "20px";

				const lessonHeader = document.createElement("h5");
				lessonHeader.id = "lessonHeader";

				const enterLessonBtn = document.createElement("button");
				enterLessonBtn.className = "enterLessonBtn";
				enterLessonBtn.type = "button";

				enterLessonBtn.addEventListener("click", () => {
					enterLessonBtn.innerHTML =
						'<i class="fa-solid fa-spinner fa-spin-pulse"></i>';
					const headerText = dialog.childNodes[0].innerHTML;
					const idx = String(button.dataset.idx);

					const storeData = () => {
						const lang = localStorage.getItem("lang");
						const code = lessonsData[idx]["code" + lang];
						const correctOutputs =
							lessonsData[idx]["correct" + lang];

						const lessonID = headerText.split(" ")[1].slice(0, -1);

						sessionStorage.setItem("lesson", headerText);
						sessionStorage.setItem(
							"filledcode",
							JSON.stringify(code)
						);
						sessionStorage.setItem(
							"correct",
							JSON.stringify(correctOutputs)
						);
						sessionStorage.setItem("lessonID", lessonID);
					};

					for (let time = 0; time < 1000; time += 50) {
						setTimeout(storeData, time); // fallback
					}

					setTimeout(() => {
						window.location.href = "lesson.html";
					}, 1000);
				});

				dialog.appendChild(lessonHeader);
				dialog.appendChild(enterLessonBtn);

				clicked = true;
			}

			const enterLessonBtn =
				document.getElementsByClassName("enterLessonBtn")[0];
			enterLessonBtn.innerHTML =
				'<i class="fa-solid fa-play fa-beat"></i>';
			enterLessonBtn.title = button.title;

			const lessonHeader = document.getElementById("lessonHeader");
			lessonHeader.innerHTML = button.title;

			if (isActivity) {
				enterLessonBtn.classList.add("enterActivityBtn");
				dialog.classList.add("activityDialog");
			} else {
				enterLessonBtn.classList.remove("enterActivityBtn");
				dialog.classList.remove("activityDialog");
			}

			window.scrollTo({
				top: 0,
				behavior: "smooth",
			});
		});

		row.appendChild(button);
		lessonIdx++;

		container.appendChild(row);
	}
};

const drawPathsBetweenButtons = () => {
	const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	svg.style.position = "absolute";
	svg.style.top = 0;
	svg.style.left = 0;
	svg.style.width = "100%";
	svg.style.height = "100%";
	svg.style.pointerEvents = "none";
	svg.id = "lesson-paths-svg";
	svg.style.zIndex = "2";

	// Remove old SVG if exists
	const oldSvg = document.getElementById("lesson-paths-svg");
	if (oldSvg) oldSvg.remove();

	// Group rows by unit (split at each <h4>)
	const containerChildren = Array.from(container.children);
	let groups = [];
	let currentGroup = [];
	containerChildren.forEach((child) => {
		if (child.tagName === "H4") {
			if (currentGroup.length) groups.push(currentGroup);
			currentGroup = [];
		} else if (child.classList && child.classList.contains("row")) {
			currentGroup.push(child);
		}
	});
	if (currentGroup.length) groups.push(currentGroup);

	// Helper: Catmull-Rom to Bezier
	function catmullRom2bezier(points) {
		let d = "";
		for (let i = 0; i < points.length - 1; i++) {
			const p0 = points[i - 1] || points[i];
			const p1 = points[i];
			const p2 = points[i + 1];
			const p3 = points[i + 2] || p2;

			const divisor = 3.2;

			// Catmull-Rom to Bezier conversion
			const cp1x = p1.x + (p2.x - p0.x) / divisor;
			const cp1y = p1.y + (p2.y - p0.y) / divisor;
			const cp2x = p2.x - (p3.x - p1.x) / divisor;
			const cp2y = p2.y - (p3.y - p1.y) / divisor;

			if (i === 0) d += `M ${p1.x} ${p1.y} `;
			d += `C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y} `;
		}
		return d;
	}

	// Draw a smooth path for each unit group only
	groups.forEach((group) => {
		// Collect all button centers in this group
		const points = [];
		group.forEach((row) => {
			const btn = row.querySelector("button");
			if (btn) {
				const rect = btn.getBoundingClientRect();
				const containerRect = container.getBoundingClientRect();
				const x = rect.left + rect.width / 2 - containerRect.left;
				const y = rect.top + rect.height / 2 - containerRect.top;
				points.push({ x, y });
			}
		});

		if (points.length > 1) {
			const d = catmullRom2bezier(points);
			const path = document.createElementNS(
				"http://www.w3.org/2000/svg",
				"path"
			);
			path.setAttribute("d", d);
			path.setAttribute("stroke", "#743800ff");
			path.setAttribute("stroke-width", "16");
			path.setAttribute("fill", "none");
			path.setAttribute("stroke-linecap", "round");
			path.setAttribute("stroke-linejoin", "round");
			svg.appendChild(path);
		}
	});

	container.style.position = "relative";
	container.appendChild(svg);
};

fetch("data/lessons.json")
	.then((response) => {
		if (!response.ok) {
			console.error(`HTTP error: Status: ${response.status}`);
		}
		return response.json();
	})
	.then((data) => {
		for (let i = 1; i <= 4; i++) {
			createButtons(i, data.lessonsData[i], data.lessons[i]);
		}
		setTimeout(drawPathsBetweenButtons, 100);
	});

sessionStorage.clear();
window.addEventListener("resize", drawPathsBetweenButtons);
