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
					if (key == "language-btn") {
						element.title = data[key];
					} else {
						element.innerHTML = data[key];
					}
				}
			}
		});
};

const languageBtn = document.getElementById("language-btn");
languageBtn.addEventListener("click", () => {
	if (localStorage.getItem("lang") === "en") {
		localStorage.setItem("lang", "vi");
		fetchLang("data/lang_vi/index.json");
	} else {
		localStorage.setItem("lang", "en");
		fetchLang("data/lang_en/index.json");
	}
});

if (localStorage.getItem("lang") === "en") {
	fetchLang("data/lang_en/index.json");
} else {
	fetchLang("data/lang_vi/index.json");
}
