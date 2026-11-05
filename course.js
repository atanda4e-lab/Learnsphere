// ========================================
// LEARNSPHERE COURSE LEARNING SYSTEM
// COMPLETE FIREBASE VERSION
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

const SECONDS_PER_QUESTION = 30;

const DEFAULT_MAX_ATTEMPTS = 3;


// ========================================
// 4. GLOBAL VARIABLES
// ========================================

const urlParameters = new URLSearchParams(window.location.search);

const courseId = urlParameters.get("id");

let currentStudent = null;

let currentCourse = null;

let courseLessons = [];

let courseQuizzes = [];

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


// GET CURRENT LOCAL DATE

function getCurrentLocalDate() {

    const today = new Date();

    const year = today.getFullYear();

    const month = String(today.getMonth() + 1).padStart(2, "0");

    const day = String(today.getDate()).padStart(2, "0");

    return year + "-" + month + "-" + day;

}


// ========================================
// 6. COURSE OPENING AND CLOSING DATES
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


    // CHECK OPENING DATE

    if (openingDate && today < openingDate) {

        return {

            allowed: false,

            message: "This course has not opened yet. It will open on " +

                openingDate + "."

        };

    }


    // CHECK CLOSING DATE

    if (closingDate && today > closingDate) {

        return {

            allowed: false,

            message: "This course closed on " + closingDate + "."

        };

    }


    // COURSE IS AVAILABLE

    return {

        allowed: true,

        message: ""

    };

}


// ========================================
// 7. AUTHENTICATION
// ========================================

onAuthStateChanged(auth, async function (user) {

    if (!user) {

        window.location.href = "auth.html?mode=student";

        return;

    }

    try {

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

            fullName: studentData.fullName || user.displayName || "Student"

        };

        await loadCourse();

    }

    catch (error) {

        console.error("Authentication error:", error);

        showError("Unable to verify your account: " + error.message);

    }

});


// ========================================
// 8. CHECK ENROLMENT
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
// 9. LOAD COURSE
// ========================================

