// ======================================================
// LEARNSPHERE ADMIN DASHBOARD
// COMPLETE FIREBASE ADMIN SYSTEM
// ======================================================


// ======================================================
// 1. FIREBASE IMPORTS
// ======================================================

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
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ======================================================
// 2. GLOBAL VARIABLES
// ======================================================

let currentAdmin = null;

let courses = [];
let lessons = [];
let quizSettings = [];
let quizzes = [];

let students = [];
let instructors = [];
let results = [];
let certificates = [];
let announcements = [];

let battleQuizzes = [];
let battleQuestions = [];
let battleMatches = [];

let activeCourseId = "";
let activeQuizId = "";
let activeBattleQuizId = "";


// ======================================================
// 3. HELPER FUNCTIONS
// ======================================================

function $(id) {
    return document.getElementById(id);
}

function value(id) {
    return $(id)?.value?.trim() || "";
}

function checked(id) {
    return Boolean($(id)?.checked);
}

function text(id, content) {
    if ($(id)) {
        $(id).textContent = content ?? "";
    }
}

function html(id, content) {
    if ($(id)) {
        $(id).innerHTML = content ?? "";
    }
}

function setValue(id, content) {
    if ($(id)) {
        $(id).value = content ?? "";
    }
}

function setChecked(id, content) {
    if ($(id)) {
        $(id).checked = Boolean(content);
    }
}

function setAllText(id, content) {
    document.querySelectorAll(`[id="${id}"]`).forEach(element => {
        element.textContent = content ?? "";
    });
}

