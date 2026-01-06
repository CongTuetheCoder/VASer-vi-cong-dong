async function signUpWithEmail(email, password, username, isStudent = true) {
	const userCredential = await createUserWithEmailAndPassword(
		auth,
		email,
		password
	);
	const user = userCredential.user;
	if (!user)
		throw new Error("No user returned from createUserWithEmailAndPassword");

	await updateProfile(user, { displayName: username });
	setCookie("user", username);
	await createUserInFirestore(user, "email", [], isStudent);
}

button.addEventListener("click", () => {
	signUpWithEmail(emailIn.value, passwordIn.value, emailIn.value, true).then(
		() => {
			window.location.href = "home.html";
		}
	);
});
