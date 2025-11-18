document.addEventListener("click", (e) => {
	const isDropdownButton = e.target.matches("[data-dropdown-button]");
	if (!isDropdownButton && e.target.closest("[data-dropdown]") != null)
		return;

	let currentDropdown;
	if (isDropdownButton) {
		currentDropdown = e.target.closest("[data-dropdown]");
		currentDropdown.classList.toggle("active");
	}

	document.querySelectorAll("[data-dropdown].active").forEach((dropdown) => {
		if (dropdown === currentDropdown) return;
		dropdown.classList.remove("active");
	});
});

document.querySelectorAll(".dropdown-item").forEach((item) => {
	item.addEventListener("click", () => {
		const dropdown = item.closest(".dropdown");
		const btn = dropdown.querySelector(".dropdown-btn");
		btn.innerHTML = item.innerHTML;
		dropdown.classList.remove("active");
	});
});
