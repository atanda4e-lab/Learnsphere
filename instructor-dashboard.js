// ==========================================
// LEARNSPHERE INSTRUCTOR DASHBOARD
// FIREBASE VERSION
// ==========================================

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
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================
// 1. GLOBAL VARIABLES
// ==========================================

let currentInstructor = null;

let departmentCourses = [];

let departmentLessons = [];

let departmentQuizSettings = [];

let departmentQuestions = [];

let departmentStudents = [];

let selectedQuestionQuiz = "";


// ==========================================
// 2. HELPERS
// ==========================================

function element(id) {
    return document.getElementById(id);
}

function value(id) {
    return element(id)?.value?.trim() || "";
}

function setText(id, text) {
    if (element(id)) {
        element(id).textContent = text ?? "";
    }
}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text ?? "";
    return div.innerHTML;
}

function showError(error, message) {
    console.error(message, error);
    alert(message + "\n\n" + (error.message || "Unknown error"));
}

function departmentName() {
    return currentInstructor?.department || "";
}

function getCourse(courseId) {
    return departmentCourses.find(course => course.id === courseId);
}

function getQuizSettings(quizId) {
    return departmentQuizSettings.find(item => item.id === quizId);
}

function showEmpty(message) {
    return `<div class="empty-state">${escapeHTML(message)}</div>`;
}

function getDateTimeValue(value) {
    if (!value) return "";

    if (typeof value === "string") {
        return value;
    }

    return "";
}


// ==========================================
// 3. AUTHENTICATION
// ==========================================

onAuthStateChanged(auth, async user => {

    if (!user) {
        window.location.href = "auth.html?mode=instructor";
        return;
    }

    try {

        const instructorSnapshot = await getDoc(
            doc(db, "instructors", user.uid)
        );

        if (!instructorSnapshot.exists()) {
            await signOut(auth);
            window.location.href = "auth.html?mode=instructor";
            return;
        }

        const profile = instructorSnapshot.data();

        if (
            profile.role !== "instructor" ||
            profile.status !== "approved"
        ) {
            alert("Your instructor account is not approved.");
            await signOut(auth);
            window.location.href = "auth.html?mode=instructor";
            return;
        }

        currentInstructor = {
            uid: user.uid,
            fullName: profile.fullName || "Instructor",
            email: profile.email || user.email || "",
            university: profile.university || "",
            department: profile.department || ""
        };

        if (!currentInstructor.department) {
            alert("Your instructor profile has no department.");
            return;
        }

        displayInstructorProfile();

        await loadAllData();

    } catch (error) {
        showError(error, "Unable to load instructor dashboard.");
    }

});


// ==========================================
// 4. PROFILE
// ==========================================

function displayInstructorProfile() {

    setText("instructorName", currentInstructor.fullName);
    setText("profileName", currentInstructor.fullName);
    setText("profileDepartment", currentInstructor.department);

    setText("overviewName", currentInstructor.fullName);
    setText("overviewEmail", currentInstructor.email);
    setText("overviewUniversity", currentInstructor.university);
    setText("overviewDepartment", currentInstructor.department);

}


// ==========================================
// 5. LOAD ALL DATA
// ==========================================

async function loadAllData() {

    await loadDepartmentCourses();

    await loadDepartmentLessons();

    await loadDepartmentQuizSettings();

    await loadDepartmentQuestions();

    await loadDepartmentStudents();

    populateCourseSelects();

    populateQuizSelects();

    displayAllData();

}


// ==========================================
// 6. LOAD DEPARTMENT COURSES
// ==========================================

async function loadDepartmentCourses() {

    const courseQuery = query(
        collection(db, "courses"),
        where("department", "==", departmentName())
    );

    const snapshot = await getDocs(courseQuery);

    departmentCourses = snapshot.docs.map(item => ({
        ...item.data(),
        id: item.id
    }));

}


// ==========================================
// 7. LOAD LESSONS
// ==========================================

async function loadDepartmentLessons() {

    departmentLessons = [];

    const tasks = departmentCourses.map(async course => {

        const lessonQuery = query(
            collection(db, "lessons"),
            where("courseId", "==", course.id)
        );

        const snapshot = await getDocs(lessonQuery);

        snapshot.docs.forEach(item => {

            departmentLessons.push({
                ...item.data(),
                id: item.id,
                courseTitle: course.title
            });

        });

    });

    await Promise.all(tasks);

}


