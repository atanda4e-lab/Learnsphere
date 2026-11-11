// ========================================
// LEARNSPHERE INSTRUCTOR DASHBOARD
// COMPLETE FIREBASE JAVASCRIPT
// FIREBASE VERSION 12.2.1
// ========================================


// ========================================
// 1. FIREBASE IMPORTS
// ========================================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ========================================
// 2. GLOBAL VARIABLES
// ========================================

let currentUser = null;
let instructorData = null;
let instructorCourses = [];
let departmentStudents = [];


// ========================================
// 3. HTML ELEMENTS
// ========================================

const notification = document.getElementById("notification");

const logoutBtn = document.getElementById("logoutBtn");

const menuBtn = document.getElementById("menuBtn");

const sidebar = document.getElementById("sidebar");

const createCourseForm = document.getElementById("createCourseForm");

const createLessonForm = document.getElementById("createLessonForm");

const createQuizForm = document.getElementById("createQuizForm");


// ========================================
// 4. HELPER FUNCTIONS
// ========================================

function getElement(id) {
    return document.getElementById(id);
}


function setElementContent(id, value) {

    const element = getElement(id);

    if (!element) return;

    if (
        element.tagName === "INPUT" ||
        element.tagName === "TEXTAREA" ||
        element.tagName === "SELECT"
    ) {
        element.value = value ?? "";
    } else {
        element.textContent = value ?? "";
    }

}


function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, character => {

        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];

    });

}


// IMPORTANT:
// Your Firestore instructor name field is "full name"
// with a space, so we read that exact field.

function getInstructorName() {

    if (!instructorData) {

        return (
            currentUser?.displayName ||
            currentUser?.email?.split("@")[0] ||
            "Instructor"
        );

    }

    const firstName =
        instructorData.firstName ||
        instructorData.firstname ||
        "";

    const lastName =
        instructorData.lastName ||
        instructorData.lastname ||
        "";

    return (
        instructorData["full name"] ||
        instructorData.fullName ||
        instructorData.fullname ||
        instructorData.instructorName ||
        instructorData.name ||
        instructorData.displayName ||
        `${firstName} ${lastName}`.trim() ||
        currentUser?.displayName ||
        currentUser?.email?.split("@")[0] ||
        "Instructor"
    );

}


function getInstructorEmail() {

    return (
        instructorData?.email ||
        instructorData?.emailAddress ||
        currentUser?.email ||
        "Not available"
    );

}


function isCoursePublished(course) {

    return (
        course.published === true ||
        course.isPublished === true
    );

}


function showNotification(message, type = "success") {

    if (!notification) {
        alert(message);
        return;
    }

    notification.textContent = message;

    notification.className = "notification " + type;

    notification.style.display = "block";

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    setTimeout(() => {
        notification.style.display = "none";
    }, 5000);

}


function getCourseById(courseId) {

    return instructorCourses.find(
        course => course.id === courseId
    );

}


function getStudentName(student) {

    return (
        student["full name"] ||
        student.fullName ||
        student.fullname ||
        student.name ||
        student.displayName ||
        `${student.firstName || ""} ${student.lastName || ""}`.trim() ||
        "Student"
    );

}


// ========================================
// 5. NAVIGATION
// ========================================

function navigateTo(sectionId) {

    document.querySelectorAll(".dashboard-section").forEach(section => {

        section.classList.remove("active");

    });

    const target = getElement(sectionId);

    if (!target) return;

    target.classList.add("active");

    document.querySelectorAll(".nav-link").forEach(link => {

        link.classList.remove("active");

        if (link.dataset.section === sectionId) {
            link.classList.add("active");
        }

    });

    sidebar?.classList.remove("show");

    if (sectionId === "courses") {
        loadCourses();
    }

    if (sectionId === "lessons") {
        loadCourseOptions();
    }

    if (sectionId === "quizzes") {
        loadCourseOptions();
        loadQuizzes();
    }

    if (sectionId === "students") {
        loadStudents();
    }

    if (sectionId === "profile") {
        displayInstructorProfile();
    }

}


