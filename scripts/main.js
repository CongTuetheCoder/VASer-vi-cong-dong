const hamburgerBtn = document.querySelector(".hamburger-btn");
const closeBtn = document.querySelector(".close-btn");
const mobileSheet = document.getElementById("mobileSheet");
const overlay = document.getElementById("sheetOverlay");
const body = document.body;
const mobileDropdown = document.querySelector(".mobile-nav .dropdown");
const mobileDropdownBtn = document.querySelector(".mobile-nav .drop-btn");

function openMobileMenu() {
  mobileSheet.classList.add("is-open");
  overlay.classList.add("is-open");
  body.classList.add("mobile-menu-open");
}

function closeMobileMenu() {
  mobileSheet.classList.remove("is-open");
  overlay.classList.remove("is-open");
  body.classList.remove("mobile-menu-open");
  mobileDropdown.classList.remove("is-open");
}

hamburgerBtn.addEventListener("click", openMobileMenu);
closeBtn.addEventListener("click", closeMobileMenu);
overlay.addEventListener("click", closeMobileMenu);

mobileDropdownBtn.addEventListener("click", function (event) {
  if (window.innerWidth <= 1024) {
    event.preventDefault();
    event.stopPropagation();
    mobileDropdown.classList.toggle("is-open");
  }
});

mobileSheet.addEventListener("click", function (event) {
  if (
    window.innerWidth <= 1024 &&
    !mobileDropdown.contains(event.target) &&
    mobileDropdown.classList.contains("is-open")
  ) {
    mobileDropdown.classList.remove("is-open");
  }
});

window.addEventListener("resize", () => {
  if (window.innerWidth > 1024) {
    mobileSheet.classList.remove("is-open");
    overlay.classList.remove("is-open");
    body.classList.remove("mobile-menu-open");
    mobileDropdown.classList.remove("is-open");
    document
      .querySelectorAll(".desktop-nav .dropdown-content")
      .forEach((content) => {
        content.style.display = "";
      });
    document.querySelectorAll(".desktop-nav .arrow-icon").forEach((icon) => {
      icon.style.transform = "";
    });
  }
});
