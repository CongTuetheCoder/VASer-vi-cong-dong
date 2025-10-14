const button = document.getElementById("loginBtn");
const usernameIn = document.getElementById("username");
const passwordIn = document.getElementById("password");

console.log(button, usernameIn, passwordIn);

const usersAPI = "https://68ce57d06dc3f350777eb8f9.mockapi.io/users";

async function verifyPassword(inputPassword, storedSaltHex, storedHashHex) {
	// Convert stored salt (hex -> bytes)
	const saltBytes = new Uint8Array(
		storedSaltHex.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
	);

	// Encode password
	const enc = new TextEncoder();
	const passwordData = enc.encode(inputPassword);

	// Derive hash again using PBKDF2
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

	// Convert derived bits to hex
	const derivedHashHex = Array.from(new Uint8Array(derivedBits))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	// Compare hashes
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
			return;
		}

		const isMatch = await verifyPassword(
			passwordIn.value,
			user.salt,
			user.hash
		);

		if (isMatch) {
			localStorage.setItem("user", usernameIn.value);
			window.location.href = "home.html";
		}
	} catch (error) {
		confirm(`An error occurred: ${error}`);
		button.innerHTML = originalHTML;
	}
}

button.addEventListener("click", async () => {
	await loginUser();
});