document.querySelectorAll(".nav-link").forEach(link => {

    link.addEventListener("click", event => {

        event.preventDefault();

        navigateTo(link.dataset.section);

    });

});


document.querySelectorAll("[data-go]").forEach(button => {

    button.addEventListener("click", () => {

        navigateTo(button.dataset.go);

    });

});


menuBtn?.addEventListener("click", () => {

    sidebar?.classList.toggle("show");

});


// ========================================
// 6. AUTHENTICATION
// ========================================

onAuthStateChanged(auth, async user => {

    if (!user) {

        window.location.href = "auth.html";

        return;

    }

    currentUser = user;

    await verifyInstructor();

});


// ========================================
// 7. VERIFY INSTRUCTOR
// ========================================

async function verifyInstructor() {

    try {

        const instructorRef = doc(
            db,
            "instructors",
            currentUser.uid
        );

        const instructorSnap = await getDoc(instructorRef);

        if (!instructorSnap.exists()) {

            showNotification(
                "Instructor profile was not found.",
                "error"
            );

            return;

        }

        instructorData = instructorSnap.data();

        if (
            instructorData.role !== "instructor" ||
            instructorData.status !== "approved"
        ) {

            showNotification(
                "Your instructor account has not been approved.",
                "error"
            );

            return;

        }

        if (!instructorData.department) {

            showNotification(
                "Your instructor profile has no department.",
                "error"
            );

            return;

        }

        displayInstructorProfile();

        await loadDashboard();

    } catch (error) {

        console.error(
            "Instructor verification error:",
            error
        );

        showNotification(
            "Unable to verify instructor: " + error.message,
            "error"
        );

    }

}


// ========================================
// 8. DISPLAY INSTRUCTOR PROFILE
// ========================================

function displayInstructorProfile() {

    if (!instructorData || !currentUser) return;

    const name = getInstructorName();

    const email = getInstructorEmail();

    const university =
        instructorData.university ||
        instructorData.institution ||
        "Not available";

    const department =
        instructorData.department ||
        "Not available";

    const status =
        instructorData.status ||
        "Not available";

    const initial = name.charAt(0).toUpperCase();

    // Welcome message

    setElementContent("welcomeName", name);

    // Header

    setElementContent("headerInstructorName", name);

    setElementContent("headerAvatar", initial);

    // Profile

    setElementContent("profileAvatar", initial);

    setElementContent("profileName", name);

    setElementContent("profileEmail", email);

    setElementContent("profileFullName", name);

    setElementContent("profileEmailAddress", email);

    setElementContent("profileUniversity", university);

    setElementContent("profileDepartment", department);

    setElementContent("profileStatus", status);

}


// ========================================
// 9. LOAD DASHBOARD
// ========================================

async function loadDashboard() {

    displayInstructorProfile();

    await loadCourses();

    await loadStudents();

    await loadDashboardStatistics();

    await loadRecentCourses();

}


// ========================================
// 10. LOAD DEPARTMENT COURSES
// ========================================

async function loadCourses() {

    try {

        const department = instructorData.department;

        const coursesQuery = query(
            collection(db, "courses"),
            where("department", "==", department)
        );

        const snapshot = await getDocs(coursesQuery);

        instructorCourses = snapshot.docs.map(courseDoc => {

            return {
                id: courseDoc.id,
                ...courseDoc.data()
            };

        });

        displayCourses();

        loadCourseOptions();

    } catch (error) {

        console.error(
            "Course loading error:",
            error
        );

        const container = getElement("myCourses");

        if (container) {

            container.textContent =
                "Unable to load courses: " + error.message;

        }

    }

}


// ========================================
// 11. DISPLAY COURSES
// ========================================