function escapeHTML(input) {
    return String(input ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function message(id, content, type = "success") {
    const element = $(id);

    if (!element) return;

    element.textContent = content;
    element.className = "form-message " + type;
}

function formatDate(date) {
    if (!date) return "Not available";

    try {
        if (date.toDate) date = date.toDate();

        return new Date(date).toLocaleString();
    } catch {
        return "Not available";
    }
}

function showLoading() {
    $("adminLoading")?.classList.remove("hidden");
    $("adminArea")?.classList.add("hidden");
}

function hideLoading() {
    $("adminLoading")?.classList.add("hidden");
}

function sortNewest(items) {
    return [...items].sort((a, b) => {
        const first = a.createdAt?.seconds || 0;
        const second = b.createdAt?.seconds || 0;
        return second - first;
    });
}

function findCourse(id) {
    return courses.find(course => course.id === id);
}

function findLesson(id) {
    return lessons.find(lesson => lesson.id === id);
}

function findQuiz(id) {
    return quizzes.find(quiz => quiz.id === id);
}

function findBattle(id) {
    return battleQuizzes.find(battle => battle.id === id);
}

function showError(error) {
    console.error(error);
    alert(error.message || "Something went wrong. Please try again.");
}


// ======================================================
// 4. FIRESTORE HELPERS
// ======================================================

async function getCollectionData(name) {
    try {
        const snapshot = await getDocs(collection(db, name));

        return snapshot.docs.map(item => ({
            id: item.id,
            ...item.data()
        }));

    } catch (error) {
        console.error("Could not load " + name, error);
        return [];
    }
}

async function refreshData() {
    const data = await Promise.all([
        getCollectionData("courses"),
        getCollectionData("lessons"),
        getCollectionData("quizSettings"),
        getCollectionData("quizzes"),
        getCollectionData("students"),
        getCollectionData("instructors"),
        getCollectionData("results"),
        getCollectionData("certificates"),
        getCollectionData("announcements"),
        getCollectionData("battleQuizzes"),
        getCollectionData("battleQuestions"),
        getCollectionData("battles")
    ]);

    courses = data[0];
    lessons = data[1];
    quizSettings = data[2];
    quizzes = data[3];

    students = data[4];
    instructors = data[5];
    results = data[6];
    certificates = data[7];
    announcements = data[8];

    battleQuizzes = data[9];
    battleQuestions = data[10];
    battleMatches = data[11];

    refreshDashboard();
}


// ======================================================
// 5. ADMIN AUTHENTICATION
// ======================================================

onAuthStateChanged(auth, async user => {
    showLoading();

    if (!user) {
        window.location.href = "auth.html";
        return;
    }

    try {
        const adminSnapshot = await getDoc(
            doc(db, "admins", user.uid)
        );

        if (!adminSnapshot.exists() ||
            adminSnapshot.data().role !== "admin") {

            alert("You do not have administrator access.");

            await signOut(auth);
            window.location.href = "auth.html";
            return;
        }

        currentAdmin = user;

        const adminData = adminSnapshot.data();

        text("adminName", adminData.fullName || "Administrator");
        text("adminEmail", user.email || "Admin Account");

        setupEventListeners();

        await refreshData();

        $("adminArea")?.classList.remove("hidden");

        hideLoading();

        showPage("overview");

    } catch (error) {
        console.error("Admin authentication error:", error);

        hideLoading();

        alert("Unable to load the admin dashboard. Check your connection and Firebase permissions.");
    }
});


// ======================================================
// 6. EVENT LISTENERS
// ======================================================

function setupEventListeners() {

    document.querySelectorAll(".nav-link").forEach(button => {
        button.addEventListener("click", () => {
            showPage(button.dataset.page);
        });
    });

    $("mobileMenuBtn")?.addEventListener("click", () => {
        $("sidebar")?.classList.toggle("sidebar-open");
    });

    $("adminLogoutBtn")?.addEventListener("click", logoutAdmin);

    $("addNewCourseBtn")?.addEventListener("click", openNewCourse);

    $("backToCoursesBtn")?.addEventListener("click", closeCourseEditor);

    $("editCourseForm")?.addEventListener("submit", saveCourse);

    $("courseScheduleForm")?.addEventListener("submit", saveCourseSchedule);

    $("editorLessonForm")?.addEventListener("submit", saveLesson);

    $("editorQuizSettingsForm")?.addEventListener("submit", saveQuizSettings);

    $("editorQuizForm")?.addEventListener("submit", saveQuizQuestion);

    $("battleQuizForm")?.addEventListener("submit", createBattleQuiz);

    $("battleQuestionForm")?.addEventListener("submit", saveBattleQuestion);

    $("announcementForm")?.addEventListener("submit", publishAnnouncement);

    $("publishEditorCourseBtn")?.addEventListener("click", publishCourse);

    $("unpublishCourseBtn")?.addEventListener("click", unpublishCourse);

    $("previewCourseBtn")?.addEventListener("click", previewCourse);

    $("closePreviewBtn")?.addEventListener("click", closePreview);

    $("cancelLessonEditBtn")?.addEventListener("click", clearLessonForm);

    $("cancelQuizEditBtn")?.addEventListener("click", clearQuestionForm);

    $("editorQuestionType")?.addEventListener("change", toggleQuestionType);

    $("editorQuizType")?.addEventListener("change", toggleLessonQuizSelector);

    $("editorQuizLessonId")?.addEventListener("change", () => {
        setValue("editorQuizCourseId", activeCourseId);
    });

    $("refreshInstructorsBtn")?.addEventListener("click", async () => {
        instructors = await getCollectionData("instructors");
        renderInstructors();
    });

    $("adminCourseSearch")?.addEventListener("input", renderCourses);
    $("adminCourseFilter")?.addEventListener("change", renderCourses);

    $("adminLessonSearch")?.addEventListener("input", renderLessons);
    $("adminQuizSearch")?.addEventListener("input", renderQuizzes);

    $("adminStudentSearch")?.addEventListener("input", renderStudents);

    $("adminInstructorSearch")?.addEventListener("input", renderInstructors);
    $("adminInstructorFilter")?.addEventListener("change", renderInstructors);

    $("adminResultSearch")?.addEventListener("input", renderResults);
    $("adminCertificateSearch")?.addEventListener("input", renderCertificates);

    // Buttons created dynamically inside dashboard cards.

    document.addEventListener("click", handleDynamicButtons);

    toggleQuestionType();
    toggleLessonQuizSelector();
}


// ======================================================
// 7. LOGOUT
// ======================================================

async function logoutAdmin() {
    if (!confirm("Are you sure you want to logout?")) return;

    try {
        await signOut(auth);
        window.location.href = "auth.html";
    } catch (error) {
        showError(error);
    }
}


// ======================================================
// 8. PAGE NAVIGATION
// ======================================================

function showPage(page) {
    document.querySelectorAll(".admin-page").forEach(section => {
        section.classList.add("hidden");
    });

    $(page + "Page")?.classList.remove("hidden");

    document.querySelectorAll(".nav-link").forEach(button => {
        button.classList.toggle("active", button.dataset.page === page);
    });

    const headings = {
        overview: "Overview",
        courses: "Courses",
        lessons: "Lessons",
        quizzes: "Quizzes",
        battles: "Battle Arena",
        students: "Students",
        instructors: "Instructors",
        results: "Results",
        certificates: "Certificates",
        announcements: "Announcements"
    };

    text("pageHeading", headings[page] || "Dashboard");

    $("sidebar")?.classList.remove("sidebar-open");
}


// ======================================================
// 9. REFRESH DASHBOARD
// ======================================================

function refreshDashboard() {
    renderOverview();
    renderCourses();
    renderLessons();
    renderQuizzes();
    renderBattleQuizzes();
    renderBattleQuestions();
    renderBattleMatches();
    renderStudents();
    renderInstructors();
    renderResults();
    renderCertificates();
    renderAnnouncements();
    updateCourseSelects();
}


// ======================================================
// 10. OVERVIEW
// ======================================================

function renderOverview() {
    const pending = instructors.filter(item =>
        String(item.status || "pending").toLowerCase() === "pending"
    ).length;

    const approved = instructors.filter(item =>
        String(item.status || "").toLowerCase() === "approved"
    ).length;

    const rejected = instructors.filter(item =>
        String(item.status || "").toLowerCase() === "rejected"
    ).length;

    const publishedBattles = battleQuizzes.filter(item =>
        item.published === true
    ).length;

    const completedMatches = battleMatches.filter(item =>
        ["completed", "finished"].includes(
            String(item.status || "").toLowerCase()
        )
    ).length;

    text("totalCourses", courses.length);
    text("totalStudents", students.length);
    text("totalLessons", lessons.length);
    text("totalQuizzes", quizzes.length);
    text("totalInstructors", instructors.length);
    text("totalPendingInstructors", pending);

    text("pendingInstructorBadge", pending);

    setAllText("pendingInstructorCount", pending);
    setAllText("approvedInstructorCount", approved);
    setAllText("rejectedInstructorCount", rejected);

    setAllText("totalBattlesCreated", battleQuizzes.length);
    setAllText("publishedBattlesCount", publishedBattles);
    setAllText("completedBattlesCount", completedMatches);
}


// ======================================================
// 11. COURSE MANAGEMENT
// ======================================================

function renderCourses() {
    const container = $("adminCourseList");
    if (!container) return;

    const search = value("adminCourseSearch").toLowerCase();
    const filter = value("adminCourseFilter") || "all";

    const filtered = courses.filter(course => {
        const matchesSearch =
            (course.title || "").toLowerCase().includes(search) ||
            (course.department || "").toLowerCase().includes(search);

        const matchesFilter =
            filter === "all" || course.category === filter;

        return matchesSearch && matchesFilter;
    });

    if (!filtered.length) {
        container.innerHTML = "<p>No courses found.</p>";
        return;
    }

    container.innerHTML = filtered.map(course => `
        <div class="admin-card">
            <h3>${escapeHTML(course.title)}</h3>
            <p>${escapeHTML(course.department)}</p>
            <p>${escapeHTML(course.level)} Level</p>
            <p>${escapeHTML(course.category)}</p>
            <p>Status: ${course.published && course.isPublished ? "Published" : "Unpublished"}</p>

            <button type="button" class="primary-btn"
                data-action="edit-course" data-id="${course.id}">
                Manage Course
            </button>

            <button type="button" class="secondary-btn"
                data-action="toggle-course" data-id="${course.id}">
                ${course.published && course.isPublished ? "Unpublish" : "Publish"}
            </button>
        </div>
    `).join("");
}


function openNewCourse() {
    activeCourseId = "";

    $("courseEditor")?.classList.remove("hidden");

    $("adminCourseList")?.classList.add("hidden");

    $("editCourseForm")?.reset();

    setValue("editCourseId", "");

    text("editorCourseHeading", "Add New Course");

    setValue("scheduleCourseId", "");

    clearLessonForm();
    clearQuestionForm();

    html("editorLessonList", "");
    html("editorQuizList", "");

    text("editorQuizQuestionCount", "0");
    text("editorQuizTotalMarks", "0");

    updateCourseSelects();
}


function closeCourseEditor() {
    $("courseEditor")?.classList.add("hidden");
    $("adminCourseList")?.classList.remove("hidden");

    activeCourseId = "";
}


function editCourse(id) {
    const course = findCourse(id);
    if (!course) return;

    activeCourseId = id;

    $("courseEditor")?.classList.remove("hidden");
    $("adminCourseList")?.classList.add("hidden");

    text("editorCourseHeading", "Edit Course");

    setValue("editCourseId", id);
    setValue("editCourseTitle", course.title);
    setValue("editCourseCategory", course.category);
    setValue("editCourseDepartment", course.department);
    setValue("editCourseLevel", course.level);
    setValue("editCourseDescription", course.description);
    setValue("editCourseImage", course.image);

    setValue("scheduleCourseId", id);
    setValue("editCourseOpeningDate", course.openingDateTime);
    setValue("editCourseClosingDate", course.closingDateTime);

    loadCourseEditor(id);
    updateCourseSelects();
}


async function saveCourse(event) {
    event.preventDefault();

    if (!currentAdmin) return;

    const id = value("editCourseId");

    const courseData = {
        title: value("editCourseTitle"),
        category: value("editCourseCategory"),
        department: value("editCourseDepartment"),
        level: value("editCourseLevel"),
        description: value("editCourseDescription"),
        image: value("editCourseImage"),
        updatedAt: serverTimestamp()
    };

    if (!courseData.title || !courseData.category ||
        !courseData.department || !courseData.level ||
        !courseData.description) {
        alert("Please complete all required course fields.");
        return;
    }

    try {
        if (id) {
            await updateDoc(doc(db, "courses", id), courseData);
        } else {
            courseData.published = false;
            courseData.isPublished = false;
            courseData.createdAt = serverTimestamp();

            const newCourse = await addDoc(
                collection(db, "courses"),
                courseData
            );

            activeCourseId = newCourse.id;

            setValue("editCourseId", newCourse.id);
            setValue("scheduleCourseId", newCourse.id);
        }

        alert("Course saved successfully.");

        await refreshData();

        if (activeCourseId) {
            editCourse(activeCourseId);
        }

    } catch (error) {
        showError(error);
    }
}


async function saveCourseSchedule(event) {
    event.preventDefault();

    const id = value("scheduleCourseId") || activeCourseId;

    if (!id) {
        alert("Save the course first.");
        return;
    }

    const opening = value("editCourseOpeningDate");
    const closing = value("editCourseClosingDate");

    if (opening && closing && new Date(closing) <= new Date(opening)) {
        alert("Closing date must be later than opening date.");
        return;
    }

    try {
        await updateDoc(doc(db, "courses", id), {
            openingDateTime: opening,
            closingDateTime: closing,
            updatedAt: serverTimestamp()
        });

        message("courseScheduleStatus", "Schedule saved successfully.");

        await refreshData();

    } catch (error) {
        showError(error);
    }
}


async function publishCourse() {
    const id = activeCourseId || value("editCourseId");

    if (!id) {
        alert("Save the course before publishing.");
        return;
    }

    try {
        await updateDoc(doc(db, "courses", id), {
            published: true,
            isPublished: true,
            updatedAt: serverTimestamp()
        });

        message("coursePublishStatus", "Course published successfully.");

        await refreshData();

    } catch (error) {
        showError(error);
    }
}


async function unpublishCourse() {
    const id = activeCourseId || value("editCourseId");

    if (!id) return;

    if (!confirm("Unpublish this course?")) return;

    try {
        await updateDoc(doc(db, "courses", id), {
            published: false,
            isPublished: false,
            updatedAt: serverTimestamp()
        });

        message("coursePublishStatus", "Course unpublished.");

        await refreshData();

    } catch (error) {
        showError(error);
    }
}


function previewCourse() {
    const id = activeCourseId || value("editCourseId");
    const course = findCourse(id);

    if (!course) {
        alert("Save the course first.");
        return;
    }

    html("coursePreviewContent", `
        <h2>${escapeHTML(value("editCourseTitle") || course.title)}</h2>
        <p><strong>Department:</strong> ${escapeHTML(value("editCourseDepartment") || course.department)}</p>
        <p><strong>Level:</strong> ${escapeHTML(value("editCourseLevel") || course.level)}</p>
        <p><strong>Category:</strong> ${escapeHTML(value("editCourseCategory") || course.category)}</p>
        <p>${escapeHTML(value("editCourseDescription") || course.description)}</p>
    `);

    $("coursePreview")?.classList.remove("hidden");
}


function closePreview() {
    $("coursePreview")?.classList.add("hidden");
}


// ======================================================
// 12. COURSE EDITOR
// ======================================================

async function loadCourseEditor(courseId) {
    const courseLessons = lessons.filter(item => item.courseId === courseId);

    renderEditorLessons(courseLessons);

    const courseQuizzes = quizzes.filter(item => item.courseId === courseId);

    renderEditorQuestions(courseQuizzes);

    const settings = quizSettings.find(item =>
        item.courseId === courseId
    );

    if (settings) {
        setValue("editorSettingsCourseId", courseId);
        setValue("editorQuizTitle", settings.title || "");
        setValue("editorQuizType", settings.quizType || "course");
        setValue("editorQuizTimeLimit", settings.timeLimitMinutes || 40);
        setValue("editorQuizMaxAttempts", settings.maxAttempts || 2);
        setValue("editorQuizQuestionLimit", settings.questionLimit || 20);
        setValue("editorQuizOpeningDate", settings.openingDateTime || "");
        setValue("editorQuizClosingDate", settings.closingDateTime || "");
        setValue("editorQuizInstructions", settings.instructions || "");

        setChecked("editorShuffleQuestions", settings.shuffleQuestions);
        setChecked("editorShuffleOptions", settings.shuffleOptions);
        setChecked("editorQuizPublished", settings.published);
    } else {
        setValue("editorSettingsCourseId", courseId);
    }

    updateCourseSelects();
}


function renderEditorLessons(items) {
    const container = $("editorLessonList");
    if (!container) return;

    if (!items.length) {
        container.innerHTML = "<p>No lessons added yet.</p>";
        return;
    }

    container.innerHTML = items.map(item => `
        <div class="admin-card">
            <h4>${escapeHTML(item.title)}</h4>
            <p>${item.published ? "Published" : "Unpublished"}</p>

            <button type="button" class="secondary-btn"
                data-action="edit-lesson" data-id="${item.id}">
                Edit
            </button>

            <button type="button" class="danger-btn"
                data-action="delete-lesson" data-id="${item.id}">
                Delete
            </button>
        </div>
    `).join("");
}


// ======================================================
// 13. LESSON MANAGEMENT
// ======================================================

async function saveLesson(event) {
    event.preventDefault();

    const courseId = activeCourseId || value("editCourseId");

    if (!courseId) {
        alert("Save or select a course first.");
        return;
    }

    const id = value("editorLessonId");

    const lessonData = {
        courseId,
        title: value("editorLessonTitle"),
        description: value("editorLessonDescription"),
        instructions: value("editorLessonInstructions"),
        content: value("editorLessonContent"),
        pdfLink: value("editorLessonPDF"),
        videoLink: value("editorLessonVideo"),
        published: checked("editorLessonPublished"),
        updatedAt: serverTimestamp()
    };

    if (!lessonData.title || !lessonData.content) {
        alert("Enter the lesson title and content.");
        return;
    }

    try {
        if (id) {
            await updateDoc(doc(db, "lessons", id), lessonData);
        } else {
            lessonData.createdAt = serverTimestamp();

            await addDoc(collection(db, "lessons"), lessonData);
        }

        alert("Lesson saved successfully.");

        clearLessonForm();

        await refreshData();

        await loadCourseEditor(courseId);

    } catch (error) {
        showError(error);
    }
}


function editLesson(id) {
    const lesson = findLesson(id);
    if (!lesson) return;

    setValue("editorLessonId", id);
    setValue("editorLessonCourseId", lesson.courseId);
    setValue("editorLessonTitle", lesson.title);
    setValue("editorLessonDescription", lesson.description);
    setValue("editorLessonInstructions", lesson.instructions);
    setValue("editorLessonContent", lesson.content);
    setValue("editorLessonPDF", lesson.pdfLink || lesson.pdfUrl);
    setValue("editorLessonVideo", lesson.videoLink || lesson.youtubeLink);

    setChecked("editorLessonPublished", lesson.published);
}


function clearLessonForm() {
    $("editorLessonForm")?.reset();

    setValue("editorLessonId", "");
    setValue("editorLessonCourseId", activeCourseId);

    setChecked("editorLessonPublished", false);
}


async function deleteLesson(id) {
    if (!confirm("Delete this lesson?")) return;

    try {
        await deleteDoc(doc(db, "lessons", id));

        await refreshData();

        if (activeCourseId) {
            await loadCourseEditor(activeCourseId);
        }

    } catch (error) {
        showError(error);
    }
}


function renderLessons() {
    const container = $("adminLessonList");
    if (!container) return;

    const search = value("adminLessonSearch").toLowerCase();

    const filtered = lessons.filter(item => {
        const course = findCourse(item.courseId);

        return (
            (item.title || "").toLowerCase().includes(search) ||
            (course?.title || "").toLowerCase().includes(search)
        );
    });

    if (!filtered.length) {
        container.innerHTML = "<p>No lessons found.</p>";
        return;
    }

    container.innerHTML = filtered.map(item => `
        <div class="admin-card">
            <h3>${escapeHTML(item.title)}</h3>
            <p>Course: ${escapeHTML(findCourse(item.courseId)?.title || "Unknown")}</p>
            <p>${item.published ? "Published" : "Unpublished"}</p>

            <button type="button" class="secondary-btn"
                data-action="open-lesson-course" data-id="${item.courseId}">
                Open Course
            </button>
        </div>
    `).join("");
}


// ======================================================
// 14. QUIZ SETTINGS
// ======================================================

function toggleLessonQuizSelector() {
    const group = $("lessonQuizSelectorGroup");
    if (!group) return;

    const isLessonQuiz = value("editorQuizType") === "lesson";

    group.style.display = isLessonQuiz ? "block" : "none";
}


async function saveQuizSettings(event) {
    event.preventDefault();

    const courseId = activeCourseId || value("editCourseId");

    if (!courseId) {
        alert("Save or select a course first.");
        return;
    }

    const opening = value("editorQuizOpeningDate");
    const closing = value("editorQuizClosingDate");

    if (opening && closing && new Date(closing) <= new Date(opening)) {
        alert("Quiz closing date must be later than opening date.");
        return;
    }

    const settings = {
        courseId,
        title: value("editorQuizTitle"),
        quizType: value("editorQuizType"),
        lessonId: value("editorQuizLessonId"),
        timeLimitMinutes: Number(value("editorQuizTimeLimit")) || 40,
        maxAttempts: Number(value("editorQuizMaxAttempts")) || 2,
        questionLimit: Number(value("editorQuizQuestionLimit")) || 20,
        openingDateTime: opening,
        closingDateTime: closing,
        instructions: value("editorQuizInstructions"),
        shuffleQuestions: checked("editorShuffleQuestions"),
        shuffleOptions: checked("editorShuffleOptions"),
        published: checked("editorQuizPublished"),
        updatedAt: serverTimestamp()
    };

    if (!settings.title) {
        alert("Enter a quiz title.");
        return;
    }

    try {
        const existing = quizSettings.find(item =>
            item.courseId === courseId
        );

        if (existing) {
            await updateDoc(doc(db, "quizSettings", existing.id), settings);
        } else {
            settings.createdAt = serverTimestamp();

            await addDoc(collection(db, "quizSettings"), settings);
        }

        message("quizSettingsStatus", "Quiz settings saved successfully.");

        await refreshData();

    } catch (error) {
        showError(error);
    }
}


// ======================================================
// 15. QUIZ QUESTIONS
// ======================================================

function toggleQuestionType() {
    const mcqFields = $("mcqQuestionFields");
    if (!mcqFields) return;

    mcqFields.style.display =
        value("editorQuestionType") === "theory" ? "none" : "block";
}


async function saveQuizQuestion(event) {
    event.preventDefault();

    const courseId = activeCourseId || value("editCourseId");

    if (!courseId) {
        alert("Select a course first.");
        return;
    }

    const questionType = value("editorQuestionType");
    const id = value("editorQuizId");

    const questionData = {
        courseId,
        quizId: activeQuizId || value("editorQuizCourseId") || courseId,
        type: questionType,
        question: value("editorQuestionText"),
        marks: Number(value("editorQuestionMark")) || 1,
        updatedAt: serverTimestamp()
    };

    if (!questionData.question) {
        alert("Enter a question.");
        return;
    }

    if (questionType === "mcq") {
        questionData.options = [
            value("editorOptionA"),
            value("editorOptionB"),
            value("editorOptionC"),
            value("editorOptionD")
        ];

        questionData.correctAnswer = Number(value("editorCorrectAnswer"));

        if (questionData.options.some(option => !option)) {
            alert("Fill in all four options.");
            return;
        }
    } else {
        questionData.options = [];
        questionData.correctAnswer = null;
    }

    try {
        if (id) {
            await updateDoc(doc(db, "quizzes", id), questionData);
        } else {
            questionData.createdAt = serverTimestamp();

            await addDoc(collection(db, "quizzes"), questionData);
        }

        alert("Quiz question saved successfully.");

        clearQuestionForm();

        await refreshData();

        if (activeCourseId) {
            await loadCourseEditor(activeCourseId);
        }

    } catch (error) {
        showError(error);
    }
}


function editQuestion(id) {
    const question = findQuiz(id);
    if (!question) return;

    setValue("editorQuizId", id);
    setValue("editorQuizCourseId", question.courseId);
    setValue("editorQuestionType", question.type || "mcq");
    setValue("editorQuestionText", question.question);
    setValue("editorQuestionMark", question.marks || 1);

    const options = Array.isArray(question.options)
        ? question.options
        : Object.values(question.options || {});

    setValue("editorOptionA", options[0] || "");
    setValue("editorOptionB", options[1] || "");
    setValue("editorOptionC", options[2] || "");
    setValue("editorOptionD", options[3] || "");

    setValue("editorCorrectAnswer", question.correctAnswer ?? 0);

    toggleQuestionType();
}


function clearQuestionForm() {
    $("editorQuizForm")?.reset();

    setValue("editorQuizId", "");
    setValue("editorQuizCourseId", activeCourseId);

    setValue("editorQuestionType", "mcq");
    setValue("editorQuestionMark", "1");

    toggleQuestionType();
}


function renderEditorQuestions(items) {
    const container = $("editorQuizList");
    if (!container) return;

    if (!items.length) {
        container.innerHTML = "<p>No quiz questions added yet.</p>";
        text("editorQuizQuestionCount", "0");
        text("editorQuizTotalMarks", "0");
        return;
    }

    const totalMarks = items.reduce((sum, item) =>
        sum + Number(item.marks || 1), 0
    );

    text("editorQuizQuestionCount", items.length);
    text("editorQuizTotalMarks", totalMarks);

    container.innerHTML = items.map((item, index) => `
        <div class="admin-card">
            <h4>Question ${index + 1}</h4>
            <p>${escapeHTML(item.question)}</p>
            <p>Type: ${escapeHTML(item.type || "mcq")}</p>
            <p>Marks: ${Number(item.marks || 1)}</p>

            <button type="button" class="secondary-btn"
                data-action="edit-question" data-id="${item.id}">
                Edit
            </button>

            <button type="button" class="danger-btn"
                data-action="delete-question" data-id="${item.id}">
                Delete
            </button>
        </div>
    `).join("");
}


function renderQuizzes() {
    const container = $("adminQuizList");
    if (!container) return;

    const search = value("adminQuizSearch").toLowerCase();

    const filtered = quizzes.filter(item =>
        (item.question || "").toLowerCase().includes(search)
    );

    if (!filtered.length) {
        container.innerHTML = "<p>No quiz questions found.</p>";
        return;
    }

    container.innerHTML = filtered.map(item => `
        <div class="admin-card">
            <h3>${escapeHTML(item.question)}</h3>
            <p>Course: ${escapeHTML(findCourse(item.courseId)?.title || "Unknown")}</p>
            <p>Type: ${escapeHTML(item.type || "mcq")}</p>
            <p>Marks: ${Number(item.marks || 1)}</p>

            <button type="button" class="secondary-btn"
                data-action="open-quiz-course" data-id="${item.courseId}">
                Open Course
            </button>
        </div>
    `).join("");
}


async function deleteQuestion(id) {
    if (!confirm("Delete this quiz question?")) return;

    try {
        await deleteDoc(doc(db, "quizzes", id));

        await refreshData();

        if (activeCourseId) {
            await loadCourseEditor(activeCourseId);
        }

    } catch (error) {
        showError(error);
    }
}


// ======================================================
// 16. BATTLE ARENA COMPETITIONS
// ======================================================

async function createBattleQuiz(event) {
    event.preventDefault();

    const opening = value("battleOpeningDate");
    const closing = value("battleClosingDate");

    if (opening && closing && new Date(closing) <= new Date(opening)) {
        alert("Closing date must be later than opening date.");
        return;
    }

    const data = {
        title: value("battleQuizTitle"),
        description: value("battleQuizDescription"),
        questionLimit: Number(value("battleQuestionLimit")) || 10,
        durationSeconds: Number(value("battleDuration")) || 60,
        openingDate: opening,
        closingDate: closing,
        published: false,
        status: "draft",
        createdBy: currentAdmin.uid,
        createdAt: serverTimestamp()
    };

    if (!data.title) {
        alert("Enter a competition title.");
        return;
    }

    try {
        await addDoc(collection(db, "battleQuizzes"), data);

        $("battleQuizForm")?.reset();

        message("battleAdminMessage", "Competition created successfully.");

        await refreshData();

    } catch (error) {
        showError(error);
    }
}


function renderBattleQuizzes() {
    const container = $("adminBattleList");
    if (!container) return;

    if (!battleQuizzes.length) {
        container.innerHTML = "<p>No competitions created yet.</p>";
        return;
    }

    container.innerHTML = sortNewest(battleQuizzes).map(battle => `
        <div class="admin-card">
            <h3>${escapeHTML(battle.title)}</h3>
            <p>${escapeHTML(battle.description)}</p>
            <p>Questions: ${Number(battle.questionLimit || 0)}</p>
            <p>Duration: ${Number(battle.durationSeconds || 0)} seconds</p>
            <p>Status: ${battle.published ? "Published" : "Unpublished"}</p>

            <button type="button" class="secondary-btn"
                data-action="select-battle" data-id="${battle.id}">
                Manage Questions
            </button>

            <button type="button" class="primary-btn"
                data-action="toggle-battle" data-id="${battle.id}">
                ${battle.published ? "Unpublish" : "Publish"}
            </button>

            <button type="button" class="danger-btn"
                data-action="delete-battle" data-id="${battle.id}">
                Delete
            </button>
        </div>
    `).join("");
}


async function toggleBattle(id) {
    const battle = findBattle(id);
    if (!battle) return;

    try {
        await updateDoc(doc(db, "battleQuizzes", id), {
            published: !battle.published,
            status: battle.published ? "draft" : "published",
            updatedAt: serverTimestamp()
        });

        await refreshData();

    } catch (error) {
        showError(error);
    }
}


async function deleteBattle(id) {
    if (!confirm("Delete this competition?")) return;

    try {
        await deleteDoc(doc(db, "battleQuizzes", id));

        await refreshData();

    } catch (error) {
        showError(error);
    }
}


// ======================================================
// 17. BATTLE QUESTIONS
// ======================================================

async function saveBattleQuestion(event) {
    event.preventDefault();

    const quizId = value("battleQuestionQuizId");

    if (!quizId) {
        alert("Select a competition.");
        return;
    }

    const id = value("battleQuestionId");

    const data = {
        battleQuizId: quizId,
        question: value("battleQuestionText"),
        options: {
            A: value("battleOptionA"),
            B: value("battleOptionB"),
            C: value("battleOptionC"),
            D: value("battleOptionD")
        },
        correctAnswer: ["A", "B", "C", "D"][
            Number(value("battleCorrectAnswer")) || 0
        ],
        marks: Number(value("battleQuestionMarks")) || 1,
        published: true,
        updatedAt: serverTimestamp()
    };

    if (!data.question ||
        Object.values(data.options).some(option => !option)) {
        alert("Complete the question and all four options.");
        return;
    }

    try {
        if (id) {
            await updateDoc(doc(db, "battleQuestions", id), data);
        } else {
            data.createdBy = currentAdmin.uid;
            data.createdAt = serverTimestamp();

            await addDoc(collection(db, "battleQuestions"), data);
        }

        $("battleQuestionForm")?.reset();

        setValue("battleQuestionId", "");

        message("battleQuestionMessage", "Battle question saved successfully.");

        await refreshData();

    } catch (error) {
        showError(error);
    }
}


function renderBattleQuestions() {
    const container = $("battleQuestionList");
    if (!container) return;

    let questions = battleQuestions;

    if (activeBattleQuizId) {
        questions = questions.filter(item =>
            item.battleQuizId === activeBattleQuizId
        );
    }

    if (!questions.length) {
        container.innerHTML = "<p>No battle questions to display.</p>";
        return;
    }

    container.innerHTML = questions.map(item => `
        <div class="admin-card">
            <h4>${escapeHTML(item.question)}</h4>
            <p>A: ${escapeHTML(item.options?.A)}</p>
            <p>B: ${escapeHTML(item.options?.B)}</p>
            <p>C: ${escapeHTML(item.options?.C)}</p>
            <p>D: ${escapeHTML(item.options?.D)}</p>
            <p>Correct answer: ${escapeHTML(item.correctAnswer)}</p>

            <button type="button" class="danger-btn"
                data-action="delete-battle-question" data-id="${item.id}">
                Delete
            </button>
        </div>
    `).join("");
}


function selectBattle(id) {
    activeBattleQuizId = id;

    setValue("battleQuestionQuizId", id);

    renderBattleQuestions();

    $("battleQuestionForm")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
    });
}