// ==========================================
// 8. LOAD QUIZ SETTINGS
// ==========================================

async function loadDepartmentQuizSettings() {

    departmentQuizSettings = [];

    const tasks = departmentCourses.map(async course => {

        const settingsQuery = query(
            collection(db, "quizSettings"),
            where("courseId", "==", course.id)
        );

        const snapshot = await getDocs(settingsQuery);

        snapshot.docs.forEach(item => {

            departmentQuizSettings.push({
                ...item.data(),
                id: item.id,
                courseTitle: course.title
            });

        });

    });

    await Promise.all(tasks);

}


// ==========================================
// 9. LOAD QUIZ QUESTIONS
// ==========================================

async function loadDepartmentQuestions() {

    departmentQuestions = [];

    const tasks = departmentCourses.map(async course => {

        const questionsQuery = query(
            collection(db, "quizzes"),
            where("courseId", "==", course.id)
        );

        const snapshot = await getDocs(questionsQuery);

        snapshot.docs.forEach(item => {

            departmentQuestions.push({
                ...item.data(),
                id: item.id
            });

        });

    });

    await Promise.all(tasks);

}


// ==========================================
// 10. LOAD DEPARTMENT STUDENTS
// ==========================================

async function loadDepartmentStudents() {

    departmentStudents = [];

    const studentMap = new Map();

    const tasks = departmentCourses.map(async course => {

        const enrollmentQuery = query(
            collection(db, "enrollments"),
            where("courseId", "==", course.id)
        );

        const snapshot = await getDocs(enrollmentQuery);

        snapshot.docs.forEach(item => {

            const enrollment = item.data();

            const studentId = enrollment.studentId;

            if (!studentId) return;

            if (!studentMap.has(studentId)) {

                studentMap.set(studentId, {
                    studentId: studentId,
                    studentName: enrollment.studentName || "Student",
                    courses: [],
                    enrolledAt: enrollment.enrolledAt || null
                });

            }

            const student = studentMap.get(studentId);

            if (!student.courses.includes(course.title)) {
                student.courses.push(course.title);
            }

        });

    });

    await Promise.all(tasks);

    departmentStudents = Array.from(studentMap.values());

}


// ==========================================
// 11. DISPLAY ALL DATA
// ==========================================

function displayAllData() {

    displayCourses();

    displayLessons();

    displayQuizSettings();

    displayQuestions();

    displayStudents();

    updateStatistics();

}


// ==========================================
// 12. STATISTICS
// ==========================================

function updateStatistics() {

    setText("courseCount", departmentCourses.length);

    setText("lessonCount", departmentLessons.length);

    setText("questionCount", departmentQuestions.length);

    setText("studentCount", departmentStudents.length);

}


// ==========================================
// 13. COURSE SELECT BOXES
// ==========================================

function populateCourseSelects() {

    const selects = [
        element("lessonCourse"),
        element("quizCourse")
    ];

    selects.forEach(select => {

        if (!select) return;

        const previous = select.value;

        select.innerHTML = `<option value="">Select course</option>`;

        departmentCourses.forEach(course => {

            const option = document.createElement("option");

            option.value = course.id;
            option.textContent = course.title;

            select.appendChild(option);

        });

        if (departmentCourses.some(course => course.id === previous)) {
            select.value = previous;
        }

    });

}


// ==========================================
// 14. DISPLAY COURSES
// ==========================================

function displayCourses() {

    const list = element("courseList");

    if (!list) return;

    if (departmentCourses.length === 0) {
        list.innerHTML = showEmpty("No courses found in your department.");
        return;
    }

    list.innerHTML = departmentCourses.map(course => {

        const published =
            course.published === true ||
            course.isPublished === true;

        return `
            <div class="item-card">

                <h3>${escapeHTML(course.title)}</h3>

                <p>Department: ${escapeHTML(course.department)}</p>

                <p>Level: ${escapeHTML(course.level)}</p>

                <span class="status ${published ? "" : "unpublished"}">
                    ${published ? "Published" : "Unpublished"}
                </span>

                <div class="item-actions">

                    <button class="edit-btn"
                        data-edit-course="${course.id}">
                        Edit
                    </button>

                    <button class="publish-btn"
                        data-toggle-course="${course.id}">
                        ${published ? "Unpublish" : "Publish"}
                    </button>

                    <button class="delete-btn"
                        data-delete-course="${course.id}">
                        Delete
                    </button>

                </div>

            </div>
        `;

    }).join("");

}


