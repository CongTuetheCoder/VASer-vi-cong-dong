const container = document.getElementById("lessons-container");
const dialog = document.getElementsByClassName("lessonDialog")[0];
let clicked = false;

const usersAPI = "https://68ce57d06dc3f350777eb8f9.mockapi.io/users";

async function fetchUID() {
	try {
		const response = await fetch(usersAPI);
		if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
		const data = await response.json();

		const username = localStorage.getItem("user");
		const user = data.find((u) => u.username === username);

		if (!user || !user.data) throw new Error("User data missing");

		return {
			currentUnit: user.data.currentUnit,
			currentLesson: user.data.lesson,
		};
	} catch (err) {
		console.error("Failed to fetch user progress:", err);
		return { currentUnit: 1, currentLesson: 1 }; // fallback
	}
}

const createButtons = async (unit, lessonsArrange, lessonsData) => {
	let lessonIdx = 1;
	const title = document.createElement("h4");
	title.innerText = lessonsData["name"];
	title.id = `section${unit}`;
	container.appendChild(title);

	const { currentUnit, currentLesson } = await fetchUID();

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
		const isCaseStudy =
			lesson.startsWith("Case study") ||
			lesson.startsWith("Nghiên cứu tình huống");
		const title = !(isActivity || isCaseStudy)
			? `Bài ${unit}.${lessonIdx} - ${lesson}`
			: lesson;

		button.innerHTML = `<i class="${lessonsData[lessonIdx]["iconClasses"]}"></i>`;
		button.className = "lessonBtn";
		if (isActivity || isCaseStudy) button.classList.add("activityBtn");
		button.title = title;
		button.type = "button";
		button.id = `lesson${unit}${lessonIdx}`;
		button.dataset.unit = unit;
		button.dataset.idx = lessonIdx;

		if (unit > parseInt(currentUnit)) button.disabled = true;
		if (
			unit === parseInt(currentUnit) &&
			lessonIdx > parseInt(currentLesson)
		)
			button.disabled = true;

		if (i == 0) button.disabled = false;

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

					fetch("data/lessons.json")
						.then((response) => {
							if (!response.ok) {
								console.error(
									`HTTP error: Status: ${response.status}`
								);
							}
							return response.json();
						})
						.then((data) => {
							const lang = localStorage.getItem("lang");
							const isActivity =
								headerText.indexOf("Thực hành") !== -1 ||
								headerText.indexOf("Practice") !== -1;
							const isCaseStudy =
								headerText.startsWith("Case Study") ||
								headerText.startsWith("Nghiên cứu tình huống");

							let splitIdx = 1;
							splitIdx += Number(lang == "vi" && isActivity);
							splitIdx +=
								Number(isCaseStudy) *
								(Number(lang == "vi") * 2 + 1);

							const lessonID = headerText
								.split(" ")
								[splitIdx];
							let chapter, lesson;
							chapter = Number(lessonID.split(".")[0]);

							if (isCaseStudy) chapter *= 2;

							chapter = chapter.toString();

							if (!isActivity && !isCaseStudy)
								lesson = lessonID.split(".")[1];
							else
								lesson =
									data.lessonsData[chapter].length.toString();

							console.log(lessonID, lesson);
							if (data.lessons[chapter][lesson].disabled) {
								alert(
									lang == "vi"
										? "Bài tập hiện chưa hoàn thiện."
										: "Exercise currently unavailable."
								);
								enterLessonBtn.innerHTML = `<i class='fa-solid fa-play fa-beat'></i>`;
								return;
							}

							const storeData = () => {
								const code =
									data.lessons[chapter][lesson][
										"code" + lang
									];
								const correctOutputs =
									data.lessons[chapter][lesson][
										"correct" + lang
									];

								sessionStorage.setItem("lesson", headerText);
								sessionStorage.setItem(
									"filledcode",
									JSON.stringify(code)
								);
								sessionStorage.setItem(
									"correct",
									JSON.stringify(correctOutputs)
								);

								const getIndex =
									lessonID * (Number(isCaseStudy) + 1);
								sessionStorage.setItem("lessonID", getIndex);
							};

							for (let time = 0; time < 1000; time += 50) {
								setTimeout(storeData, time); // fallback
							}

							setTimeout(() => {
								window.location.href = "lesson.html";
							}, 1000);
						});
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

			if (isActivity || isCaseStudy) {
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

(async function init() {
	if (!localStorage.getItem("user")) {
		window.location.href = "index.html";
		return;
	}

	sessionStorage.clear();

	try {
		const response = await fetch("data/lessons.json");
		if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
		const data = await response.json();

		for (let i = 1; i <= 4; i++) {
			await createButtons(i, data.lessonsData[i], data.lessons[i]);
		}

		setTimeout(drawPathsBetweenButtons, 100);
		window.addEventListener("resize", drawPathsBetweenButtons);
	} catch (err) {
		console.error("Error initializing lessons:", err);
	}
})();
