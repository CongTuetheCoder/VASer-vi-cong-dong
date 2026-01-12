async function getTopPlayers() {
	const usersRef = collection(db, "users");
	const q = query(usersRef, orderBy("xp", "desc"), limit(10));

	const querySnapshot = await getDocs(q);
	const leaderboardData = [];

	querySnapshot.forEach((doc) => {
		const data = doc.data();
		leaderboardData.push({
			username: data.username || "Anonymous",
			xp: data.xp || 0,
		});
	});

	return leaderboardData;
}

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

async function createLeaderboard() {
	const container = document.querySelector(".container");
	if (!container) return;

	const topPlayers = await getTopPlayers();
	container.innerHTML = "";
	const uData = await window.getUserData(auth.currentUser.uid);

	topPlayers.forEach((player, index) => {
		const i = index + 1;
		const wrapper = document.createElement("div");
		wrapper.classList.add("ranking");
		if (player.username == uData.username)
			wrapper.classList.add("current-user");
		wrapper.id = `place-${i}`;

		// 1. Placement (Left)
		const rankNumber = document.createElement("div");
		rankNumber.classList.add("rank-digit");
		if (i === 10) {
			rankNumber.innerHTML =
				'<i class="fa-solid fa-1"></i><i class="fa-solid fa-0"></i>';
		} else {
			rankNumber.innerHTML = `<i class="fa-solid fa-${i}"></i>`;
		}

		const name = document.createElement("span");
		name.classList.add("user");
		name.textContent = player.username;

		const xpWrapper = document.createElement("div");
		xpWrapper.classList.add("xp-display");
		xpWrapper.innerHTML = `<i class="fa-solid fa-bolt"></i><span>${player.xp}</span>`;

		wrapper.appendChild(rankNumber);
		wrapper.appendChild(name);
		wrapper.appendChild(xpWrapper);
		container.appendChild(wrapper);
	});
}

window.addEventListener("DOMContentLoaded", async () => {
	const xpLabel = document.getElementById("xp-count");
	const { xp } = await fetchUID();
	xpLabel.innerText = String(xp);
});

createLeaderboard();
