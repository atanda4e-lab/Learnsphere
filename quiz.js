/* ================================================
   LEARNSPHERE
   COMPLETE QUIZ.JS
================================================ */


/* ================================================
   1. FIREBASE IMPORTS
================================================ */

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


/* ================================================
   2. HTML ELEMENTS
================================================ */

const quizTimer = document.getElementById("quizTimer");

const quizTitle = document.getElementById("quizTitle");

const quizDescription = document.getElementById("quizDescription");

const questionCount = document.getElementById("questionCount");

const attemptInformation = document.getElementById("attemptInformation");

const quizInstructions = document.getElementById("quizInstructions");

const startQuizBtn = document.getElementById("startQuizBtn");

const quizForm = document.getElementById("quizForm");

const quizQuestions = document.getElementById("quizQuestions");

const submitQuizBtn = document.getElementById("submitQuizBtn");

const quizResult = document.getElementById("quizResult");

const resultMessage = document.getElementById("resultMessage");

const resultDetails = document.getElementById("resultDetails");


/* ================================================
   3. QUIZ CONFIGURATION
================================================ */

const PASS_MARK = 70;

const DEFAULT_TIME_LIMIT = 30;

const DEFAULT_MAX_ATTEMPTS = 2;

const urlParameters = new URLSearchParams(
    window.location.search
);

const courseId = urlParameters.get("id");

const quizId = urlParameters.get("quizId");


/* ================================================
   4. GLOBAL VARIABLES
================================================ */

let currentStudent = null;

let currentCourse = null;

let currentQuizSettings = null;

let quizQuestionsList = [];

let activeQuizQuestions = [];

let studentAnswers = {};

let currentResultId = null;

let quizStarted = false;

let quizSubmitted = false;

let quizCancelled = false;

let quizSubmissionInProgress = false;

let quizLoading = false;

let quizTimerInterval = null;

let remainingSeconds = 0;

let quizTimeLimit = DEFAULT_TIME_LIMIT;

let quizStartTime = null;

let usedQuizAttempts = 0;

let maxQuizAttempts = DEFAULT_MAX_ATTEMPTS;

let isTheoryQuiz = false;


/* ================================================
   5. HELPER FUNCTIONS
================================================ */

function showQuizError(message) {

    alert(message);

}


function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        function (character) {

            const characters = {

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"

            };

            return characters[character];

        }
    );

}


function getDateValue(value) {

    if (!value) {
        return null;
    }

    if (
        value.toDate &&
        typeof value.toDate === "function"
    ) {

        return value.toDate();

    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    return date;

}


function formatTime(seconds) {

    const minutes = Math.floor(seconds / 60);

    const remaining = seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remaining).padStart(2, "0")
    );

}


function getQuestionType(question) {

    const type = String(
        question.type ||
        question.questionType ||
        "mcq"
    ).toLowerCase();

    if (
        type === "theory" ||
        type === "essay" ||
        type === "short-answer"
    ) {

        return "theory";

    }

    return "mcq";

}


function getQuestionMarks(question) {

    const marks = Number(
        question.marks ??
        question.mark ??
        question.points ??
        1
    );

    return marks > 0 ? marks : 1;

}


function shuffleArray(array) {

    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [shuffled[i], shuffled[j]] = [
            shuffled[j],
            shuffled[i]
        ];

    }

    return shuffled;

}


function getQuestionOptions(question) {

    let options = question.options || [];

    if (
        !Array.isArray(options) &&
        typeof options === "object"
    ) {

        options = Object.values(options);

    }

    if (!Array.isArray(options)) {
        return [];
    }

    return options.map(function (option) {

        if (
            typeof option === "object" &&
            option !== null
        ) {

            return (
                option.text ??
                option.value ??
                option.label ??
                ""
            );

        }

        return option;

    });

}


/* ================================================
   6. INITIAL PAGE SETUP
================================================ */

if (startQuizBtn) {

    startQuizBtn.disabled = true;

    startQuizBtn.textContent = "Loading Quiz...";

}

if (quizForm) {
    quizForm.classList.add("hidden");
}

if (quizResult) {
    quizResult.classList.add("hidden");
}

if (quizTimer) {
    quizTimer.textContent = "00:00";
}


/* ================================================
   7. VALIDATE QUIZ URL
================================================ */

if (!courseId || !quizId) {

    showQuizError(
        "Invalid quiz link. Return to your course and try again."
    );

}


