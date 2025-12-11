const fetchLang = (path) => {
	fetch(path)
		.then((response) => {
			if (!response.ok) {
				console.error(`HTTP error: Status: ${response.status}`);
			}
			return response.json();
		})
		.then((data) => {
			for (const key in data) {
				if (Object.prototype.hasOwnProperty.call(data, key)) {
					const element = document.getElementById(key);
					if (key == "language-btn" || key.indexOf("lesson") !== -1) {
						element.title = data[key];
					} else if (key == "animated") {
						element.dataset.value = data[key];
						element.innerHTML = data[key];
					} else if (key == "title") {
						document.title = data[key];
					} else if (key.startsWith("section")) {
						const splitted = data[key].split(":");
						element.innerHTML = `<span class='accent'>${splitted[0]}:</span>${splitted[1]}`;
					} else {
						element.innerHTML = data[key];
					}
				}
			}
		});
};

const languageBtn = document.getElementById("language-btn");

document.addEventListener("lessonReady", () => {
	if (localStorage.getItem("lang") === "en") {
		fetchLang("data/lang_en/home.json");
	} else {
		fetchLang("data/lang_vi/home.json");
	}

	languageBtn.addEventListener("click", () => {
		const dialog = document.getElementsByClassName("lessonDialog")[0];
		dialog.innerHTML = "";
		dialog.style.height = "0";
		dialog.style.padding = "0";

		if (localStorage.getItem("lang") === "en") {
			localStorage.setItem("lang", "vi");
			fetchLang("data/lang_vi/home.json");
		} else {
			localStorage.setItem("lang", "en");
			fetchLang("data/lang_en/home.json");
		}
	});
});
