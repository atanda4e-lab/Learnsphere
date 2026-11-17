// ========================================
// LEARNSPHERE AUTHENTICATION SYSTEM
// STUDENT, INSTRUCTOR AND ADMIN
// FIREBASE VERSION 12.2.1
// ========================================


// ========================================
// 1. FIREBASE IMPORTS
// ========================================

import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    deleteUser
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    setDoc,
    getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ========================================
// 2. GET HTML ELEMENTS
// ========================================

const studentAccountBtn = document.getElementById("studentAccountBtn");

const instructorAccountBtn = document.getElementById("instructorAccountBtn");

const adminAccountBtn = document.getElementById("adminAccountBtn");


const studentAuthSection = document.getElementById("studentAuthSection");

const instructorAuthSection = document.getElementById("instructorAuthSection");

const adminAuthSection = document.getElementById("adminAuthSection");


const loginTab = document.getElementById("loginTab");

const registerTab = document.getElementById("registerTab");


const instructorLoginTab = document.getElementById("instructorLoginTab");

const instructorRegisterTab = document.getElementById("instructorRegisterTab");


const loginForm = document.getElementById("loginForm");

const registerForm = document.getElementById("registerForm");


const instructorLoginForm = document.getElementById("instructorLoginForm");

const instructorRegisterForm = document.getElementById("instructorRegisterForm");


const adminLoginForm = document.getElementById("adminLoginForm");


// ========================================
// 3. MESSAGE FUNCTION
// ========================================

function showMessage(elementId, message, success = false) {

    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;

    element.style.color = success ? "#13a889" : "#e04444";

}


// ========================================
// 4. CLEAR MESSAGES
// ========================================

function clearMessages() {

    const messageIds = [
        "loginMessage",
        "registerMessage",
        "adminLoginMessage",
        "instructorLoginMessage",
        "instructorRegisterMessage"
    ];

    messageIds.forEach(id => {

        const element = document.getElementById(id);

        if (element) {
            element.textContent = "";
        }

    });

}


// ========================================
// 5. GET AUTH ERROR MESSAGE
// ========================================

function getAuthErrorMessage(error) {

    switch (error.code) {

        case "auth/email-already-in-use":
            return "This email address is already registered.";

        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/weak-password":
            return "Password must contain at least 6 characters.";

        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "Incorrect email address or password.";

        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";

        case "auth/network-request-failed":
            return "Network error. Check your internet connection.";

        case "permission-denied":
            return "You do not have permission to perform this action.";

        default:
            return error.message || "Something went wrong.";

    }

}


// ========================================
// 6. BUTTON LOADING
// ========================================

function setButtonLoading(button, loading, message, originalHTML) {

    if (!button) return;

    button.disabled = loading;

    if (loading) {

        button.textContent = message;

    } else {

        button.innerHTML = originalHTML;

    }

}


// ========================================
// 7. ACCOUNT SWITCHING
// ========================================

function selectAccount(type) {

    clearMessages();

    studentAuthSection.hidden = type !== "student";

    instructorAuthSection.hidden = type !== "instructor";

    adminAuthSection.hidden = type !== "admin";


    studentAccountBtn.classList.toggle("active", type === "student");

    instructorAccountBtn.classList.toggle("active", type === "instructor");

    adminAccountBtn.classList.toggle("active", type === "admin");

}


// ========================================
// 8. STUDENT TABS
// ========================================

function showStudentLogin() {

    loginForm.hidden = false;

    registerForm.hidden = true;

    loginTab.classList.add("active");

    registerTab.classList.remove("active");

    clearMessages();

}


function showStudentRegister() {

    loginForm.hidden = true;

    registerForm.hidden = false;

    loginTab.classList.remove("active");

    registerTab.classList.add("active");

    clearMessages();

}


// ========================================
// 9. INSTRUCTOR TABS
// ========================================

function showInstructorLogin() {

    instructorLoginForm.hidden = false;

    instructorRegisterForm.hidden = true;

    instructorLoginTab.classList.add("active");

    instructorRegisterTab.classList.remove("active");

    clearMessages();

}


function showInstructorRegister() {

    instructorLoginForm.hidden = true;

    instructorRegisterForm.hidden = false;

    instructorLoginTab.classList.remove("active");

    instructorRegisterTab.classList.add("active");

    clearMessages();

}


// ========================================
// 10. ACCOUNT BUTTON EVENTS
// ========================================

studentAccountBtn.addEventListener("click", () => {

    selectAccount("student");

    showStudentLogin();

});


instructorAccountBtn.addEventListener("click", () => {

    selectAccount("instructor");

    showInstructorLogin();

});