/* ================================================
   8. STUDENT AUTHENTICATION
================================================ */

onAuthStateChanged(auth, async function (user) {

    if (!user) {

        alert("Please sign in to take this quiz.");

        window.location.href = "auth.html?mode=student";

        return;

    }

    try {

        const studentReference = doc(
            db,
            "students",
            user.uid
        );

        const studentSnapshot = await getDoc(
            studentReference
        );

        if (!studentSnapshot.exists()) {

            throw new Error(
                "Student profile not found."
            );

        }

        const studentData = studentSnapshot.data();

        if (studentData.role !== "student") {

            throw new Error(
                "Only registered students can take this quiz."
            );

        }

        currentStudent = {

            uid: user.uid,

            id: user.uid,

            fullName:
                studentData.fullName ||
                user.displayName ||
                "Student",

            email: user.email || ""

        };

        await loadQuizInformation();

    }

    catch (error) {

        console.error(
            "Authentication error:",
            error
        );

        showQuizError(
            error.message ||
            "Unable to verify your student account."
        );

    }

});


/* ================================================
   9. CHECK COURSE ENROLLMENT
================================================ */

async function checkStudentEnrollment() {

    const enrollmentQuery = query(

        collection(db, "enrollments"),

        where(
            "studentId",
            "==",
            currentStudent.uid
        )

    );

    const enrollmentSnapshot = await getDocs(
        enrollmentQuery
    );

    const isEnrolled = enrollmentSnapshot.docs.some(
        function (item) {

            const enrollment = item.data();

            return (
                String(enrollment.courseId) ===
                String(courseId)
            );

        }
    );

    if (!isEnrolled) {

        throw new Error(
            "You are not enrolled in this course. Enrol before taking the quiz."
        );

    }

}


/* ================================================
   10. CHECK COURSE SCHEDULE
================================================ */

function checkQuizCourseSchedule() {

    if (!currentCourse) {

        return {

            allowed: false,

            message: "Course information is unavailable."

        };

    }

    const now = new Date();

    const openingDate = getDateValue(
        currentCourse.openingDate
    );

    const closingDate = getDateValue(
        currentCourse.closingDate
    );

    if (openingDate && now < openingDate) {

        return {

            allowed: false,

            message: "This course has not opened yet."

        };

    }

    if (closingDate && now > closingDate) {

        return {

            allowed: false,

            message: "This course has closed."

        };

    }

    return {

        allowed: true,

        message: ""

    };

}


/* ================================================
   11. CHECK QUIZ AVAILABILITY
================================================ */

function checkQuizAvailability() {

    if (!currentQuizSettings) {

        throw new Error(
            "Quiz settings are not loaded. Please refresh the page."
        );

    }

    const now = new Date();

    const openingDate = getDateValue(
        currentQuizSettings.openingDateTime
    );

    const closingDate = getDateValue(
        currentQuizSettings.closingDateTime
    );

    if (openingDate && now < openingDate) {

        throw new Error(
            "This quiz has not opened yet."
        );

    }

    if (closingDate && now > closingDate) {

        throw new Error(
            "This quiz has already closed."
        );

    }

}


/* ================================================
   12. LOAD COURSE AND QUIZ INFORMATION
================================================ */

