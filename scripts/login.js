const button = document.getElementById("loginBtn");
const usernameIn = document.getElementById("username");
const passwordIn = document.getElementById("password");
const dialog = document.getElementById("wrong-dialog");

const usersAPI = "https://68ce57d06dc3f350777eb8f9.mockapi.io/users";

function setCookie(name, value, days) {
	const date = new Date();
	date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
	const expires = "expires=" + date.toUTCString();
	document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

async function verifyPassword(inputPassword, storedSaltHex, storedHashHex) {
	const salt = CryptoJS.enc.Hex.parse(storedSaltHex);

	// Derive key with same parameters
	const derivedKey = CryptoJS.PBKDF2(inputPassword, salt, {
		keySize: 256 / 32, // 256 bits = 32 bytes
		iterations: 100000,
		hasher: CryptoJS.algo.SHA256,
	});

	// Convert derived key to hex string
	const derivedHex = derivedKey.toString(CryptoJS.enc.Hex);

	return derivedHex === storedHashHex;
}

function hasDialogSupport() {
	return (
		typeof HTMLDialogElement === "function" &&
		typeof dialog.showModal === "function"
	);
}

function showDialogFallback() {
	if (dialog) dialog.setAttribute("open", "");
}
function closeDialogFallback() {
	if (dialog) dialog.removeAttribute("open");
}

function showError(message) {
	if (!dialog) {
		alert(message);
		return;
	}
	const errorMsg =
		dialog.querySelector(":scope > p") || dialog.querySelector("p") || null;
	if (errorMsg) errorMsg.innerText = message;

	try {
		if (hasDialogSupport()) {
			dialog.showModal();
		} else {
			showDialogFallback();
		}
	} catch (e) {
		showDialogFallback();
	}
}

function closeDialog() {
	if (!dialog) return;
	try {
		if (typeof dialog.close === "function") dialog.close();
		dialog.removeAttribute("open");
	} catch (e) {
		dialog.removeAttribute("open");
	}
}

(function initDialogHandlers() {
	if (!dialog) return;

	const okBtn = document.getElementById("ok-btn");
	if (okBtn) okBtn.addEventListener("click", closeDialog);

	dialog.addEventListener("click", (e) => {
		if (e.target === dialog) closeDialog();
	});

	dialog.addEventListener("cancel", (e) => {
		e.preventDefault();
		closeDialog();
	});
})();

async function loginUser() {
	const originalHTML = button.innerHTML;
	const isVn = (localStorage.getItem("lang") || "en") === "vi";
	button.innerHTML = '<i class="fa-solid fa-spinner fa-spin-pulse"></i>';

	try {
		const response = await fetch(usersAPI);
		const data = await response.json();

		const user = data.find((u) => u.username === usernameIn.value);

		if (!user) {
			showError(isVn ? "Tên người dùng không hợp lệ." : "Username not found.");
			button.innerHTML = originalHTML;
			return;
		}

		const isMatch = await verifyPassword(
			passwordIn.value,
			user.salt,
			user.hash
		);

		if (isMatch) {
			setCookie("user", usernameIn.value, 30);
			window.location.href = "home.html";
		} else {
			showError(isVn ? "Mật khẩu không hợp lệ." : "Incorrect password.");
			button.innerHTML = originalHTML;
			passwordIn.value = "";
			passwordIn.focus();
		}
	} catch (error) {
		confirm(`An error occurred: ${error}`);
		button.innerHTML = originalHTML;
	}
}

button.addEventListener("click", async () => {
	await loginUser();
});

passwordIn.addEventListener("keydown", async (event) => {
	if (event.key === "Enter") {
		event.preventDefault();
		await loginUser();
	}
});

usernameIn.addEventListener("keydown", async (event) => {
	if (event.key === "Enter") {
		event.preventDefault();
		await loginUser();
	}
});
