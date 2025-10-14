const button = document.getElementById("signup");
const usernameIn = document.getElementById("username");
const passwordIn = document.getElementById("password");
const confirmPasswordIn = document.getElementById("confirm-password");
const passwordStrength = document.getElementById("password-strength");

const usersAPI = "https://68ce57d06dc3f350777eb8f9.mockapi.io/users";

const strengthMapVi = [
	"Chưa có mật khẩu.",
	"Mật khẩu yếu.",
	"Mật khẩu tốt.",
	"Mật khẩu mạnh.",
];

const strengthMapEn = [
	"No password.",
	"Weak password.",
	"Okay password.",
	"Strong password.",
];

const fieldsValid = {
	username: false,
	password: false,
	notWeakPassword: false,
};

const weakPasswords = [
	"password",
	"123",
	"1234",
	"12345",
	"123456",
	"12345678",
	"123456789",
	"111111",
	"abcdef",
	"qwerty",
	"admin",
	"guest",
];

const strengthColors = ["#949494", "#ff7575", "#ffdf75", "#7cff75"];

const passwordStrengthCheck = (password) => {
	const lowercase = /[a-z]/;
	const uppercase = /[A-Z]/;
	const symbols = /[0-9$-\/:-?{-~!"^_`\[\]@#]/;

	if (password == "") return 0;
	if (
		password.length <= 6 ||
		weakPasswords.includes(password) ||
		password == usernameIn.value
	)
		return 1;

	let strength = 1;

	if (lowercase.test(password)) strength++;
	if (uppercase.test(password)) strength++;
	if (symbols.test(password)) strength++;

	if (strength > 3) strength = 3;

	return strength;
};

async function hashPassword(password) {
	// 1. Generate a random 16-byte salt
	const salt = crypto.getRandomValues(new Uint8Array(16));

	// 2. Encode the password into bytes
	const enc = new TextEncoder();
	const passwordData = enc.encode(password);

	// 3. Derive a key using PBKDF2 (100,000 iterations of SHA-256)
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
			salt,
			iterations: 100000,
			hash: "SHA-256",
		},
		keyMaterial,
		256 // 256 bits = 32 bytes
	);

	// 4. Convert to hex strings
	const hashArray = Array.from(new Uint8Array(derivedBits));
	const hashHex = hashArray
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	const saltHex = Array.from(salt)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	// Return both the salt and hash
	return { salt: saltHex, hash: hashHex };
}

const updateButton = () => {
	button.disabled = !(fieldsValid.username && fieldsValid.password);
};

usernameIn.addEventListener("keydown", () => {
	setTimeout(() => {
		fieldsValid.username = usernameIn.value.length > 0;
		updateButton();
	}, 50);
});

confirmPasswordIn.addEventListener("keydown", () => {
	setTimeout(() => {
		fieldsValid.password =
			passwordIn.value === confirmPasswordIn.value &&
			passwordIn.value != "";
		updateButton();
	}, 50);
});

passwordIn.addEventListener("keydown", () => {
	setTimeout(() => {
		fieldsValid.password =
			passwordIn.value === confirmPasswordIn.value &&
			passwordIn.value != "";
		updateButton();
	}, 50);
});

button.addEventListener("click", () => {
	if (button.disabled) return; // Fallback

	const originalHTML = button.innerHTML;
	button.innerHTML = '<i class="fa-solid fa-spinner fa-spin-pulse"></i>';

	// Check if there is already the same username
	fetch(usersAPI)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error: Status: ${response.status}`);
			}
			return response.json();
		})
		.then(async (data) => {
			const existingUser = data.find(
				(user) => user.username === usernameIn.value
			);

			if (existingUser) {
				confirm(`Username '${usernameIn.value}' already exists!`);
				button.innerHTML = originalHTML;
				return;
			}

			const { salt, hash } = await hashPassword(passwordIn.value);

			const newUser = {
				username: usernameIn.value,
				salt, // store salt separately
				hash, // store the derived hash
				type: "userAccount",
				data: {
					currentUnit: "1",
					lesson: "0",
				},
			};

			// send it to the same api
			fetch(usersAPI, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(newUser),
			})
				.then((response) => {
					if (!response.ok) throw new Error("Failed to add user");
					return response.json();
				})
				.then((result) => {
					localStorage.setItem("user", usernameIn.value);
					window.location.href = "home.html";
				})
				.catch((error) => confirm(`Error adding user: ${error}`));
		})
		.catch((error) => {
			confirm(`An error occured: ${error}`);
			button.innerHTML = originalHTML;
		});
});

setInterval(() => {
	const strength = passwordStrengthCheck(passwordIn.value);
	passwordStrength.innerText =
		localStorage.getItem("lang") === "vi"
			? strengthMapVi[strength]
			: strengthMapEn[strength];
	passwordStrength.style.color = strengthColors[strength];
}, 50);