function displayCourses() {

    const container = getElement("myCourses");

    if (!container) return;

    if (instructorCourses.length === 0) {

        container.innerHTML =
            "<p>No courses found in your department.</p>";

        return;

    }

    container.innerHTML = "";

    instructorCourses.forEach(course => {

        const card = document.createElement("div");

        card.className = "course-card";

        const image =
            course.image ||
            "https://placehold.co/600x300?text=LearnSphere";

        const isOwner =
            course.instructorId === currentUser.uid;

        const published = isCoursePublished(course);

        card.innerHTML = `

            <img
                src="${escapeHTML(image)}"
                alt="Course image"
            >

            <div class="course-card-body">

                <h3>
                    ${escapeHTML(course.title || "Untitled Course")}
                </h3>

                <p>
                    Course Code:
                    ${escapeHTML(course.courseCode || "Not available")}
                </p>

                <p>
                    Department:
                    ${escapeHTML(course.department || "")}
                </p>

                <p>
                    Level:
                    ${escapeHTML(course.level || "Not specified")}
                </p>

                <p>
                    Instructor:
                    ${escapeHTML(course.instructorName || "LearnSphere Admin")}
                </p>

                <p>
                    Status:
                    ${published ? "Published" : "Draft"}
                </p>

                <div class="course-actions">

                    <button
                        data-action="lessons"
                        data-id="${escapeHTML(course.id)}">
                        Lessons
                    </button>

                    ${
                        isOwner
                        ? `

                            <button
                                data-action="publish"
                                data-id="${escapeHTML(course.id)}">

                                ${published ? "Unpublish" : "Publish"}

                            </button>

                            <button
                                data-action="delete"
                                data-id="${escapeHTML(course.id)}"
                                class="delete-btn">

                                Delete

                            </button>

                        `
                        : `
                            <span class="course-owner">
                                Department Course
                            </span>
                        `
                    }

                </div>

            </div>

        `;

        container.appendChild(card);

    });

}


// ========================================
// 12. COURSE ACTIONS
// ========================================

document.addEventListener("click", async event => {

    const button = event.target.closest("[data-action]");

    if (!button || !currentUser) return;

    const action = button.dataset.action;

    const courseId = button.dataset.id;

    const course = getCourseById(courseId);

    if (!course) return;

    if (action === "lessons") {

        navigateTo("lessons");

        const select = getElement("lessonCourseSelect");

        if (select) {
            select.value = courseId;
        }

        await loadLessons(courseId);

        return;

    }

    if (course.instructorId !== currentUser.uid) {

        showNotification(
            "You cannot manage this course.",
            "error"
        );

        return;

    }

    if (action === "publish") {

        await toggleCoursePublication(course);

    }

    if (action === "delete") {

        await deleteCourse(course);

    }

});


// ========================================
// 13. PUBLISH COURSE
// ========================================

async function toggleCoursePublication(course) {

    try {

        const newStatus = !isCoursePublished(course);

        await updateDoc(
            doc(db, "courses", course.id),
            {
                published: newStatus,
                isPublished: newStatus,
                updatedAt: serverTimestamp()
            }
        );

        showNotification(
            newStatus
                ? "Course published successfully."
                : "Course unpublished successfully."
        );

        await loadCourses();

        await loadDashboardStatistics();

        await loadRecentCourses();

    } catch (error) {

        console.error("Course publication error:", error);

        showNotification(
            "Unable to update course: " + error.message,
            "error"
        );

    }

}


// ========================================
// 14. DELETE COURSE
// ========================================

async function deleteCourse(course) {

    if (course.instructorId !== currentUser.uid) {

        showNotification(
            "You cannot delete another instructor's course.",
            "error"
        );

        return;

    }

    if (!confirm("Are you sure you want to delete this course?")) {
        return;
    }

    try {

        await deleteDoc(
            doc(db, "courses", course.id)
        );

        showNotification("Course deleted successfully.");

        await loadCourses();

        await loadDashboardStatistics();

        await loadRecentCourses();

    } catch (error) {

        console.error("Course deletion error:", error);

        showNotification(
            "Unable to delete course: " + error.message,
            "error"
        );

    }

}


// ========================================
// 15. CREATE COURSE
// ========================================

