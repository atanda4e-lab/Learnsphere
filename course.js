
// ========================================
// LEARNSPHERE COURSE LEARNING SYSTEM
// COMPLETE FIREBASE VERSION
// PUBLIC COURSE SEO + PROTECTED LEARNING
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
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    setDoc,
    serverTimestamp,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ========================================
// 2. HTML ELEMENTS
// ========================================

const courseTitle = document.getElementById("courseTitle");
const courseDescription = document.getElementById("courseDescription");
const courseDepartment = document.getElementById("courseDepartment");
const courseLevel = document.getElementById("courseLevel");

const lessonList = document.getElementById("lessonList");

const welcomeMessage = document.getElementById("welcomeMessage");
const lessonArea = document.getElementById("lessonArea");

const lessonTitle = document.getElementById("lessonTitle");
const lessonDescription = document.getElementById("lessonDescription");
const lessonContent = document.getElementById("lessonContent");

const videoArea = document.getElementById("videoArea");
const videoLink = document.getElementById("videoLink");

const pdfArea = document.getElementById("pdfArea");
const pdfLink = document.getElementById("pdfLink");

const previousLessonBtn = document.getElementById("previousLessonBtn");
const nextLessonBtn = document.getElementById("nextLessonBtn");
const completeLessonBtn = document.getElementById("completeLessonBtn");

const progressPercentage = document.getElementById("progressPercentage");
const progressFill = document.getElementById("progressFill");

const openQuizBtn = document.getElementById("openQuizBtn");
const quizArea = document.getElementById("quizArea");
const quizForm = document.getElementById("quizForm");
const quizQuestions = document.getElementById("quizQuestions");

const submitQuizBtn = document.getElementById("submitQuizBtn");

const quizResult = document.getElementById("quizResult");
const quizScore = document.getElementById("quizScore");
const quizFeedback = document.getElementById("quizFeedback");


// ========================================
// 3. SETTINGS
// ========================================

const CERTIFICATE_PASS_MARK = 70;

const CERTIFICATE_FOUNDER_NAME = "AKINTAYO IBRAHIM";

const DEFAULT_MAX_ATTEMPTS = 3;

const SECONDS_PER_QUESTION = 30;


// ========================================
// 4. GLOBAL VARIABLES
// ========================================

const urlParameters = new URLSearchParams(window.location.search);

const courseId = urlParameters.get("id");

let currentStudent = null;

let currentCourse = null;

let courseLessons = [];

let courseQuizzes = [];

let courseQuizSettings = [];

let lessonQuizSettings = [];

let currentQuizSettings = null;

let activeQuizQuestions = [];

let currentLessonIndex = 0;

let currentQuestionIndex = 0;

let studentAnswers = {};

let quizSubmitted = false;

let quizSubmissionInProgress = false;

let quizTimer = null;

let remainingTime = 0;

let quizStartTime = null;

let quizTimerDisplay = null;

let maxQuizAttempts = DEFAULT_MAX_ATTEMPTS;

let usedQuizAttempts = 0;

let lessonQuizButton = null;


// ========================================
// 5. HELPER FUNCTIONS
// ========================================

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, function (character) {

        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return characters[character];

    });

}


function showError(message) {

    console.error(message);

    alert(message);

}


function getCurrentLocalDate() {

    const today = new Date();

    const year = today.getFullYear();

    const month = String(today.getMonth() + 1).padStart(2, "0");

    const day = String(today.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;

}


function shuffleArray(array) {

    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {

        const randomIndex = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[randomIndex]] =
            [shuffled[randomIndex], shuffled[i]];

    }

    return shuffled;

}


