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
	authDomain: "criticalcode-data.firebaseapp.com",
	projectId: "criticalcode-data",
	storageBucket: "criticalcode-data.firebasestorage.app",
	messagingSenderId: "63538851270",
	appId: "1:63538851270:web:9d57619eca41fd479796c7",
	measurementId: "G-EM5M671BJV",
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
	isStudent = true
) {
	const userRef = doc(db, "users", user.uid);

	const docSnap = await getDoc(userRef);
	if (!docSnap.exists()) {
		await setDoc(userRef, {
			username: user.displayName || "",
			email: user.email,
			type: loginType, // "email" or "google"
			isStudent: isStudent, // boolean
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

async function deleteUserDoc(uid) {
	const userRef = doc(db, "users", uid);
	await deleteDoc(userRef);
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