createCourseForm?.addEventListener("submit", async event => {

    event.preventDefault();

    const button = getElement("createCourseBtn");

    if (button) {

        button.disabled = true;

        button.textContent = "Creating Course...";

    }

    try {

        const courseData = {

            title: getElement("courseTitle").value.trim(),

            courseCode: getElement("courseCode").value.trim().toUpperCase(),

            category: getElement("courseCategory").value,

            department: instructorData.department,

            level: getElement("courseLevel").value,

            description: getElement("courseDescription").value.trim(),

            image: getElement("courseImage").value.trim(),

            openingDate: getElement("courseOpeningDate").value,

            closingDate: getElement("courseClosingDate").value,

            instructorId: currentUser.uid,

            instructorName: getInstructorName(),

            instructorEmail: getInstructorEmail(),

            published: false,

            isPublished: false,

            createdAt: serverTimestamp(),

            updatedAt: serverTimestamp()

        };

        if (!courseData.title || !courseData.courseCode) {

            throw new Error(
                "Course title and course code are required."
            );

        }

        if (
            courseData.openingDate &&
            courseData.closingDate &&
            courseData.closingDate < courseData.openingDate
        ) {

            throw new Error(
                "Closing date cannot be earlier than opening date."
            );

        }

        await addDoc(
            collection(db, "courses"),
            courseData
        );

        createCourseForm.reset();

        showNotification("Course created successfully.");

        await loadCourses();

        await loadDashboardStatistics();

        await loadRecentCourses();

        navigateTo("courses");

    } catch (error) {

        console.error("Course creation error:", error);

        showNotification(
            "Course creation failed: " + error.message,
            "error"
        );

    } finally {

        if (button) {

            button.disabled = false;

            button.textContent = "Create Course";

        }

    }

});


// ========================================
// 16. COURSE SELECT OPTIONS
// ========================================

function loadCourseOptions() {

    const selects = [

        getElement("lessonCourseSelect"),

        getElement("quizCourseSelect"),

        getElement("studentCourseFilter")

    ];

    selects.forEach(select => {

        if (!select) return;

        const previousValue = select.value;

        const firstOption =
            select.id === "studentCourseFilter"
                ? "All Department Students"
                : "Choose a course";

        select.innerHTML = "";

        const defaultOption = document.createElement("option");

        defaultOption.value = "";

        defaultOption.textContent = firstOption;

        select.appendChild(defaultOption);

        instructorCourses.forEach(course => {

            const option = document.createElement("option");

            option.value = course.id;

            option.textContent =
                `${course.courseCode || ""} - ${course.title || ""}`;

            select.appendChild(option);

        });

        if (
            [...select.options].some(
                option => option.value === previousValue
            )
        ) {

            select.value = previousValue;

        }

    });

}


// ========================================
// 17. CREATE LESSON
// ========================================

createLessonForm?.addEventListener("submit", async event => {

    event.preventDefault();

    const courseId = getElement("lessonCourseSelect").value;

    const course = getCourseById(courseId);

    if (!course) {

        showNotification(
            "Please select a valid course.",
            "error"
        );

        return;

    }

    try {

        const lessonData = {

            courseId: courseId,

            courseTitle: course.title,

            title: getElement("lessonTitle").value.trim(),

            description: getElement("lessonDescription").value.trim(),

            content: getElement("lessonContent").value.trim(),

            instructions: "",

            pdf: getElement("lessonPdf").value.trim(),

            video: getElement("lessonVideo").value.trim(),

            instructorId: currentUser.uid,

            department: instructorData.department,

            published: false,

            createdAt: serverTimestamp(),

            updatedAt: serverTimestamp()

        };

        if (!lessonData.title || !lessonData.content) {

            throw new Error(
                "Lesson title and content are required."
            );

        }

        await addDoc(
            collection(db, "lessons"),
            lessonData
        );

        createLessonForm.reset();

        showNotification("Lesson added successfully.");

        await loadLessons(courseId);

        await loadDashboardStatistics();

    } catch (error) {

        console.error("Lesson creation error:", error);

        showNotification(
            "Unable to add lesson: " + error.message,
            "error"
        );

    }

});


