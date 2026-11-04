// ========================================
// LEARNSPHERE FIREBASE CONFIGURATION
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    getFirestore
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// Firebase project configuration

const firebaseConfig = {
    apiKey: "AIzaSyClx2M5QO3eVNbjUNqg6CESb70ZSSI9Dyg",
    authDomain: "learnsphere-38f06.firebaseapp.com",
    projectId: "learnsphere-38f06",
    storageBucket: "learnsphere-38f06.firebasestorage.app",
    messagingSenderId: "87012683633",
    appId: "1:87012683633:web:d9151166969be006eb10d0"
};


// Initialize Firebase

const app = initializeApp(firebaseConfig);


// Initialize Firebase services

const auth = getAuth(app);
const db = getFirestore(app);


// Export services for other JavaScript files

export { app, auth, db };