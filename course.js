// ========================================
// LEARNSPHERE COURSE LEARNING SYSTEM
// ========================================


// ========================================
// 1. GET HTML ELEMENTS
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
// 2. LOCAL STORAGE KEYS
// ========================================

const COURSES_KEY = "learnsphereCourses";
const LESSONS_KEY = "learnsphereLessons";
const QUIZZES_KEY = "learnsphereQuizzes";
const ENROLLMENTS_KEY = "learnsphereEnrollments";
const CURRENT_STUDENT_KEY = "learnsphereCurrentStudent";
const COMPLETED_LESSONS_KEY = "learnsphereCompletedLessons";
const RESULTS_KEY = "learnsphereResults";
const CERTIFICATES_KEY = "learnsphereCertificates";


// ========================================
// 3. GET DATA FROM LOCAL STORAGE
// ========================================

function getSavedData(key) {

    const data = localStorage.getItem(key);

    try {

        return data ? JSON.parse(data) : [];

    } catch (error) {

        console.error("Error reading local storage:", error);

        return [];

    }

}


// ========================================
// 4. GET COURSE ID FROM URL
// ========================================

const urlParameters = new URLSearchParams(window.location.search);

const courseId = urlParameters.get("id");


// ========================================
// 5. GET CURRENT STUDENT
// ========================================

const currentStudentData = localStorage.getItem(CURRENT_STUDENT_KEY);

let currentStudent = null;

if (currentStudentData) {

    try {

        currentStudent = JSON.parse(currentStudentData);

    } catch (error) {

        currentStudent = null;

    }

}


// ========================================
// 6. CHECK STUDENT LOGIN
// ========================================

if (!currentStudent) {

    alert("Please log in to access your course.");

    window.location.href = "auth.html?mode=login";

}


// ========================================
// 7. COURSE AND QUIZ VARIABLES
// ========================================

let currentCourse = null;

let courseLessons = [];

let courseQuizzes = [];

let currentLessonIndex = 0;

let currentQuestionIndex = 0;

let studentAnswers = {};

let quizSubmitted = false;


// TIMER VARIABLES

let quizTimer = null;

let remainingTime = 0;

let quizStartTime = null;

let quizTimerDisplay = null;


// CERTIFICATE SETTINGS

const CERTIFICATE_PASS_MARK = 70;

const CERTIFICATE_FOUNDER_NAME = "AKINTAYO IBRAHIM";


// Each question gets 30 seconds.

const SECONDS_PER_QUESTION = 30;


// ========================================
// 8. CHECK STUDENT ENROLLMENT
// ========================================

function isStudentEnrolled() {

    const enrollments = getSavedData(ENROLLMENTS_KEY);

    return enrollments.some(function (enrollment) {

        return (

            String(enrollment.studentId) === String(currentStudent.id) &&

            String(enrollment.courseId) === String(courseId)

        );

    });

}


// ========================================
// 9. LOAD COURSE
// ========================================

function loadCourse() {

    if (!courseId) {

        alert("No course was selected.");

        window.location.href = "student-dashboard.html";

        return;

    }


    const courses = getSavedData(COURSES_KEY);

    currentCourse = courses.find(function (course) {

        return String(course.id) === String(courseId);

    });


    if (!currentCourse || currentCourse.published !== true) {

        alert("This course is unavailable.");

        window.location.href = "student-dashboard.html";

        return;

    }


    if (!isStudentEnrolled()) {

        alert("You must enrol in this course before accessing it.");

        window.location.href = "courses.html";

        return;

    }


    // DISPLAY COURSE INFORMATION

    courseTitle.textContent = currentCourse.title;

    courseDescription.textContent = currentCourse.description || "";

    courseDepartment.innerHTML =

        '<i class="fa-solid fa-building"></i> ' +

        escapeHTML(currentCourse.department || "General");


    courseLevel.innerHTML =

        '<i class="fa-solid fa-graduation-cap"></i> ' +

        escapeHTML(currentCourse.level || "All Levels");


    // GET COURSE LESSONS

    const allLessons = getSavedData(LESSONS_KEY);

    courseLessons = allLessons.filter(function (lesson) {

        return String(lesson.courseId) === String(courseId);

    });


    // GET COURSE QUIZZES

    const allQuizzes = getSavedData(QUIZZES_KEY);

    courseQuizzes = allQuizzes.filter(function (quiz) {

        return String(quiz.courseId) === String(courseId);

    });


    displayLessons();

    updateProgress();


    if (courseLessons.length > 0) {

        showLesson(0);

    } else {

        lessonList.innerHTML =

            "<p>No lessons have been added to this course yet.</p>";

    }

}


