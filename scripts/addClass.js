
async function fetchIsStudent() {
	return new Promise((resolve) => {
		window.auth.onAuthStateChanged(async (user) => {
			if (!user) {
				window.location.href = "index.html";
				resolve({ isStudent: false });
				return;
			}
			try {
				const data = await window.getUserData(user.uid);
				if (!data) throw new Error("User data missing");
				currentUsername = data.username || null;
				resolve({
					isStudent: !!data.isStudent,
					uid: user.uid,
					username: currentUsername,
				});
			} catch (err) {
				console.error("Failed to fetch user progress:", err);
				resolve({ isStudent: false });
			}
		});
	});
}

addClassBtn.addEventListener("click", async () => {
	const { isStudent, uid } = await fetchIsStudent();
	const classID = prompt("Enter class:", "xxxx-xxxx");
	if (!classID) return;

	const classDocRef = window.doc(window.db, "classes", `class-${classID}`);
	try {
		const classSnap = await window.getDoc(classDocRef);

		if (isStudent) {
			if (!classSnap.exists()) {
				alert("Class does not exist.");
				return;
			}
			await window.addUserToClass(uid, classID);
			alert("Joined class successfully.");
		} else {
			if (classSnap.exists()) {
				alert("A class with that ID already exists.");
				return;
			}
			await window.setDoc(classDocRef, {
				teacherID: uid,
				teacherName: currentUsername || "",
				classID: classID,
				studentIDs: [],
				createdAt: new Date(),
			});
			alert(`Class created: ${classID}`);
		}
	} catch (err) {
		console.error("Error handling class:", err);
		alert("An error occurred. See console for details.");
	}
});