function getDateValue(value) {

    if (!value) return null;

    if (typeof value.toDate === "function") {

        return value.toDate();

    }

    if (value instanceof Date) {

        return value;

    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {

        return null;

    }

    return date;

}


function formatDateTime(value) {

    const date = getDateValue(value);

    if (!date) return "";

    return date.toLocaleString();

}


// ========================================
// 6. DYNAMIC COURSE SEO
// ========================================

function setMetaTag(attribute, name, content) {

    let element = document.head.querySelector(
        `meta[${attribute}="${name}"]`
    );

    if (!element) {

        element = document.createElement("meta");

        element.setAttribute(attribute, name);

        document.head.appendChild(element);

    }

    element.setAttribute("content", content);

}


function updateCourseSEO(course) {

    if (!course) return;

    const title = course.title || "Online Course";

    const description = course.description ||
        "Explore online courses and learning resources on LearnSphere Nigeria.";

    const department = course.department || "General";

    const level = course.level || "All Levels";

    const canonicalURL =
        "https://learnsphere-ng.vercel.app/course.html?id=" +
        encodeURIComponent(course.id);

    const seoTitle = title + " | LearnSphere Nigeria";

    const seoDescription = (
        description +
        " Department: " +
        department +
        ". Level: " +
        level +
        ". Learn online with LearnSphere Nigeria."
    ).slice(0, 300);

    // PAGE TITLE

    document.title = seoTitle;

    // BASIC SEO

    setMetaTag("name", "description", seoDescription);

    setMetaTag("name", "robots", "index, follow");

    setMetaTag("name", "author", "LearnSphere Nigeria");

    // OPEN GRAPH

    setMetaTag("property", "og:type", "website");

    setMetaTag("property", "og:site_name", "LearnSphere Nigeria");

    setMetaTag("property", "og:title", seoTitle);

    setMetaTag("property", "og:description", seoDescription);

    setMetaTag("property", "og:url", canonicalURL);

    // TWITTER

    setMetaTag("name", "twitter:card", "summary");

    setMetaTag("name", "twitter:title", seoTitle);

    setMetaTag("name", "twitter:description", seoDescription);

    // CANONICAL URL

    let canonical = document.querySelector(
        'link[rel="canonical"]'
    );

    if (!canonical) {

        canonical = document.createElement("link");

        canonical.rel = "canonical";

        document.head.appendChild(canonical);

    }

    canonical.href = canonicalURL;

    // COURSE STRUCTURED DATA

    let structuredData = document.getElementById(
        "courseStructuredData"
    );

    if (!structuredData) {

        structuredData = document.createElement("script");

        structuredData.type = "application/ld+json";

        structuredData.id = "courseStructuredData";

        document.head.appendChild(structuredData);

    }

    structuredData.textContent = JSON.stringify({

        "@context": "https://schema.org",

        "@type": "Course",

        "name": title,

        "description": description,

        "url": canonicalURL,

        "provider": {

            "@type": "Organization",

            "name": "LearnSphere Nigeria",

            "url": "https://learnsphere-ng.vercel.app/"

        },

        "educationalLevel": level,

        "about": department

    });

}


// ========================================
// 7. LOAD PUBLIC COURSE INFORMATION
// ========================================

async function loadPublicCourseInformation() {

    if (!courseId) {

        courseTitle.textContent = "Course Not Found";

        courseDescription.textContent =
            "No course was selected.";

        return false;

    }

    try {

        const courseReference = doc(db, "courses", courseId);

        const courseDocument = await getDoc(courseReference);

        if (!courseDocument.exists()) {

            courseTitle.textContent = "Course Not Found";

            courseDescription.textContent =
                "This course could not be found.";

            return false;

        }

        const courseData = {

            ...courseDocument.data(),

            id: courseDocument.id

        };

        if (
            courseData.published !== true &&
            courseData.isPublished !== true
        ) {

            courseTitle.textContent = "Course Unavailable";

            courseDescription.textContent =
                "This course is not currently published.";

            return false;

        }

        currentCourse = courseData;

        courseTitle.textContent =
            currentCourse.title || "Untitled Course";

        courseDescription.textContent =
            currentCourse.description || "";

        courseDepartment.textContent =
            currentCourse.department || "General";

        courseLevel.textContent =
            currentCourse.level || "All Levels";

        updateCourseSEO(currentCourse);

        return true;

    }

    catch (error) {

        console.error("Public course loading error:", error);

        courseTitle.textContent = "Unable to Load Course";

        courseDescription.textContent =
            "Please try again later.";

        return false;

    }

}


// ========================================
// 8. PUBLIC VISITOR MESSAGE
// ========================================

function showPublicCourseAccessMessage() {

    if (welcomeMessage) {

        welcomeMessage.classList.remove("hidden");

        welcomeMessage.innerHTML = `

            <i class="fa-solid fa-book-open"></i>

            <h2>Welcome to ${escapeHTML(
                currentCourse?.title || "LearnSphere"
            )}</h2>

            <p>
                Explore this course on LearnSphere Nigeria.
                Sign in as a student and enrol to access
                the complete lessons, learning materials
                and quizzes.
            </p>

            <a href="auth.html?mode=student"
                class="back-link"
                style="display:inline-block;margin-top:15px;">

                Sign In to Start Learning

            </a>

        `;

    }

    if (lessonArea) {

        lessonArea.classList.add("hidden");

    }

    if (quizArea) {

        quizArea.classList.add("hidden");

    }

    if (lessonList) {

        lessonList.innerHTML = `

            <p>
                Sign in and enrol in this course
                to access the lessons.
            </p>

        `;

    }

    if (openQuizBtn) {

        openQuizBtn.disabled = true;

        openQuizBtn.innerHTML = `

            <i class="fa-solid fa-lock"></i>

            Student Login Required

        `;

    }

}


// ========================================
// 9. COURSE OPENING AND CLOSING DATES
// ========================================

function checkCourseSchedule() {

    if (!currentCourse) {

        return {
            allowed: false,
            message: "Course information is unavailable."
        };

    }

    const today = getCurrentLocalDate();

    const openingDate = currentCourse.openingDate || "";

    const closingDate = currentCourse.closingDate || "";

    if (openingDate && today < openingDate) {

        return {
            allowed: false,
            message: "This course has not opened yet. It will open on " +
                openingDate + "."
        };

    }

    if (closingDate && today > closingDate) {

        return {
            allowed: false,
            message: "This course closed on " + closingDate + "."
        };

    }

    return {
        allowed: true,
        message: ""
    };

}


// ========================================
// 10. CHECK INDIVIDUAL QUIZ SCHEDULE
// ========================================

function checkQuizSchedule(settings) {

    if (!settings) {

        return {
            allowed: false,
            message: "Quiz settings are unavailable."
        };

    }

    if (settings.published !== true) {

        return {
            allowed: false,
            message: "This quiz has not been published."
        };

    }

    const now = new Date();

    const openingDate = getDateValue(settings.openingDateTime);

    const closingDate = getDateValue(settings.closingDateTime);

    if (openingDate && now < openingDate) {

        return {
            allowed: false,
            message: "This quiz will open on " +
                formatDateTime(settings.openingDateTime) + "."
        };

    }

    if (closingDate && now > closingDate) {

        return {
            allowed: false,
            message: "This quiz closed on " +
                formatDateTime(settings.closingDateTime) + "."
        };

    }

    return {
        allowed: true,
        message: ""
    };

}


// ========================================
// 11. AUTHENTICATION
// ========================================

// Load public course information before checking login.

const publicCourseReady = loadPublicCourseInformation();


onAuthStateChanged(auth, async function (user) {

    try {

        const courseAvailable = await publicCourseReady;

        if (!courseAvailable) {

            return;

        }

        // VISITOR WITHOUT LOGIN

        if (!user) {

            currentStudent = null;

            showPublicCourseAccessMessage();

            return;

        }

        // VERIFY STUDENT PROFILE

        const studentReference = doc(db, "students", user.uid);

        const studentDocument = await getDoc(studentReference);

        if (!studentDocument.exists()) {

            alert("Student profile not found.");

            await signOut(auth);

            window.location.href = "auth.html?mode=student";

            return;

        }

        const studentData = studentDocument.data();

        if (studentData.role !== "student") {

            alert("You do not have student access.");

            await signOut(auth);

            window.location.href = "auth.html";

            return;

        }

        currentStudent = {

            ...studentData,

            uid: user.uid,

            id: user.uid,

            fullName: studentData.fullName ||
                user.displayName ||
                "Student"

        };

        await loadCourse();

    }

    catch (error) {

        console.error("Authentication error:", error);

        showError(
            "Unable to verify your account: " + error.message
        );

    }

});


// ========================================
// 12. CHECK ENROLMENT
// ========================================

async function isStudentEnrolled() {

    const enrollmentQuery = query(

        collection(db, "enrollments"),

        where("studentId", "==", currentStudent.uid)

    );

    const snapshot = await getDocs(enrollmentQuery);

    return snapshot.docs.some(function (item) {

        return String(item.data().courseId) === String(courseId);

    });

}


// ========================================
// 13. LOAD COURSE FOR ENROLLED STUDENTS
// ========================================

async function loadCourse() {

    try {

        if (!currentCourse) {

            throw new Error("Course information is unavailable.");

        }

        // CHECK COURSE DATES

        const schedule = checkCourseSchedule();

        if (!schedule.allowed) {

            alert(schedule.message);

            window.location.href = "student-dashboard.html";

            return;

        }

        // CHECK ENROLMENT

        const enrolled = await isStudentEnrolled();

        if (!enrolled) {

            alert("Please enrol in this course first.");

            window.location.href = "student-dashboard.html";

            return;

        }

        // LOAD LESSONS

        const lessonsQuery = query(

            collection(db, "lessons"),

            where("courseId", "==", courseId)

        );

        const lessonsSnapshot = await getDocs(lessonsQuery);

        courseLessons = lessonsSnapshot.docs.map(function (item) {

            return {

                ...item.data(),

                id: item.id

            };

        });

        // LOAD COURSE QUESTIONS

        const quizzesQuery = query(

            collection(db, "quizzes"),

            where("courseId", "==", courseId)

        );

        const quizzesSnapshot = await getDocs(quizzesQuery);

        courseQuizzes = quizzesSnapshot.docs.map(function (item) {

            return {

                ...item.data(),

                id: item.id

            };

        });

        // LOAD INSTRUCTOR QUIZ SETTINGS

        await loadQuizSettings();

        // DISPLAY CONTENT

        await displayLessons();

        await updateProgress();

        if (courseLessons.length > 0) {

            await showLesson(0);

        } else {

            welcomeMessage.classList.remove("hidden");

            lessonArea.classList.add("hidden");

            lessonList.innerHTML =
                "<p>No lessons available yet.</p>";

        }

        updateCourseQuizButton();

        console.log("Course loaded:", currentCourse);

        console.log("Lessons:", courseLessons);

        console.log("Quiz settings:", courseQuizSettings);

        console.log("Lesson quiz settings:", lessonQuizSettings);

        console.log("Quiz questions:", courseQuizzes);

    }

    catch (error) {

        console.error("Course loading error:", error);

        showError("Unable to load course: " + error.message);

    }

}


// ========================================
// 14. LOAD INSTRUCTOR QUIZ SETTINGS
// ========================================

async function loadQuizSettings() {

    const settingsQuery = query(

        collection(db, "quizSettings"),

        where("courseId", "==", courseId)

    );

    const snapshot = await getDocs(settingsQuery);

    const allSettings = snapshot.docs.map(function (item) {

        return {

            ...item.data(),

            id: item.id

        };

    });

    const publishedSettings = allSettings.filter(function (settings) {

        return settings.published === true;

    });

    courseQuizSettings = publishedSettings.filter(function (settings) {

        return !settings.type || settings.type === "course";

    });

    lessonQuizSettings = publishedSettings.filter(function (settings) {

        return settings.type === "lesson" && settings.lessonId;

    });

}


// ========================================
// 15. REFRESH QUIZ SETTINGS
// ========================================

async function refreshQuizSettings(settingsId) {

    const settingsReference = doc(db, "quizSettings", settingsId);

    const settingsDocument = await getDoc(settingsReference);

    if (!settingsDocument.exists()) {

        throw new Error("This quiz has been removed by the instructor.");

    }

    const settings = {

        ...settingsDocument.data(),

        id: settingsDocument.id

    };

    if (settings.courseId !== courseId) {

        throw new Error("This quiz does not belong to this course.");

    }

    if (settings.published !== true) {

        throw new Error("The instructor has unpublished this quiz.");

    }

    return settings;

}


// ========================================
// 16. LOAD QUESTIONS FOR A QUIZ
// ========================================

async function loadQuestionsForQuiz(settings) {

    const questionsQuery = query(

        collection(db, "quizzes"),

        where("courseId", "==", courseId)

    );

    const snapshot = await getDocs(questionsQuery);

    const allQuestions = snapshot.docs.map(function (item) {

        return {

            ...item.data(),

            id: item.id

        };

    });

    let matchingQuestions = allQuestions.filter(function (question) {

        return String(question.quizId || "") === String(settings.id);

    });

    // LEGACY QUESTION SUPPORT

    if (matchingQuestions.length === 0) {

        const legacyQuestions = allQuestions.filter(function (question) {

            const hasNoQuizId = !question.quizId;

            if (!hasNoQuizId) return false;

            if (settings.type === "lesson") {

                return String(question.lessonId || "") ===
                    String(settings.lessonId || "");

            }

            return !question.lessonId;

        });

        matchingQuestions = legacyQuestions;

    }

    if (matchingQuestions.length === 0) {

        throw new Error(
            "No questions have been added to this quiz yet."
        );

    }

    return matchingQuestions;

}


// ========================================
// 17. GET QUESTION OPTIONS
// ========================================

function getQuestionOptions(question) {

    if (Array.isArray(question.options)) {

        return question.options;

    }

    if (question.options && typeof question.options === "object") {

        return [

            question.options.A,

            question.options.B,

            question.options.C,

            question.options.D

        ].filter(function (option) {

            return option !== undefined && option !== null;

        });

    }

    return [];

}


// ========================================
// 18. PREPARE QUESTIONS
// ========================================

function prepareQuizQuestions(questions, settings) {

    let preparedQuestions = [...questions];

    const questionLimit = Number(settings.questionLimit);

    if (
        Number.isInteger(questionLimit) &&
        questionLimit > 0 &&
        questionLimit < preparedQuestions.length
    ) {

        if (settings.shuffleQuestions === true) {

            preparedQuestions = shuffleArray(preparedQuestions)
                .slice(0, questionLimit);

        } else {

            preparedQuestions = preparedQuestions.slice(0, questionLimit);

        }

    }

    if (settings.shuffleQuestions === true) {

        preparedQuestions = shuffleArray(preparedQuestions);

    }

    preparedQuestions = preparedQuestions.map(function (question) {

        const options = getQuestionOptions(question);

        const optionOrder = options.map(function (option, index) {

            return index;

        });

        if (settings.shuffleOptions === true) {

            question.optionOrder = shuffleArray(optionOrder);

        } else {

            question.optionOrder = optionOrder;

        }

        question.displayOptions = options;

        return question;

    });

    return preparedQuestions;

}


// ========================================
// 19. LOAD COMPLETED LESSONS
// ========================================

async function getCompletedLessons() {

    const completedQuery = query(

        collection(db, "completedLessons"),

        where("studentId", "==", currentStudent.uid),

        where("courseId", "==", currentCourse.id)

    );

    const snapshot = await getDocs(completedQuery);

    return snapshot.docs.map(function (item) {

        return {

            ...item.data(),

            id: item.id

        };

    });

}


// ========================================
// 20. DISPLAY LESSONS
// ========================================

async function displayLessons() {

    lessonList.innerHTML = "<p>Loading lessons...</p>";

    try {

        const completed = await getCompletedLessons();

        lessonList.innerHTML = "";

        courseLessons.forEach(function (lesson, index) {

            const isCompleted = completed.some(function (item) {

                return String(item.lessonId) === String(lesson.id);

            });

            const button = document.createElement("button");

            button.type = "button";

            button.className = "lesson-item";

            if (isCompleted) {

                button.classList.add("completed");

            }

            if (index === currentLessonIndex) {

                button.classList.add("active");

            }

            button.innerHTML = `

                <i class="fa-solid fa-book-open"></i>

                <span>${index + 1}. ${escapeHTML(lesson.title)}</span>

                <i class="fa-solid ${
                    isCompleted ? "fa-circle-check" : "fa-circle"
                } lesson-status"></i>

            `;

            button.addEventListener("click", function () {

                showLesson(index);

            });

            lessonList.appendChild(button);

        });

    }

    catch (error) {

        console.error("Lesson display error:", error);

        lessonList.innerHTML =
            "<p>Unable to load lesson progress.</p>";

    }

}


// ========================================
// 21. CREATE LESSON QUIZ BUTTON
// ========================================

function createLessonQuizButton() {

    if (lessonQuizButton) return;

    lessonQuizButton = document.createElement("button");

    lessonQuizButton.type = "button";

    lessonQuizButton.id = "lessonQuizButton";

    lessonQuizButton.className = "quiz-navigation-btn";

    lessonQuizButton.innerHTML = `

        <i class="fa-solid fa-clipboard-question"></i>

        Take Lesson Quiz

    `;

    lessonQuizButton.style.marginTop = "15px";

    lessonQuizButton.classList.add("hidden");

    lessonQuizButton.addEventListener("click", async function () {

        const lesson = courseLessons[currentLessonIndex];

        if (!lesson) return;

        const settings = getLessonQuizSettings(lesson.id);

        if (!settings) {

            alert("There is no published quiz for this lesson.");

            return;

        }

        await openConfiguredQuiz(settings);

    });

    const heading = document.querySelector(".lesson-heading");

    if (heading) {

        heading.appendChild(lessonQuizButton);

    }

}


// ========================================
// 22. FIND LESSON QUIZ SETTINGS
// ========================================

function getLessonQuizSettings(lessonId) {

    const matchingSettings = lessonQuizSettings.filter(function (settings) {

        return String(settings.lessonId) === String(lessonId);

    });

    if (matchingSettings.length === 0) {

        return null;

    }

    matchingSettings.sort(function (a, b) {

        const dateA = getDateValue(a.updatedAt)?.getTime() || 0;

        const dateB = getDateValue(b.updatedAt)?.getTime() || 0;

        return dateB - dateA;

    });

    return matchingSettings[0];

}


// ========================================
// 23. SHOW LESSON
// ========================================

async function showLesson(index) {

    if (index < 0 || index >= courseLessons.length) return;

    const schedule = checkCourseSchedule();

    if (!schedule.allowed) {

        alert(schedule.message);

        window.location.href = "student-dashboard.html";

        return;

    }

    currentLessonIndex = index;

    const lesson = courseLessons[index];

    welcomeMessage.classList.add("hidden");

    quizArea.classList.add("hidden");

    lessonArea.classList.remove("hidden");

    lessonTitle.textContent = lesson.title || "";

    lessonDescription.textContent = lesson.description || "";

    lessonContent.textContent =
        lesson.content || "No lesson content available.";

    // VIDEO

    if (lesson.video) {

        videoArea.classList.remove("hidden");

        videoLink.href = lesson.video;

    } else {

        videoArea.classList.add("hidden");

    }

    // PDF

    const pdf = lesson.pdf || lesson.pdfData;

    if (pdf) {

        pdfArea.classList.remove("hidden");

        pdfLink.href = pdf;

        pdfLink.download = lesson.pdfName || "Lesson-Material.pdf";

    } else {

        pdfArea.classList.add("hidden");

    }

    // NAVIGATION

    previousLessonBtn.disabled = index === 0;

    nextLessonBtn.disabled = index === courseLessons.length - 1;

    // LESSON QUIZ

    createLessonQuizButton();

    const lessonQuiz = getLessonQuizSettings(lesson.id);

    if (lessonQuiz) {

        lessonQuizButton.classList.remove("hidden");

        lessonQuizButton.disabled = false;

        lessonQuizButton.innerHTML = `

            <i class="fa-solid fa-clipboard-question"></i>

            Take Quiz: ${escapeHTML(lessonQuiz.title || "Lesson Quiz")}

        `;

    } else {

        lessonQuizButton.classList.add("hidden");

    }

    try {

        const completed = await getCompletedLessons();

        const isCompleted = completed.some(function (item) {

            return String(item.lessonId) === String(lesson.id);

        });

        completeLessonBtn.disabled = isCompleted;

        completeLessonBtn.textContent = isCompleted

            ? "Completed ✓"

            : "Mark as Completed";

        await displayLessons();

        await updateProgress();

    }

    catch (error) {

        console.error("Lesson status error:", error);

    }

}


/// ========================================
// 24. COMPLETE LESSON
// ========================================

async function completeLesson() {

    if (!currentStudent || !currentCourse) {

        alert("Please log in as a student.");

        return;

    }

    const schedule = checkCourseSchedule();

    if (!schedule.allowed) {

        alert(schedule.message);

        return;

    }

    const lesson = courseLessons[currentLessonIndex];

    if (!lesson) {

        alert("Lesson not found.");

        return;

    }

    const studentId = currentStudent.uid;

    const courseId = currentCourse.id;

    const lessonId = lesson.id;

    const completionId =
        studentId + "_" + courseId + "_" + lessonId;

    const completionReference = doc(
        db,
        "completedLessons",
        completionId
    );

    completeLessonBtn.disabled = true;

    completeLessonBtn.textContent = "Saving...";

    try {

        // Save completion directly to Firestore.
        // No preliminary getDoc() request is needed.

        await setDoc(completionReference, {

            studentId: studentId,

            studentName: currentStudent.fullName,

            courseId: courseId,

            lessonId: lessonId,

            completed: true,

            completedAt: serverTimestamp()

        }, {

            merge: true

        });

        console.log(
            "Lesson completion saved successfully:",
            completionId
        );

        completeLessonBtn.textContent = "Completed ✓";

        completeLessonBtn.disabled = true;

        // Refresh lesson list

        await displayLessons();

        // Refresh course progress

        await updateProgress();

        // Check certificate eligibility

        await checkCourseCompletionAndIssueCertificate();

        alert("Congratulations! Lesson marked as completed.");

    }

    catch (error) {

        console.error(
            "Lesson completion error:",
            error
        );

        console.error(
            "Error code:",
            error.code
        );

        completeLessonBtn.disabled = false;

        completeLessonBtn.textContent = "Mark as Completed";

        showError(
            "Unable to save lesson: " + error.message
        );

    }

}


// ========================================
// 25. UPDATE PROGRESS
// ========================================

async function updateProgress() {

    if (!currentStudent || !currentCourse) return;

    try {

        const completed = await getCompletedLessons();

        const total = courseLessons.length;

        const count = completed.length;

        const percentage = total > 0

            ? Math.round((count / total) * 100)

            : 0;

        progressPercentage.textContent = percentage + "%";

        progressFill.style.width = percentage + "%";

    }

    catch (error) {

        console.error("Progress error:", error);

    }

}


// ========================================
// 26. LESSON NAVIGATION EVENTS
// ========================================

previousLessonBtn.addEventListener("click", function () {

    showLesson(currentLessonIndex - 1);

});

nextLessonBtn.addEventListener("click", function () {

    showLesson(currentLessonIndex + 1);

});

completeLessonBtn.addEventListener("click", completeLesson);


// ========================================
// 27. COURSE QUIZ BUTTON
// ========================================

function updateCourseQuizButton() {

    if (!openQuizBtn) return;

    if (courseQuizSettings.length === 0) {

        openQuizBtn.disabled = true;

        openQuizBtn.innerHTML = `

            <i class="fa-solid fa-lock"></i>

            No Published Course Quiz

        `;

        return;

    }

    openQuizBtn.disabled = false;

    openQuizBtn.innerHTML = `

        <i class="fa-solid fa-clipboard-question"></i>

        Take Course Quiz

    `;

}


// ========================================
// 28. COURSE QUIZ BUTTON EVENT
// ========================================

openQuizBtn.addEventListener("click", async function () {

    if (courseQuizSettings.length === 0) {

        alert("There is no published course quiz.");

        return;

    }

    const matchingSettings = [...courseQuizSettings];

    matchingSettings.sort(function (a, b) {

        const dateA = getDateValue(a.updatedAt)?.getTime() || 0;

        const dateB = getDateValue(b.updatedAt)?.getTime() || 0;

        return dateB - dateA;

    });

    await openConfiguredQuiz(matchingSettings[0]);

});


// ========================================
// 29. OPEN CONFIGURED QUIZ
// ========================================

async function openConfiguredQuiz(settings) {

    if (quizSubmissionInProgress) return;

    const courseSchedule = checkCourseSchedule();

    if (!courseSchedule.allowed) {

        alert(courseSchedule.message);

        return;

    }

    try {

        openQuizBtn.disabled = true;

        const freshSettings = await refreshQuizSettings(settings.id);

        const quizSchedule = checkQuizSchedule(freshSettings);

        if (!quizSchedule.allowed) {

            alert(quizSchedule.message);

            return;

        }

        const questions = await loadQuestionsForQuiz(freshSettings);

        const preparedQuestions = prepareQuizQuestions(
            questions,
            freshSettings
        );

        if (preparedQuestions.length === 0) {

            alert("No questions are available for this quiz.");

            return;

        }

        const attemptStatus = await checkQuizAttempts(freshSettings);

        if (!attemptStatus.allowed) {

            alert(attemptStatus.message);

            return;

        }

        currentQuizSettings = freshSettings;

        activeQuizQuestions = preparedQuestions;

        maxQuizAttempts = attemptStatus.maxAttempts;

        usedQuizAttempts = attemptStatus.usedAttempts;

        currentQuestionIndex = 0;

        studentAnswers = {};

        quizSubmitted = false;

        quizSubmissionInProgress = false;

        quizResult.classList.add("hidden");

        submitQuizBtn.disabled = false;

        submitQuizBtn.textContent = "Submit Answers";

        const heading = quizArea.querySelector(".quiz-heading h2");

        const description = quizArea.querySelector(".quiz-heading p");

        if (heading) {

            heading.textContent = freshSettings.title || "Course Quiz";

        }

        if (description) {

            description.textContent =
                freshSettings.instructions ||
                "Answer the questions below.";

        }

        lessonArea.classList.add("hidden");

        welcomeMessage.classList.add("hidden");

        quizArea.classList.remove("hidden");

        startQuizTimer();

        displayQuiz();

    }

    catch (error) {

        console.error("Open quiz error:", error);

        showError(error.message || "Unable to open this quiz.");

    }

    finally {

        openQuizBtn.disabled = courseQuizSettings.length === 0;

    }

}


// ========================================
// 30. CHECK QUIZ ATTEMPTS
// ========================================

async function checkQuizAttempts(settings) {

    try {

        const resultsQuery = query(

            collection(db, "results"),

            where("studentId", "==", currentStudent.uid),

            where("courseId", "==", currentCourse.id)

        );

        const snapshot = await getDocs(resultsQuery);

        const allResults = snapshot.docs.map(function (item) {

            return {

                ...item.data(),

                id: item.id

            };

        });

        const quizResults = allResults.filter(function (result) {

            if (result.quizId) {

                return String(result.quizId) === String(settings.id);

            }

            return settings.type !== "lesson";

        });

        const usedAttempts = quizResults.length;

        let maxAttempts = Number(settings.maxAttempts);

        if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {

            maxAttempts = Number(currentCourse.maxAttempts);

        }

        if (!Number.isInteger(maxAttempts) || maxAttempts < 1) {

            maxAttempts = DEFAULT_MAX_ATTEMPTS;

        }

        const remainingAttempts = Math.max(
            0,
            maxAttempts - usedAttempts
        );

        if (remainingAttempts <= 0) {

            return {

                allowed: false,

                message: "You have used all " +
                    maxAttempts +
                    " attempts for this quiz.",

                usedAttempts: usedAttempts,

                maxAttempts: maxAttempts

            };

        }

        return {

            allowed: true,

            message: "",

            usedAttempts: usedAttempts,

            maxAttempts: maxAttempts

        };

    }

    catch (error) {

        console.error("Quiz attempt checking error:", error);

        throw new Error(
            "Unable to check your quiz attempts: " + error.message
        );

    }

}


// ========================================
// 31. QUIZ TIMER DISPLAY
// ========================================

function createTimerDisplay() {

    if (quizTimerDisplay) return;

    const heading = quizArea.querySelector(".quiz-heading");

    if (!heading) return;

    quizTimerDisplay = document.createElement("div");

    quizTimerDisplay.id = "quizTimerDisplay";

    quizTimerDisplay.style.padding = "15px";

    quizTimerDisplay.style.margin = "15px 0";

    quizTimerDisplay.style.backgroundColor = "#eef2ff";

    quizTimerDisplay.style.borderRadius = "10px";

    quizTimerDisplay.style.fontWeight = "bold";

    quizTimerDisplay.style.textAlign = "center";

    heading.after(quizTimerDisplay);

}


function formatTime(seconds) {

    return String(Math.floor(seconds / 60)).padStart(2, "0") +

        ":" +

        String(seconds % 60).padStart(2, "0");

}


function updateTimerDisplay() {

    if (!quizTimerDisplay) return;

    quizTimerDisplay.textContent =
        "Time Remaining: " + formatTime(remainingTime);

    if (remainingTime <= 60) {

        quizTimerDisplay.style.backgroundColor = "#ffe4e6";

        quizTimerDisplay.style.color = "#be123c";

    } else {

        quizTimerDisplay.style.backgroundColor = "#eef2ff";

        quizTimerDisplay.style.color = "#3157d5";

    }

}


function stopQuizTimer() {

    if (quizTimer) {

        clearInterval(quizTimer);

        quizTimer = null;

    }

}


// ========================================
// 32. START QUIZ TIMER
// ========================================

function startQuizTimer() {

    stopQuizTimer();

    let timeLimitMinutes = Number(
        currentQuizSettings.timeLimitMinutes
    );

    if (
        !Number.isFinite(timeLimitMinutes) ||
        timeLimitMinutes <= 0
    ) {

        timeLimitMinutes = Math.max(

            1,

            Math.ceil(
                activeQuizQuestions.length *
                SECONDS_PER_QUESTION / 60
            )

        );

    }

    remainingTime = Math.round(timeLimitMinutes * 60);

    quizStartTime = Date.now();

    createTimerDisplay();

    updateTimerDisplay();

    quizTimer = setInterval(function () {

        if (quizSubmitted || quizSubmissionInProgress) {

            stopQuizTimer();

            return;

        }

        remainingTime = Math.max(

            0,

            Math.round(timeLimitMinutes * 60) -

            Math.floor((Date.now() - quizStartTime) / 1000)

        );

        updateTimerDisplay();

        if (remainingTime <= 0) {

            stopQuizTimer();

            submitQuiz(true);

        }

    }, 1000);

}


// ========================================
// 33. DISPLAY QUIZ QUESTION
// ========================================

function displayQuiz() {

    quizQuestions.innerHTML = "";

    const quiz = activeQuizQuestions[currentQuestionIndex];

    if (!quiz) return;

    const letters = ["A", "B", "C", "D"];

    let optionsHTML = "";

    quiz.optionOrder.forEach(function (originalIndex, displayIndex) {

        const option = quiz.displayOptions[originalIndex];

        if (option === undefined || option === null || option === "") {

            return;

        }

        const selected =
            studentAnswers[quiz.id] === String(originalIndex);

        optionsHTML += `

            <label class="quiz-option">

                <input type="radio"

                    name="question-${escapeHTML(quiz.id)}"

                    value="${originalIndex}"

                    ${selected ? "checked" : ""}>

                <span>
                    ${letters[displayIndex]}. ${escapeHTML(option)}
                </span>

            </label>

        `;

    });

    const questionText = quiz.question || quiz.questionText || "";

    quizQuestions.innerHTML = `

        <div class="quiz-question">

            <h3>
                Question ${currentQuestionIndex + 1}
                of ${activeQuizQuestions.length}
            </h3>

            <p>${escapeHTML(questionText)}</p>

            ${optionsHTML}

        </div>

    `;

    quizQuestions.querySelectorAll('input[type="radio"]').forEach(
        function (radio) {

            radio.addEventListener("change", function () {

                studentAnswers[quiz.id] = radio.value;

            });

        }
    );

    createQuizNavigation();

    updateQuizNavigation();

}


// ========================================
// 34. QUIZ NAVIGATION
// ========================================

function createQuizNavigation() {

    let navigation = document.getElementById("quizNavigation");

    if (!navigation) {

        navigation = document.createElement("div");

        navigation.id = "quizNavigation";

        quizQuestions.after(navigation);

    }

    navigation.classList.remove("hidden");

    navigation.innerHTML = `

        <button type="button" id="previousQuestionBtn">
            Previous
        </button>

        <span id="questionCounter"></span>

        <button type="button" id="nextQuestionBtn">
            Next
        </button>

    `;

    document.getElementById("previousQuestionBtn").addEventListener(
        "click",
        function () {

            if (currentQuestionIndex > 0) {

                currentQuestionIndex--;

                displayQuiz();

            }

        }
    );

    document.getElementById("nextQuestionBtn").addEventListener(
        "click",
        nextQuestion
    );

}


// ========================================
// 35. UPDATE QUIZ NAVIGATION
// ========================================

function updateQuizNavigation() {

    const previous = document.getElementById("previousQuestionBtn");

    const next = document.getElementById("nextQuestionBtn");

    const counter = document.getElementById("questionCounter");

    if (!previous || !next || !counter) return;

    previous.disabled = currentQuestionIndex === 0;

    counter.textContent =

        "Question " + (currentQuestionIndex + 1) +

        " of " + activeQuizQuestions.length;

    const last =
        currentQuestionIndex === activeQuizQuestions.length - 1;

    next.classList.toggle("hidden", last);

    submitQuizBtn.classList.toggle("hidden", !last);

}


// ========================================
// 36. NEXT QUESTION
// ========================================

function nextQuestion() {

    const quiz = activeQuizQuestions[currentQuestionIndex];

    if (!quiz) return;

    if (studentAnswers[quiz.id] === undefined) {

        alert("Please select an answer.");

        return;

    }

    if (currentQuestionIndex < activeQuizQuestions.length - 1) {

        currentQuestionIndex++;

        displayQuiz();

    }

}


// ========================================
// 37. CHECK CORRECT ANSWER
// ========================================

function isCorrectAnswer(quiz, answer) {

    if (answer === undefined || answer === null) {

        return false;

    }

    const correct = String(quiz.correctAnswer ?? "").trim();

    const letters = ["A", "B", "C", "D"];

    const selectedIndex = Number(answer);

    const options = getQuestionOptions(quiz);

    if (["0", "1", "2", "3"].includes(correct)) {

        return selectedIndex === Number(correct);

    }

    if (letters.includes(correct.toUpperCase())) {

        const correctIndex = letters.indexOf(correct.toUpperCase());

        return selectedIndex === correctIndex;

    }

    const selectedOption = options[selectedIndex];

    return Boolean(selectedOption) &&

        String(selectedOption).trim().toLowerCase() ===

        correct.toLowerCase();

}


// ========================================
// 38. SAVE QUIZ RESULT TO FIREBASE
// ========================================

async function saveQuizResult(

    score,

    totalQuestions,

    percentage,

    answers,

    timeExpired

) {

    const resultId =

        currentStudent.uid + "_" +

        currentCourse.id + "_" +

        currentQuizSettings.id + "_" +

        Date.now();

    const resultReference = doc(db, "results", resultId);

    const resultData = {

        studentId: currentStudent.uid,

        studentName: currentStudent.fullName,

        courseId: currentCourse.id,

        courseTitle: currentCourse.title,

        quizId: currentQuizSettings.id,

        quizTitle: currentQuizSettings.title || "Course Quiz",

        quizType: currentQuizSettings.type || "course",

        lessonId: currentQuizSettings.lessonId || "",

        attemptNumber: usedQuizAttempts + 1,

        timeLimitMinutes:
            Number(currentQuizSettings.timeLimitMinutes) || null,

        score: score,

        totalQuestions: totalQuestions,

        percentage: percentage,

        answers: answers,

        timeExpired: timeExpired,

        passed: percentage >= CERTIFICATE_PASS_MARK,

        submittedAt: serverTimestamp()

    };

    await setDoc(resultReference, resultData);

    return resultId;

}


// ========================================
// 39. ISSUE CERTIFICATE
// ========================================

async function checkCourseCompletionAndIssueCertificate() {

    if (!currentStudent || !currentCourse) return;

    if (courseLessons.length === 0 || courseQuizSettings.length === 0) {

        return;

    }

    try {

        const completed = await getCompletedLessons();

        const allCompleted = courseLessons.every(function (lesson) {

            return completed.some(function (item) {

                return String(item.lessonId) === String(lesson.id);

            });

        });

        if (!allCompleted) return;

        const resultsQuery = query(

            collection(db, "results"),

            where("studentId", "==", currentStudent.uid),

            where("courseId", "==", currentCourse.id)

        );

        const resultsSnapshot = await getDocs(resultsQuery);

        const passingResults = resultsSnapshot.docs

            .map(function (item) {

                return item.data();

            })

            .filter(function (result) {

                const isCourseQuiz =

                    !result.quizType || result.quizType === "course";

                return isCourseQuiz &&

                    Number(result.percentage) >= CERTIFICATE_PASS_MARK;

            });

        if (passingResults.length === 0) return;

        const certificateId =

            "LS-" + currentStudent.uid + "-" + currentCourse.id;

        const certificateReference = doc(

            db,

            "certificates",

            certificateId

        );

        let newlyIssued = false;

        await runTransaction(db, async function (transaction) {

            const existing = await transaction.get(certificateReference);

            if (existing.exists()) return;

            const bestResult = [...passingResults].sort(

                function (a, b) {

                    return Number(b.percentage) - Number(a.percentage);

                }

            )[0];

            transaction.set(certificateReference, {

                certificateId: certificateId,

                studentId: currentStudent.uid,

                studentName: currentStudent.fullName,

                courseId: currentCourse.id,

                courseTitle: currentCourse.title,

                score: bestResult.score,

                totalQuestions: bestResult.totalQuestions,

                percentage: bestResult.percentage,

                founderName: CERTIFICATE_FOUNDER_NAME,

                issuedAt: serverTimestamp(),

                createdAt: serverTimestamp()

            });

            newlyIssued = true;

        });

        if (newlyIssued) {

            alert(

                "Congratulations!\n\n" +

                "You have completed " + currentCourse.title +

                " and earned a certificate with " +

                Math.max(

                    ...passingResults.map(function (result) {

                        return Number(result.percentage);

                    })

                ) +

                "%.\n\nYour certificate is now available in your dashboard."

            );

        }

    }

    catch (error) {

        console.error("Certificate issue error:", error);

    }

}


// ========================================
// 40. SUBMIT QUIZ
// ========================================

async function submitQuiz(timeExpired = false) {

    if (quizSubmitted || quizSubmissionInProgress) return;

    if (!currentQuizSettings || activeQuizQuestions.length === 0) {

        alert("No active quiz is available.");

        return;

    }

    const courseSchedule = checkCourseSchedule();

    if (!courseSchedule.allowed) {

        alert(courseSchedule.message);

        window.location.href = "student-dashboard.html";

        return;

    }

    const unanswered = activeQuizQuestions.filter(function (quiz) {

        return studentAnswers[quiz.id] === undefined;

    });

    if (!timeExpired && unanswered.length > 0) {

        alert("Please answer all questions before submitting.");

        return;

    }

    quizSubmissionInProgress = true;

    stopQuizTimer();

    submitQuizBtn.disabled = true;

    submitQuizBtn.textContent = "Submitting...";

    let score = 0;

    const answers = [];

    activeQuizQuestions.forEach(function (quiz) {

        const answer = studentAnswers[quiz.id] ?? null;

        const correct = isCorrectAnswer(quiz, answer);

        if (correct) {

            score++;

        }

        answers.push({

            questionId: quiz.id,

            answer: answer,

            correctAnswer: quiz.correctAnswer,

            isCorrect: correct

        });

    });

    const totalQuestions = activeQuizQuestions.length;

    const percentage = totalQuestions > 0

        ? Math.round((score / totalQuestions) * 100)

        : 0;

    try {

        await saveQuizResult(

            score,

            totalQuestions,

            percentage,

            answers,

            timeExpired

        );

        quizSubmitted = true;

        usedQuizAttempts++;

        if (
            !currentQuizSettings.type ||
            currentQuizSettings.type === "course"
        ) {

            await checkCourseCompletionAndIssueCertificate();

        }

        quizResult.classList.remove("hidden");

        quizScore.textContent =

            "You scored " + score +

            " out of " + totalQuestions +

            " (" + percentage + "%)";

        if (timeExpired) {

            quizFeedback.textContent =
                "Time is up! Your quiz was submitted automatically.";

        } else if (percentage >= CERTIFICATE_PASS_MARK) {

            quizFeedback.textContent =
                "Excellent work! You passed the quiz.";

        } else {

            quizFeedback.textContent =
                "Keep learning. You can try again.";

        }

        const navigation = document.getElementById("quizNavigation");

        if (navigation) {

            navigation.classList.add("hidden");

        }

        alert(

            "Quiz submitted successfully!\n\n" +

            "Quiz: " + currentQuizSettings.title +

            "\nYour score: " + score + "/" + totalQuestions +

            "\nPercentage: " + percentage + "%" +

            "\nAttempts used: " + usedQuizAttempts +

            " of " + maxQuizAttempts +

            "\n\nReturning to your dashboard..."

        );

        window.location.href = "student-dashboard.html";

    }

    catch (error) {

        console.error("Quiz submission error:", error);

        quizSubmissionInProgress = false;

        submitQuizBtn.disabled = false;

        submitQuizBtn.textContent = "Submit Answers";

        showError(

            "Unable to save your quiz result: " + error.message

        );

    }

}


// ========================================
// 41. QUIZ FORM SUBMISSION
// ========================================

quizForm.addEventListener("submit", function (event) {

    event.preventDefault();

    submitQuiz(false);

});


// ========================================
// END OF LEARNSPHERE COURSE SYSTEM
// ========================================