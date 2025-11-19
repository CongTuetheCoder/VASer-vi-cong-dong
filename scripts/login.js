const button = document.getElementById("loginBtn");
const usernameIn = document.getElementById("username");
const passwordIn = document.getElementById("password");

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

async function loginUser() {
	const originalHTML = button.innerHTML;
	button.innerHTML = '<i class="fa-solid fa-spinner fa-spin-pulse"></i>';

	try {
		const response = await fetch(usersAPI);
		const data = await response.json();

		const user = data.find((u) => u.username === usernameIn.value);

		if (!user) {
			confirm("Username not found.");
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
			button.innerHTML = originalHTML;
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