async function loadCourse() {

    try {

        if (!courseId) {

            alert("No course selected.");

            window.location.href = "student-dashboard.html";

            return;

        }

        const courseReference = doc(db, "courses", courseId);

        const courseDocument = await getDoc(courseReference);

        if (!courseDocument.exists()) {

            alert("Course not found.");

            window.location.href = "student-dashboard.html";

            return;

        }

        currentCourse = {

            ...courseDocument.data(),

            id: courseDocument.id

        };


        // CHECK PUBLICATION

        if (currentCourse.published !== true) {

            alert("This course is not published.");

            window.location.href = "student-dashboard.html";

            return;

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


        // DISPLAY COURSE INFORMATION

        courseTitle.textContent = currentCourse.title || "Untitled Course";

        courseDescription.textContent = currentCourse.description || "";

        courseDepartment.textContent = currentCourse.department || "General";

        courseLevel.textContent = currentCourse.level || "All Levels";


        // LOAD MAXIMUM QUIZ ATTEMPTS

        maxQuizAttempts = Number(currentCourse.maxAttempts);

        if (!Number.isInteger(maxQuizAttempts) || maxQuizAttempts < 1) {

            maxQuizAttempts = DEFAULT_MAX_ATTEMPTS;

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


        // LOAD QUIZZES

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


        // DISPLAY CONTENT

        displayLessons();

        await updateProgress();

        if (courseLessons.length > 0) {

            await showLesson(0);

        } else {

            welcomeMessage.classList.remove("hidden");

            lessonArea.classList.add("hidden");

            lessonList.innerHTML = "<p>No lessons available yet.</p>";

        }


        console.log("Course loaded:", currentCourse);

        console.log("Lessons:", courseLessons);

        console.log("Quizzes:", courseQuizzes);

        console.log("Maximum attempts:", maxQuizAttempts);

        console.log("Opening date:", currentCourse.openingDate || "No restriction");

        console.log("Closing date:", currentCourse.closingDate || "No restriction");

    }

    catch (error) {

        console.error("Course loading error:", error);

        showError("Unable to load course: " + error.message);

    }

}


// ========================================
// 10. LOAD COMPLETED LESSONS
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
// 11. DISPLAY LESSONS
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

                <i class="fa-solid ${isCompleted ? "fa-circle-check" : "fa-circle"} lesson-status"></i>

            `;

            button.addEventListener("click", function () {

                showLesson(index);

            });

            lessonList.appendChild(button);

        });

    }

    catch (error) {

        console.error("Lesson display error:", error);

        lessonList.innerHTML = "<p>Unable to load lesson progress.</p>";

    }

}


// ========================================
// 12. SHOW LESSON
// ========================================

async function showLesson(index) {

    if (index < 0 || index >= courseLessons.length) return;


    // RECHECK COURSE SCHEDULE

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

    lessonContent.textContent = lesson.content || "No lesson content available.";


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


    previousLessonBtn.disabled = index === 0;

    nextLessonBtn.disabled = index === courseLessons.length - 1;


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


// ========================================
// 13. COMPLETE LESSON
// ========================================

async function completeLesson() {

    const schedule = checkCourseSchedule();

    if (!schedule.allowed) {

        alert(schedule.message);

        window.location.href = "student-dashboard.html";

        return;

    }

    const lesson = courseLessons[currentLessonIndex];

    if (!lesson) return;

    completeLessonBtn.disabled = true;

    try {

        const lessonId = currentStudent.uid + "_" +

            currentCourse.id + "_" + lesson.id;

        const lessonReference = doc(

            db,

            "completedLessons",

            lessonId

        );

        const existing = await getDoc(lessonReference);

        if (!existing.exists()) {

            await setDoc(lessonReference, {

                studentId: currentStudent.uid,

                studentName: currentStudent.fullName,

                courseId: currentCourse.id,

                lessonId: lesson.id,

                completedAt: serverTimestamp()

            });

        }

        alert("Lesson marked as completed!");

        await displayLessons();

        await updateProgress();

        await checkCourseCompletionAndIssueCertificate();

        await showLesson(currentLessonIndex);

    }

    catch (error) {

        console.error("Lesson completion error:", error);

        showError("Unable to save lesson: " + error.message);

        completeLessonBtn.disabled = false;

    }

}


// ========================================
// 14. UPDATE PROGRESS
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
// 15. LESSON NAVIGATION
// ========================================

previousLessonBtn.addEventListener("click", function () {

    showLesson(currentLessonIndex - 1);

});


nextLessonBtn.addEventListener("click", function () {

    showLesson(currentLessonIndex + 1);

});


completeLessonBtn.addEventListener("click", completeLesson);


// ========================================
// 16. QUIZ TIMER
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

    quizTimerDisplay.textContent = "Time Remaining: " + formatTime(remainingTime);

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


function startQuizTimer() {

    stopQuizTimer();

    remainingTime = courseQuizzes.length * SECONDS_PER_QUESTION;

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

            courseQuizzes.length * SECONDS_PER_QUESTION -

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
// 17. CHECK QUIZ ATTEMPTS
// ========================================

async function checkQuizAttempts() {

    try {

        const resultsQuery = query(

            collection(db, "results"),

            where("studentId", "==", currentStudent.uid),

            where("courseId", "==", currentCourse.id)

        );

        const snapshot = await getDocs(resultsQuery);

        usedQuizAttempts = snapshot.size;

        const remainingAttempts = Math.max(

            0,

            maxQuizAttempts - usedQuizAttempts

        );

        console.log("Used attempts:", usedQuizAttempts);

        console.log("Maximum attempts:", maxQuizAttempts);

        console.log("Remaining attempts:", remainingAttempts);

        if (remainingAttempts <= 0) {

            alert(

                "You have used all " +

                maxQuizAttempts +

                " quiz attempts for this course."

            );

            return false;

        }

        return true;

    }

    catch (error) {

        console.error("Quiz attempt checking error:", error);

        showError("Unable to check your quiz attempts: " + error.message);

        return false;

    }

}


// ========================================
// 18. OPEN QUIZ
// ========================================

openQuizBtn.addEventListener("click", async function () {

    // CHECK COURSE DATES

    const schedule = checkCourseSchedule();

    if (!schedule.allowed) {

        alert(schedule.message);

        window.location.href = "student-dashboard.html";

        return;

    }


    // CHECK QUIZ QUESTIONS

    if (courseQuizzes.length === 0) {

        alert("No quiz questions available.");

        return;

    }


    // CHECK ATTEMPTS

    openQuizBtn.disabled = true;

    const canAttempt = await checkQuizAttempts();

    openQuizBtn.disabled = false;

    if (!canAttempt) return;


    // OPEN QUIZ

    lessonArea.classList.add("hidden");

    welcomeMessage.classList.add("hidden");

    quizArea.classList.remove("hidden");

    currentQuestionIndex = 0;

    studentAnswers = {};

    quizSubmitted = false;

    quizSubmissionInProgress = false;

    quizResult.classList.add("hidden");

    submitQuizBtn.disabled = false;

    submitQuizBtn.textContent = "Submit Quiz";

    submitQuizBtn.classList.add("hidden");

    startQuizTimer();

    displayQuiz();

});


// ========================================
// 19. DISPLAY QUIZ
// ========================================

function displayQuiz() {

    quizQuestions.innerHTML = "";

    const quiz = courseQuizzes[currentQuestionIndex];

    if (!quiz) return;

    const letters = ["A", "B", "C", "D"];

    let optionsHTML = "";

    letters.forEach(function (letter, index) {

        const option = Array.isArray(quiz.options)

            ? quiz.options[index]

            : quiz.options?.[letter];

        if (option === undefined || option === null || option === "") return;

        const selected = studentAnswers[quiz.id] === letter;

        optionsHTML += `

            <label class="quiz-option">

                <input type="radio"

                    name="question-${quiz.id}"

                    value="${letter}"

                    ${selected ? "checked" : ""}>

                <span>${letter}. ${escapeHTML(option)}</span>

            </label>

        `;

    });

    quizQuestions.innerHTML = `

        <div class="quiz-question">

            <h3>Question ${currentQuestionIndex + 1} of ${courseQuizzes.length}</h3>

            <p>${escapeHTML(quiz.question)}</p>

            ${optionsHTML}

        </div>

    `;

    quizQuestions.querySelectorAll('input[type="radio"]').forEach(function (radio) {

        radio.addEventListener("change", function () {

            studentAnswers[quiz.id] = radio.value;

        });

    });

    createQuizNavigation();

    updateQuizNavigation();

}


// ========================================
// 20. QUIZ NAVIGATION
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

        <button type="button" id="previousQuestionBtn">Previous</button>

        <span id="questionCounter"></span>

        <button type="button" id="nextQuestionBtn">Next</button>

    `;

    document.getElementById("previousQuestionBtn").addEventListener("click", function () {

        if (currentQuestionIndex > 0) {

            currentQuestionIndex--;

            displayQuiz();

        }

    });

    document.getElementById("nextQuestionBtn").addEventListener("click", nextQuestion);

}


function updateQuizNavigation() {

    const previous = document.getElementById("previousQuestionBtn");

    const next = document.getElementById("nextQuestionBtn");

    const counter = document.getElementById("questionCounter");

    if (!previous || !next || !counter) return;

    previous.disabled = currentQuestionIndex === 0;

    counter.textContent = "Question " + (currentQuestionIndex + 1) +

        " of " + courseQuizzes.length;

    const last = currentQuestionIndex === courseQuizzes.length - 1;

    next.classList.toggle("hidden", last);

    submitQuizBtn.classList.toggle("hidden", !last);

}


function nextQuestion() {

    const quiz = courseQuizzes[currentQuestionIndex];

    if (!studentAnswers[quiz.id]) {

        alert("Please select an answer.");

        return;

    }

    if (currentQuestionIndex < courseQuizzes.length - 1) {

        currentQuestionIndex++;

        displayQuiz();

    }

}


// ========================================
// 21. CHECK CORRECT ANSWER
// ========================================

function isCorrectAnswer(quiz, answer) {

    if (!answer) return false;

    const correct = String(quiz.correctAnswer ?? "").trim();

    const letters = ["A", "B", "C", "D"];

    const index = letters.indexOf(String(answer).toUpperCase());

    const selectedOption = Array.isArray(quiz.options)

        ? quiz.options[index]

        : quiz.options?.[String(answer).toUpperCase()];

    if (["0", "1", "2", "3"].includes(correct) && index === Number(correct)) {

        return true;

    }

    if (correct.toUpperCase() === String(answer).toUpperCase()) {

        return true;

    }

    return Boolean(selectedOption) &&

        String(selectedOption).trim().toLowerCase() === correct.toLowerCase();

}


// ========================================
// 22. SAVE QUIZ RESULT TO FIREBASE
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

        Date.now();

    const resultReference = doc(db, "results", resultId);

    const resultData = {

        studentId: currentStudent.uid,

        studentName: currentStudent.fullName,

        courseId: currentCourse.id,

        courseTitle: currentCourse.title,

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
// 23. ISSUE CERTIFICATE
// ========================================

async function checkCourseCompletionAndIssueCertificate() {

    if (!currentStudent || !currentCourse) return;

    if (courseLessons.length === 0 || courseQuizzes.length === 0) return;

    try {

        const completed = await getCompletedLessons();

        const allCompleted = courseLessons.every(function (lesson) {

            return completed.some(function (item) {

                return String(item.lessonId) === String(lesson.id);

            });

        });

        if (!allCompleted) return;


        // GET STUDENT PASSING RESULTS

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

                return Number(result.percentage) >= CERTIFICATE_PASS_MARK;

            });

        if (passingResults.length === 0) return;


        // CHECK EXISTING CERTIFICATE

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

            const bestResult = [...passingResults].sort(function (a, b) {

                return Number(b.percentage) - Number(a.percentage);

            })[0];

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

                Math.max(...passingResults.map(r => Number(r.percentage))) +

                "%.\n\nYour certificate is now available in your dashboard."

            );

        }

    }

    catch (error) {

        console.error("Certificate issue error:", error);

    }

}