// ==========================================
// 15. SAVE COURSE
// ==========================================

element("courseForm").addEventListener("submit", async event => {

    event.preventDefault();

    const id = value("courseId");

    const courseData = {

        title: value("courseTitle"),

        category: value("courseCategory"),

        department: departmentName(),

        level: value("courseLevel"),

        description: value("courseDescription"),

        image: value("courseImage"),

        updatedAt: serverTimestamp()

    };

    try {

        if (id) {

            await updateDoc(
                doc(db, "courses", id),
                courseData
            );

        } else {

            courseData.published = false;
            courseData.isPublished = false;
            courseData.createdAt = serverTimestamp();
            courseData.instructorId = currentInstructor.uid;

            await addDoc(
                collection(db, "courses"),
                courseData
            );

        }

        element("courseForm").reset();
        setText("courseId", "");

        await loadAllData();

        alert("Course saved successfully.");

    } catch (error) {
        showError(error, "Unable to save course.");
    }

});


// ==========================================
// 16. EDIT COURSE
// ==========================================

function editCourse(id) {

    const course = getCourse(id);

    if (!course) return;

    setText("courseId", course.id);

    element("courseId").value = course.id;
    element("courseTitle").value = course.title || "";
    element("courseCategory").value = course.category || "";
    element("courseLevel").value = course.level || "";
    element("courseDescription").value = course.description || "";
    element("courseImage").value = course.image || "";

    setText("courseFormTitle", "Edit Course");

    showSection("courses");

    element("courseForm").scrollIntoView({
        behavior: "smooth"
    });

}


// ==========================================
// 17. PUBLISH / UNPUBLISH COURSE
// ==========================================

async function toggleCourse(id) {

    const course = getCourse(id);

    if (!course) return;

    const published =
        course.published === true ||
        course.isPublished === true;

    try {

        await updateDoc(
            doc(db, "courses", id),
            {
                published: !published,
                isPublished: !published,
                updatedAt: serverTimestamp()
            }
        );

        await loadAllData();

    } catch (error) {
        showError(error, "Unable to update course publication.");
    }

}


// ==========================================
// 18. DELETE COURSE
// ==========================================

async function removeCourse(id) {

    if (!confirm(
        "Delete this course? Its lessons, quizzes and enrolments will not automatically be deleted."
    )) return;

    try {

        await deleteDoc(doc(db, "courses", id));

        await loadAllData();

        alert("Course deleted.");

    } catch (error) {
        showError(error, "Unable to delete course.");
    }

}


// ==========================================
// 19. COURSE FORM CLEAR
// ==========================================

element("cancelCourseEdit").addEventListener("click", () => {

    element("courseForm").reset();
    element("courseId").value = "";

    setText("courseFormTitle", "Create New Course");

});


// ==========================================
// 20. LESSON COURSE FILTER
// ==========================================

function displayLessons() {

    const list = element("lessonList");

    if (!list) return;

    if (departmentLessons.length === 0) {
        list.innerHTML = showEmpty("No lessons have been added yet.");
        return;
    }

    list.innerHTML = departmentLessons.map(lesson => {

        return `
            <div class="item-card">

                <h3>${escapeHTML(lesson.title)}</h3>

                <p>Course: ${escapeHTML(lesson.courseTitle)}</p>

                <p>${escapeHTML(lesson.description || "")}</p>

                <span class="status ${lesson.published ? "" : "unpublished"}">
                    ${lesson.published ? "Published" : "Unpublished"}
                </span>

                <div class="item-actions">

                    <button class="edit-btn"
                        data-edit-lesson="${lesson.id}">
                        Edit
                    </button>

                    <button class="delete-btn"
                        data-delete-lesson="${lesson.id}">
                        Delete
                    </button>

                </div>

            </div>
        `;

    }).join("");

}


