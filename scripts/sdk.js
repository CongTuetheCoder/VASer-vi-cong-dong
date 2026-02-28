import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
	getFirestore,
	doc,
	getDoc,
	getDocs,
	setDoc,
	deleteDoc,
	onSnapshot,
	collection,
	query,
	orderBy,
	limit,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
	getAuth,
	createUserWithEmailAndPassword,
	updateProfile as updateProfileFn,
	GoogleAuthProvider,
	signInWithPopup,
	signInWithEmailAndPassword,
	deleteUser,
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
	apiKey: "...",
	authDomain: "...",
	projectId: "...",
	storageBucket: "...",
	messagingSenderId: "...",
	appId: "...",
	measurementId: "...",
};
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

/**
 * Creates a new user document in Firestore if it doesn't exist.
 * @param {FirebaseUser} user - Firebase Auth user
 * @param {string} loginType - "email" or "google"
 * @param {Array} classList - Array of class IDs
 * @param {boolean} isStudent - True if user is a student
 */
async function createUserInFirestore(
	user,
	loginType,
	classList = [],
	isStudent = true,
) {
	const userRef = doc(db, "users", user.uid);

	const docSnap = await getDoc(userRef);
	if (!docSnap.exists()) {
		await setDoc(userRef, {
			username: user.displayName || "",
			email: user.email,
			type: loginType,
			isStudent: isStudent,
			data: {
				currentUnit: "1",
				currentLesson: "1",
			},
			classList: classList,
			xp: 0,
			createdAt: new Date(),
		});
	}
	window.currentUser = user;
}

/**
 * Loads a snap of the current user's data
 * @param {string} uid - The ID of the user
 * @returns {object|null}
 */
async function getUserData(uid) {
	const userRef = doc(db, "users", uid);
	const snap = await getDoc(userRef);
	return snap.exists() ? snap.data() : null;
}

async function updateUserProgress(uid, progress) {
	const userRef = doc(db, "users", uid);
	await setDoc(userRef, { data: progress }, { merge: true });
}

async function updateUserXP(uid, amount) {
	const userRef = doc(db, "users", uid);
	await setDoc(userRef, { xp: amount }, { merge: true });
}

function listenToUser(uid, callback) {
	const userRef = doc(db, "users", uid);
	return onSnapshot(userRef, (snapshot) => {
		callback(snapshot.exists() ? snapshot.data() : null);
	});
}

/**
 * Deletes the current user
 * @param {string} uid - The ID of the user
 */
async function deleteUserDoc(uid) {
	const userRef = doc(db, "users", uid);
	await deleteDoc(userRef);
}

/**
 * Creates a new user document in Firestore if it doesn't exist.
 * @param {string} uid - The ID of the current user
 * @param {string} classID - The ID of the class
 */
async function addUserToClass(uid, classID) {
	const userRef = doc(db, "users", uid);
	await updateDoc(userRef, {
		classList: arrayUnion({ class: classID, isStudent: true }),
	});

	const classRef = doc(db, "classes", `class-${classID}`);
	const docSnap = await getDoc(classRef);
	if (docSnap.exists()) {
		await updateDoc(classRef, {
			studentIDs: arrayUnion(uid),
		});
	}
}

/**
 * Get recent report entries for a user, sorted by date descending.
 * @param {string} uid
 * @param {number} limitCount
 * @returns {Array} Array of report objects
 */
async function getUserReports(uid, limitCount = 10) {
	const userRef = doc(db, "users", uid);
	const snap = await getDoc(userRef);
	if (!snap.exists()) return [];
	const data = snap.data();
	const reports = Array.isArray(data.report) ? data.report.slice() : [];

	// normalize dates and sort descending
	reports.forEach((r) => {
		if (r && r.date && typeof r.date.toDate === "function") {
			r._dateObj = r.date.toDate();
		} else if (r && r.date) {
			r._dateObj = new Date(r.date);
		} else {
			r._dateObj = new Date(0);
		}
	});

	reports.sort((a, b) => b._dateObj - a._dateObj);

	return reports.slice(0, limitCount);
}

export {
	app,
	db,
	auth,
	createUserInFirestore,
	createUserWithEmailAndPassword,
	updateProfileFn as updateProfile,
	getUserData,
	updateUserProgress,
	updateUserXP,
	listenToUser,
	deleteUserDoc,
	addUserToClass,
	getUserReports,
};

window.getUserData = getUserData;
window.updateUserProgress = updateUserProgress;
window.updateUserXP = updateUserXP;
window.firebaseApp = app;
window.db = db;
window.auth = auth;
window.createUserInFirestore = createUserInFirestore;
window.createUserWithEmailAndPassword = createUserWithEmailAndPassword;
window.updateProfile = updateProfileFn;
window.listenToUser = listenToUser;
window.deleteUserDoc = deleteUserDoc;
window.GoogleAuthProvider = GoogleAuthProvider;
window.signInWithPopup = signInWithPopup;
window.signInWithEmailAndPassword = signInWithEmailAndPassword;
window.collection = collection;
window.query = query;
window.limit = limit;
window.orderBy = orderBy;
window.getDocs = getDocs;
window.deleteDoc = deleteDoc;
window.deleteUser = deleteUser;
window.doc = doc;
window.addUserToClass = addUserToClass;
window.getDoc = getDoc;
window.updateDoc = updateDoc;
window.setDoc = setDoc;
window.arrayUnion = arrayUnion;
window.getUserReports = getUserReports;