// ========================================
// 18. LOAD LESSONS
// ========================================

async function loadLessons(courseId) {

    const container = getElement("lessonsList");

    if (!container) return;

    if (!courseId) {

        container.textContent =
            "Select a course to view lessons.";

        return;

    }

    container.textContent = "Loading lessons...";

    try {

        const lessonsQuery = query(
            collection(db, "lessons"),
            where("courseId", "==", courseId)
        );

        const snapshot = await getDocs(lessonsQuery);

        container.innerHTML = "";

        if (snapshot.empty) {

            container.textContent =
                "No lessons available for this course.";

            return;

        }

        snapshot.forEach(lessonDoc => {

            const lesson = lessonDoc.data();

            const isOwner =
                lesson.instructorId === currentUser.uid;

            const item = document.createElement("div");

            item.className = "lesson-item";

            item.innerHTML = `

                <h4>
                    ${escapeHTML(lesson.title || "Untitled Lesson")}
                </h4>

                <p>
                    ${escapeHTML(lesson.description || "")}
                </p>

                <p>
                    Status:
                    ${lesson.published ? "Published" : "Draft"}
                </p>

                ${
                    isOwner
                    ? `

                        <div class="course-actions">

                            <button
                                data-lesson-action="publish"
                                data-id="${escapeHTML(lessonDoc.id)}"
                                data-course="${escapeHTML(courseId)}">

                                ${lesson.published ? "Unpublish" : "Publish"}

                            </button>

                            <button
                                class="delete-btn"
                                data-lesson-action="delete"
                                data-id="${escapeHTML(lessonDoc.id)}"
                                data-course="${escapeHTML(courseId)}">

                                Delete

                            </button>

                        </div>

                    `
                    : "<p>Department lesson</p>"
                }

            `;

            container.appendChild(item);

        });

    } catch (error) {

        console.error("Lesson loading error:", error);

        container.textContent =
            "Unable to load lessons: " + error.message;

    }

}


getElement("lessonCourseSelect")?.addEventListener(
    "change",
    event => loadLessons(event.target.value)
);


// ========================================
// 19. LESSON ACTIONS
// ========================================

document.addEventListener("click", async event => {

    const button = event.target.closest("[data-lesson-action]");

    if (!button || !currentUser) return;

    const action = button.dataset.lessonAction;

    const lessonId = button.dataset.id;

    const courseId = button.dataset.course;

    try {

        const lessonRef = doc(
            db,
            "lessons",
            lessonId
        );

        const lessonSnap = await getDoc(lessonRef);

        if (!lessonSnap.exists()) {

            throw new Error("Lesson not found.");

        }

        const lesson = lessonSnap.data();

        if (lesson.instructorId !== currentUser.uid) {

            throw new Error(
                "You cannot manage another instructor's lesson."
            );

        }

        if (action === "publish") {

            await updateDoc(lessonRef, {

                published: !lesson.published,

                updatedAt: serverTimestamp()

            });

            showNotification("Lesson status updated.");

        }

        if (action === "delete") {

            if (!confirm("Delete this lesson?")) return;

            await deleteDoc(lessonRef);

            showNotification("Lesson deleted successfully.");

        }

        await loadLessons(courseId);

        await loadDashboardStatistics();

    } catch (error) {

        console.error("Lesson action error:", error);

        showNotification(
            error.message,
            "error"
        );

    }

});


// ========================================
// 20. CREATE QUIZ SETTINGS
// ========================================