async function loadQuizInformation() {

    if (quizLoading) {
        return;
    }

    quizLoading = true;

    try {

        if (!courseId || !quizId) {

            throw new Error(
                "Invalid quiz link."
            );

        }

        // Load course.

        const courseReference = doc(
            db,
            "courses",
            courseId
        );

        const courseSnapshot = await getDoc(
            courseReference
        );

        if (!courseSnapshot.exists()) {

            throw new Error(
                "Course not found."
            );

        }

        currentCourse = {

            ...courseSnapshot.data(),

            id: courseSnapshot.id

        };

        if (
            currentCourse.published !== true &&
            currentCourse.isPublished !== true
        ) {

            throw new Error(
                "This course is not published."
            );

        }

        // Check course schedule.

        const schedule = checkQuizCourseSchedule();

        if (!schedule.allowed) {

            throw new Error(schedule.message);

        }

        // Check enrollment.

        await checkStudentEnrollment();

        // Load quiz settings.

        const settingsReference = doc(
            db,
            "quizSettings",
            quizId
        );

        const settingsSnapshot = await getDoc(
            settingsReference
        );

        if (!settingsSnapshot.exists()) {

            throw new Error(
                "Quiz settings not found."
            );

        }

        currentQuizSettings = {

            ...settingsSnapshot.data(),

            id: settingsSnapshot.id

        };

        // Verify quiz belongs to course.

        if (
            String(currentQuizSettings.courseId) !==
            String(courseId)
        ) {

            throw new Error(
                "This quiz does not belong to the selected course."
            );

        }

        if (currentQuizSettings.published !== true) {

            throw new Error(
                "This quiz is not published."
            );

        }

        // Validate quiz type.

        if (
            currentQuizSettings.type &&
            !["course", "lesson"].includes(
                currentQuizSettings.type
            )
        ) {

            throw new Error(
                "Invalid quiz type."
            );

        }

        // Check quiz schedule.

        checkQuizAvailability();

        // Load questions.

console.log("STEP 1: Loading questions...");

await loadQuizQuestions();

console.log("STEP 2: Questions loaded.");

// Load previous attempts.

console.log("STEP 3: Loading previous attempts...");

await loadQuizAttempts();

console.log("STEP 4: Previous attempts loaded.");

// Display information.

console.log("STEP 5: Displaying quiz information...");

displayQuizInformation();

console.log("STEP 6: Quiz information displayed.");

updateQuizPageTitle();

    }

    catch (error) {

        console.error(
            "Load quiz information error:",
            error
        );

        showQuizError(
            error.message ||
            "Unable to load quiz information."
        );

        if (startQuizBtn) {

            startQuizBtn.disabled = true;

        }

    }

    finally {

        quizLoading = false;

    }

}


/* ================================================
   LOAD QUIZ QUESTIONS
================================================ */

async function loadQuizQuestions() {

    console.log("Loading quiz questions...");

    console.log("Course ID:", courseId);

    console.log("Quiz ID:", quizId);

    const questionsQuery = query(
        collection(db, "quizzes"),
        where("courseId", "==", courseId)
    );

    const questionsSnapshot = await getDocs(
        questionsQuery
    );

    console.log(
        "Total questions found:",
        questionsSnapshot.size
    );

    const allQuestions = questionsSnapshot.docs.map(
        function (item) {

            return {
                ...item.data(),
                id: item.id
            };

        }
    );

    console.log("All questions:", allQuestions);

    let selectedQuestions = allQuestions.filter(
        function (question) {

            return String(question.quizId) === String(quizId);

        }
    );

    console.log(
        "Questions matching quiz ID:",
        selectedQuestions.length
    );

    if (selectedQuestions.length === 0) {

        selectedQuestions = allQuestions.filter(
            function (question) {

                return !question.quizId;

            }
        );

    }

    if (selectedQuestions.length === 0) {

        throw new Error(
            "No questions found for this quiz. Check the quiz ID saved with your questions."
        );

    }

    selectedQuestions.sort(
        function (a, b) {

            return Number(a.order || 0) -
                Number(b.order || 0);

        }
    );

    const questionLimit = Number(
        currentQuizSettings.questionLimit || 0
    );

    if (
        questionLimit > 0 &&
        questionLimit < selectedQuestions.length
    ) {

        selectedQuestions = selectedQuestions.slice(
            0,
            questionLimit
        );

    }

    quizQuestionsList = selectedQuestions;

    isTheoryQuiz = quizQuestionsList.some(
        function (question) {

            return getQuestionType(question) === "theory";

        }
    );

    console.log(
        "Final questions loaded:",
        quizQuestionsList
    );

}
/* ================================================
   14. LOAD PREVIOUS ATTEMPTS
================================================ */

async function loadQuizAttempts() {

    const resultsQuery = query(

        collection(db, "results"),

        where(
            "studentId",
            "==",
            currentStudent.uid
        )

    );

    const resultsSnapshot = await getDocs(
        resultsQuery
    );

    const previousResults = resultsSnapshot.docs.filter(
        function (item) {

            const result = item.data();

            return (
                String(result.courseId) === String(courseId) &&
                String(result.quizId) === String(quizId)
            );

        }
    );

    usedQuizAttempts = previousResults.length;

    maxQuizAttempts = Number(
        currentQuizSettings.maxAttempts ||
        DEFAULT_MAX_ATTEMPTS
    );

    if (maxQuizAttempts < 1) {

        maxQuizAttempts = DEFAULT_MAX_ATTEMPTS;

    }

    if (usedQuizAttempts >= maxQuizAttempts) {

        throw new Error(
            "You have used all " +
            maxQuizAttempts +
            " attempts allowed for this quiz."
        );

    }

}


