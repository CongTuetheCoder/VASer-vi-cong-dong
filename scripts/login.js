const button = document.getElementById("loginBtn");
const emailIn = document.getElementById("username");
const passwordIn = document.getElementById("password");
const dialog = document.getElementById("wrong-dialog");

const usersAPI = "https://68ce57d06dc3f350777eb8f9.mockapi.io/users";

function setCookie(name, value, days) {
	const date = new Date();
	date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
	const expires = "expires=" + date.toUTCString();
	document.cookie = name + "=" + value + ";" + expires + ";path=/";
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

	// UI Feedback
	button.innerHTML = '<i class="fa-solid fa-spinner fa-spin-pulse"></i>';
	button.disabled = true;

	try {
		// Authenticate using Firebase Email/Password
		const userCredential = await window.signInWithEmailAndPassword(
			window.auth,
			emailIn.value,
			passwordIn.value
		);

		const user = userCredential.user;

		// Set login state
		setCookie("user", user.displayName || user.email, 30);
		window.location.href = "home.html";
	} catch (error) {
		console.error("Login error:", error.code);
		let errorMessage = isVn
			? "Đã xảy ra lỗi khi đăng nhập."
			: "An error occurred during login.";

		// Human-friendly error handling for common Firebase Auth issues
		if (
			error.code === "auth/invalid-email" ||
			error.code === "auth/user-not-found"
		) {
			errorMessage = isVn
				? "Email không hợp lệ hoặc không tồn tại."
				: "Invalid email or user not found.";
		} else if (
			error.code === "auth/wrong-password" ||
			error.code === "auth/invalid-credential"
		) {
			errorMessage = isVn
				? "Mật khẩu không chính xác."
				: "Incorrect password.";
		}

		showError(errorMessage);
		button.innerHTML = originalHTML;
		button.disabled = false;
		passwordIn.value = "";
	}
}

button.addEventListener("click", loginUser);

passwordIn.addEventListener("keydown", async (event) => {
	if (event.key === "Enter") {
		event.preventDefault();
		await loginUser();
	}
});

emailIn.addEventListener("keydown", async (event) => {
	if (event.key === "Enter") {
		event.preventDefault();
		await loginUser();
	}
});
