const user = document.getElementById("animated");

const currentUnit = document.getElementById("current-unit");
const progressSpan = document.getElementById("progress");
const deleteAccBtn = document.getElementById("deleteAccBtn");
const signOutBtn = document.getElementById("signoutBtn");
const addClassBtn = document.getElementById("addClassBtn");
const editBtn = document.getElementById("edit-username");

let currentUserData = null;
let currentUsername = null;

const lessonJSON = "data/lessons.json";

/**
 * Render the user's classes into the profile UI.
 * Shows class ID and teacher name (if available).
 * Clicking an entry copies the class ID to clipboard.
 * @param {object} userData
 */
async function renderClasses(userData) {
	const listEl = document.getElementById("class-list");
	if (!listEl) return;
	listEl.innerHTML = "";

	const classList = userData?.classList || [];
	if (!Array.isArray(classList) || classList.length === 0) {
		const li = document.createElement("li");
		li.className = "text-muted";
		li.innerText =
			localStorage.getItem("lang") === "vi"
				? "Bạn chưa tham gia lớp nào."
				: "You are not in any classes.";
		listEl.appendChild(li);
		return;
	}

	for (const cid of classList) {
		const li = document.createElement("li");
		li.className = "mb-2";

		const span = document.createElement("span");
		span.innerText = cid["class"];
		span.style.cursor = "pointer";
		console.log(cid);

		try {
			const classRef = doc(db, "classes", `class-${cid["class"]}`);
			const classSnap = await getDoc(classRef);
			console.log(classRef, classSnap);
			if (classSnap.exists()) {
				const data = classSnap.data();
				const meta = document.createElement("small");
				meta.className = "ms-2";
				meta.innerText = data.teacherName
					? `- ${data.teacherName}`
					: "";
				li.appendChild(span);
				li.appendChild(meta);
			} else {
				li.appendChild(span);
				const missing = document.createElement("small");
				missing.className = "ms-2";
				missing.innerText =
					localStorage.getItem("lang") === "vi"
						? "- Không tìm thấy lớp"
						: "- not found";
				li.appendChild(missing);
			}
		} catch (e) {
			li.appendChild(span);
		}

		li.addEventListener("click", async () => {
			try {
				await navigator.clipboard.writeText(cid["class"]);
				const msg =
					localStorage.getItem("lang") === "vi"
						? "ID lớp đã được sao chép"
						: "Class ID copied";
				alert(msg + ": " + cid["class"]);
			} catch (e) {
				alert(cid["class"]);
			}
		});

		listEl.appendChild(li);
	}
}

/**
 * Render recent report entries for the current user.
 * @param {object} userData
 */
async function renderReports(userData) {
	const container = document.getElementById("report-section");
	if (!container) return;

	let list = container.querySelector("ul#report-list");
	if (!list) {
		list = document.createElement("ul");
		list.id = "report-list";
		list.className = "list-unstyled d-flex flex-wrap gap-3"; // Added flex for grid layout
		container.appendChild(list);
	}
	list.innerHTML = "";

	const authObj = window.auth ?? auth;
	const uid = authObj?.currentUser?.uid;
	const isVietnamese = localStorage.getItem("lang") === "vi";

	if (!uid) {
		list.innerHTML = `<li>${isVietnamese ? "Đăng nhập để xem báo cáo" : "Sign in to view reports"}</li>`;
		return;
	}

	try {
		const reports =
			typeof window.getUserReports === "function"
				? await window.getUserReports(uid, 10)
				: userData?.report || [];

		if (!Array.isArray(reports) || reports.length === 0) {
			list.innerHTML = `<li>${isVietnamese ? "Chưa có báo cáo gần đây" : "No recent reports"}</li>`;
			return;
		}

		for (const r of reports) {
			const li = document.createElement("li");
			li.className = "lesson-card p-3 rounded-4 shadow-sm";
			li.style.cssText =
				"background: #1a0b2e; border: 1px solid #3d1a6d; min-width: 280px; flex: 1;";

			const pctVal = Number(r.percentage) || 0;
			const scoreDisplay = r.total
				? `${r.correct}/${r.total}`
				: `${pctVal}%`;

			const dateObj =
				r._dateObj ||
				(r.date &&
					(r.date.toDate ? r.date.toDate() : new Date(r.date))) ||
				new Date();
			const dateStr = dateObj.toLocaleDateString(
				isVietnamese ? "vi-VN" : "en-US",
				{ day: "numeric", month: "short" },
			);

			const unitTxt = isVietnamese ? "Chương" : "Unit";
			const lessonTxt = isVietnamese ? "Bài" : "Lesson";

			const metaRow = `
                <div class="d-flex justify-content-between mb-2" style="font-size: 0.75rem; color: #a282cf; text-transform: uppercase; font-weight: 600;">
                    <span>${unitTxt} ${r.unit} • ${lessonTxt} ${r.lesson}</span>
                    <span>${dateStr}</span>
                </div>`;

			const scoreRow = `
                <div class="d-flex justify-content-between align-items-end mb-1">
                    <span style="font-size: 1.5rem; font-weight: 800; color: ${getColor(pctVal)};">${pctVal}%</span>
                    <span style="font-size: 0.85rem; color: #a282cf; margin-bottom: 4px;">${scoreDisplay}</span>
                </div>`;

			const progressBar = `
                <div class="progress" style="height: 6px; background-color: #3d1a6d; border-radius: 10px; overflow: hidden;">
                    <div class="progress-bar" style="width: ${pctVal}%; background-color: ${getColor(pctVal)}; transition: width 0.5s ease;"></div>
                </div>`;

			li.innerHTML = metaRow + scoreRow + progressBar;
			list.appendChild(li);
		}
	} catch (e) {
		console.error(e);
		list.innerHTML = `<li>${isVietnamese ? "Lỗi khi tải báo cáo" : "Error loading reports"}</li>`;
	}
}