adminAccountBtn.addEventListener("click", () => {

    selectAccount("admin");

});


// ========================================
// 11. TAB EVENTS
// ========================================

loginTab.addEventListener("click", showStudentLogin);

registerTab.addEventListener("click", showStudentRegister);


instructorLoginTab.addEventListener("click", showInstructorLogin);

instructorRegisterTab.addEventListener("click", showInstructorRegister);


// ========================================
// 12. STUDENT REGISTRATION
// ========================================

registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    clearMessages();

    const fullName = document.getElementById("fullName").value.trim();

    const email = document.getElementById("registerEmail").value.trim();

    const university = document.getElementById("university").value.trim();

    const department = document.getElementById("department").value.trim();

    const level = document.getElementById("level").value;

    const password = document.getElementById("registerPassword").value;

    const confirmPassword = document.getElementById("confirmPassword").value;


    if (password !== confirmPassword) {

        showMessage("registerMessage", "Passwords do not match.");

        return;

    }


    if (password.length < 6) {

        showMessage("registerMessage", "Password must contain at least 6 characters.");

        return;

    }


    const submitButton = registerForm.querySelector(".auth-submit");

    const originalHTML = submitButton.innerHTML;

    setButtonLoading(submitButton, true, "Creating account...", originalHTML);


    try {

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;


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


        await signOut(auth);


        registerForm.reset();

        showStudentLogin();

        showMessage(
            "loginMessage",
            "Account created successfully. Please log in.",
            true
        );


    } catch (error) {

        console.error("Student registration error:", error);

        showMessage("registerMessage", getAuthErrorMessage(error));

    } finally {

        setButtonLoading(submitButton, false, "", originalHTML);

    }

});


// ========================================
// 13. STUDENT LOGIN
// ========================================

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    clearMessages();

    const email = document.getElementById("loginEmail").value.trim();

    const password = document.getElementById("loginPassword").value;


    const submitButton = loginForm.querySelector(".auth-submit");

    const originalHTML = submitButton.innerHTML;

    setButtonLoading(submitButton, true, "Logging in...", originalHTML);


    try {

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;


        const studentRef = doc(db, "students", user.uid);

        const studentSnapshot = await getDoc(studentRef);


        if (
            !studentSnapshot.exists() ||
            studentSnapshot.data().role !== "student"
        ) {

            await signOut(auth);

            showMessage(
                "loginMessage",
                "Student account not found or not authorised."
            );

            return;

        }


        window.location.href = "student-dashboard.html";


    } catch (error) {

        console.error("Student login error:", error);

        showMessage("loginMessage", getAuthErrorMessage(error));

    } finally {

        setButtonLoading(submitButton, false, "", originalHTML);

    }

});


// ========================================
// 14. INSTRUCTOR REGISTRATION
// ========================================

instructorRegisterForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    clearMessages();


    // BASIC INFORMATION

    const fullName = document.getElementById("instructorFullName").value.trim();

    const email = document.getElementById("instructorRegisterEmail").value.trim();


    // ACADEMIC INFORMATION

    const university = document.getElementById("instructorUniversity").value.trim();

    const faculty = document.getElementById("instructorFaculty").value.trim();

    const department = document.getElementById("instructorDepartment").value.trim();


    // TEACHING INFORMATION

    const specialisation = document.getElementById("instructorSpecialisation").value.trim();

    const courses = document.getElementById("instructorCourses").value.trim();


    // PASSWORD

    const password = document.getElementById("instructorRegisterPassword").value;

    const confirmPassword = document.getElementById("instructorConfirmPassword").value;


    // VALIDATION

    if (password !== confirmPassword) {

        showMessage(
            "instructorRegisterMessage",
            "Passwords do not match."
        );

        return;

    }


    if (password.length < 6) {

        showMessage(
            "instructorRegisterMessage",
            "Password must contain at least 6 characters."
        );

        return;

    }


    const submitButton = instructorRegisterForm.querySelector(".auth-submit");

    const originalHTML = submitButton.innerHTML;

    setButtonLoading(
        submitButton,
        true,
        "Submitting application...",
        originalHTML
    );


    let createdUser = null;


    try {

        // CREATE FIREBASE ACCOUNT

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );

        createdUser = userCredential.user;


        // SAVE INSTRUCTOR APPLICATION

        await setDoc(
            doc(db, "instructors", createdUser.uid),
            {

                uid: createdUser.uid,

                fullName: fullName,

                email: email,

                university: university,

                faculty: faculty,

                department: department,

                specialisation: specialisation,

                courses: courses,

                role: "instructor",

                status: "pending",

                createdAt: serverTimestamp(),

                approvedAt: null

            }
        );


        // SIGN OUT AFTER REGISTRATION

        await signOut(auth);


        // RESET FORM

        instructorRegisterForm.reset();


        // SHOW LOGIN SECTION

        showInstructorLogin();


        showMessage(
            "instructorLoginMessage",
            "Application submitted successfully! Your application is awaiting admin approval.",
            true
        );


    } catch (error) {

        console.error("Instructor registration error:", error);


        // CLEAN UP AUTH ACCOUNT IF PROFILE CREATION FAILED

        if (createdUser) {

            try {

                await deleteUser(createdUser);

            } catch (deleteError) {

                console.error(
                    "Account cleanup error:",
                    deleteError
                );

            }

        }


        showMessage(
            "instructorRegisterMessage",
            getAuthErrorMessage(error)
        );

    } finally {

        setButtonLoading(submitButton, false, "", originalHTML);

    }

});


