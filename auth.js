// ========================================
// LEARNSPHERE AUTHENTICATION SYSTEM
// STUDENT, INSTRUCTOR AND ADMIN
// ========================================


// ========================================
// 1. FIREBASE IMPORTS
// ========================================

import { auth, db } from "./firebase.js";

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut
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

// Account buttons

const studentAccountBtn =
    document.getElementById("studentAccountBtn");

const instructorAccountBtn =
    document.getElementById("instructorAccountBtn");

const adminAccountBtn =
    document.getElementById("adminAccountBtn");


// Account sections

const studentAuthSection =
    document.getElementById("studentAuthSection");

const instructorAuthSection =
    document.getElementById("instructorAuthSection");

const adminAuthSection =
    document.getElementById("adminAuthSection");


// Student tabs

const loginTab =
    document.getElementById("loginTab");

const registerTab =
    document.getElementById("registerTab");


// Instructor tabs

const instructorLoginTab =
    document.getElementById("instructorLoginTab");

const instructorRegisterTab =
    document.getElementById("instructorRegisterTab");


// Student forms

const loginForm =
    document.getElementById("loginForm");

const registerForm =
    document.getElementById("registerForm");


// Instructor forms

const instructorLoginForm =
    document.getElementById("instructorLoginForm");

const instructorRegisterForm =
    document.getElementById("instructorRegisterForm");


// Admin form

const adminLoginForm =
    document.getElementById("adminLoginForm");


// ========================================
// 3. MESSAGE FUNCTION
// ========================================

function showMessage(elementId, message, success = false) {

    const element = document.getElementById(elementId);

    if (!element) return;

    element.textContent = message;

    element.style.color = success
        ? "#13a889"
        : "#e04444";

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
// 5. FIREBASE ERROR MESSAGES
// ========================================

function getAuthErrorMessage(error) {

    switch (error.code) {

        case "auth/email-already-in-use":
            return "This email address is already registered.";

        case "auth/invalid-email":
            return "Please enter a valid email address.";

        case "auth/weak-password":
            return "Your password must contain at least 6 characters.";

        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "Incorrect email address or password.";

        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";

        case "auth/network-request-failed":
            return "Network error. Please check your internet connection.";

        default:
            return error.message || "Something went wrong. Please try again.";

    }

}


// ========================================
// 6. ACCOUNT TYPE SWITCHING
// ========================================

function selectAccount(type) {

    clearMessages();

    studentAuthSection.hidden = type !== "student";

    instructorAuthSection.hidden = type !== "instructor";

    adminAuthSection.hidden = type !== "admin";


    studentAccountBtn.classList.toggle(
        "active",
        type === "student"
    );

    instructorAccountBtn.classList.toggle(
        "active",
        type === "instructor"
    );

    adminAccountBtn.classList.toggle(
        "active",
        type === "admin"
    );

}


// ========================================
// 7. STUDENT LOGIN AND REGISTRATION TABS
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
// 8. INSTRUCTOR LOGIN AND REGISTRATION TABS
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
// 9. ACCOUNT BUTTON EVENTS
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
// 10. STUDENT TAB EVENTS
// ========================================

loginTab.addEventListener("click", showStudentLogin);

registerTab.addEventListener("click", showStudentRegister);


// ========================================
// 11. INSTRUCTOR TAB EVENTS
// ========================================

instructorLoginTab.addEventListener(
    "click",
    showInstructorLogin
);

instructorRegisterTab.addEventListener(
    "click",
    showInstructorRegister
);


// ========================================
// 12. STUDENT REGISTRATION
// ========================================

registerForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    clearMessages();

    const fullName =
        document.getElementById("fullName").value.trim();

    const email =
        document.getElementById("registerEmail").value.trim();

    const university =
        document.getElementById("university").value.trim();

    const department =
        document.getElementById("department").value.trim();

    const level =
        document.getElementById("level").value;

    const password =
        document.getElementById("registerPassword").value;

    const confirmPassword =
        document.getElementById("confirmPassword").value;


    if (password !== confirmPassword) {

        showMessage(
            "registerMessage",
            "Passwords do not match."
        );

        return;

    }


    if (password.length < 6) {

        showMessage(
            "registerMessage",
            "Password must contain at least 6 characters."
        );

        return;

    }


    const submitButton =
        registerForm.querySelector(".auth-submit");

    submitButton.disabled = true;

    submitButton.textContent = "Creating account...";


    try {

        const userCredential =
            await createUserWithEmailAndPassword(
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


        showMessage(
            "registerMessage",
            "Account created successfully. You can now log in.",
            true
        );

        registerForm.reset();

        showStudentLogin();

        showMessage(
            "loginMessage",
            "Your account is ready. Please log in.",
            true
        );

    } catch (error) {

        console.error("Student registration error:", error);

        showMessage(
            "registerMessage",
            getAuthErrorMessage(error)
        );

    } finally {

        submitButton.disabled = false;

        submitButton.innerHTML =
            'Create Student Account <i class="fa-solid fa-arrow-right"></i>';

    }

});