createQuizForm?.addEventListener("submit", async event => {

    event.preventDefault();

    const courseId = getElement("quizCourseSelect").value;

    const course = getCourseById(courseId);

    if (!course) {

        showNotification(
            "Please select a valid course.",
            "error"
        );

        return;

    }

    try {

        const quizData = {

            courseId: courseId,

            courseTitle: course.title,

            title: getElement("quizTitle").value.trim(),

            type: "course",

            lessonId: "",

            timeLimitMinutes: Number(
                getElement("quizDuration").value
            ),

            maxAttempts: Number(
                getElement("quizAttempts").value
            ),

            questionLimit: Number(
                getElement("quizTotalQuestions").value
            ),

            passMark: Number(
                getElement("quizPassMark").value
            ),

            instructorId: currentUser.uid,

            department: instructorData.department,

            published: false,

            createdAt: serverTimestamp(),

            updatedAt: serverTimestamp()

        };

        if (
            !quizData.title ||
            !Number.isFinite(quizData.timeLimitMinutes) ||
            quizData.timeLimitMinutes <= 0 ||
            !Number.isFinite(quizData.maxAttempts) ||
            quizData.maxAttempts <= 0 ||
            !Number.isFinite(quizData.questionLimit) ||
            quizData.questionLimit <= 0 ||
            !Number.isFinite(quizData.passMark) ||
            quizData.passMark < 1 ||
            quizData.passMark > 100
        ) {

            throw new Error(
                "Please enter valid quiz settings."
            );

        }

        await addDoc(
            collection(db, "quizSettings"),
            quizData
        );

        createQuizForm.reset();

        showNotification(
            "Quiz settings created successfully."
        );

        await loadQuizzes();

        await loadDashboardStatistics();

    } catch (error) {

        console.error("Quiz creation error:", error);

        showNotification(
            "Unable to create quiz: " + error.message,
            "error"
        );

    }

});


// ========================================
// 21. LOAD DEPARTMENT QUIZZES
// ========================================

async function loadQuizzes() {

    const container = getElement("quizzesList");

    if (!container) return;

    container.textContent = "Loading quizzes...";

    try {

        container.innerHTML = "";

        let totalFound = 0;

        let permissionErrors = 0;

        for (const course of instructorCourses) {

            try {

                const quizQuery = query(
                    collection(db, "quizSettings"),
                    where("courseId", "==", course.id)
                );

                const snapshot = await getDocs(quizQuery);

                snapshot.forEach(quizDoc => {

                    const quiz = quizDoc.data();

                    const isOwner =
                        quiz.instructorId === currentUser.uid;

                    const item = document.createElement("div");

                    item.className = "quiz-item";

                    item.innerHTML = `

                        <h4>
                            ${escapeHTML(quiz.title || "Untitled Quiz")}
                        </h4>

                        <p>
                            Course:
                            ${escapeHTML(course.title || "")}
                        </p>

                        <p>
                            Questions:
                            ${escapeHTML(quiz.questionLimit || 0)}
                        </p>

                        <p>
                            Duration:
                            ${escapeHTML(quiz.timeLimitMinutes || 0)}
                            minutes
                        </p>

                        <p>
                            Attempts:
                            ${escapeHTML(quiz.maxAttempts || 1)}
                        </p>

                        <p>
                            Pass Mark:
                            ${escapeHTML(quiz.passMark || 50)}%
                        </p>

                        <p>
                            Status:
                            ${quiz.published ? "Published" : "Draft"}
                        </p>

                        ${
                            isOwner
                            ? `

                                <div class="course-actions">

                                    <button
                                        data-quiz-action="publish"
                                        data-id="${escapeHTML(quizDoc.id)}">

                                        ${quiz.published ? "Unpublish" : "Publish"}

                                    </button>

                                    <button
                                        class="delete-btn"
                                        data-quiz-action="delete"
                                        data-id="${escapeHTML(quizDoc.id)}">

                                        Delete

                                    </button>

                                </div>

                            `
                            : "<p>Department quiz</p>"
                        }

                    `;

                    container.appendChild(item);

                    totalFound++;

                });

            } catch (error) {

                permissionErrors++;

                console.error(
                    "Quiz loading error for course:",
                    course.title,
                    error
                );

            }

        }

        if (totalFound === 0 && permissionErrors === 0) {

            container.textContent =
                "No quizzes available yet.";

        } else if (totalFound === 0 && permissionErrors > 0) {

            container.textContent =
                "Quiz records could not be accessed. Check Firestore quizSettings permissions and courseId fields.";

        }

        if (permissionErrors > 0) {

            console.warn(
                permissionErrors +
                " course quiz queries failed. Other courses were still checked."
            );

        }

    } catch (error) {

        console.error("Quiz loading error:", error);

        container.textContent =
            "Unable to load quizzes: " + error.message;

    }

}


