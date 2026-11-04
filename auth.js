// ==========================================
// LEARNSPHERE AUTHENTICATION
// ==========================================


// ==========================================
// 1. GET HTML ELEMENTS
// ==========================================

// Account selection buttons
const studentAccountBtn = document.getElementById("studentAccountBtn");
const adminAccountBtn = document.getElementById("adminAccountBtn");

// Authentication sections
const studentAuthSection = document.getElementById("studentAuthSection");
const adminAuthSection = document.getElementById("adminAuthSection");

// Student login and registration tabs
const loginTab = document.getElementById("loginTab");
const registerTab = document.getElementById("registerTab");

// Student forms
const loginForm = document.getElementById("loginForm");
const registerForm = document.getElementById("registerForm");

// Admin form
const adminLoginForm = document.getElementById("adminLoginForm");


// ==========================================
// 2. ADMIN LOGIN DETAILS
// ==========================================

const ADMIN_EMAIL = "admin@learnsphere.com";
const ADMIN_PASSWORD = "admin123";


// ==========================================
// 3. LOCAL STORAGE FUNCTIONS
// ==========================================

function getStudents() {

    try {

        const students = localStorage.getItem("learnsphereStudents");

        return students ? JSON.parse(students) : [];

    } catch (error) {

        console.error("Unable to load students:", error);

        return [];

    }

}


function saveStudents(students) {

    try {

        localStorage.setItem(
            "learnsphereStudents",
            JSON.stringify(students)
        );

        return true;

    } catch (error) {

        console.error("Unable to save students:", error);

        alert("Unable to save your account. Please try again.");

        return false;

    }

}


// ==========================================
// 4. SHOW STUDENT LOGIN
// ==========================================

function showStudentLogin() {

    loginForm.hidden = false;

    registerForm.hidden = true;

    loginTab.classList.add("active");

    registerTab.classList.remove("active");

}


// ==========================================
// 5. SHOW STUDENT REGISTRATION
// ==========================================

function showStudentRegistration() {

    loginForm.hidden = true;

    registerForm.hidden = false;

    registerTab.classList.add("active");

    loginTab.classList.remove("active");

}


// ==========================================
// 6. SELECT STUDENT ACCOUNT
// ==========================================

if (studentAccountBtn) {

    studentAccountBtn.addEventListener("click", function () {

        studentAuthSection.hidden = false;

        adminAuthSection.hidden = true;

        studentAccountBtn.classList.add("active");

        adminAccountBtn.classList.remove("active");

        showStudentLogin();

    });

}


// ==========================================
// 7. SELECT ADMIN ACCOUNT
// ==========================================

if (adminAccountBtn) {

    adminAccountBtn.addEventListener("click", function () {

        studentAuthSection.hidden = true;

        adminAuthSection.hidden = false;

        adminAccountBtn.classList.add("active");

        studentAccountBtn.classList.remove("active");

    });

}


// ==========================================
// 8. SWITCH TO LOGIN TAB
// ==========================================

if (loginTab) {

    loginTab.addEventListener("click", showStudentLogin);

}


// ==========================================
// 9. SWITCH TO REGISTER TAB
// ==========================================

if (registerTab) {

    registerTab.addEventListener("click", showStudentRegistration);

}


// ==========================================
// 10. STUDENT REGISTRATION
// ==========================================

if (registerForm) {

    registerForm.addEventListener("submit", function (event) {

        event.preventDefault();

        // Get registration details
        const fullName = document.getElementById("fullName").value.trim();

        const email = document.getElementById("registerEmail").value.trim().toLowerCase();

        const university = document.getElementById("university").value.trim();

        const department = document.getElementById("department").value;

        const level = document.getElementById("level").value;

        const password = document.getElementById("registerPassword").value;

        const confirmPassword = document.getElementById("confirmPassword").value;

        const message = document.getElementById("registerMessage");


        // Check empty fields
        if (
            !fullName ||
            !email ||
            !university ||
            !department ||
            !level ||
            !password ||
            !confirmPassword
        ) {

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


        // Load existing students
        const students = getStudents();


        // Check duplicate email
        const existingStudent = students.find(function (student) {

            return student.email.toLowerCase() === email;

        });


        if (existingStudent) {

            message.textContent = "An account with this email already exists.";

            message.style.color = "red";

            return;

        }


        // Create student account
        const newStudent = {

            id: Date.now().toString(),

            fullName: fullName,

            email: email,

            university: university,

            department: department,

            level: level,

            password: password,

            createdAt: new Date().toISOString()

        };


        // Add student to the list
        students.push(newStudent);


        // Save student account
        if (!saveStudents(students)) {

            return;

        }


        message.textContent = "Registration successful! You can now log in.";

        message.style.color = "green";


        // Clear registration form
        registerForm.reset();


        // Switch to login after registration
        setTimeout(function () {

            showStudentLogin();

        }, 1500);

    });

}


// ==========================================
// 11. STUDENT LOGIN
// ==========================================

if (loginForm) {

    loginForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const email = document.getElementById("loginEmail").value.trim().toLowerCase();

        const password = document.getElementById("loginPassword").value;

        const message = document.getElementById("loginMessage");


        // Load registered students
        const students = getStudents();


        // Find student account
        const student = students.find(function (item) {

            return (
                item.email.toLowerCase() === email &&
                item.password === password
            );

        });


        if (!student) {

            message.textContent = "Incorrect email or password.";

            message.style.color = "red";

            return;

        }


        // Save logged-in student
        const currentStudent = {

            id: student.id,

            fullName: student.fullName,

            email: student.email,

            university: student.university,

            department: student.department,

            level: student.level

        };


        localStorage.setItem(
            "learnsphereCurrentStudent",
            JSON.stringify(currentStudent)
        );


        message.textContent = "Login successful! Redirecting...";

        message.style.color = "green";


        // Redirect to student dashboard
        setTimeout(function () {

            window.location.href = "student-dashboard.html";

        }, 1000);

    });

}


// ==========================================
// 12. ADMIN LOGIN
// ==========================================

if (adminLoginForm) {

    adminLoginForm.addEventListener("submit", function (event) {

        event.preventDefault();

        const email = document.getElementById("adminEmail").value.trim().toLowerCase();

        const password = document.getElementById("adminPassword").value;

        const message = document.getElementById("adminLoginMessage");


        // Check admin credentials
        if (
            email === ADMIN_EMAIL &&
            password === ADMIN_PASSWORD
        ) {

            localStorage.setItem(
                "learnsphereAdminLoggedIn",
                "true"
            );


            message.textContent = "Login successful! Redirecting...";

            message.style.color = "green";


            // Redirect to admin dashboard
            setTimeout(function () {

                window.location.href = "admin.html";

            }, 1000);

        } else {

            message.textContent = "Incorrect admin email or password.";

            message.style.color = "red";

        }

    });

}


// ==========================================
// 13. CHECK URL MODE
// ==========================================

const urlParams = new URLSearchParams(window.location.search);

const mode = urlParams.get("mode");


if (mode === "register") {

    showStudentRegistration();

} else if (mode === "admin") {

    adminAccountBtn.click();

} else {

    showStudentLogin();

}


// ==========================================
// END OF AUTHENTICATION
// ==========================================