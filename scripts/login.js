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
	const saltBytes = new Uint8Array(
		storedSaltHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
	);

	const enc = new TextEncoder();
	const passwordData = enc.encode(inputPassword);

	const keyMaterial = await crypto.subtle.importKey(
		"raw",
		passwordData,
		"PBKDF2",
		false,
		["deriveBits"]
	);

	const derivedBits = await crypto.subtle.deriveBits(
		{
			name: "PBKDF2",
			salt: saltBytes,
			iterations: 100000,
			hash: "SHA-256",
		},
		keyMaterial,
		256
	);

	const derivedHashHex = Array.from(new Uint8Array(derivedBits))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return derivedHashHex === storedHashHex;
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