/* ================================================
   15. DISPLAY QUIZ INFORMATION
================================================ */

function displayQuizInformation() {

    if (quizTitle) {

        quizTitle.textContent =
            currentQuizSettings.title ||
            currentCourse.title ||
            "Course Quiz";

    }

    if (quizDescription) {

        quizDescription.textContent =
            currentQuizSettings.description ||
            "Complete the questions below.";

    }

    if (questionCount) {

        questionCount.textContent =
            quizQuestionsList.length + " Questions";

    }

    if (attemptInformation) {

        attemptInformation.textContent =
            "Attempts used: " +
            usedQuizAttempts +
            " of " +
            maxQuizAttempts;

    }

    if (quizInstructions) {

        quizInstructions.textContent =
            currentQuizSettings.instructions ||
            "Read each question carefully before answering.";

    }

    if (quizTimer) {

        quizTimer.textContent = formatTime(
            Number(
                currentQuizSettings.timeLimitMinutes ||
                DEFAULT_TIME_LIMIT
            ) * 60
        );

    }

    if (startQuizBtn) {

        startQuizBtn.disabled = false;

        startQuizBtn.textContent = "Start Quiz";

    }

}

/* ================================================
   16. START QUIZ BUTTON
================================================ */

if (startQuizBtn) {

    startQuizBtn.type = "button";

    startQuizBtn.addEventListener("click", async function (event) {

        event.preventDefault();

        console.log("START QUIZ BUTTON CLICKED");

        if (quizStarted || quizSubmitted || quizLoading) {
            return;
        }

        if (
            !currentStudent ||
            !currentCourse ||
            !currentQuizSettings ||
            quizQuestionsList.length === 0
        ) {

            showQuizError(
                "Quiz information is not ready. Please wait or refresh the page."
            );

            console.log("Quiz information:", {
                student: currentStudent,
                course: currentCourse,
                settings: currentQuizSettings,
                questions: quizQuestionsList.length
            });

            return;
        }

        const confirmed = confirm(
            "Are you ready to start this examination?\n\nYour examination time will begin immediately."
        );

        if (!confirmed) {
            return;
        }

        startQuizBtn.disabled = true;
        startQuizBtn.textContent = "Starting...";

        await startQuiz();

    });

}
/* ================================================
   17. START EXAMINATION
================================================ */

async function startQuiz() {

    if (quizStarted || quizSubmitted) {
        return;
    }

    try {

        if (!currentQuizSettings) {

            throw new Error(
                "Quiz settings are not ready."
            );

        }

        // Check quiz availability.

        checkQuizAvailability();

        // Check course schedule.

        const schedule = checkQuizCourseSchedule();

        if (!schedule.allowed) {

            throw new Error(schedule.message);

        }

        // Check attempt limit again.

        await loadQuizAttempts();

        // Prepare questions.

         activeQuizQuestions = [
            ...quizQuestionsList
        ];

        if (currentQuizSettings.shuffleQuestions === true) {

            activeQuizQuestions = shuffleArray(
                activeQuizQuestions
            );

        }

        // Prepare options.

        activeQuizQuestions = activeQuizQuestions.map(
            function (question) {

                const preparedQuestion = {
                    ...question
                };

                const options = getQuestionOptions(
                    question
                );

                if (
                    currentQuizSettings.shuffleOptions === true &&
                    getQuestionType(question) === "mcq"
                ) {

                    preparedQuestion.displayOptions =
                        shuffleArray(options);

                } else {

                    preparedQuestion.displayOptions = options;

                }

                return preparedQuestion;

            }
        );

        // Set time.

        quizTimeLimit = Number(
            currentQuizSettings.timeLimitMinutes ||
            DEFAULT_TIME_LIMIT
        );

        remainingSeconds = quizTimeLimit * 60;

        quizStartTime = new Date();

        studentAnswers = {};

        // Create result record.

        const resultData = {

            studentId: currentStudent.uid,

            studentName: currentStudent.fullName,

            studentEmail: currentStudent.email,

            courseId: courseId,

            courseTitle:
                currentCourse.title ||
                currentCourse.courseTitle ||
                "",

            quizId: quizId,

            quizTitle:
                currentQuizSettings.title ||
                "Course Quiz",

            quizType:
                currentQuizSettings.type ||
                "course",

            attemptNumber: usedQuizAttempts + 1,

            status: "inProgress",

            startedAt: serverTimestamp(),

            score: 0,

            totalMarks: 0,

            percentage: 0,

            passed: false

        };

        const resultReference = await addDoc(
            collection(db, "results"),
            resultData
        );

        currentResultId = resultReference.id;

        // Mark quiz as started.

        quizStarted = true;

        quizSubmitted = false;

        quizCancelled = false;

        usedQuizAttempts++;

        // Display questions.

        displayExaminationQuestions();

        // Update page.

        if (quizInstructions) {

            quizInstructions.classList.add("hidden");

        }

        if (startQuizBtn) {

            startQuizBtn.classList.add("hidden");

        }

        if (quizForm) {

            quizForm.classList.remove("hidden");

        }

        if (quizResult) {

            quizResult.classList.add("hidden");

        }

        if (attemptInformation) {

            attemptInformation.textContent =
                "Attempt " +
                usedQuizAttempts +
                " of " +
                maxQuizAttempts;

        }

        // Create cancellation button.

        createCancelButton();

        // Start timer.

        startQuizTimer();

    }

    catch (error) {

        console.error(
            "Start quiz error:",
            error
        );

        showQuizError(
            error.message ||
            "Unable to start the examination."
        );

        if (startQuizBtn) {

            startQuizBtn.disabled = false;

            startQuizBtn.textContent = "Start Quiz";

        }

    }

}