async function deleteBattleQuestion(id) {
    if (!confirm("Delete this battle question?")) return;

    try {
        await deleteDoc(doc(db, "battleQuestions", id));

        await refreshData();

    } catch (error) {
        showError(error);
    }
}


// ======================================================
// 18. BATTLE MATCH HISTORY
// ======================================================

function renderBattleMatches() {
    const container = $("adminBattleMatchesList");
    if (!container) return;

    if (!battleMatches.length) {
        container.innerHTML = "<p>No battle match records found.</p>";
        return;
    }

    container.innerHTML = sortNewest(battleMatches).map(match => `
        <div class="admin-card">
            <h4>Match ${escapeHTML(match.id)}</h4>
            <p>Player 1: ${escapeHTML(match.player1Name || match.player1Id || "Unknown")}</p>
            <p>Player 2: ${escapeHTML(match.player2Name || match.player2Id || "Unknown")}</p>
            <p>Status: ${escapeHTML(match.status || "Unknown")}</p>
            <p>Winner: ${escapeHTML(match.winnerName || match.winnerId || "Not available")}</p>
            <p>Date: ${formatDate(match.createdAt)}</p>
        </div>
    `).join("");
}


// ======================================================
// 19. STUDENTS
// ======================================================

function renderStudents() {
    const container = $("adminStudentList");
    if (!container) return;

    const search = value("adminStudentSearch").toLowerCase();

    const filtered = students.filter(student =>
        (student.fullName || student.name || "").toLowerCase().includes(search) ||
        (student.email || "").toLowerCase().includes(search) ||
        (student.department || "").toLowerCase().includes(search) ||
        (student.matricNumber || "").toLowerCase().includes(search)
    );

    if (!filtered.length) {
        container.innerHTML = "<p>No students found.</p>";
        return;
    }

    container.innerHTML = filtered.map(student => `
        <div class="admin-card">
            <h3>${escapeHTML(student.fullName || student.name || "Student")}</h3>
            <p>Email: ${escapeHTML(student.email)}</p>
            <p>Matric Number: ${escapeHTML(student.matricNumber)}</p>
            <p>Department: ${escapeHTML(student.department)}</p>
            <p>Level: ${escapeHTML(student.level)}</p>
        </div>
    `).join("");
}