// ==========================================
// 21. SAVE LESSON
// ==========================================

element("lessonForm").addEventListener("submit", async event => {

    event.preventDefault();

    const id = value("lessonId");

    const courseId = value("lessonCourse");

    const course = getCourse(courseId);

    if (!course) {
        alert("Please select a valid course.");
        return;
    }

    const lessonData = {

        courseId: courseId,

        title: value("lessonTitle"),

        description: value("lessonDescription"),

        instructions: value("lessonInstructions"),

        content: value("lessonContent"),

        pdf: value("lessonPdf"),

        video: value("lessonVideo"),

        published: element("lessonPublished").checked,

        updatedAt: serverTimestamp()

    };

    try {

        if (id) {

            await updateDoc(
                doc(db, "lessons", id),
                lessonData
            );

        } else {

            lessonData.createdAt = serverTimestamp();

            await addDoc(
                collection(db, "lessons"),
                lessonData
            );

        }

        element("lessonForm").reset();
        element("lessonId").value = "";

        await loadAllData();

        alert("Lesson saved successfully.");

    } catch (error) {
        showError(error, "Unable to save lesson.");
    }

});


// ==========================================
// 22. EDIT LESSON
// ==========================================

function editLesson(id) {

    const lesson = departmentLessons.find(item => item.id === id);

    if (!lesson) return;

    element("lessonId").value = id;
    element("lessonCourse").value = lesson.courseId || "";
    element("lessonTitle").value = lesson.title || "";
    element("lessonDescription").value = lesson.description || "";
    element("lessonInstructions").value = lesson.instructions || "";
    element("lessonContent").value = lesson.content || "";
    element("lessonPdf").value = lesson.pdf || "";
    element("lessonVideo").value = lesson.video || "";
    element("lessonPublished").checked = lesson.published === true;

    setText("lessonFormTitle", "Edit Lesson");

    showSection("lessons");

    element("lessonForm").scrollIntoView({
        behavior: "smooth"
    });

}


// ==========================================
// 23. DELETE LESSON
// ==========================================

async function deleteLesson(id) {

    if (!confirm("Delete this lesson?")) return;

    try {

        await deleteDoc(doc(db, "lessons", id));

        await loadAllData();

        alert("Lesson deleted.");

    } catch (error) {
        showError(error, "Unable to delete lesson.");
    }

}


// ==========================================
// 24. CLEAR LESSON FORM
// ==========================================

element("cancelLessonEdit").addEventListener("click", () => {

    element("lessonForm").reset();
    element("lessonId").value = "";

    setText("lessonFormTitle", "Add Lesson");

});


// ==========================================
// 25. QUIZ LESSON SELECT
// ==========================================

element("quizCourse").addEventListener("change", () => {

    populateLessonSelect();

});

element("quizType").addEventListener("change", () => {

    const isLessonQuiz = value("quizType") === "lesson";

    element("quizLesson").disabled = !isLessonQuiz;

    if (isLessonQuiz) {
        populateLessonSelect();
    } else {
        element("quizLesson").value = "";
    }

});


function populateLessonSelect() {

    const courseId = value("quizCourse");

    const select = element("quizLesson");

    select.innerHTML =
        `<option value="">Select lesson</option>`;

    departmentLessons
        .filter(lesson => lesson.courseId === courseId)
        .forEach(lesson => {

            const option = document.createElement("option");

            option.value = lesson.id;
            option.textContent = lesson.title;

            select.appendChild(option);

        });

}


// ==========================================
// 26. SAVE QUIZ SETTINGS
// ==========================================