// ========================================
// 22. QUIZ ACTIONS
// ========================================

document.addEventListener("click", async event => {

    const button = event.target.closest("[data-quiz-action]");

    if (!button || !currentUser) return;

    const action = button.dataset.quizAction;

    const quizId = button.dataset.id;

    try {

        const quizRef = doc(
            db,
            "quizSettings",
            quizId
        );

        const quizSnap = await getDoc(quizRef);

        if (!quizSnap.exists()) {

            throw new Error("Quiz not found.");

        }

        const quiz = quizSnap.data();

        if (quiz.instructorId !== currentUser.uid) {

            throw new Error(
                "You cannot manage another instructor's quiz."
            );

        }

        if (action === "publish") {

            await updateDoc(quizRef, {

                published: !quiz.published,

                updatedAt: serverTimestamp()

            });

            showNotification("Quiz status updated.");

        }

        if (action === "delete") {

            if (!confirm("Delete this quiz settings?")) return;

            await deleteDoc(quizRef);

            showNotification("Quiz deleted successfully.");

        }

        await loadQuizzes();

        await loadDashboardStatistics();

    } catch (error) {

        console.error("Quiz action error:", error);

        showNotification(
            error.message,
            "error"
        );

    }

});


// ========================================
// 23. LOAD ALL DEPARTMENT STUDENTS
// ========================================

async function loadStudents() {

    const container = getElement("studentsList");

    if (!container || !instructorData) return;

    container.textContent = "Loading department students...";

    try {

        const department = instructorData.department;

        // Firestore rules require this department filter.
        // The department value must match the instructor's
        // department exactly.

        const studentsQuery = query(
            collection(db, "students"),
            where("department", "==", department)
        );

        const snapshot = await getDocs(studentsQuery);

        // Use document IDs to avoid duplicate records.

        const uniqueStudents = new Map();

        snapshot.docs.forEach(studentDoc => {

            uniqueStudents.set(studentDoc.id, {

                id: studentDoc.id,

                ...studentDoc.data()

            });

        });

        departmentStudents = Array.from(
            uniqueStudents.values()
        );

        let students = [...departmentStudents];

        const selectedCourse =
            getElement("studentCourseFilter")?.value;

        // Filter students by course enrollment.

        if (selectedCourse) {

            try {

                const enrollmentQuery = query(
                    collection(db, "enrollments"),
                    where("courseId", "==", selectedCourse)
                );

                const enrollmentSnapshot = await getDocs(
                    enrollmentQuery
                );

                const enrolledIds = new Set();

                enrollmentSnapshot.docs.forEach(item => {

                    const enrollment = item.data();

                    if (enrollment.studentId) {
                        enrolledIds.add(enrollment.studentId);
                    }

                    if (enrollment.studentUid) {
                        enrolledIds.add(enrollment.studentUid);
                    }

                });

                students = students.filter(student => {

                    return (
                        enrolledIds.has(student.id) ||
                        enrolledIds.has(student.uid)
                    );

                });

            } catch (error) {

                console.error(
                    "Enrollment filtering error:",
                    error
                );

                showNotification(
                    "Could not filter by enrollment. Showing all department students.",
                    "error"
                );

                students = [...departmentStudents];

            }

        }

        container.innerHTML = "";

        if (students.length === 0) {

            container.textContent =
                "No students found for this selection.";

            return;

        }

        students.forEach(student => {

            const item = document.createElement("div");

            item.className = "student-item";

            const studentName = getStudentName(student);

            item.innerHTML = `

                <h4>
                    ${escapeHTML(studentName)}
                </h4>

                <p>
                    Email:
                    ${escapeHTML(student.email || "Not available")}
                </p>

                <p>
                    Matric Number:
                    ${escapeHTML(student.matricNumber || "Not available")}
                </p>

                <p>
                    Department:
                    ${escapeHTML(student.department || "Not available")}
                </p>

                <p>
                    Level:
                    ${escapeHTML(student.level || "Not available")}
                </p>

            `;

            container.appendChild(item);

        });

        console.log(
            "Department students loaded:",
            departmentStudents.length
        );

    } catch (error) {

        console.error(
            "Student loading error:",
            error
        );

        container.textContent =
            "Unable to load department students: " + error.message;

    }

}