// ======================================================
// 20. INSTRUCTORS
// ======================================================

function renderInstructors() {
    const container = $("adminInstructorList");
    if (!container) return;

    const search = value("adminInstructorSearch").toLowerCase();
    const filter = value("adminInstructorFilter") || "all";

    const filtered = instructors.filter(instructor => {
        const status = String(instructor.status || "pending").toLowerCase();

        const matchesSearch =
            (instructor.fullName || instructor.name || "").toLowerCase().includes(search) ||
            (instructor.email || "").toLowerCase().includes(search);

        const matchesFilter = filter === "all" || status === filter;

        return matchesSearch && matchesFilter;
    });

    if (!filtered.length) {
        container.innerHTML = "<p>No instructors found.</p>";
        return;
    }

    container.innerHTML = filtered.map(instructor => `
        <div class="admin-card">
            <h3>${escapeHTML(instructor.fullName || instructor.name || "Instructor")}</h3>
            <p>Email: ${escapeHTML(instructor.email)}</p>
            <p>Department: ${escapeHTML(instructor.department)}</p>
            <p>Status: ${escapeHTML(instructor.status || "pending")}</p>

            <button type="button" class="primary-btn"
                data-action="approve-instructor" data-id="${instructor.id}">
                Approve
            </button>

            <button type="button" class="danger-btn"
                data-action="reject-instructor" data-id="${instructor.id}">
                Reject
            </button>
        </div>
    `).join("");
}