element("quizSettingsForm").addEventListener("submit", async event => {

    event.preventDefault();

    const id = value("quizSettingsId");

    const courseId = value("quizCourse");

    const course = getCourse(courseId);

    if (!course) {
        alert("Please select a valid course.");
        return;
    }

    const type = value("quizType");

    const lessonId = value("quizLesson");

    if (type === "lesson" && !lessonId) {
        alert("Please select a lesson for this quiz.");
        return;
    }

    const quizData = {

        courseId: courseId,

        title: value("quizTitle"),

        type: type,

        lessonId: type === "lesson" ? lessonId : "",

        instructions: value("quizInstructions"),

        timeLimitMinutes: Number(value("quizTime")),

        maxAttempts: Number(value("quizAttempts")),

        questionLimit: Number(value("quizQuestionLimit")),

        openingDateTime: value("quizOpening"),

        closingDateTime: value("quizClosing"),

        shuffleQuestions: element("shuffleQuestions").checked,

        shuffleOptions: element("shuffleOptions").checked,

        published: element("quizPublished").checked,

        updatedAt: serverTimestamp(),

        updatedBy: currentInstructor.uid

    };

    if (
        quizData.timeLimitMinutes < 1 ||
        quizData.maxAttempts < 1 ||
        quizData.questionLimit < 1
    ) {
        alert("Please enter valid quiz settings.");
        return;
    }

    if (
        quizData.openingDateTime &&
        quizData.closingDateTime &&
        new Date(quizData.closingDateTime) <=
        new Date(quizData.openingDateTime)
    ) {
        alert("Closing time must be later than opening time.");
        return;
    }

    try {

        if (id) {

            await updateDoc(
                doc(db, "quizSettings", id),
                quizData
            );

        } else {

            quizData.createdAt = serverTimestamp();
            quizData.createdBy = currentInstructor.uid;

            const newQuiz = await addDoc(
                collection(db, "quizSettings"),
                quizData
            );

            selectedQuestionQuiz = newQuiz.id;

        }

        element("quizSettingsForm").reset();
        element("quizSettingsId").value = "";

        await loadAllData();

        alert("Quiz settings saved.");

    } catch (error) {
        showError(error, "Unable to save quiz settings.");
    }

});


// ==========================================
// 27. DISPLAY QUIZ SETTINGS
// ==========================================

function displayQuizSettings() {

    const list = element("quizSettingsList");

    if (!list) return;

    if (departmentQuizSettings.length === 0) {
        list.innerHTML = showEmpty("No quizzes have been created yet.");
        return;
    }

    list.innerHTML = departmentQuizSettings.map(quiz => {

        return `
            <div class="item-card">

                <h3>${escapeHTML(quiz.title)}</h3>

                <p>Course: ${escapeHTML(quiz.courseTitle)}</p>

                <p>Time: ${escapeHTML(quiz.timeLimitMinutes)} minutes</p>

                <p>Attempts: ${escapeHTML(quiz.maxAttempts)}</p>

                <p>Questions: ${escapeHTML(quiz.questionLimit)}</p>

                <span class="status ${quiz.published ? "" : "unpublished"}">
                    ${quiz.published ? "Published" : "Unpublished"}
                </span>

                <div class="item-actions">

                    <button class="edit-btn"
                        data-edit-settings="${quiz.id}">
                        Edit Settings
                    </button>

                    <button class="publish-btn"
                        data-select-quiz="${quiz.id}">
                        Manage Questions
                    </button>

                    <button class="delete-btn"
                        data-delete-settings="${quiz.id}">
                        Delete Quiz
                    </button>

                </div>

            </div>
        `;

    }).join("");

}


// ==========================================
// 28. POPULATE QUIZ SELECT
// ==========================================

function populateQuizSelects() {

    const select = element("questionQuiz");

    if (!select) return;

    select.innerHTML = `<option value="">Select quiz</option>`;

    departmentQuizSettings.forEach(quiz => {

        const option = document.createElement("option");

        option.value = quiz.id;
        option.textContent = quiz.courseTitle + " - " + quiz.title;

        select.appendChild(option);

    });

    if (
        selectedQuestionQuiz &&
        departmentQuizSettings.some(
            quiz => quiz.id === selectedQuestionQuiz
        )
    ) {
        select.value = selectedQuestionQuiz;
    }

}


// ==========================================
// 29. SAVE QUESTION
// ==========================================

