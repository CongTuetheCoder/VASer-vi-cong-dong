const user = document.getElementById("animated");
const usernameText = localStorage.getItem("user") || "user";

user.dataset.value = usernameText;
user.innerHTML = usernameText;

const currentUnit = document.getElementById("current-unit");
const progressSpan = document.getElementById("progress");

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

					console.log(progressSpan);
				});
		});
}, 100);