async function updateInstructorStatus(id, status) {
    if (!confirm("Change instructor status to " + status + "?")) return;

    try {
        await updateDoc(doc(db, "instructors", id), {
            status,
            updatedAt: serverTimestamp()
        });

        await refreshData();

    } catch (error) {
        showError(error);
    }
}


// ======================================================
// 21. RESULTS
// ======================================================

function renderResults() {
    const container = $("adminResultList");
    if (!container) return;

    const search = value("adminResultSearch").toLowerCase();

    const filtered = sortNewest(results).filter(result =>
        (result.studentName || "").toLowerCase().includes(search) ||
        (result.courseTitle || "").toLowerCase().includes(search) ||
        (result.quizTitle || "").toLowerCase().includes(search)
    );

    if (!filtered.length) {
        container.innerHTML = "<p>No student results found.</p>";
        return;
    }

    container.innerHTML = filtered.map(result => `
        <div class="admin-card">
            <h3>${escapeHTML(result.studentName || "Student")}</h3>
            <p>Course: ${escapeHTML(result.courseTitle)}</p>
            <p>Quiz: ${escapeHTML(result.quizTitle)}</p>
            <p>Score: ${Number(result.score || 0)} / ${Number(result.totalMarks || 0)}</p>
            <p>Percentage: ${Number(result.percentage || 0)}%</p>
            <p>Grading: ${escapeHTML(result.gradingStatus || "Completed")}</p>
            <p>Date: ${formatDate(result.submittedAt)}</p>

            <button type="button" class="primary-btn"
                data-action="edit-result" data-id="${result.id}">
                Edit Marks
            </button>
        </div>
    `).join("");
}