// ========================================
// 24. SUBMIT QUIZ
// ========================================

async function submitQuiz(timeExpired = false) {

    if (quizSubmitted || quizSubmissionInProgress) return;


    // CHECK COURSE SCHEDULE

    const schedule = checkCourseSchedule();

    if (!schedule.allowed) {

        alert(schedule.message);

        window.location.href = "student-dashboard.html";

        return;

    }


    // CHECK UNANSWERED QUESTIONS

    const unanswered = courseQuizzes.filter(function (quiz) {

        return !studentAnswers[quiz.id];

    });

    if (!timeExpired && unanswered.length > 0) {

        alert("Please answer all questions before submitting.");

        return;

    }


    // PREVENT DOUBLE SUBMISSION

    quizSubmissionInProgress = true;

    stopQuizTimer();

    submitQuizBtn.disabled = true;

    submitQuizBtn.textContent = "Submitting...";


    // CALCULATE SCORE

    let score = 0;

    const answers = [];

    courseQuizzes.forEach(function (quiz) {

        const answer = studentAnswers[quiz.id] || null;

        const correct = isCorrectAnswer(quiz, answer);

        if (correct) score++;

        answers.push({

            questionId: quiz.id,

            answer: answer,

            correctAnswer: quiz.correctAnswer,

            isCorrect: correct

        });

    });


    const totalQuestions = courseQuizzes.length;

    const percentage = totalQuestions > 0

        ? Math.round((score / totalQuestions) * 100)

        : 0;


    try {

        // SAVE RESULT

        await saveQuizResult(

            score,

            totalQuestions,

            percentage,

            answers,

            timeExpired

        );

        quizSubmitted = true;

        usedQuizAttempts++;


        // CHECK CERTIFICATE

        await checkCourseCompletionAndIssueCertificate();


        // SHOW RESULT FEEDBACK

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


        // HIDE QUIZ NAVIGATION

        const navigation = document.getElementById("quizNavigation");

        if (navigation) {

            navigation.classList.add("hidden");

        }


        // REDIRECT TO DASHBOARD

        alert(

            "Quiz submitted successfully!\n\n" +

            "Your score: " + score + "/" + totalQuestions +

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

        submitQuizBtn.textContent = "Submit Quiz";

        showError(

            "Unable to save your quiz result: " + error.message

        );

    }

}


// ========================================
// 25. QUIZ FORM
// ========================================

quizForm.addEventListener("submit", function (event) {

    event.preventDefault();

    submitQuiz(false);

});


// ========================================
// END OF LEARNSPHERE COURSE SYSTEM
// ========================================