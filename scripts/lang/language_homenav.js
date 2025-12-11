document.addEventListener("lessonReady", () => {
	languageBtn.addEventListener("click", () => {
		if (localStorage.getItem("lang") === "en") {
			fetchLang("data/lang_en/homeNavbar.json");
		} else {
			fetchLang("data/lang_vi/homeNavbar.json");
		}
	});

	if (localStorage.getItem("lang") === "en") {
		fetchLang("data/lang_en/homeNavbar.json");
	} else {
		fetchLang("data/lang_vi/homeNavbar.json");
	}
});