async function editResultMarks(id) {
    const result = results.find(item => item.id === id);
    if (!result) return;

    const currentScore = Number(result.score || 0);

    const newScore = prompt(
        "Student: " + (result.studentName || "Unknown") +
        "\nQuiz: " + (result.quizTitle || "Quiz") +
        "\nCurrent score: " + currentScore +
        "\nTotal marks: " + Number(result.totalMarks || 0) +
        "\n\nEnter the corrected total score:"
    );

    if (newScore === null) return;

    const score = Number(newScore);
    const total = Number(result.totalMarks || 0);

    if (!Number.isFinite(score) || score < 0 || score > total) {
        alert("Enter a valid score between 0 and " + total + ".");
        return;
    }

    const percentage = total > 0
        ? Number(((score / total) * 100).toFixed(2))
        : 0;

    try {
        await updateDoc(doc(db, "results", id), {
            score,
            percentage,
            gradingStatus: result.hasTheoryQuestions ? "manually_graded" : (result.gradingStatus || "completed"),
            updatedAt: serverTimestamp(),
            marksUpdatedBy: currentAdmin.uid
        });

        alert("Result marks updated successfully.");

        await refreshData();

    } catch (error) {
        showError(error);
    }
}


// ======================================================
// 22. CERTIFICATES
// ======================================================

