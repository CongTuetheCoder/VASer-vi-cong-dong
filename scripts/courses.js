const dropBtn = document.getElementById("dropdown");
const dropdown = document.querySelector(".courses-dropdown");

document.addEventListener("click", (event) => {
	if (dropdown.contains(event.target)) {
		if (event.target === dropBtn || dropBtn.contains(event.target)) {
			dropdown.classList.toggle("dropdown-active");
		}
	} else {
		if (dropdown.classList.contains("dropdown-active")) {
			dropdown.classList.remove("dropdown-active");
		}
	}
});
