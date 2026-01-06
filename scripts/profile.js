const user = document.getElementById("animated");

const currentUnit = document.getElementById("current-unit");
const progressSpan = document.getElementById("progress");
const deleteAccBtn = document.getElementById("deleteAccBtn");
const signOutBtn = document.getElementById("signoutBtn");
const addClassBtn = document.getElementById("addClassBtn");

const usersAPI = "https://68ce57d06dc3f350777eb8f9.mockapi.io/users";
const lessonJSON = "data/lessons.json";

const usernameText = getCookie("user");
user.dataset.value = usernameText;
user.innerHTML = usernameText;

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
	const userData = await getUserData(auth.currentUser.uid);
	document.getElementById("current-unit").innerHTML =
		(localStorage.getItem("lang") == "vi" ? "Chủ đề " : "Unit ") +
		userData.data.currentUnit.toString();

	fetch(lessonJSON)
		.then((secondResponse) => {
			if (!secondResponse.ok) {
				throw new Error(`HTTP error: Status: ${secondResponse.status}`);
			}
			return secondResponse.json();
		})
		.then((lessons) => {
			const lessonsList =
				lessons.lessonsData[userData.data.currentUnit.toString()];
			const totalLessons = lessonsList.length;
			const currentLesson = Number(userData.data.currentLesson) - 1;

			const percentage = Math.round(
				(currentLesson * 100) / totalLessons
			).toString();
			document.getElementById("progress").innerHTML = percentage;
		});
}, 3000);

deleteAccBtn.addEventListener("click", async () => {
	const lang = sessionStorage.getItem("lang");
	const msg =
		localStorage.getItem("lang") === "en"
			? "To delete your account, enter your username:"
			: "Để xóa tài khoản, vui lòng nhập tên người dùng:";
	const promptedUser = prompt(msg);

	if (promptedUser === usernameText) {
		const currentUser = auth.currentUser;

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