/* ================================================
   18. DISPLAY EXAMINATION QUESTIONS
================================================ */

function displayExaminationQuestions() {

    console.log("Displaying examination questions...");

    console.log("Questions:", activeQuizQuestions.length);

    console.log("Question container:", quizQuestions);

    if (!quizQuestions) {

        console.error("quizQuestions element was not found.");

        throw new Error("Question container is missing from quiz.html.");

    }

    quizQuestions.innerHTML = "";

    activeQuizQuestions.forEach(function (question, index) {

        const questionCard = document.createElement("div");

        questionCard.className = "question-card";

        const questionText =
            question.question ||
            question.questionText ||
            question.title ||
            "Question " + (index + 1);

        const marks = getQuestionMarks(question);

        let questionHTML = `
            <div class="question-heading">
                <h3>Question ${index + 1}</h3>
                <span>${marks} Mark(s)</span>
            </div>

            <p class="question-text">
                ${escapeHTML(questionText)}
            </p>
        `;

        if (getQuestionType(question) === "theory") {

            questionHTML += `
                <textarea
                    class="theory-answer"
                    id="answer-${index}"
                    data-question-id="${escapeHTML(question.id)}"
                    placeholder="Type your answer here..."
                    rows="6"
                ></textarea>
            `;

        } else {

            const options = question.displayOptions || [];

            if (options.length === 0) {

                questionHTML += `
                    <p>No options available for this question.</p>
                `;

            } else {

                questionHTML += `<div class="quiz-options">`;

                options.forEach(function (option, optionIndex) {

                    const optionText = String(option);

                    const optionId =
                        "question-" + index + "-option-" + optionIndex;

                    questionHTML += `
                        <label class="quiz-option" for="${optionId}">
                            <input
                                type="radio"
                                id="${optionId}"
                                name="question-${index}"
                                value="${escapeHTML(optionText)}"
                                data-question-id="${escapeHTML(question.id)}"
                            >

                            <span>${escapeHTML(optionText)}</span>
                        </label>
                    `;

                });

                questionHTML += `</div>`;

            }

        }

        questionCard.innerHTML = questionHTML;

        quizQuestions.appendChild(questionCard);

    });

    quizQuestions.querySelectorAll('input[type="radio"]').forEach(
        function (radio) {

            radio.addEventListener("change", function () {

                studentAnswers[radio.dataset.questionId] = radio.value;

            });

        }
    );

    quizQuestions.querySelectorAll(".theory-answer").forEach(
        function (textarea) {

            textarea.addEventListener("input", function () {

                studentAnswers[textarea.dataset.questionId] =
                    textarea.value;

            });

        }
    );

    console.log(
        "Successfully rendered question cards:",
        quizQuestions.children.length
    );

}
/* ================================================
   19. COLLECT STUDENT ANSWERS
================================================ */

