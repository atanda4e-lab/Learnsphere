// ========================================
// LEARNSPHERE FIREBASE CONFIGURATION
// ========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// FIREBASE CONFIGURATION

const firebaseConfig = {
    apiKey: "AIzaSyDmRbTb9GmbdV4XewH3mWR4sCnjFjNCmNg",
    authDomain: "learn-platform-ee239.firebaseapp.com",
    projectId: "learn-platform-ee239",
    storageBucket: "learn-platform-ee239.firebasestorage.app",
    messagingSenderId: "239413628166",
    appId: "1:239413628166:web:3171b69e94030f8cb9a287"
};


// INITIALIZE FIREBASE

const app = initializeApp(firebaseConfig);


// INITIALIZE AUTHENTICATION

const auth = getAuth(app);


// INITIALIZE FIRESTORE

const db = getFirestore(app);


// EXPORT FIREBASE SERVICES

export { app, auth, db };