// ========================================
// 10. DISPLAY LESSON LIST
// ========================================

function displayLessons() {

    lessonList.innerHTML = "";

    const completedLessons = getSavedData(COMPLETED_LESSONS_KEY);


    courseLessons.forEach(function (lesson, index) {

        const isCompleted = completedLessons.some(function (item) {

            return (

                String(item.studentId) === String(currentStudent.id) &&

                String(item.courseId) === String(courseId) &&

                String(item.lessonId) === String(lesson.id)

            );

        });


        const lessonButton = document.createElement("button");

        lessonButton.type = "button";

        lessonButton.className = "lesson-item";


        if (isCompleted) {

            lessonButton.classList.add("completed");

        }


        if (index === currentLessonIndex) {

            lessonButton.classList.add("active");

        }


        lessonButton.innerHTML = `

            <i class="fa-solid fa-book-open"></i>

            <span>${index + 1}. ${escapeHTML(lesson.title)}</span>

            <i class="fa-solid ${isCompleted ? "fa-circle-check lesson-status" : "fa-circle lesson-status"}"></i>

        `;


        lessonButton.addEventListener("click", function () {

            showLesson(index);

        });


        lessonList.appendChild(lessonButton);

    });

}


// ========================================
// 11. SHOW SELECTED LESSON
// ========================================

function showLesson(index) {

    if (index < 0 || index >= courseLessons.length) {

        return;

    }


    currentLessonIndex = index;

    const lesson = courseLessons[index];


    welcomeMessage.classList.add("hidden");

    quizArea.classList.add("hidden");

    lessonArea.classList.remove("hidden");


    lessonTitle.textContent = lesson.title;

    lessonDescription.textContent = lesson.description || "";

    lessonContent.textContent = lesson.content || "No lesson content available.";


    // DISPLAY VIDEO

    if (lesson.video) {

        videoArea.classList.remove("hidden");

        videoLink.href = lesson.video;

    } else {

        videoArea.classList.add("hidden");

    }


    // DISPLAY PDF

    const lessonPDF = lesson.pdf || lesson.pdfData;

    if (lessonPDF) {

        pdfArea.classList.remove("hidden");

        pdfLink.href = lessonPDF;

        pdfLink.download = lesson.pdfName || "Lesson-Material.pdf";

    } else {

        pdfArea.classList.add("hidden");

    }


    // UPDATE LESSON BUTTONS

    previousLessonBtn.disabled = index === 0;

    nextLessonBtn.disabled = index === courseLessons.length - 1;


    // CHECK COMPLETION STATUS

    const completedLessons = getSavedData(COMPLETED_LESSONS_KEY);

    const alreadyCompleted = completedLessons.some(function (item) {

        return (

            String(item.studentId) === String(currentStudent.id) &&

            String(item.courseId) === String(courseId) &&

            String(item.lessonId) === String(lesson.id)

        );

    });


    if (alreadyCompleted) {

        completeLessonBtn.textContent = "Completed ✓";

        completeLessonBtn.disabled = true;

    } else {

        completeLessonBtn.innerHTML =

            'Mark as Completed <i class="fa-solid fa-check"></i>';

        completeLessonBtn.disabled = false;

    }


    displayLessons();

    updateProgress();

}


// ========================================
// 12. MARK LESSON AS COMPLETED
// ========================================