// ========================================
// 15. INSTRUCTOR LOGIN
// ========================================

instructorLoginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    clearMessages();


    const email = document.getElementById("instructorLoginEmail").value.trim();

    const password = document.getElementById("instructorLoginPassword").value;


    const submitButton = instructorLoginForm.querySelector(".auth-submit");

    const originalHTML = submitButton.innerHTML;

    setButtonLoading(
        submitButton,
        true,
        "Checking account...",
        originalHTML
    );


    try {

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;


        const instructorRef = doc(db, "instructors", user.uid);

        const instructorSnapshot = await getDoc(instructorRef);


        if (!instructorSnapshot.exists()) {

            await signOut(auth);

            showMessage(
                "instructorLoginMessage",
                "Instructor account not found."
            );

            return;

        }


        const instructor = instructorSnapshot.data();


        if (instructor.role !== "instructor") {

            await signOut(auth);

            showMessage(
                "instructorLoginMessage",
                "This account is not authorised as an instructor."
            );

            return;

        }


        if (instructor.status === "pending") {

            await signOut(auth);

            showMessage(
                "instructorLoginMessage",
                "Your application is still awaiting admin approval."
            );

            return;

        }


        if (instructor.status === "rejected") {

            await signOut(auth);

            showMessage(
                "instructorLoginMessage",
                "Your application was not approved. Please contact the administrator."
            );

            return;

        }


        if (instructor.status !== "approved") {

            await signOut(auth);

            showMessage(
                "instructorLoginMessage",
                "Your instructor account is not yet active."
            );

            return;

        }


        window.location.href = "instructor-dashboard.html";


    } catch (error) {

        console.error("Instructor login error:", error);

        showMessage(
            "instructorLoginMessage",
            getAuthErrorMessage(error)
        );

    } finally {

        setButtonLoading(submitButton, false, "", originalHTML);

    }

});


// ========================================
// 16. ADMIN LOGIN
// ========================================

adminLoginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    clearMessages();


    const email = document.getElementById("adminEmail").value.trim();

    const password = document.getElementById("adminPassword").value;


    const submitButton = adminLoginForm.querySelector(".auth-submit");

    const originalHTML = submitButton.innerHTML;

    setButtonLoading(
        submitButton,
        true,
        "Checking administrator...",
        originalHTML
    );


    try {

        const userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
        );

        const user = userCredential.user;


        const adminRef = doc(db, "admins", user.uid);

        const adminSnapshot = await getDoc(adminRef);


        if (
            !adminSnapshot.exists() ||
            adminSnapshot.data().role !== "admin"
        ) {

            await signOut(auth);

            showMessage(
                "adminLoginMessage",
                "You are not authorised as an administrator."
            );

            return;

        }


        window.location.href = "admin.html";


    } catch (error) {

        console.error("Admin login error:", error);

        showMessage(
            "adminLoginMessage",
            getAuthErrorMessage(error)
        );

    } finally {

        setButtonLoading(submitButton, false, "", originalHTML);

    }

});


// ========================================
// 17. INITIAL PAGE MODE
// ========================================

const urlParams = new URLSearchParams(window.location.search);

const mode = urlParams.get("mode");


if (mode === "register") {

    selectAccount("student");

    showStudentRegister();

} else if (mode === "admin") {

    selectAccount("admin");

} else if (mode === "instructor") {

    selectAccount("instructor");

    showInstructorLogin();

} else {

    selectAccount("student");

    showStudentLogin();

}


// ========================================
// END OF LEARNSPHERE AUTHENTICATION
// ========================================