function collectStudentAnswers() {

    const answers = {};

    activeQuizQuestions.forEach(
        function (question) {

            const questionId = question.id;

            answers[questionId] =
                studentAnswers[questionId] || "";

        }
    );

    return answers;

}


/* ================================================
   20. QUIZ TIMER
================================================ */

function startQuizTimer() {

    clearInterval(quizTimerInterval);

    if (quizTimer) {

        quizTimer.textContent = formatTime(
            remainingSeconds
        );

    }

    quizTimerInterval = setInterval(
        function () {

            if (!quizStarted || quizSubmitted) {

                clearInterval(quizTimerInterval);

                return;

            }

            remainingSeconds--;

            if (quizTimer) {

                quizTimer.textContent = formatTime(
                    Math.max(remainingSeconds, 0)
                );

            }

            if (remainingSeconds === 60) {

                alert(
                    "One minute remaining!"
                );

            }

            if (remainingSeconds <= 0) {

                clearInterval(quizTimerInterval);

                alert(
                    "Your examination time has expired. Your answers will be submitted automatically."
                );

                submitQuiz(true);

            }

        },
        1000
    );

}


/* ================================================
   21. GET CORRECT ANSWER
================================================ */

function getCorrectAnswer(question) {

    return (

        question.correctAnswer ??

        question.answer ??

        question.correctOption ??

        question.correct ??

        ""

    );

}


/* ================================================
   22. CHECK ANSWER
================================================ */

function normalizeAnswer(answer) {

    if (answer === null || answer === undefined) {
        return "";
    }

    if (typeof answer === "object") {

        answer =
            answer.text ??
            answer.value ??
            answer.label ??
            "";

    }

    return String(answer)
        .trim()
        .toLowerCase();

}


function isAnswerCorrect(question, studentAnswer) {

    if (!studentAnswer) {
        return false;
    }

    if (getQuestionType(question) === "theory") {
        return false;
    }

    const correctAnswer = getCorrectAnswer(
        question
    );

    const student = normalizeAnswer(
        studentAnswer
    );

    const correct = normalizeAnswer(
        correctAnswer
    );

    if (!correct) {
        return false;
    }

    // Direct answer comparison.

    if (student === correct) {
        return true;
    }

    // Support correct answers saved as option indexes.

    const options = getQuestionOptions(question);

    const correctIndex = Number(correctAnswer);

    if (
        Number.isInteger(correctIndex) &&
        correctIndex >= 0 &&
        correctIndex < options.length
    ) {

        return (
            student === normalizeAnswer(
                options[correctIndex]
            )
        );

    }

    return false;

}


/* ================================================
   23. GRADE EXAMINATION
================================================ */

function gradeExamination() {

    const answers = collectStudentAnswers();

    let score = 0;

    let totalMarks = 0;

    let theoryQuestions = 0;

    let unansweredQuestions = 0;

    let automaticallyGradedQuestions = 0;

    activeQuizQuestions.forEach(
        function (question) {

            const questionId = question.id;

            const studentAnswer = answers[questionId];

            const marks = getQuestionMarks(
                question
            );

            const questionType = getQuestionType(
                question
            );

            totalMarks += marks;

            if (
                !studentAnswer ||
                !String(studentAnswer).trim()
            ) {

                unansweredQuestions++;

            }

            // Theory questions.

         if (questionType === "theory") {

    theoryQuestions++;

} else {

    const correct = isAnswerCorrect(
        question,
        studentAnswer
    );

    automaticallyGradedQuestions++;

    if (correct) {
        score += marks;
    }

}

            // Automatically grade MCQ.

            const correct = isAnswerCorrect(
                question,
                studentAnswer
            );

            automaticallyGradedQuestions++;

            if (correct) {

                score += marks;

            }

        }
    );

    const percentage = totalMarks > 0

        ? Math.round(
            (score / totalMarks) * 100
        )

        : 0;

    const gradingStatus = theoryQuestions > 0
        ? "pending"
        : "completed";

    const passed =
        theoryQuestions === 0 &&
        percentage >= PASS_MARK;

    return {

        answers: answers,

        score: score,

        totalMarks: totalMarks,

        percentage: percentage,

        passed: passed,

        theoryQuestions: theoryQuestions,

        unansweredQuestions: unansweredQuestions,

        automaticallyGradedQuestions:
            automaticallyGradedQuestions,

        gradingStatus: gradingStatus

    };

}