function completeLesson() {

    const lesson = courseLessons[currentLessonIndex];

    if (!lesson) {

        return;

    }


    const completedLessons = getSavedData(COMPLETED_LESSONS_KEY);


    const alreadyCompleted = completedLessons.some(function (item) {

        return (

            String(item.studentId) === String(currentStudent.id) &&

            String(item.courseId) === String(courseId) &&

            String(item.lessonId) === String(lesson.id)

        );

    });


    if (alreadyCompleted) {

        return;

    }


    const completedLesson = {

        id: Date.now(),

        studentId: currentStudent.id,

        courseId: currentCourse.id,

        lessonId: lesson.id,

        completedAt: new Date().toISOString()

    };


    completedLessons.push(completedLesson);


    localStorage.setItem(

        COMPLETED_LESSONS_KEY,

        JSON.stringify(completedLessons)

    );


    alert("Lesson marked as completed!");


    displayLessons();

    updateProgress();

    showLesson(currentLessonIndex);


    // CHECK CERTIFICATE ELIGIBILITY

    checkCourseCompletionAndIssueCertificate();

}


// ========================================
// 13. UPDATE LEARNING PROGRESS
// ========================================

function updateProgress() {

    const completedLessons = getSavedData(COMPLETED_LESSONS_KEY);


    const studentCompletedLessons = completedLessons.filter(function (item) {

        return (

            String(item.studentId) === String(currentStudent.id) &&

            String(item.courseId) === String(courseId)

        );

    });


    const totalLessons = courseLessons.length;

    const completedCount = studentCompletedLessons.length;


    let percentage = 0;


    if (totalLessons > 0) {

        percentage = Math.round(

            (completedCount / totalLessons) * 100

        );

    }


    progressPercentage.textContent = percentage + "%";

    progressFill.style.width = percentage + "%";

}


// ========================================
// 14. PREVIOUS LESSON
// ========================================

previousLessonBtn.addEventListener("click", function () {

    showLesson(currentLessonIndex - 1);

});


// ========================================
// 15. NEXT LESSON
// ========================================

nextLessonBtn.addEventListener("click", function () {

    showLesson(currentLessonIndex + 1);

});


// ========================================
// 16. COMPLETE LESSON BUTTON
// ========================================

completeLessonBtn.addEventListener("click", function () {

    completeLesson();

});


// ========================================
// 17. CREATE TIMER DISPLAY
// ========================================

function createTimerDisplay() {

    if (quizTimerDisplay) {

        return;

    }


    const quizHeading = quizArea.querySelector(".quiz-heading");

    if (!quizHeading) {

        return;

    }


    quizTimerDisplay = document.createElement("div");

    quizTimerDisplay.id = "quizTimerDisplay";

    quizTimerDisplay.style.padding = "15px";

    quizTimerDisplay.style.margin = "15px 0";

    quizTimerDisplay.style.backgroundColor = "#eef2ff";

    quizTimerDisplay.style.borderRadius = "10px";

    quizTimerDisplay.style.fontWeight = "bold";

    quizTimerDisplay.style.textAlign = "center";

    quizTimerDisplay.style.fontSize = "18px";


    quizHeading.after(quizTimerDisplay);

}


// ========================================
// 18. FORMAT TIMER
// ========================================

function formatTime(seconds) {

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return (

        String(minutes).padStart(2, "0") +

        ":" +

        String(remainingSeconds).padStart(2, "0")

    );

}


// ========================================
// 19. UPDATE TIMER DISPLAY
// ========================================

