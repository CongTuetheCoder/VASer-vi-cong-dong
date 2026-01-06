async function signInWithGoogle() {
	const { GoogleAuthProvider, signInWithPopup } = await import(
		"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
	);

	const provider = new GoogleAuthProvider();
	const result = await signInWithPopup(auth, provider);
	const user = result.user;

	await window.createUserInFirestore(user, "google", [], true);
	console.log("Signed in as:", user.displayName);
	setCookie("user", user.displayName, 365);
	window.location.href = "home.html";
}

document
	.getElementById("googleSignup")
	.addEventListener("click", signInWithGoogle);