/* ================================================
   24. SUBMIT BUTTON
================================================ */

if (submitQuizBtn) {

    submitQuizBtn.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            submitQuiz(false);

        }
    );

}


/* ================================================
   25. SUBMIT EXAMINATION
================================================ */

async function submitQuiz(isTimeExpired = false) {

    if (
        !quizStarted ||
        quizSubmitted ||
        quizSubmissionInProgress
    ) {

        return;

    }

    if (!currentResultId) {

        showQuizError(
            "Your examination record could not be found."
        );

        return;

    }

    if (!isTimeExpired) {

        const confirmed = confirm(
            "Are you sure you want to submit your examination?"
        );

        if (!confirmed) {
            return;
        }

    }

    quizSubmissionInProgress = true;

    if (submitQuizBtn) {

        submitQuizBtn.disabled = true;

        submitQuizBtn.textContent = "Submitting...";

    }

    try {

        clearInterval(quizTimerInterval);

        const grading = gradeExamination();

        const timeUsed = Math.floor(
            (Date.now() - quizStartTime.getTime()) / 1000
        );

        const resultReference = doc(
            db,
            "results",
            currentResultId
        );

        await updateDoc(
            resultReference,
            {

                answers: grading.answers,

                score: grading.score,

                totalMarks: grading.totalMarks,

                percentage: grading.percentage,

                passed: grading.passed,

                theoryQuestions:
                    grading.theoryQuestions,

                unansweredQuestions:
                    grading.unansweredQuestions,

                automaticallyGradedQuestions:
                    grading.automaticallyGradedQuestions,

                gradingStatus:
                    grading.gradingStatus,

                status: "submitted",

                timeUsed: timeUsed,

                timeExpired: isTimeExpired,

                submittedAt: serverTimestamp()

            }
        );

        quizSubmitted = true;

        quizStarted = false;

        quizSubmissionInProgress = false;

        displayQuizResult(
            grading,
            isTimeExpired
        );

    }

    catch (error) {

        console.error(
            "Submit quiz error:",
            error
        );

        quizSubmissionInProgress = false;

        if (submitQuizBtn) {

            submitQuizBtn.disabled = false;

            submitQuizBtn.textContent =
                "Submit Examination";

        }

        showQuizError(
            "Unable to submit your examination. Please try again.\n\n" +
            error.message
        );

    }

}


/* ================================================
   26. DISPLAY QUIZ RESULT
================================================ */

function displayQuizResult(grading, isTimeExpired) {

    if (quizForm) {
        quizForm.classList.add("hidden");
    }

    if (quizInstructions) {
        quizInstructions.classList.add("hidden");
    }

    if (quizResult) {
        quizResult.classList.remove("hidden");
    }

    if (quizTimer) {
        quizTimer.textContent = "Submitted";
    }

    if (resultMessage) {

        if (grading.gradingStatus === "pending") {

            resultMessage.textContent =
                "Your examination has been submitted. Theory answers are awaiting manual grading.";

        }

        else if (grading.passed) {

            resultMessage.textContent =
                "Congratulations! You passed this examination.";

        }

        else {

            resultMessage.textContent =
                "You did not reach the required pass mark. Keep studying and try again if you have attempts remaining.";

        }

    }

    if (resultDetails) {

        resultDetails.innerHTML = `

            <div class="result-item">

                <strong>Course:</strong>

                <span>
                    ${escapeHTML(
                        currentCourse.title ||
                        currentCourse.courseTitle ||
                        "Course"
                    )}
                </span>

            </div>

            <div class="result-item">

                <strong>Quiz:</strong>

                <span>
                    ${escapeHTML(
                        currentQuizSettings.title ||
                        "Course Quiz"
                    )}
                </span>

            </div>

            <div class="result-item">

                <strong>Score:</strong>

                <span>
                    ${grading.score} / ${grading.totalMarks}
                </span>

            </div>

            <div class="result-item">

                <strong>Percentage:</strong>

                <span>
                    ${grading.percentage}%
                </span>

            </div>

            <div class="result-item">

                <strong>Pass Mark:</strong>

                <span>
                    ${PASS_MARK}%
                </span>

            </div>

            <div class="result-item">

                <strong>Unanswered Questions:</strong>

                <span>
                    ${grading.unansweredQuestions}
                </span>

            </div>

            <div class="result-item">

                <strong>Theory Questions:</strong>

                <span>
                    ${grading.theoryQuestions}
                </span>

            </div>

            <div class="result-item">

                <strong>Grading Status:</strong>

                <span>
                    ${grading.gradingStatus === "pending"
                        ? "Awaiting Manual Grading"
                        : "Completed"}
                </span>

            </div>

            <div class="result-item">

                <strong>Submission:</strong>

                <span>
                    ${isTimeExpired
                        ? "Automatically Submitted"
                        : "Submitted by Student"}
                </span>

            </div>

        `;

    }

    if (submitQuizBtn) {

        submitQuizBtn.disabled = true;

    }

    if (attemptInformation) {

        attemptInformation.textContent =
            "Attempts used: " +
            usedQuizAttempts +
            " of " +
            maxQuizAttempts;

    }

}


