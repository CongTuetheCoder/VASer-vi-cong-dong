const button = document.getElementById("signup");
const emailIn = document.getElementById("username");
const passwordIn = document.getElementById("password");
const confirmPasswordIn = document.getElementById("confirm-password");
const passwordStrength = document.getElementById("password-strength");

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
	"123",
	"123123",
	"1234",
	"12345",
	"123456",
	"12345678",
	"123456789",
	"111111",
	"123abc",
	"abcabc",
	"abcdef",
	"qwerty",
	"asdfgh",
	"1q2w3e",
	"password",
	"secret",
	"admin",
	"guest",
	"criticalcode",
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
		password == emailIn.value
	)
		return 1;

	let strength = 0;

	if (lowercase.test(password)) strength++;
	if (uppercase.test(password)) strength++;
	if (symbols.test(password)) strength++;

	if (password.length >= 8 && strength == 1) strength++;

	if (strength > 3) strength = 3;

	return strength;
};

const updateButton = () => {
	button.disabled = !(fieldsValid.username && fieldsValid.password);
};

emailIn.addEventListener("keydown", () => {
	const emailPat = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
	const email = emailIn.value;
	setTimeout(() => {
		fieldsValid.username = email.length > 0 && emailPat.test(email);
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

setInterval(() => {
	const strength = passwordStrengthCheck(passwordIn.value);
	passwordStrength.innerText =
		localStorage.getItem("lang") === "vi"
			? strengthMapVi[strength]
			: strengthMapEn[strength];
	passwordStrength.style.color = strengthColors[strength];
}, 50);