function renderCertificates() {
    const container = $("adminCertificateList");
    if (!container) return;

    const search = value("adminCertificateSearch").toLowerCase();

    const filtered = sortNewest(certificates).filter(certificate =>
        (certificate.studentName || "").toLowerCase().includes(search) ||
        (certificate.courseTitle || "").toLowerCase().includes(search) ||
        (certificate.certificateId || "").toLowerCase().includes(search)
    );

    if (!filtered.length) {
        container.innerHTML = "<p>No certificates found.</p>";
        return;
    }

    container.innerHTML = filtered.map(certificate => `
        <div class="admin-card">
            <h3>${escapeHTML(certificate.studentName || "Student")}</h3>
            <p>Course: ${escapeHTML(certificate.courseTitle)}</p>
            <p>Certificate ID: ${escapeHTML(certificate.certificateId)}</p>
            <p>Score: ${Number(certificate.score || 0)}</p>
            <p>Percentage: ${Number(certificate.percentage || 0)}%</p>
            <p>Status: ${certificate.revoked || certificate.status === "revoked" ? "Revoked" : "Valid"}</p>
            <p>Issued: ${formatDate(certificate.issuedAt || certificate.createdAt)}</p>

            ${certificate.revoked || certificate.status === "revoked" ? "" : `
                <button type="button" class="danger-btn"
                    data-action="revoke-certificate" data-id="${certificate.id}">
                    Revoke Certificate
                </button>
            `}
        </div>
    `).join("");
}