element("questionForm").addEventListener("submit", async event => {

    event.preventDefault();

    const quizId = value("questionQuiz");

    const settings = getQuizSettings(quizId);

    if (!settings) {
        alert("Please select a valid quiz.");
        return;
    }

    const options = [
        value("optionA"),
        value("optionB"),
        value("optionC"),
        value("optionD")
    ];

    const correctAnswer = Number(value("correctAnswer"));

    const questionData = {

        courseId: settings.courseId,

        quizId: quizId,

        lessonId: settings.lessonId || "",

        question: value("questionText"),

        questionText: value("questionText"),

        options: options,

        correctAnswer: correctAnswer,

        marks: Number(value("questionMarks")),

        updatedAt: serverTimestamp(),

        createdAt: serverTimestamp()

    };

    if (
        options.some(option => !option) ||
        !Number.isInteger(correctAnswer) ||
        correctAnswer < 0 ||
        correctAnswer > 3 ||
        questionData.marks < 1
    ) {
        alert("Please complete all question fields correctly.");
        return;
    }

    try {

        await addDoc(
            collection(db, "quizzes"),
            questionData
        );

        element("questionForm").reset();

        selectedQuestionQuiz = quizId;

        await loadAllData();

        element("questionQuiz").value = quizId;

        alert("Quiz question saved successfully.");

    } catch (error) {
        showError(error, "Unable to save quiz question.");
    }

});


// ==========================================
// 30. DISPLAY QUESTIONS
// ==========================================

function displayQuestions() {

    const list = element("questionList");

    if (!list) return;

    const quizId = value("questionQuiz");

    const questions = departmentQuestions.filter(
        question => question.quizId === quizId
    );

    if (!quizId) {
        list.innerHTML = showEmpty("Select a quiz to view its questions.");
        return;
    }

    if (questions.length === 0) {
        list.innerHTML = showEmpty("No questions have been added to this quiz.");
        return;
    }

    list.innerHTML = questions.map((question, index) => {

        return `
            <div class="item-card">

                <h3>Question ${index + 1}</h3>

                <p>${escapeHTML(question.question || question.questionText)}</p>

                <p>Marks: ${escapeHTML(question.marks || 1)}</p>

                <div class="item-actions">

                    <button class="delete-btn"
                        data-delete-question="${question.id}">
                        Delete Question
                    </button>

                </div>

            </div>
        `;

    }).join("");

}

element("questionQuiz").addEventListener("change", () => {

    selectedQuestionQuiz = value("questionQuiz");

    displayQuestions();

});


// ==========================================
// 31. EDIT QUIZ SETTINGS
// ==========================================

function editQuizSettings(id) {

    const quiz = getQuizSettings(id);

    if (!quiz) return;

    element("quizSettingsId").value = id;

    element("quizCourse").value = quiz.courseId || "";
    element("quizTitle").value = quiz.title || "";
    element("quizType").value = quiz.type || "course";
    element("quizInstructions").value = quiz.instructions || "";
    element("quizTime").value = quiz.timeLimitMinutes || 30;
    element("quizAttempts").value = quiz.maxAttempts || 2;
    element("quizQuestionLimit").value = quiz.questionLimit || 10;
    element("quizOpening").value = getDateTimeValue(quiz.openingDateTime);
    element("quizClosing").value = getDateTimeValue(quiz.closingDateTime);

    element("shuffleQuestions").checked = quiz.shuffleQuestions === true;
    element("shuffleOptions").checked = quiz.shuffleOptions === true;
    element("quizPublished").checked = quiz.published === true;

    populateLessonSelect();

    element("quizLesson").value = quiz.lessonId || "";

    element("quizLesson").disabled = quiz.type !== "lesson";

    showSection("quizzes");

    element("quizSettingsForm").scrollIntoView({
        behavior: "smooth"
    });

}


// ==========================================
// 32. DELETE QUIZ SETTINGS
// ==========================================

async function deleteQuizSettings(id) {

    if (!confirm(
        "Delete these quiz settings? Existing questions will remain."
    )) return;

    try {

        await deleteDoc(doc(db, "quizSettings", id));

        await loadAllData();

        alert("Quiz settings deleted.");

    } catch (error) {
        showError(error, "Unable to delete quiz settings.");
    }

}


// ==========================================
// 33. DELETE QUESTION
// ==========================================