// ========================================
// 13. STUDENT LOGIN
// ========================================

loginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    clearMessages();

    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;


    const submitButton =
        loginForm.querySelector(".auth-submit");

    submitButton.disabled = true;

    submitButton.textContent = "Logging in...";


    try {

        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;


        const studentRef =
            doc(db, "students", user.uid);

        const studentSnapshot =
            await getDoc(studentRef);


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

        showMessage(
            "loginMessage",
            getAuthErrorMessage(error)
        );

    } finally {

        submitButton.disabled = false;

        submitButton.innerHTML =
            'Login as Student <i class="fa-solid fa-arrow-right"></i>';

    }

});


// ========================================
// 14. INSTRUCTOR REGISTRATION
// ========================================

instructorRegisterForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        clearMessages();

        const fullName =
            document.getElementById("instructorFullName")
                .value.trim();

        const email =
            document.getElementById("instructorRegisterEmail")
                .value.trim();

        const university =
            document.getElementById("instructorUniversity")
                .value.trim();

        const department =
            document.getElementById("instructorDepartment")
                .value.trim();

        const password =
            document.getElementById("instructorRegisterPassword")
                .value;

        const confirmPassword =
            document.getElementById("instructorConfirmPassword")
                .value;


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


        const submitButton =
            instructorRegisterForm.querySelector(".auth-submit");

        submitButton.disabled = true;

        submitButton.textContent = "Submitting application...";


        try {

            const userCredential =
                await createUserWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;


            // Save instructor application

            await setDoc(
                doc(db, "instructors", user.uid),
                {

                    uid: user.uid,

                    fullName: fullName,

                    email: email,

                    university: university,

                    department: department,

                    role: "instructor",

                    status: "pending",

                    createdAt: serverTimestamp(),

                    approvedAt: null

                }
            );


            await signOut(auth);


            instructorRegisterForm.reset();

            showInstructorLogin();


            showMessage(
                "instructorLoginMessage",
                "Application submitted successfully. Please wait for admin approval.",
                true
            );


        } catch (error) {

            console.error(
                "Instructor registration error:",
                error
            );

            showMessage(
                "instructorRegisterMessage",
                getAuthErrorMessage(error)
            );

        } finally {

            submitButton.disabled = false;

            submitButton.innerHTML =
                'Submit Instructor Application <i class="fa-solid fa-arrow-right"></i>';

        }

    }

);


// ========================================
// 15. INSTRUCTOR LOGIN
// ========================================

instructorLoginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        clearMessages();

        const email =
            document.getElementById("instructorLoginEmail")
                .value.trim();

        const password =
            document.getElementById("instructorLoginPassword")
                .value;


        const submitButton =
            instructorLoginForm.querySelector(".auth-submit");

        submitButton.disabled = true;

        submitButton.textContent = "Checking account...";


        try {

            const userCredential =
                await signInWithEmailAndPassword(
                    auth,
                    email,
                    password
                );

            const user = userCredential.user;


            const instructorRef =
                doc(db, "instructors", user.uid);

            const instructorSnapshot =
                await getDoc(instructorRef);


            if (!instructorSnapshot.exists()) {

                await signOut(auth);

                showMessage(
                    "instructorLoginMessage",
                    "Instructor account not found."
                );

                return;

            }


            const instructor =
                instructorSnapshot.data();


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
                    "Your application is awaiting admin approval."
                );

                return;

            }


            if (instructor.status !== "approved") {

                await signOut(auth);

                showMessage(
                    "instructorLoginMessage",
                    "Your instructor application has not been approved."
                );

                return;

            }


            window.location.href = "instructor-dashboard.html";


        } catch (error) {

            console.error(
                "Instructor login error:",
                error
            );

            showMessage(
                "instructorLoginMessage",
                getAuthErrorMessage(error)
            );

        } finally {

            submitButton.disabled = false;

            submitButton.innerHTML =
                'Login as Instructor <i class="fa-solid fa-arrow-right"></i>';

        }

    }

);


// ========================================
// 16. ADMIN LOGIN
// ========================================

adminLoginForm.addEventListener("submit", async (event) => {

    event.preventDefault();

    clearMessages();

    const email =
        document.getElementById("adminEmail").value.trim();

    const password =
        document.getElementById("adminPassword").value;


    const submitButton =
        adminLoginForm.querySelector(".auth-submit");

    submitButton.disabled = true;

    submitButton.textContent = "Checking administrator...";


    try {

        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );

        const user = userCredential.user;


        const adminRef =
            doc(db, "admins", user.uid);

        const adminSnapshot =
            await getDoc(adminRef);


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

        submitButton.disabled = false;

        submitButton.innerHTML =
            'Login as Administrator <i class="fa-solid fa-arrow-right"></i>';

    }

});


// ========================================
// 17. INITIAL PAGE MODE
// ========================================

const urlParams =
    new URLSearchParams(window.location.search);

const mode =
    urlParams.get("mode");


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
// END OF AUTHENTICATION SYSTEM
// ========================================