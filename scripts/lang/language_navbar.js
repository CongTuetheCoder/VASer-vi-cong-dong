languageBtn.addEventListener("click", () => {
	if (localStorage.getItem("lang") === "en") {
		fetchLang("data/lang_en/indexNavbar.json");
	} else {
		fetchLang("data/lang_vi/indexNavbar.json");
	}
});

if (localStorage.getItem("lang") === "en") {
	fetchLang("data/lang_en/indexNavbar.json");
} else {
	fetchLang("data/lang_vi/indexNavbar.json");
}