function updateTimerDisplay() {

    if (!quizTimerDisplay) {

        return;

    }


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


// ========================================
// 20. START QUIZ TIMER
// ========================================

function startQuizTimer() {

    stopQuizTimer();


    remainingTime = courseQuizzes.length * SECONDS_PER_QUESTION;

    quizStartTime = Date.now();


    createTimerDisplay();

    updateTimerDisplay();


    quizTimer = setInterval(function () {

        const elapsedSeconds = Math.floor(

            (Date.now() - quizStartTime) / 1000

        );


        remainingTime = Math.max(

            0,

            (courseQuizzes.length * SECONDS_PER_QUESTION) - elapsedSeconds

        );


        updateTimerDisplay();


        if (remainingTime <= 0) {

            stopQuizTimer();

            submitQuiz(true);

        }

    }, 1000);

}


// ========================================
// 21. STOP QUIZ TIMER
// ========================================

function stopQuizTimer() {

    if (quizTimer) {

        clearInterval(quizTimer);

        quizTimer = null;

    }

}


// ========================================
// 22. OPEN COURSE QUIZ
// ========================================

openQuizBtn.addEventListener("click", function () {

    if (courseQuizzes.length === 0) {

        alert("No quiz has been added to this course yet.");

        return;

    }


    lessonArea.classList.add("hidden");

    welcomeMessage.classList.add("hidden");

    quizArea.classList.remove("hidden");


    currentQuestionIndex = 0;

    studentAnswers = {};

    quizSubmitted = false;


    quizResult.classList.add("hidden");

    quizQuestions.innerHTML = "";


    submitQuizBtn.disabled = false;

    submitQuizBtn.classList.add("hidden");


    startQuizTimer();

    displayQuiz();

});


// ========================================
// 23. CREATE QUIZ NAVIGATION
// ========================================

function createQuizNavigation() {

    let navigation = document.getElementById("quizNavigation");


    if (!navigation) {

        navigation = document.createElement("div");

        navigation.id = "quizNavigation";

        navigation.style.display = "flex";

        navigation.style.justifyContent = "space-between";

        navigation.style.alignItems = "center";

        navigation.style.gap = "15px";

        navigation.style.marginTop = "25px";

        navigation.style.flexWrap = "wrap";


        quizQuestions.after(navigation);

    }


    navigation.innerHTML = `

        <button type="button" id="previousQuestionBtn">

            <i class="fa-solid fa-arrow-left"></i>

            Previous

        </button>


        <span id="questionCounter"></span>


        <button type="button" id="nextQuestionBtn">

            Next

            <i class="fa-solid fa-arrow-right"></i>

        </button>

    `;


    document.getElementById("previousQuestionBtn")

        .addEventListener("click", previousQuestion);


    document.getElementById("nextQuestionBtn")

        .addEventListener("click", nextQuestion);

}


// ========================================
// 24. DISPLAY ONE QUIZ QUESTION
// ========================================

function displayQuiz() {

    quizQuestions.innerHTML = "";

    quizResult.classList.add("hidden");


    if (courseQuizzes.length === 0) {

        quizQuestions.innerHTML = "<p>No quiz questions available.</p>";

        return;

    }


    const quiz = courseQuizzes[currentQuestionIndex];

    const questionBox = document.createElement("div");

    questionBox.className = "quiz-question";


    let optionsHTML = "";

    const optionLetters = ["A", "B", "C", "D"];


    optionLetters.forEach(function (option, index) {

        // ADMIN SAVES OPTIONS AS AN ARRAY

        const optionText = Array.isArray(quiz.options)

            ? quiz.options[index]

            : quiz.options[option];


        if (optionText === undefined || optionText === null || optionText === "") {

            return;

        }


        const isSelected = studentAnswers[quiz.id] === option;


        optionsHTML += `

            <label class="quiz-option">

                <input

                    type="radio"

                    name="question-${quiz.id}"

                    value="${option}"

                    ${isSelected ? "checked" : ""}

                >

                <span>

                    ${option}. ${escapeHTML(optionText)}

                </span>

            </label>

        `;

    });


    questionBox.innerHTML = `

        <h3>

            Question ${currentQuestionIndex + 1}

            of ${courseQuizzes.length}

        </h3>


        <p>

            ${escapeHTML(quiz.question)}

        </p>


        ${optionsHTML}

    `;


    quizQuestions.appendChild(questionBox);


    const radioButtons = quizQuestions.querySelectorAll(

        'input[type="radio"]'

    );


    radioButtons.forEach(function (radio) {

        radio.addEventListener("change", function () {

            studentAnswers[quiz.id] = radio.value;

        });

    });


    createQuizNavigation();

    updateQuizNavigation();

}


// ========================================
// 25. UPDATE QUIZ NAVIGATION
// ========================================

function updateQuizNavigation() {

    const previousButton = document.getElementById("previousQuestionBtn");

    const nextButton = document.getElementById("nextQuestionBtn");

    const questionCounter = document.getElementById("questionCounter");


    questionCounter.textContent =

        "Question " + (currentQuestionIndex + 1) +

        " of " + courseQuizzes.length;


    previousButton.disabled = currentQuestionIndex === 0;


    const isLastQuestion =

        currentQuestionIndex === courseQuizzes.length - 1;


    if (isLastQuestion) {

        nextButton.classList.add("hidden");

        submitQuizBtn.classList.remove("hidden");

        submitQuizBtn.disabled = false;

    } else {

        nextButton.classList.remove("hidden");

        submitQuizBtn.classList.add("hidden");

    }

}


// ========================================
// 26. PREVIOUS QUESTION
// ========================================

function previousQuestion() {

    if (quizSubmitted) {

        return;

    }


    if (currentQuestionIndex > 0) {

        currentQuestionIndex--;

        displayQuiz();

    }

}


// ========================================
// 27. NEXT QUESTION
// ========================================

function nextQuestion() {

    if (quizSubmitted) {

        return;

    }


    const currentQuiz = courseQuizzes[currentQuestionIndex];


    if (!studentAnswers[currentQuiz.id]) {

        alert("Please select an answer before continuing.");

        return;

    }


    if (currentQuestionIndex < courseQuizzes.length - 1) {

        currentQuestionIndex++;

        displayQuiz();

    }

}


// ========================================
// 28. CHECK CORRECT ANSWER
// ========================================

function isCorrectAnswer(quiz, studentAnswer) {

    if (!studentAnswer) {

        return false;

    }


    const correctAnswer = String(

        quiz.correctAnswer ?? ""

    ).trim();


    const selectedLetter = String(studentAnswer).trim().toUpperCase();

    const optionLetters = ["A", "B", "C", "D"];

    const selectedIndex = optionLetters.indexOf(selectedLetter);


    // GET THE SELECTED OPTION TEXT

    const selectedOptionText = Array.isArray(quiz.options)

        ? quiz.options[selectedIndex]

        : quiz.options[selectedLetter];


    // ADMIN SAVED 0, 1, 2 OR 3

    if (

        ["0", "1", "2", "3"].includes(correctAnswer) &&

        selectedIndex === Number(correctAnswer)

    ) {

        return true;

    }


    // ADMIN SAVED A, B, C OR D

    if (correctAnswer.toUpperCase() === selectedLetter) {

        return true;

    }


    // ADMIN SAVED THE FULL OPTION TEXT

    if (

        selectedOptionText &&

        String(selectedOptionText).trim().toLowerCase() ===

        correctAnswer.toLowerCase()

    ) {

        return true;

    }


    return false;

}


// ========================================
// 29. CHECK CERTIFICATE ELIGIBILITY
// ========================================

function checkCourseCompletionAndIssueCertificate() {

    if (!currentStudent || !currentCourse) {

        return;

    }


    // A COURSE MUST HAVE LESSONS AND QUIZ QUESTIONS

    if (courseLessons.length === 0 || courseQuizzes.length === 0) {

        return;

    }


    const completedLessons = getSavedData(COMPLETED_LESSONS_KEY);


    // COUNT THIS STUDENT'S COMPLETED LESSONS

    const studentCompletedLessons = completedLessons.filter(function (item) {

        return (

            String(item.studentId) === String(currentStudent.id) &&

            String(item.courseId) === String(currentCourse.id)

        );

    });


    const allLessonsCompleted = courseLessons.every(function (lesson) {

        return studentCompletedLessons.some(function (item) {

            return String(item.lessonId) === String(lesson.id);

        });

    });


    if (!allLessonsCompleted) {

        return;

    }


    // CHECK WHETHER THE STUDENT HAS A PASSING QUIZ RESULT

    const results = getSavedData(RESULTS_KEY);


    const passingResult = results.find(function (result) {

        return (

            String(result.studentId) === String(currentStudent.id) &&

            String(result.courseId) === String(currentCourse.id) &&

            Number(result.percentage) >= CERTIFICATE_PASS_MARK

        );

    });


    if (!passingResult) {

        return;

    }


    // CHECK FOR AN EXISTING CERTIFICATE

    const certificates = getSavedData(CERTIFICATES_KEY);


    const existingCertificate = certificates.some(function (certificate) {

        return (

            String(certificate.studentId) === String(currentStudent.id) &&

            String(certificate.courseId) === String(currentCourse.id)

        );

    });


    if (existingCertificate) {

        return;

    }


    // CREATE CERTIFICATE

    const certificateId =

        "LS-" +

        Date.now() +

        "-" +

        Math.floor(Math.random() * 10000);


    const newCertificate = {

        id: Date.now(),

        certificateId: certificateId,

        studentId: currentStudent.id,

        studentName: currentStudent.fullName || "Student",

        courseId: currentCourse.id,

        courseTitle: currentCourse.title,

        score: passingResult.score,

        totalQuestions: passingResult.totalQuestions,

        percentage: passingResult.percentage,

        founderName: CERTIFICATE_FOUNDER_NAME,

        issuedAt: new Date().toISOString(),

        verificationUrl: ""

    };


    certificates.push(newCertificate);


    localStorage.setItem(

        CERTIFICATES_KEY,

        JSON.stringify(certificates)

    );


    alert(

        "Congratulations!\n\n" +

        "You have completed " + currentCourse.title +

        " and passed the quiz with " +

        passingResult.percentage + "%.\n\n" +

        "Your certificate has been issued. " +

        "You can find it in your student dashboard."

    );

}


// ========================================
// 30. SUBMIT QUIZ
// ========================================

function submitQuiz(timeExpired = false) {

    if (quizSubmitted) {

        return;

    }


    const unansweredQuestions = courseQuizzes.filter(function (quiz) {

        return !studentAnswers[quiz.id];

    });


    if (!timeExpired && unansweredQuestions.length > 0) {

        alert(

            "You have " +

            unansweredQuestions.length +

            " unanswered question(s). Please answer all questions."

        );

        return;

    }


    stopQuizTimer();


    // CALCULATE SCORE

    let score = 0;

    let answers = [];


    courseQuizzes.forEach(function (quiz) {

        const studentAnswer = studentAnswers[quiz.id] || null;

        const correct = isCorrectAnswer(quiz, studentAnswer);


        if (correct) {

            score++;

        }


        answers.push({

            questionId: quiz.id,

            answer: studentAnswer,

            correctAnswer: quiz.correctAnswer,

            isCorrect: correct

        });

    });


    // CALCULATE PERCENTAGE

    const totalQuestions = courseQuizzes.length;

    const percentage = totalQuestions > 0

        ? Math.round((score / totalQuestions) * 100)

        : 0;


    // SAVE RESULT

    const results = getSavedData(RESULTS_KEY);


    const newResult = {

        id: Date.now(),

        studentId: currentStudent.id,

        studentName: currentStudent.fullName,

        courseId: currentCourse.id,

        courseTitle: currentCourse.title,

        score: score,

        totalQuestions: totalQuestions,

        percentage: percentage,

        answers: answers,

        timeExpired: timeExpired,

        submittedAt: new Date().toISOString()

    };


    results.push(newResult);


    localStorage.setItem(

        RESULTS_KEY,

        JSON.stringify(results)

    );


    quizSubmitted = true;


    // DISPLAY RESULT

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

            "Excellent work! You have passed the quiz.";

    } else if (percentage >= 50) {

        quizFeedback.textContent =

            "Good effort! Review your lessons and keep practising.";

    } else {

        quizFeedback.textContent =

            "Keep learning. Review the lessons and try again.";

    }


    // CHECK CERTIFICATE ELIGIBILITY

    checkCourseCompletionAndIssueCertificate();


    if (timeExpired && quizTimerDisplay) {

        quizTimerDisplay.textContent = "Time is up!";

    }


    // PREVENT DOUBLE SUBMISSION

    submitQuizBtn.disabled = true;

    submitQuizBtn.classList.add("hidden");


    const navigation = document.getElementById("quizNavigation");

    if (navigation) {

        navigation.classList.add("hidden");

    }


    quizResult.scrollIntoView({

        behavior: "smooth",

        block: "center"

    });

}


// ========================================
// 31. SUBMIT BUTTON EVENT
// ========================================

quizForm.addEventListener("submit", function (event) {

    event.preventDefault();

    submitQuiz(false);

});


// ========================================
// 32. ESCAPE HTML CONTENT
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


// ========================================
// 33. START COURSE
// ========================================

if (currentStudent) {

    loadCourse();

}