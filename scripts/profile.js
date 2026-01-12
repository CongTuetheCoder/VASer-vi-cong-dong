const user = document.getElementById("animated");

const currentUnit = document.getElementById("current-unit");
const progressSpan = document.getElementById("progress");
const deleteAccBtn = document.getElementById("deleteAccBtn");
const signOutBtn = document.getElementById("signoutBtn");
const addClassBtn = document.getElementById("addClassBtn");

// Global holder for currently loaded user data to avoid scoping issues
let currentUserData = null;
let currentUsername = null;

const lessonJSON = "data/lessons.json";

async function fetchUID() {
	return new Promise((resolve) => {
		window.auth.onAuthStateChanged(async (user) => {
			if (!user) {
				window.location.href = "index.html";
				resolve({ xp: 0 });
				return;
			}
			try {
				const data = await window.getUserData(user.uid);
				if (!data) throw new Error("User data missing");
				currentUsername = data.username || null;

				if (currentUsername) {
					document.getElementById("animated").dataset.value =
						currentUsername;
					document.getElementById("animated").innerHTML =
						currentUsername;
					applyEffect();
				}
				resolve({
					xp: data.xp,
				});
			} catch (err) {
				console.error("Failed to fetch user progress:", err);
				resolve({ xp: 0 });
			}
		});
	});
}

setInterval(async () => {
	try {
		const authObj = window.auth ?? auth;
		const uid = authObj?.currentUser?.uid;
		if (!uid) return;

		const fetchUser = window.getUserData ?? getUserData;
		const userData = await fetchUser(uid);
		if (!userData || !userData.data) return;

		currentUserData = userData;

		const unitIndex = userData.data.currentUnit;
		if (unitIndex != null) {
			const prefix =
				localStorage.getItem("lang") == "vi" ? "Chủ đề " : "Unit ";
			document.getElementById("current-unit").innerHTML =
				prefix + String(unitIndex);
		}

		// Update progress safely
		try {
			const resp = await fetch(lessonJSON);
			if (!resp.ok) return;
			const lessons = await resp.json();
			const lessonsList =
				lessons?.lessonsData?.[String(userData.data.currentUnit)];
			if (!Array.isArray(lessonsList)) return;
			const totalLessons = lessonsList.length || 1;
			const currentLesson =
				Math.max(0, Number(userData.data.currentLesson) - 1) || 0;
			const percentage = Math.round(
				(currentLesson * 100) / totalLessons
			).toString();
			document.getElementById("progress").innerHTML = percentage;
		} catch (e) {
			console.error("Failed to update lesson progress:", e);
		}
	} catch (e) {
		console.error("Periodic profile update failed:", e);
	}
}, 3000);

deleteAccBtn.addEventListener("click", async () => {
	const lang = sessionStorage.getItem("lang");
	const msg =
		localStorage.getItem("lang") === "en"
			? "To delete your account, enter your username:"
			: "Để xóa tài khoản, vui lòng nhập tên người dùng:";
	const promptedUser = prompt(msg);

	// Ensure we have the latest username
	if (!currentUsername) {
		try {
			const authObj = window.auth ?? auth;
			const uid = authObj?.currentUser?.uid;
			if (uid) {
				const fetchUser = window.getUserData ?? getUserData;
				const ud = await fetchUser(uid);
				currentUsername =
					ud?.username || (ud?.data && ud.data.username) || null;
			}
		} catch (e) {
			console.error(
				"Failed to resolve username before deletion check:",
				e
			);
		}
	}

	if (promptedUser === currentUsername) {
		const authObj = window.auth ?? auth;
		const currentUser = authObj?.currentUser;

		if (!currentUser) {
			alert("No user is currently signed in.");
			return;
		}

		const confirmFinal =
			lang === "en"
				? "Are you absolutely sure? This action is permanent."
				: "Bạn có chắc chắn không? Hành động này không thể hoàn tác.";

		if (confirm(confirmFinal)) {
			try {
				// 1. Delete user data from Firestore
				const userDocRef = doc(db, "users", currentUser.uid);
				await deleteDoc(userDocRef);

				// 2. Delete user from Firebase Auth
				await deleteUser(currentUser);

				alert(
					lang === "en"
						? "Account deleted successfully."
						: "Xóa tài khoản thành công."
				);

				// 3. Clean up local state
				localStorage.removeItem("user");
				setCookie("user", "user", -1);
				window.location.href = "register.html";
			} catch (error) {
				console.error("Deletion failed:", error);

				// Handle re-authentication requirement
				if (error.code === "auth/requires-recent-login") {
					alert(
						lang === "en"
							? "For security, please sign out and sign back in before deleting your account."
							: "Vì lý do bảo mật, vui lòng đăng xuất và đăng nhập lại trước khi xóa tài khoản."
					);
				} else {
					alert(`Error: ${error.message}`);
				}
			}
		}
	} else {
		alert(
			lang === "en"
				? "Username does not match!"
				: "Tên người dùng không khớp!"
		);
	}
});

signOutBtn.addEventListener("click", () => {
	setCookie("user", "user", -1);
	window.location.href = "index.html";
});

window.addEventListener("DOMContentLoaded", async () => {
	const xpLabel = document.getElementById("xp-count");
	const { xp } = await fetchUID();
	xpLabel.innerText = String(xp);
});