// Helper function for dynamic color management
function getColor(pct) {
	if (pct >= 80) return "#28a745"; // Success Green
	if (pct >= 50) return "#ffcc00"; // Warning Yellow
	return "#dc3545"; // Danger Red
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
				(currentLesson * 100) / totalLessons,
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
				e,
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
						: "Xóa tài khoản thành công.",
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
							: "Vì lý do bảo mật, vui lòng đăng xuất và đăng nhập lại trước khi xóa tài khoản.",
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
				: "Tên người dùng không khớp!",
		);
	}
});

window.addEventListener("DOMContentLoaded", async () => {
	const xpLabel = document.getElementById("xp-count");
	const { xp } = await fetchUID();
	xpLabel.innerText = String(xp);

	try {
		const authObj = window.auth ?? auth;
		const uid = authObj?.currentUser?.uid;
		if (uid) {
			const fetchUser = window.getUserData ?? getUserData;
			const ud = await fetchUser(uid);
			if (ud) {
				currentUserData = ud;
				renderClasses(ud).catch((e) =>
					console.error("Initial renderClasses failed:", e),
				);
				renderReports(ud);
			}
		}
	} catch (e) {
		console.error("Failed to load classes on DOMContentLoaded:", e);
	}
});

signOutBtn.addEventListener("click", () => {
	setCookie("user", "user", -1);
	window.location.href = "index.html";
});

editBtn.addEventListener("click", async () => {
	const lang = sessionStorage.getItem("lang");
	const msg =
		localStorage.getItem("lang") === "en"
			? "Enter new username:"
			: "Nhập tên người dùng mới:";
	const promptedUser = prompt(msg);

	if (promptedUser) {
		// basic validation
		const newName = String(promptedUser).trim();
		if (newName.length < 2) {
			alert(
				lang === "en"
					? "Username must be at least 2 characters."
					: "Tên người dùng phải có ít nhất 2 ký tự.",
			);
			return;
		}

		const authObj = window.auth ?? auth;
		const currentUser = authObj?.currentUser;
		if (!currentUser) {
			alert(
				lang === "en"
					? "No user is currently signed in."
					: "Không có người dùng nào đang đăng nhập.",
			);
			return;
		}

		const userDocRef = window.doc(window.db, "users", currentUser.uid);

		try {
			const docSnap = await window.getDoc(userDocRef);
			const oldName =
				docSnap?.data &&
				(docSnap.data().username || docSnap.data().data?.username);

			if (oldName === newName) {
				alert(
					lang === "en"
						? "New username is the same as the current one."
						: "Tên mới giống với tên hiện tại.",
				);
				return;
			}

			// Update Firestore user document
			await window.updateDoc(userDocRef, { username: newName });

			// Update Firebase Auth displayName if possible
			try {
				if (
					window.updateProfile &&
					typeof window.updateProfile === "function"
				) {
					await window.updateProfile(currentUser, {
						displayName: newName,
					});
				}
			} catch (e) {
				// non-fatal
				console.warn("Failed to update auth displayName:", e);
			}

			// Update any class documents where this user is the teacher
			try {
				const classesCol = window.collection(window.db, "classes");
				const classesSnap = await window.getDocs(classesCol);
				for (const c of classesSnap.docs) {
					const data = c.data();
					if (data && data.teacherID === currentUser.uid) {
						const classRef = window.doc(window.db, "classes", c.id);
						await window
							.updateDoc(classRef, { teacherName: newName })
							.catch(() => {});
					}
				}
			} catch (e) {
				console.warn("Failed to update class teacher names:", e);
			}

			// update UI
			currentUsername = newName;
			document.getElementById("animated").dataset.value = newName;
			document.getElementById("animated").innerHTML = newName;
			if (typeof applyEffect === "function") applyEffect();

			alert(
				lang === "en"
					? "Username updated successfully."
					: "Cập nhật tên người dùng thành công.",
			);
		} catch (err) {
			console.error("Failed to update username:", err);
			alert(
				lang === "en"
					? "Failed to update username. See console for details."
					: "Cập nhật tên người dùng thất bại. Xem console để biết chi tiết.",
			);
		}
	}
});
