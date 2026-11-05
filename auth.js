// ==========================================
// LEARNSPHERE FIREBASE AUTHENTICATION
// ==========================================

import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================
// 1. GET HTML ELEMENTS
// ==========================================

const studentAccountBtn = document.getElementById("studentAccountBtn");
const adminAccountBtn = document.getElementById("adminAccountBtn");

const studentAuthSection = document.getElementById("studentAuthSection");
const adminAuthSection = document.getElementById("adminAuthSection");

const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

const adminLoginForm = document.getElementById("adminLoginForm");


// ==========================================
// 2. SHOW STUDENT LOGIN
// ==========================================

function showStudentLogin() {

    loginForm.hidden = false;
    registerForm.hidden = true;

    loginTab.classList.add("active");
    registerTab.classList.remove("active");

}


// ==========================================
// 3. SHOW STUDENT REGISTRATION
// ==========================================

function showStudentRegistration() {

    loginForm.hidden = true;
    registerForm.hidden = false;

    registerTab.classList.add("active");
    loginTab.classList.remove("active");

}


// ==========================================
// 4. SELECT STUDENT ACCOUNT
// ==========================================

studentAccountBtn.addEventListener("click", function () {

    studentAuthSection.hidden = false;
    adminAuthSection.hidden = true;

    studentAccountBtn.classList.add("active");
    adminAccountBtn.classList.remove("active");

    showStudentLogin();

});


// ==========================================
// 5. SELECT ADMIN ACCOUNT
// ==========================================

adminAccountBtn.addEventListener("click", function () {

    studentAuthSection.hidden = true;
    adminAuthSection.hidden = false;

    adminAccountBtn.classList.add("active");
    studentAccountBtn.classList.remove("active");

});


// ==========================================
// 6. SWITCH AUTHENTICATION TABS
// ==========================================

loginTab.addEventListener("click", showStudentLogin);

registerTab.addEventListener("click", showStudentRegistration);


// ==========================================
// 7. STUDENT REGISTRATION
// ==========================================

registerForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();

    const email = document.getElementById("registerEmail").value.trim().toLowerCase();

    const university = document.getElementById("university").value.trim();

    const department = document.getElementById("department").value.trim();

    const level = document.getElementById("level").value;

    const password = document.getElementById("registerPassword").value;

    const confirmPassword = document.getElementById("confirmPassword").value;

    const message = document.getElementById("registerMessage");


    // Check empty fields

    if (!fullName || !email || !university || !department || !level || !password || !confirmPassword) {

        message.textContent = "Please complete all fields.";
        message.style.color = "red";

        return;

    }


    // Check password length

    if (password.length < 6) {

        message.textContent = "Password must contain at least 6 characters.";
        message.style.color = "red";

        return;

    }


    // Check password confirmation

    if (password !== confirmPassword) {

        message.textContent = "Passwords do not match.";
        message.style.color = "red";

        return;

    }


    try {

        message.textContent = "Creating your account...";
        message.style.color = "blue";


        // Create Firebase authentication account

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );


        // Get student ID

        const user = userCredential.user;


        // Save student profile in Firestore

        await setDoc(doc(db, "students", user.uid), {

            uid: user.uid,

            fullName: fullName,

            email: email,

            university: university,

            department: department,

            level: level,

            role: "student",

            createdAt: serverTimestamp()

        });


        // Log out after registration so student can use login form

        await signOut(auth);


        message.textContent = "Registration successful! You can now log in.";

        message.style.color = "green";


        registerForm.reset();


        setTimeout(function () {

            showStudentLogin();

        }, 1500);


    } catch (error) {

        console.error("Registration error:", error);

        message.textContent = getAuthErrorMessage(error);

        message.style.color = "red";

    }

});


// ==========================================
// 8. STUDENT LOGIN
// ==========================================

loginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email = document.getElementById("loginEmail").value.trim().toLowerCase();

    const password = document.getElementById("loginPassword").value;

    const message = document.getElementById("loginMessage");


    try {

        message.textContent = "Logging in...";
        message.style.color = "blue";


        // Login with Firebase

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


        const user = userCredential.user;


        // Get student profile

        const studentRef = doc(db, "students", user.uid);

        const studentSnapshot = await getDoc(studentRef);


        if (!studentSnapshot.exists()) {

            await signOut(auth);

            throw new Error("Student profile not found. Contact the administrator.");

        }


        const student = studentSnapshot.data();


        // Check account role

        if (student.role !== "student") {

            await signOut(auth);

            throw new Error("This account is not registered as a student.");

        }


        message.textContent = "Login successful! Redirecting...";
        message.style.color = "green";


        setTimeout(function () {

            window.location.href = "student-dashboard.html";

        }, 1000);


    } catch (error) {

        console.error("Login error:", error);

        message.textContent = getAuthErrorMessage(error);

        message.style.color = "red";

    }

});


// ==========================================
// 9. ADMIN LOGIN
// ==========================================

adminLoginForm.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email = document.getElementById("adminEmail").value.trim().toLowerCase();

    const password = document.getElementById("adminPassword").value;

    const message = document.getElementById("adminLoginMessage");


    try {

        message.textContent = "Verifying administrator...";
        message.style.color = "blue";


        // Firebase administrator login

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );


        const user = userCredential.user;


        // Check administrator profile

        const adminRef = doc(db, "admins", user.uid);

        const adminSnapshot = await getDoc(adminRef);


        if (!adminSnapshot.exists()) {

            await signOut(auth);

            throw new Error("You are not authorised to access the admin dashboard.");

        }


        if (adminSnapshot.data().role !== "admin") {

            await signOut(auth);

            throw new Error("Administrator access denied.");

        }


        message.textContent = "Login successful! Redirecting...";
        message.style.color = "green";


        setTimeout(function () {

            window.location.href = "admin.html";

        }, 1000);


    } catch (error) {

        console.error("Admin login error:", error);

        message.textContent = getAuthErrorMessage(error);

        message.style.color = "red";

    }

});


// ==========================================
// 10. FIREBASE ERROR MESSAGES
// ==========================================

function getAuthErrorMessage(error) {

    switch (error.code) {

        case "auth/email-already-in-use":
            return "This email already has an account.";

        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/weak-password":
            return "Password must contain at least 6 characters.";

        case "auth/invalid-credential":
            return "Incorrect email or password.";

        case "auth/network-request-failed":
            return "Network error. Check your internet connection.";

        default:
            return error.message || "Something went wrong. Please try again.";

    }

}


// ==========================================
// 11. CHECK URL MODE
// ==========================================

const urlParams = new URLSearchParams(window.location.search);

const mode = urlParams.get("mode");


if (mode === "register") {

    showStudentRegistration();

}

else if (mode === "admin") {

    adminAccountBtn.click();

}

else {

    showStudentLogin();

}


// ==========================================
// END OF LEARNSPHERE AUTHENTICATION
// ==========================================