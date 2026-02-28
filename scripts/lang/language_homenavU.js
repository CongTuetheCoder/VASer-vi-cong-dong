languageBtn.addEventListener("click", () => {
	if (localStorage.getItem("lang") === "en") {
		fetchLang("data/lang_en/homeNavbar.json");
	} else {
		fetchLang("data/lang_vi/homeNavbar.json");
	}

	location.reload(true);
});

if (localStorage.getItem("lang") === "en") {
	fetchLang("data/lang_en/homeNavbar.json");
} else {
	fetchLang("data/lang_vi/homeNavbar.json");
}