/* ================================================
   27. CANCEL EXAMINATION
================================================ */

async function cancelQuiz() {

    if (
        !quizStarted ||
        quizSubmitted ||
        quizSubmissionInProgress
    ) {

        return;

    }

    const confirmed = confirm(
        "Are you sure you want to cancel this examination?\n\nThis attempt will be counted."
    );

    if (!confirmed) {
        return;
    }

    try {

        clearInterval(quizTimerInterval);

        quizSubmissionInProgress = true;

        const resultReference = doc(
            db,
            "results",
            currentResultId
        );

        await updateDoc(
            resultReference,
            {

                status: "cancelled",

                cancelled: true,

                cancelledAt: serverTimestamp(),

                answers: collectStudentAnswers(),

                timeUsed: Math.floor(
                    (Date.now() - quizStartTime.getTime()) / 1000
                )

            }
        );

        quizCancelled = true;

        quizSubmitted = true;

        quizStarted = false;

        quizSubmissionInProgress = false;

        alert(
            "Your examination has been cancelled. This attempt has been counted."
        );

        window.location.href =
            "course.html?id=" +
            encodeURIComponent(courseId);

    }

    catch (error) {

        console.error(
            "Cancel quiz error:",
            error
        );

        quizSubmissionInProgress = false;

        showQuizError(
            "Unable to cancel examination: " +
            error.message
        );

        startQuizTimer();

    }

}


/* ================================================
   28. CREATE CANCEL BUTTON
================================================ */

function createCancelButton() {

    if (!quizForm) {
        return;
    }

    if (document.getElementById("cancelQuizBtn")) {
        return;
    }

    const cancelButton =
        document.createElement("button");

    cancelButton.type = "button";

    cancelButton.id = "cancelQuizBtn";

    cancelButton.className = "cancel-quiz-button";

    cancelButton.textContent = "Cancel Examination";

    cancelButton.addEventListener(
        "click",
        cancelQuiz
    );

    quizForm.appendChild(cancelButton);

}


/* ================================================
   29. PREVENT ACCIDENTAL PAGE EXIT
================================================ */

window.addEventListener(
    "beforeunload",
    function (event) {

        if (quizStarted && !quizSubmitted) {

            event.preventDefault();

            event.returnValue = "";

        }

    }
);


/* ================================================
   30. BROWSER BACK BUTTON PROTECTION
================================================ */

history.pushState(
    null,
    "",
    window.location.href
);

window.addEventListener(
    "popstate",
    function () {

        if (quizStarted && !quizSubmitted) {

            history.pushState(
                null,
                "",
                window.location.href
            );

            alert(
                "You cannot leave during the examination. Use the Cancel Examination button if you want to cancel."
            );

        }

    }
);


/* ================================================
   31. UPDATE PAGE TITLE
================================================ */

function updateQuizPageTitle() {

    if (
        currentQuizSettings &&
        currentQuizSettings.title
    ) {

        document.title =
            currentQuizSettings.title +
            " | LearnSphere";

    }

}


/* ================================================
   32. FINAL PAGE SETUP
================================================ */

document.addEventListener(
    "DOMContentLoaded",
    function () {

        if (quizForm) {

            quizForm.classList.add("hidden");

        }

        if (quizResult) {

            quizResult.classList.add("hidden");

        }

    }
);


/* ================================================
   END OF LEARNSPHERE QUIZ.JS
================================================ */