// ========================================
// 24. STUDENT FILTER
// ========================================

getElement("studentCourseFilter")?.addEventListener(
    "change",
    loadStudents
);


// ========================================
// 25. DASHBOARD STATISTICS
// ========================================

async function loadDashboardStatistics() {

    try {

        // Department student count

        const studentsQuery = query(
            collection(db, "students"),
            where("department", "==", instructorData.department)
        );

        const studentsSnapshot = await getDocs(studentsQuery);

        // Count lessons and quizzes course by course.

        let totalLessons = 0;

        let totalQuizzes = 0;

        for (const course of instructorCourses) {

            try {

                const lessonQuery = query(
                    collection(db, "lessons"),
                    where("courseId", "==", course.id)
                );

                const lessonSnapshot = await getDocs(lessonQuery);

                totalLessons += lessonSnapshot.size;

            } catch (error) {

                console.error(
                    "Lesson statistics error:",
                    course.title,
                    error
                );

            }

            try {

                const quizQuery = query(
                    collection(db, "quizSettings"),
                    where("courseId", "==", course.id)
                );

                const quizSnapshot = await getDocs(quizQuery);

                totalQuizzes += quizSnapshot.size;

            } catch (error) {

                console.error(
                    "Quiz statistics error:",
                    course.title,
                    error
                );

            }

        }

        setElementContent(
            "totalCourses",
            instructorCourses.length
        );

        setElementContent(
            "totalStudents",
            studentsSnapshot.size
        );

        setElementContent(
            "totalLessons",
            totalLessons
        );

        setElementContent(
            "totalQuizzes",
            totalQuizzes
        );

    } catch (error) {

        console.error(
            "Dashboard statistics error:",
            error
        );

        showNotification(
            "Some dashboard statistics could not be loaded: " + error.message,
            "error"
        );

    }

}


// ========================================
// 26. RECENT COURSES
// ========================================

async function loadRecentCourses() {

    const container = getElement("recentCourses");

    if (!container) return;

    const recentCourses = instructorCourses.slice(0, 4);

    if (recentCourses.length === 0) {

        container.textContent =
            "No courses available in your department.";

        return;

    }

    container.innerHTML = "";

    recentCourses.forEach(course => {

        const card = document.createElement("div");

        card.className = "course-card";

        card.innerHTML = `

            <div class="course-card-body">

                <h3>
                    ${escapeHTML(course.title || "Untitled Course")}
                </h3>

                <p>
                    ${escapeHTML(course.courseCode || "")}
                </p>

                <p>
                    ${escapeHTML(course.department || "")}
                </p>

                <p>
                    ${escapeHTML(course.level || "")}
                </p>

                <p>
                    Status:
                    ${isCoursePublished(course) ? "Published" : "Draft"}
                </p>

            </div>

        `;

        container.appendChild(card);

    });

}


// ========================================
// 27. LOGOUT
// ========================================

logoutBtn?.addEventListener("click", async () => {

    try {

        await signOut(auth);

        window.location.href = "auth.html";

    } catch (error) {

        console.error("Logout error:", error);

        showNotification(
            "Unable to logout: " + error.message,
            "error"
        );

    }

});


// ========================================
// 28. DASHBOARD READY
// ========================================

console.log(
    "LearnSphere Instructor Dashboard loaded successfully."
);