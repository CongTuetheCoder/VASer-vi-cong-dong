async function loginWithGoogle() {
	try {
		// Import Firebase Auth
		const { getAuth, GoogleAuthProvider, signInWithPopup } = await import(
			"https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
		);
		const auth = getAuth();
		const provider = new window.GoogleAuthProvider();

		// Sign in with popup
		const result = await window.signInWithPopup(auth, provider);
		const user = result.user;

		// Check if the user exists in Firestore
		const userData = await window.getUserData(user.uid);

		if (!userData) {
			// User does NOT exist, log them out immediately
			await window.auth.signOut();
			console.warn("❌ User not found in Firestore");
			alert(
				"No account found for this Google user. Please sign up first."
			);
			return;
		}

		console.log("Logged in as:", user.displayName);
		setCookie("user", user.displayName, 365);
		window.location.href = "home.html";
	} catch (err) {
		console.error("Google login failed:", err);
		alert("Login failed: " + err.message);
	}
}

// Attach listener
const googleLoginBtn = document.getElementById("googleLogin");
if (googleLoginBtn) {
	googleLoginBtn.addEventListener("click", loginWithGoogle);
}