async function revokeCertificate(id) {
    if (!confirm("Are you sure you want to revoke this certificate?")) return;

    try {
        await updateDoc(doc(db, "certificates", id), {
            status: "revoked",
            revoked: true,
            revokedAt: serverTimestamp(),
            revokedBy: currentAdmin.uid
        });

        alert("Certificate revoked successfully.");

        await refreshData();

    } catch (error) {
        showError(error);
    }
}


// ======================================================
// 23. ANNOUNCEMENTS
// ======================================================

async function publishAnnouncement(event) {
    event.preventDefault();

    const data = {
        title: value("announcementTitle"),
        message: value("announcementMessage"),
        targetDepartment: value("announcementDepartment") || "All",
        targetLevel: value("announcementLevel") || "All",
        createdBy: currentAdmin.uid,
        createdAt: serverTimestamp()
    };

    if (!data.title || !data.message) {
        alert("Enter the announcement title and message.");
        return;
    }

    try {
        await addDoc(collection(db, "announcements"), data);

        $("announcementForm")?.reset();

        alert("Announcement published successfully.");

        await refreshData();

    } catch (error) {
        showError(error);
    }
}


function renderAnnouncements() {
    const container = $("adminAnnouncementList");
    if (!container) return;

    if (!announcements.length) {
        container.innerHTML = "<p>No announcements published yet.</p>";
        return;
    }

    container.innerHTML = sortNewest(announcements).map(item => `
        <div class="admin-card">
            <h3>${escapeHTML(item.title)}</h3>
            <p>${escapeHTML(item.message)}</p>
            <p>Department: ${escapeHTML(item.targetDepartment || "All")}</p>
            <p>Level: ${escapeHTML(item.targetLevel || "All")}</p>
            <p>Date: ${formatDate(item.createdAt)}</p>

            <button type="button" class="danger-btn"
                data-action="delete-announcement" data-id="${item.id}">
                Delete
            </button>
        </div>
    `).join("");
}


async function deleteAnnouncement(id) {
    if (!confirm("Delete this announcement?")) return;

    try {
        await deleteDoc(doc(db, "announcements", id));

        await refreshData();

    } catch (error) {
        showError(error);
    }
}


// ======================================================
// 24. COURSE DROPDOWNS
// ======================================================

function updateCourseSelects() {
    const lessonSelect = $("editorQuizLessonId");

    if (lessonSelect) {
        const current = lessonSelect.value;

        const courseLessons = lessons.filter(item =>
            item.courseId === activeCourseId
        );

        lessonSelect.innerHTML = `
            <option value="">Select Lesson</option>
            ${courseLessons.map(item => `
                <option value="${item.id}">
                    ${escapeHTML(item.title)}
                </option>
            `).join("")}
        `;

        if (courseLessons.some(item => item.id === current)) {
            lessonSelect.value = current;
        }
    }

    const battleSelect = $("battleQuestionQuizId");

    if (battleSelect) {
        const current = battleSelect.value;

        battleSelect.innerHTML = `
            <option value="">Select Competition</option>
            ${battleQuizzes.map(item => `
                <option value="${item.id}">
                    ${escapeHTML(item.title)}
                </option>
            `).join("")}
        `;

        if (battleQuizzes.some(item => item.id === current)) {
            battleSelect.value = current;
        }
    }
}


// ======================================================
// 25. DYNAMIC BUTTON ACTIONS
// ======================================================

async function handleDynamicButtons(event) {
    const button = event.target.closest("[data-action]");

    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (!id && action !== "none") return;

    switch (action) {

        case "edit-course":
            editCourse(id);
            break;

        case "toggle-course": {
            const course = findCourse(id);

            if (!course) break;

            try {
                await updateDoc(doc(db, "courses", id), {
                    published: !(course.published && course.isPublished),
                    isPublished: !(course.published && course.isPublished),
                    updatedAt: serverTimestamp()
                });

                await refreshData();

            } catch (error) {
                showError(error);
            }

            break;
        }

        case "edit-lesson":
            editLesson(id);
            break;

        case "delete-lesson":
            await deleteLesson(id);
            break;

        case "edit-question":
            editQuestion(id);
            break;

        case "delete-question":
            await deleteQuestion(id);
            break;

        case "open-lesson-course":
        case "open-quiz-course":
            if (findCourse(id)) {
                editCourse(id);
                showPage("courses");
            }
            break;

        case "select-battle":
            selectBattle(id);
            break;

        case "toggle-battle":
            await toggleBattle(id);
            break;

        case "delete-battle":
            await deleteBattle(id);
            break;

        case "delete-battle-question":
            await deleteBattleQuestion(id);
            break;

        case "approve-instructor":
            await updateInstructorStatus(id, "approved");
            break;

        case "reject-instructor":
            await updateInstructorStatus(id, "rejected");
            break;

        case "edit-result":
            await editResultMarks(id);
            break;

        case "revoke-certificate":
            await revokeCertificate(id);
            break;

        case "delete-announcement":
            await deleteAnnouncement(id);
            break;
    }
}


// ======================================================
// 26. INITIAL FORM STATE
// ======================================================

function initializeDashboardForms() {
    clearLessonForm();
    clearQuestionForm();
    toggleQuestionType();
    toggleLessonQuizSelector();
}


// ======================================================
// 27. STARTUP
// ======================================================

initializeDashboardForms();

console.log("LearnSphere Admin Dashboard JavaScript loaded.");