async function deleteQuestion(id) {

    if (!confirm("Delete this question?")) return;

    try {

        await deleteDoc(doc(db, "quizzes", id));

        await loadAllData();

        alert("Question deleted.");

    } catch (error) {
        showError(error, "Unable to delete question.");
    }

}


// ==========================================
// 34. DISPLAY DEPARTMENT STUDENTS
// ==========================================

function displayStudents() {

    const list = element("studentList");

    if (!list) return;

    if (departmentStudents.length === 0) {
        list.innerHTML = showEmpty(
            "No students have enrolled in your department's courses yet."
        );
        return;
    }

    list.innerHTML = departmentStudents.map(student => {

        return `
            <div class="item-card">

                <h3>${escapeHTML(student.studentName)}</h3>

                <p>Student ID: ${escapeHTML(student.studentId)}</p>

                <p>
                    Enrolled Courses:
                    ${escapeHTML(student.courses.join(", "))}
                </p>

            </div>
        `;

    }).join("");

}


// ==========================================
// 35. SEARCH STUDENTS
// ==========================================

element("studentSearch").addEventListener("input", () => {

    const search = value("studentSearch").toLowerCase();

    const filtered = departmentStudents.filter(student => {

        return (
            student.studentName.toLowerCase().includes(search) ||
            student.studentId.toLowerCase().includes(search) ||
            student.courses.join(" ").toLowerCase().includes(search)
        );

    });

    const list = element("studentList");

    if (filtered.length === 0) {
        list.innerHTML = showEmpty("No matching students found.");
        return;
    }

    list.innerHTML = filtered.map(student => `

        <div class="item-card">

            <h3>${escapeHTML(student.studentName)}</h3>

            <p>Student ID: ${escapeHTML(student.studentId)}</p>

            <p>Courses: ${escapeHTML(student.courses.join(", "))}</p>

        </div>

    `).join("");

});


// ==========================================
// 36. NAVIGATION
// ==========================================

function showSection(sectionId) {

    document.querySelectorAll(".page-section").forEach(section => {
        section.classList.remove("active");
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.classList.remove("active");
    });

    element(sectionId)?.classList.add("active");

    document.querySelector(
        `.nav-link[data-section="${sectionId}"]`
    )?.classList.add("active");

}

document.querySelectorAll(".nav-link").forEach(button => {

    button.addEventListener("click", () => {
        showSection(button.dataset.section);
    });

});


// ==========================================
// 37. BUTTON EVENTS
// ==========================================

document.addEventListener("click", event => {

    const target = event.target.closest("button");

    if (!target) return;

    if (target.dataset.editCourse) {
        editCourse(target.dataset.editCourse);
    }

    if (target.dataset.toggleCourse) {
        toggleCourse(target.dataset.toggleCourse);
    }

    if (target.dataset.deleteCourse) {
        removeCourse(target.dataset.deleteCourse);
    }

    if (target.dataset.editLesson) {
        editLesson(target.dataset.editLesson);
    }

    if (target.dataset.deleteLesson) {
        deleteLesson(target.dataset.deleteLesson);
    }

    if (target.dataset.editSettings) {
        editQuizSettings(target.dataset.editSettings);
    }

    if (target.dataset.selectQuiz) {

        selectedQuestionQuiz = target.dataset.selectQuiz;

        populateQuizSelects();

        element("questionQuiz").value = selectedQuestionQuiz;

        displayQuestions();

        element("questionForm").scrollIntoView({
            behavior: "smooth"
        });

    }

    if (target.dataset.deleteSettings) {
        deleteQuizSettings(target.dataset.deleteSettings);
    }

    if (target.dataset.deleteQuestion) {
        deleteQuestion(target.dataset.deleteQuestion);
    }

});


// ==========================================
// 38. LOGOUT
// ==========================================

element("logoutBtn").addEventListener("click", async () => {

    if (!confirm("Are you sure you want to log out?")) return;

    try {

        await signOut(auth);

        window.location.href = "auth.html?mode=instructor";

    } catch (error) {
        showError(error, "Unable to log out.");
    }

});


// ==========================================
// 39. INITIAL QUESTION DISPLAY
// ==========================================

element("questionQuiz").addEventListener("change", displayQuestions);


// ==========================================
// END OF INSTRUCTOR DASHBOARD
// ==========================================