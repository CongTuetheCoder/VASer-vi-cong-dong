const user = document.getElementById("animated");
const usernameText = localStorage.getItem("user") || "user";

user.dataset.value = usernameText;
user.innerHTML = usernameText;

const currentUnit = document.getElementById("current-unit");
const progressSpan = document.getElementById("progress");
const deleteAccBtn = document.getElementById("deleteAccBtn");
const signOutBtn = document.getElementById("signoutBtn");

const usersAPI = "https://68ce57d06dc3f350777eb8f9.mockapi.io/users";
const lessonJSON = "data/lessons.json";

setInterval(() => {
	fetch(usersAPI)
		.then((response) => {
			if (!response.ok) {
				throw new Error(`HTTP error: Status: ${response.status}`);
			}
			return response.json();
		})
		.then((data) => {
			const userData = data.find(
				(user) => user.username === usernameText
			);

			document.getElementById("current-unit").innerHTML =
				(localStorage.getItem("lang") == "vi" ? "Chủ đề " : "Unit ") +
				userData.data.currentUnit.toString();

			fetch(lessonJSON)
				.then((secondResponse) => {
					if (!secondResponse.ok) {
						throw new Error(
							`HTTP error: Status: ${secondResponse.status}`
						);
					}
					return secondResponse.json();
				})
				.then((lessons) => {
					const lessonsList =
						lessons.lessonsData[
							userData.data.currentUnit.toString()
						];
					const totalLessons = lessonsList.length;
					const currentLesson = Number(userData.data.lesson);

					const percentage = Math.round(
						(currentLesson * 100) / totalLessons
					).toString();
					document.getElementById("progress").innerHTML = percentage;
				});
		});
}, 10000);

deleteAccBtn.addEventListener("click", () => {
	const msg =
		localStorage.getItem("lang") === "en"
			? "To delete your account, enter your username:"
			: "Để xóa tài khoản, vui lòng nhập tên người dùng:";
	const promptedUser = prompt(msg);

	if (promptedUser === usernameText) {
		fetch(usersAPI)
			.then((response) => {
				if (!response.ok) {
					throw new Error(`HTTP error: Status: ${response.status}`);
				}
				return response.json();
			})
			.then((data) => {
				const userObj = data.find(
					(user) => user.username === usernameText
				);
				if (!userObj) {
					alert("User not found.");
					return;
				}

				fetch(`${usersAPI}/${userObj.id}`, {
					method: "DELETE",
					headers: {
						"Content-Type": "application/json",
					},
				}).then((response) => {
					if (!response.ok) {
						throw new Error(
							`HTTP error: Status: ${response.status}`
						);
					}
					alert("Account deleted successfully.");
					localStorage.removeItem("user");
					window.location.href = "register.html";
				});
			})
			.catch((error) => confirm(`An error occured: ${error}`));
	} else {
		alert("Wrong user!");
	}
});

signOutBtn.addEventListener("click", () => {
	localStorage.removeItem("user");
	window.location.href = "index.html";
});
