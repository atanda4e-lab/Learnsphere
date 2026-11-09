// =====================================================
// LEARNSPHERE ADMIN DASHBOARD
// FIREBASE ADMIN SYSTEM
// =====================================================


// =====================================================
// 1. FIREBASE IMPORTS
// =====================================================

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
    writeBatch,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// =====================================================
// 2. GLOBAL VARIABLES
// =====================================================

let courses = [];
let students = [];
let lessons = [];
let quizzes = [];
let results = [];
let certificates = [];
let instructors = [];
let quizSettings = [];

let currentCourseId = null;
let currentAdmin = null;

let activeQuizId = null;

let dashboardInitialized = false;


// =====================================================
// 3. ELEMENT HELPERS
// =====================================================

function getElement(id) {
    return document.getElementById(id);
}


// The course title ID exists twice in the supplied HTML.
// This function specifically selects the input inside its form.

function getInput(id) {

    if (id === "editCourseTitle") {
        return document.querySelector("#editCourseForm input#editCourseTitle");
    }

    return getElement(id);
}


function getValue(id) {

    const element = getInput(id);

    return element?.value?.trim() || "";

}


function setValue(id, value) {

    const element = getInput(id);

    if (element) {
        element.value = value ?? "";
    }

}


function notify(message) {
    alert(message);
}


function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, character => {

        return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[character];

    });

}


function getDateValue(value) {

    if (!value) return "";

    if (typeof value === "string") {
        return value.slice(0, 16);
    }

    if (value.toDate) {

        const date = value.toDate();
        const offset = date.getTimezoneOffset();

        return new Date(date.getTime() - offset * 60000)
            .toISOString()
            .slice(0, 16);

    }

    return "";

}


function formatDate(value) {

    if (!value) return "Not available";

    let date;

    if (value.toDate) {
        date = value.toDate();
    } else {
        date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) {
        return "Not available";
    }

    return date.toLocaleString();

}


// =====================================================
// 4. ADMIN AUTHENTICATION
// =====================================================

onAuthStateChanged(auth, async user => {

    if (!user) {

        window.location.href = "auth.html";
        return;

    }

    try {

        const adminRef = doc(db, "admins", user.uid);
        const adminSnapshot = await getDoc(adminRef);

        if (
            !adminSnapshot.exists() ||
            adminSnapshot.data().role !== "admin"
        ) {

            notify("You do not have administrator access.");

            await signOut(auth);

            window.location.href = "auth.html";

            return;

        }

        currentAdmin = user;

        getElement("adminArea")?.classList.remove("hidden");

        if (!dashboardInitialized) {

            dashboardInitialized = true;

            await initializeDashboard();

        }

    } catch (error) {

        console.error("Admin authentication error:", error);

        notify("Unable to verify administrator access: " + error.message);

    }

});


// =====================================================
// 5. INITIALIZE DASHBOARD
// =====================================================

async function initializeDashboard() {

    setupNavigation();

    setupEventListeners();

    prepareCourseEditorLayout();

    createImportButton();

    await loadAllData();

    showPage("overview");

    console.log("LearnSphere Admin Dashboard Ready.");

}


// =====================================================
// 6. LOAD ALL DATA
// =====================================================

async function loadAllData() {

    const tasks = [

        ["Courses", loadCourses],
        ["Students", loadStudents],
        ["Lessons", loadLessons],
        ["Quizzes", loadQuizzes],
        ["Results", loadResults],
        ["Certificates", loadCertificates],
        ["Instructors", loadInstructors],
        ["Quiz Settings", loadQuizSettings]

    ];

    const failed = [];

    for (const [name, task] of tasks) {

        try {

            await task();

            console.log(name + " loaded.");

        } catch (error) {

            console.error(name + " loading error:", error);

            failed.push(name);

        }

    }

    refreshDashboard();

    if (failed.length) {

        notify(
            "Some information could not load: " +
            failed.join(", ") +
            ". Check your Firestore permissions."
        );

    }

}


// =====================================================
// 7. LOAD COURSES
// =====================================================

async function loadCourses() {

    const snapshot = await getDocs(collection(db, "courses"));

    courses = snapshot.docs.map(item => {

        const data = item.data();

        let published = false;

        if (typeof data.published === "boolean") {
            published = data.published;
        } else if (typeof data.isPublished === "boolean") {
            published = data.isPublished;
        }

        return {
            id: item.id,
            ...data,
            published
        };

    });

}


// =====================================================
// 8. LOAD STUDENTS
// =====================================================

async function loadStudents() {

    const snapshot = await getDocs(collection(db, "students"));

    const uniqueStudents = new Map();

    snapshot.docs.forEach(item => {

        const student = {
            id: item.id,
            ...item.data()
        };

        const key =
            student.uid ||
            student.userId ||
            student.id;

        uniqueStudents.set(key, student);

    });

    students = Array.from(uniqueStudents.values());

}


// =====================================================
// 9. LOAD LESSONS
// =====================================================

async function loadLessons() {

    const snapshot = await getDocs(collection(db, "lessons"));

    lessons = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

}


// =====================================================
// 10. LOAD QUIZZES
// =====================================================

async function loadQuizzes() {

    const snapshot = await getDocs(collection(db, "quizzes"));

    quizzes = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

}


// =====================================================
// 11. LOAD RESULTS
// =====================================================

async function loadResults() {

    const snapshot = await getDocs(collection(db, "results"));

    results = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

}


// =====================================================
// 12. LOAD CERTIFICATES
// =====================================================

async function loadCertificates() {

    const snapshot = await getDocs(collection(db, "certificates"));

    certificates = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

}


// =====================================================
// 13. LOAD INSTRUCTORS
// =====================================================

async function loadInstructors() {

    const snapshot = await getDocs(collection(db, "instructors"));

    instructors = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

}


// =====================================================
// 14. LOAD QUIZ SETTINGS
// =====================================================

async function loadQuizSettings() {

    const snapshot = await getDocs(collection(db, "quizSettings"));

    quizSettings = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

}


// =====================================================
// 15. REFRESH DASHBOARD
// =====================================================

function refreshDashboard() {

    displayCourses();

    displayAllLessons();

    displayAllQuizzes();

    displayStudents();

    displayResults();

    displayCertificates();

    displayInstructors();

    updateStatistics();

    updateCoursePublicationStatus();

}


// =====================================================
// 16. NAVIGATION
// =====================================================

function setupNavigation() {

    document.querySelectorAll(".admin-nav-btn").forEach(button => {

        button.addEventListener("click", () => {

            showPage(button.dataset.page);

        });

    });

}


// =====================================================
// 17. SHOW DASHBOARD PAGE
// =====================================================

function showPage(pageName) {

    const pages = [

        "overview",
        "manageInstructors",
        "manageCourses",
        "manageLessons",
        "manageQuizzes",
        "manageStudents",
        "manageResults",
        "manageCertificates"

    ];

    pages.forEach(page => {

        const section = getElement(page);

        if (section) {

            section.classList.remove("active");
            section.classList.add("hidden");

        }

    });

    getElement("coursePreview")?.classList.add("hidden");

    const selectedPage = getElement(pageName);

    if (!selectedPage) return;

    selectedPage.classList.remove("hidden");
    selectedPage.classList.add("active");

    if (pageName !== "manageCourses") {
        closeCourseEditor();
    }

    document.querySelectorAll(".admin-nav-btn").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === pageName
        );

    });

}


// =====================================================
// 18. COURSE EDITOR LAYOUT
// =====================================================

function prepareCourseEditorLayout() {

    const manageCourses = getElement("manageCourses");
    const courseEditor = getElement("courseEditor");

    if (!manageCourses || !courseEditor) return;

    if (courseEditor.parentElement !== manageCourses) {
        manageCourses.appendChild(courseEditor);
    }

}


function closeCourseEditor() {

    const editor = getElement("courseEditor");
    const courseList = getElement("adminCourseList");

    const toolbar = getElement("manageCourses")
        ?.querySelector(".course-toolbar");

    editor?.classList.add("hidden");
    courseList?.classList.remove("hidden");
    toolbar?.classList.remove("hidden");

}


// =====================================================
// 19. EVENT LISTENERS
// =====================================================

function setupEventListeners() {

    // LOGOUT

    getElement("adminLogoutBtn")?.addEventListener("click", async () => {

        try {

            await signOut(auth);

            window.location.href = "auth.html";

        } catch (error) {

            notify("Unable to log out: " + error.message);

        }

    });


    // COURSE MANAGEMENT

    getElement("addNewCourseBtn")?.addEventListener("click", () => {
        openCourseEditor();
    });

    getElement("backToCoursesBtn")?.addEventListener("click", closeCourseEditor);

    getElement("editCourseForm")?.addEventListener("submit", saveCourse);

    getElement("courseScheduleForm")?.addEventListener(
        "submit",
        saveCourseSchedule
    );


    // LESSON MANAGEMENT

    getElement("editorLessonForm")?.addEventListener(
        "submit",
        saveLesson
    );

    getElement("cancelLessonEditBtn")?.addEventListener(
        "click",
        resetLessonForm
    );


    // QUIZ MANAGEMENT

    getElement("editorQuizForm")?.addEventListener(
        "submit",
        saveQuiz
    );

    getElement("editorQuizSettingsForm")?.addEventListener(
        "submit",
        saveQuizSettings
    );

    getElement("cancelQuizEditBtn")?.addEventListener(
        "click",
        resetQuizQuestionForm
    );

    getElement("editorQuizType")?.addEventListener(
        "change",
        updateQuizTypeDisplay
    );


    // SEARCH

    getElement("adminCourseSearch")?.addEventListener(
        "input",
        displayCourses
    );

    getElement("adminCourseFilter")?.addEventListener(
        "change",
        displayCourses
    );

    getElement("adminStudentSearch")?.addEventListener(
        "input",
        displayStudents
    );

    getElement("adminResultSearch")?.addEventListener(
        "input",
        displayResults
    );

    getElement("adminCertificateSearch")?.addEventListener(
        "input",
        displayCertificates
    );

    getElement("adminInstructorSearch")?.addEventListener(
        "input",
        displayInstructors
    );

    getElement("adminInstructorFilter")?.addEventListener(
        "change",
        displayInstructors
    );


    // REFRESH INSTRUCTORS

    getElement("refreshInstructorsBtn")?.addEventListener(
        "click",
        async () => {

            try {

                await loadInstructors();

                displayInstructors();

                notify("Instructor applications refreshed.");

            } catch (error) {

                notify("Unable to refresh instructors: " + error.message);

            }

        }
    );


    // COURSE PUBLICATION

    getElement("publishEditorCourseBtn")?.addEventListener(
        "click",
        () => changeCourseStatus(true)
    );

    getElement("unpublishCourseBtn")?.addEventListener(
        "click",
        () => changeCourseStatus(false)
    );

    getElement("previewCourseBtn")?.addEventListener(
        "click",
        previewCourse
    );

    getElement("closePreviewBtn")?.addEventListener("click", () => {
        getElement("coursePreview")?.classList.add("hidden");
    });

}


// =====================================================
// 20. DISPLAY COURSES
// =====================================================

function displayCourses() {

    const container = getElement("adminCourseList");

    if (!container) return;

    const search = getValue("adminCourseSearch").toLowerCase();

    const filter = getElement("adminCourseFilter")?.value || "all";

    const filteredCourses = courses.filter(course => {

        const title = String(course.title || "").toLowerCase();

        const department = String(course.department || "").toLowerCase();

        const matchesSearch =
            title.includes(search) ||
            department.includes(search);

        const matchesFilter =
            filter === "all" ||
            (filter === "published" && course.published) ||
            (filter === "unpublished" && !course.published);

        return matchesSearch && matchesFilter;

    });

    if (!filteredCourses.length) {

        container.innerHTML = `
            <div class="empty-message">
                <h3>No Courses Found</h3>
                <p>No courses match your search.</p>
            </div>
        `;

        return;

    }

    container.innerHTML = filteredCourses.map(course => {

        const lessonCount = lessons.filter(
            lesson => lesson.courseId === course.id
        ).length;

        const quizCount = quizzes.filter(
            quiz => quiz.courseId === course.id
        ).length;

        return `

            <div class="admin-course-card">

                ${course.image ? `
                    <img
                        src="${escapeHTML(course.image)}"
                        alt="${escapeHTML(course.title)}"
                    >
                ` : ""}

                <h3>${escapeHTML(course.title)}</h3>

                <p>Department: ${escapeHTML(course.department || "Not specified")}</p>

                <p>Category: ${escapeHTML(course.category || "Not specified")}</p>

                <p>Level: ${escapeHTML(course.level || "Not specified")}</p>

                <p>Lessons: ${lessonCount}</p>

                <p>Quiz Questions: ${quizCount}</p>

                <p>
                    Status:
                    <strong>
                        ${course.published ? "Published" : "Unpublished"}
                    </strong>
                </p>

                <button
                    type="button"
                    onclick="editCourse('${escapeHTML(course.id)}')"
                >
                    Edit Course
                </button>

                <button
                    type="button"
                    onclick="removeCourse('${escapeHTML(course.id)}')"
                >
                    Delete Course
                </button>

            </div>

        `;

    }).join("");

}


// =====================================================
// 21. OPEN COURSE EDITOR
// =====================================================

function openCourseEditor(course = null) {

    prepareCourseEditorLayout();

    currentCourseId = course?.id || null;
    activeQuizId = null;

    showPage("manageCourses");

    const editor = getElement("courseEditor");
    const courseList = getElement("adminCourseList");

    const toolbar = getElement("manageCourses")
        ?.querySelector(".course-toolbar");

    courseList?.classList.add("hidden");
    toolbar?.classList.add("hidden");
    editor?.classList.remove("hidden");

    getElement("editCourseForm")?.reset();
    getElement("editorLessonForm")?.reset();
    getElement("editorQuizForm")?.reset();
    getElement("editorQuizSettingsForm")?.reset();

    if (getElement("editorLessonPublished")) {
        getElement("editorLessonPublished").checked = true;
    }

    if (getElement("editorQuizPublished")) {
        getElement("editorQuizPublished").checked = false;
    }

    setValue("editCourseId", course?.id);
    setValue("editCourseTitle", course?.title);
    setValue("editCourseCategory", course?.category);
    setValue("editCourseDepartment", course?.department);
    setValue("editCourseLevel", course?.level);
    setValue("editCourseDescription", course?.description);
    setValue("editCourseImage", course?.image);

    const title = getElement("editorCourseTitle");

    if (title) {
        title.textContent = course
            ? "Edit Course: " + course.title
            : "Create New Course";
    }

    setValue("editorLessonCourseId", course?.id);
    setValue("editorQuizCourseId", course?.id);
    setValue("editorSettingsCourseId", course?.id);

    setValue("editCourseOpeningDate", course?.openingDateTime);
    setValue("editCourseClosingDate", course?.closingDateTime);

    resetLessonForm();
    resetQuizQuestionForm();

    updateCoursePublicationStatus();

    displayEditorLessons();
    displayEditorQuizzes();

    populateLessonSelector();

    updateQuizTypeDisplay();

    updateScheduleStatus();

}


// =====================================================
// 22. EDIT COURSE
// =====================================================

window.editCourse = function(courseId) {

    const course = courses.find(item => item.id === courseId);

    if (!course) {
        notify("Course not found.");
        return;
    }

    openCourseEditor(course);

};


// =====================================================
// 23. SAVE COURSE
// =====================================================

async function saveCourse(event) {

    event.preventDefault();

    const courseId = getValue("editCourseId");
    const title = getValue("editCourseTitle");

    if (!title) {
        notify("Please enter a course title.");
        return;
    }

    const courseData = {

        title,
        category: getValue("editCourseCategory"),
        department: getValue("editCourseDepartment"),
        level: getValue("editCourseLevel"),
        description: getValue("editCourseDescription"),
        image: getValue("editCourseImage"),
        updatedAt: serverTimestamp()

    };

    try {

        if (courseId) {

            await updateDoc(
                doc(db, "courses", courseId),
                courseData
            );

            notify("Course updated successfully.");

        } else {

            courseData.published = false;
            courseData.isPublished = false;
            courseData.createdAt = serverTimestamp();

            const newCourse = await addDoc(
                collection(db, "courses"),
                courseData
            );

            currentCourseId = newCourse.id;

            setValue("editCourseId", newCourse.id);
            setValue("editorLessonCourseId", newCourse.id);
            setValue("editorQuizCourseId", newCourse.id);
            setValue("editorSettingsCourseId", newCourse.id);

            notify("Course created successfully. It is unpublished.");

        }

        await loadCourses();

        refreshDashboard();

        const editorTitle = getElement("editorCourseTitle");

        if (editorTitle) {
            editorTitle.textContent = title;
        }

    } catch (error) {

        console.error("Save course error:", error);

        notify("Unable to save course: " + error.message);

    }

}


// =====================================================
// 24. DELETE COURSE
// =====================================================

window.removeCourse = async function(courseId) {

    const course = courses.find(item => item.id === courseId);

    if (!course) return;

    if (!confirm(
        `Delete "${course.title}" and all its lessons and quizzes?`
    )) return;

    try {

        const relatedLessons = lessons.filter(
            item => item.courseId === courseId
        );

        const relatedQuizzes = quizzes.filter(
            item => item.courseId === courseId
        );

        const relatedSettings = quizSettings.filter(
            item => item.courseId === courseId
        );

        const references = [

            doc(db, "courses", courseId),

            ...relatedLessons.map(item =>
                doc(db, "lessons", item.id)
            ),

            ...relatedQuizzes.map(item =>
                doc(db, "quizzes", item.id)
            ),

            ...relatedSettings.map(item =>
                doc(db, "quizSettings", item.id)
            )

        ];

        for (let i = 0; i < references.length; i += 450) {

            const batch = writeBatch(db);

            references.slice(i, i + 450).forEach(reference => {
                batch.delete(reference);
            });

            await batch.commit();

        }

        await loadCourses();
        await loadLessons();
        await loadQuizzes();
        await loadQuizSettings();

        refreshDashboard();

        closeCourseEditor();

        notify("Course and its lessons and quizzes deleted successfully.");

    } catch (error) {

        console.error("Delete course error:", error);

        notify("Unable to delete course: " + error.message);

    }

};


// =====================================================
// 25. PUBLISH / UNPUBLISH COURSE
// =====================================================

async function changeCourseStatus(status) {

    const courseId = getValue("editCourseId");

    if (!courseId) {
        notify("Save the course before publishing it.");
        return;
    }

    try {

        await updateDoc(
            doc(db, "courses", courseId),
            {
                published: status,
                isPublished: status,
                updatedAt: serverTimestamp()
            }
        );

        await loadCourses();

        refreshDashboard();

        updateCoursePublicationStatus();

        notify(
            status
                ? "Course published successfully."
                : "Course unpublished successfully."
        );

    } catch (error) {

        console.error("Publication error:", error);

        notify("Unable to update course status: " + error.message);

    }

}


// =====================================================
// 26. COURSE PUBLICATION STATUS
// =====================================================

function updateCoursePublicationStatus() {

    const statusElement = getElement("coursePublishStatus");

    if (!statusElement) return;

    const courseId = getValue("editCourseId");

    const course = courses.find(item => item.id === courseId);

    statusElement.textContent = course?.published
        ? "Published"
        : "Unpublished";

}


// =====================================================
// 27. COURSE SCHEDULE
// =====================================================

async function saveCourseSchedule(event) {

    event.preventDefault();

    const courseId = getValue("editCourseId");

    if (!courseId) {
        notify("Save the course before setting its schedule.");
        return;
    }

    const openingDate = getValue("editCourseOpeningDate");
    const closingDate = getValue("editCourseClosingDate");

    if (
        openingDate &&
        closingDate &&
        new Date(closingDate) <= new Date(openingDate)
    ) {

        notify("Closing date must be later than opening date.");
        return;

    }

    try {

        await updateDoc(
            doc(db, "courses", courseId),
            {
                openingDateTime: openingDate,
                closingDateTime: closingDate,
                updatedAt: serverTimestamp()
            }
        );

        await loadCourses();

        updateScheduleStatus();

        notify("Course schedule saved successfully.");

    } catch (error) {

        console.error("Schedule error:", error);

        notify("Unable to save schedule: " + error.message);

    }

}


function updateScheduleStatus() {

    const status = getElement("courseScheduleStatus");

    if (!status) return;

    const course = courses.find(
        item => item.id === getValue("editCourseId")
    );

    if (!course) {

        status.textContent = "Save the course before setting a schedule.";
        return;

    }

    status.textContent =
        "Opening: " +
        (course.openingDateTime || "Not set") +
        " | Closing: " +
        (course.closingDateTime || "Not set");

}


// =====================================================
// 28. IMPORT COURSE CATALOGUE BUTTON
// =====================================================

function createImportButton() {

    const container = getElement("manageCourses");

    if (!container || getElement("importCatalogueBtn")) return;

    const button = document.createElement("button");

    button.id = "importCatalogueBtn";
    button.className = "primary-btn";
    button.textContent = "Import Course Catalogue";

    const toolbar = container.querySelector(".course-toolbar");

    if (toolbar) {
        toolbar.appendChild(button);
    } else {
        container.prepend(button);
    }

    button.addEventListener("click", importCourseCatalogue);

}


// =====================================================
// 29. IMPORT COURSE CATALOGUE
// =====================================================

async function importCourseCatalogue() {

    const catalogue = window.learnSphereCourseCatalog || [];

    if (!catalogue.length) {

        notify("Course catalogue is empty or course-catalog.js is missing.");
        return;

    }

    if (!confirm(
        "Import missing catalogue courses and set catalogue courses to Unpublished?"
    )) return;

    try {

        const snapshot = await getDocs(collection(db, "courses"));

        const existing = new Map(
            snapshot.docs.map(item => [item.id, item.data()])
        );

        let imported = 0;
        let updated = 0;

        let batch = writeBatch(db);
        let operations = 0;

        async function commitBatch() {

            if (operations > 0) {

                await batch.commit();

                batch = writeBatch(db);
                operations = 0;

            }

        }

        for (let index = 0; index < catalogue.length; index++) {

            const course = catalogue[index];
            const courseId = `catalogue_${index}`;

            const reference = doc(db, "courses", courseId);

            if (existing.has(courseId)) {

                const data = existing.get(courseId);

                if (
                    data.published !== false ||
                    data.isPublished !== false
                ) {

                    batch.update(reference, {
                        published: false,
                        isPublished: false,
                        updatedAt: serverTimestamp()
                    });

                    updated++;
                    operations++;

                }

            } else {

                batch.set(reference, {
                    ...course,
                    published: false,
                    isPublished: false,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                imported++;
                operations++;

            }

            if (operations >= 450) {
                await commitBatch();
            }

        }

        await commitBatch();

        await loadCourses();

        refreshDashboard();

        notify(
            "Catalogue import completed!\n\n" +
            "New courses: " + imported + "\n" +
            "Reset to unpublished: " + updated
        );

    } catch (error) {

        console.error("Catalogue import error:", error);

        notify("Catalogue import failed: " + error.message);

    }

}


// =====================================================
// 30. LESSON SELECTOR FOR QUIZZES
// =====================================================

function populateLessonSelector() {

    const selector = getElement("editorQuizLessonId");

    if (!selector) return;

    const courseLessons = lessons.filter(
        item => item.courseId === currentCourseId
    );

    selector.innerHTML = `
        <option value="">Select a lesson</option>
        ${courseLessons.map(lesson => `
            <option value="${escapeHTML(lesson.id)}">
                ${escapeHTML(lesson.title)}
            </option>
        `).join("")}
    `;

}


function updateQuizTypeDisplay() {

    const type = getElement("editorQuizType")?.value || "course";

    const group = getElement("lessonQuizSelectorGroup");

    if (group) {
        group.style.display = type === "lesson" ? "block" : "none";
    }

}


// =====================================================
// 31. SAVE QUIZ SETTINGS
// =====================================================

async function saveQuizSettings(event) {

    event.preventDefault();

    const courseId = getValue("editorSettingsCourseId");

    if (!courseId) {

        notify("Save the course before configuring its quiz.");
        return;

    }

    const title = getValue("editorQuizTitle");

    const type = getValue("editorQuizType") || "course";

    const lessonId = getValue("editorQuizLessonId");

    const timeLimit = Number(getValue("editorQuizTimeLimit") || 0);

    const maxAttempts = Number(getValue("editorQuizMaxAttempts") || 1);

    const questionLimitValue = getValue("editorQuizQuestionLimit");

    const questionLimit = questionLimitValue
        ? Number(questionLimitValue)
        : 0;

    const openingDate = getValue("editorQuizOpeningDate");

    const closingDate = getValue("editorQuizClosingDate");

    if (type === "lesson" && !lessonId) {

        notify("Select the lesson this quiz belongs to.");
        return;

    }

    if (type === "lesson") {

        const selectedLesson = lessons.find(
            item => item.id === lessonId && item.courseId === courseId
        );

        if (!selectedLesson) {

            notify("The selected lesson does not belong to this course.");
            return;

        }

    }

    if (
        !Number.isInteger(timeLimit) ||
        timeLimit < 0
    ) {

        notify("Enter a valid time limit. Use 0 for no time limit.");
        return;

    }

    if (
        !Number.isInteger(maxAttempts) ||
        maxAttempts < 1
    ) {

        notify("Maximum attempts must be at least 1.");
        return;

    }

    if (
        questionLimitValue &&
        (!Number.isInteger(questionLimit) || questionLimit < 1)
    ) {

        notify("Enter a valid number of questions.");
        return;

    }

    if (
        openingDate &&
        closingDate &&
        new Date(closingDate) <= new Date(openingDate)
    ) {

        notify("Quiz closing date must be later than its opening date.");
        return;

    }

    const settingsData = {

        courseId,

        title: title || "Course Quiz",

        type,

        lessonId: type === "lesson" ? lessonId : null,

        instructions: getValue("editorQuizInstructions"),

        timeLimitMinutes: timeLimit,

        maxAttempts,

        questionLimit,

        openingDateTime: openingDate,

        closingDateTime: closingDate,

        shuffleQuestions: Boolean(
            getElement("editorShuffleQuestions")?.checked
        ),

        shuffleOptions: Boolean(
            getElement("editorShuffleOptions")?.checked
        ),

        published: Boolean(
            getElement("editorQuizPublished")?.checked
        ),

        updatedAt: serverTimestamp(),

        updatedBy: currentAdmin.uid

    };

    try {

        let settingsId = activeQuizId;

        if (settingsId) {

            await updateDoc(
                doc(db, "quizSettings", settingsId),
                settingsData
            );

        } else {

            settingsData.createdAt = serverTimestamp();
            settingsData.createdBy = currentAdmin.uid;

            const newSettings = await addDoc(
                collection(db, "quizSettings"),
                settingsData
            );

            settingsId = newSettings.id;
            activeQuizId = settingsId;

        }

        setValue("editorQuizId", settingsId);

        await loadQuizSettings();

        updateQuizSettingsStatus();

        notify(
            "Quiz settings saved successfully.\n\n" +
            "Add the questions for this quiz below."
        );

    } catch (error) {

        console.error("Quiz settings error:", error);

        notify("Unable to save quiz settings: " + error.message);

    }

}


function updateQuizSettingsStatus() {

    const status = getElement("quizSettingsStatus");

    if (!status) return;

    const settings = quizSettings.find(
        item => item.id === activeQuizId
    );

    if (!settings) {

        status.textContent = "Configure your quiz settings.";
        return;

    }

    status.textContent =
        "Quiz: " + (settings.title || "Course Quiz") +
        " | Time limit: " + settings.timeLimitMinutes + " minutes" +
        " | Attempts: " + settings.maxAttempts +
        " | Status: " + (settings.published ? "Published" : "Unpublished");

}


// =====================================================
// 32. DISPLAY EDITOR LESSONS
// =====================================================

function displayEditorLessons() {

    const container = getElement("editorLessonList");

    if (!container) return;

    const courseLessons = lessons.filter(
        item => item.courseId === currentCourseId
    );

    if (!courseLessons.length) {

        container.innerHTML = "<p>No lessons added yet.</p>";
        populateLessonSelector();
        return;

    }

    container.innerHTML = courseLessons.map(lesson => `

        <div class="admin-item">

            <h4>${escapeHTML(lesson.title)}</h4>

            <p>${escapeHTML(lesson.description || "")}</p>

            <p>
                Publication:
                <strong>
                    ${lesson.published === false ? "Unpublished" : "Published"}
                </strong>
            </p>

            <button
                type="button"
                onclick="editLesson('${escapeHTML(lesson.id)}')"
            >
                Edit Lesson
            </button>

            <button
                type="button"
                onclick="deleteLesson('${escapeHTML(lesson.id)}')"
            >
                Delete Lesson
            </button>

        </div>

    `).join("");

    populateLessonSelector();

}


// =====================================================
// 33. RESET LESSON FORM
// =====================================================

function resetLessonForm() {

    const form = getElement("editorLessonForm");

    if (!form) return;

    form.reset();

    setValue("editorLessonCourseId", currentCourseId);
    setValue("editorLessonId", "");

    delete form.dataset.editingId;

    if (getElement("editorLessonPublished")) {
        getElement("editorLessonPublished").checked = true;
    }

}


// =====================================================
// 34. SAVE LESSON
// =====================================================

async function saveLesson(event) {

    event.preventDefault();

    const courseId = getValue("editorLessonCourseId");

    if (!courseId) {

        notify("Save the course before adding lessons.");
        return;

    }

    const title = getValue("editorLessonTitle");

    if (!title) {

        notify("Enter a lesson title.");
        return;

    }

    const form = getElement("editorLessonForm");

    const lessonId =
        getValue("editorLessonId") ||
        form?.dataset.editingId ||
        "";

    const lessonData = {

        courseId,

        title,

        description: getValue("editorLessonDescription"),

        instructions: getValue("editorLessonInstructions"),

        content: getValue("editorLessonContent"),

        pdf: getValue("editorLessonPDF"),

        video: getValue("editorLessonVideo"),

        published: Boolean(
            getElement("editorLessonPublished")?.checked
        ),

        updatedAt: serverTimestamp()

    };

    try {

        if (lessonId) {

            await updateDoc(
                doc(db, "lessons", lessonId),
                lessonData
            );

            notify("Lesson updated successfully.");

        } else {

            lessonData.createdAt = serverTimestamp();

            await addDoc(
                collection(db, "lessons"),
                lessonData
            );

            notify("Lesson added successfully.");

        }

        resetLessonForm();

        await loadLessons();

        refreshDashboard();

        displayEditorLessons();

    } catch (error) {

        console.error("Lesson save error:", error);

        notify("Unable to save lesson: " + error.message);

    }

}


// =====================================================
// 35. EDIT LESSON
// =====================================================

window.editLesson = function(lessonId) {

    const lesson = lessons.find(item => item.id === lessonId);

    if (!lesson) {

        notify("Lesson not found.");
        return;

    }

    const form = getElement("editorLessonForm");

    if (!form) return;

    form.dataset.editingId = lessonId;

    setValue("editorLessonId", lessonId);
    setValue("editorLessonCourseId", lesson.courseId);
    setValue("editorLessonTitle", lesson.title);
    setValue("editorLessonDescription", lesson.description);
    setValue("editorLessonInstructions", lesson.instructions);
    setValue("editorLessonContent", lesson.content);
    setValue("editorLessonPDF", lesson.pdf);
    setValue("editorLessonVideo", lesson.video);

    if (getElement("editorLessonPublished")) {
        getElement("editorLessonPublished").checked =
            lesson.published !== false;
    }

    notify("Edit the lesson details and click Save Lesson.");

};


// =====================================================
// 36. DELETE LESSON
// =====================================================

window.deleteLesson = async function(lessonId) {

    if (!confirm("Delete this lesson?")) return;

    try {

        await deleteDoc(doc(db, "lessons", lessonId));

        await loadLessons();

        refreshDashboard();

        displayEditorLessons();

        notify("Lesson deleted successfully.");

    } catch (error) {

        console.error("Delete lesson error:", error);

        notify("Unable to delete lesson: " + error.message);

    }

};


// =====================================================
// 37. DISPLAY EDITOR QUIZZES
// =====================================================

function displayEditorQuizzes() {

    const container = getElement("editorQuizList");

    if (!container) return;

    const courseQuizzes = quizzes.filter(
        item => item.courseId === currentCourseId
    );

    if (!courseQuizzes.length) {

        container.innerHTML = "<p>No quiz questions added yet.</p>";

        updateQuizSummary([]);
        return;

    }

    container.innerHTML = courseQuizzes.map((quiz, index) => {

        const settings = quizSettings.find(
            item => item.id === quiz.quizId
        );

        return `

            <div class="admin-item">

                <h4>${index + 1}. ${escapeHTML(quiz.question || quiz.questionText)}</h4>

                <p>Quiz: ${escapeHTML(settings?.title || "Legacy / General Quiz")}</p>

                <p>Marks: ${escapeHTML(quiz.marks ?? 1)}</p>

                <button
                    type="button"
                    onclick="editQuiz('${escapeHTML(quiz.id)}')"
                >
                    Edit Question
                </button>

                <button
                    type="button"
                    onclick="deleteQuiz('${escapeHTML(quiz.id)}')"
                >
                    Delete Question
                </button>

            </div>

        `;

    }).join("");

    updateQuizSummary(courseQuizzes);

}


// =====================================================
// 38. QUIZ MARK SUMMARY
// =====================================================

function updateQuizSummary(questionList) {

    const count = getElement("editorQuizQuestionCount");
    const total = getElement("editorQuizTotalMarks");

    const questions = questionList || [];

    const totalMarks = questions.reduce(
        (sum, question) => sum + Number(question.marks || 1),
        0
    );

    if (count) {
        count.textContent = questions.length;
    }

    if (total) {
        total.textContent = totalMarks;
    }

}


// =====================================================
// 39. RESET QUIZ QUESTION FORM
// =====================================================

function resetQuizQuestionForm() {

    const form = getElement("editorQuizForm");

    if (!form) return;

    form.reset();

    delete form.dataset.editingId;

    setValue("editorQuizCourseId", currentCourseId);
    setValue("editorQuizId", activeQuizId);

    setValue("editorQuestionMark", "1");

}


// =====================================================
// 40. SAVE QUIZ QUESTION
// =====================================================

async function saveQuiz(event) {

    event.preventDefault();

    const courseId = getValue("editorQuizCourseId");

    if (!courseId) {

        notify("Save the course before adding quiz questions.");
        return;

    }

    const question = getValue("editorQuestionText");

    const options = [

        getValue("editorOptionA"),
        getValue("editorOptionB"),
        getValue("editorOptionC"),
        getValue("editorOptionD")

    ];

    const correctAnswer = Number(
        getValue("editorCorrectAnswer")
    );

    const marks = Number(
        getValue("editorQuestionMark") || 1
    );

    if (!question || options.some(option => !option)) {

        notify("Complete the question and all four options.");
        return;

    }

    if (![0, 1, 2, 3].includes(correctAnswer)) {

        notify("Select the correct answer.");
        return;

    }

    if (!Number.isFinite(marks) || marks <= 0) {

        notify("Enter valid marks for this question.");
        return;

    }

    const form = getElement("editorQuizForm");

    const questionDocumentId =
        form?.dataset.editingId || "";

    const selectedQuizId = getValue("editorQuizId") || activeQuizId || null;

    const settings = quizSettings.find(
        item => item.id === selectedQuizId
    );

    const quizData = {

        courseId,

        quizId: selectedQuizId,

        lessonId: settings?.lessonId || null,

        question,

        questionText: question,

        options,

        correctAnswer,

        marks,

        updatedAt: serverTimestamp()

    };

    try {

        if (questionDocumentId) {

            await updateDoc(
                doc(db, "quizzes", questionDocumentId),
                quizData
            );

            notify("Quiz question updated successfully.");

        } else {

            quizData.createdAt = serverTimestamp();

            await addDoc(
                collection(db, "quizzes"),
                quizData
            );

            notify("Quiz question added successfully.");

        }

        resetQuizQuestionForm();

        await loadQuizzes();

        refreshDashboard();

        displayEditorQuizzes();

    } catch (error) {

        console.error("Quiz save error:", error);

        notify("Unable to save quiz: " + error.message);

    }

}


// =====================================================
// 41. EDIT QUIZ QUESTION
// =====================================================

window.editQuiz = function(quizId) {

    const quiz = quizzes.find(item => item.id === quizId);

    if (!quiz) {

        notify("Quiz question not found.");
        return;

    }

    const form = getElement("editorQuizForm");

    if (!form) return;

    form.dataset.editingId = quizId;

    const options = Array.isArray(quiz.options)
        ? quiz.options
        : [];

    setValue("editorQuizCourseId", quiz.courseId);
    setValue("editorQuizId", quiz.quizId || "");

    setValue("editorQuestionText", quiz.question || quiz.questionText);

    setValue("editorOptionA", options[0]);
    setValue("editorOptionB", options[1]);
    setValue("editorOptionC", options[2]);
    setValue("editorOptionD", options[3]);

    setValue("editorCorrectAnswer", quiz.correctAnswer);
    setValue("editorQuestionMark", quiz.marks ?? 1);

    activeQuizId = quiz.quizId || null;

    notify("Edit the question and click Save Quiz Question.");

};


// =====================================================
// 42. DELETE QUIZ QUESTION
// =====================================================

window.deleteQuiz = async function(quizId) {

    if (!confirm("Delete this quiz question?")) return;

    try {

        await deleteDoc(doc(db, "quizzes", quizId));

        await loadQuizzes();

        refreshDashboard();

        displayEditorQuizzes();

        notify("Quiz question deleted successfully.");

    } catch (error) {

        console.error("Delete quiz error:", error);

        notify("Unable to delete quiz: " + error.message);

    }

};


// =====================================================
// 43. COURSE PREVIEW
// =====================================================

function previewCourse() {

    const title = getValue("editCourseTitle");
    const description = getValue("editCourseDescription");
    const category = getValue("editCourseCategory");
    const department = getValue("editCourseDepartment");
    const level = getValue("editCourseLevel");
    const image = getValue("editCourseImage");

    const container = getElement("coursePreviewContent");

    if (!container) return;

    container.innerHTML = `

        ${image ? `
            <img
                src="${escapeHTML(image)}"
                alt="${escapeHTML(title)}"
            >
        ` : ""}

        <h2>${escapeHTML(title)}</h2>

        <p>${escapeHTML(description)}</p>

        <p>Category: ${escapeHTML(category)}</p>

        <p>Department: ${escapeHTML(department)}</p>

        <p>Level: ${escapeHTML(level)}</p>

    `;

    getElement("coursePreview")?.classList.remove("hidden");

}


// =====================================================
// 44. DISPLAY ALL LESSONS
// =====================================================

function displayAllLessons() {

    const container = getElement("adminLessonList");

    if (!container) return;

    if (!lessons.length) {

        container.innerHTML = "<p>No lessons available yet.</p>";
        return;

    }

    container.innerHTML = lessons.map(lesson => {

        const course = courses.find(
            item => item.id === lesson.courseId
        );

        return `

            <div class="admin-item">

                <h3>${escapeHTML(lesson.title)}</h3>

                <p>Course: ${escapeHTML(course?.title || "Unknown Course")}</p>

                <p>${escapeHTML(lesson.description || "")}</p>

                <p>
                    Status:
                    ${lesson.published === false ? "Unpublished" : "Published"}
                </p>

                <button
                    type="button"
                    onclick="editCourse('${escapeHTML(lesson.courseId)}')"
                >
                    Open Course
                </button>

                <button
                    type="button"
                    onclick="deleteLesson('${escapeHTML(lesson.id)}')"
                >
                    Delete Lesson
                </button>

            </div>

        `;

    }).join("");

}


// =====================================================
// 45. DISPLAY ALL QUIZZES
// =====================================================

function displayAllQuizzes() {

    const container = getElement("adminQuizList");

    if (!container) return;

    if (!quizzes.length) {

        container.innerHTML = "<p>No quizzes available yet.</p>";
        return;

    }

    container.innerHTML = quizzes.map(quiz => {

        const course = courses.find(
            item => item.id === quiz.courseId
        );

        const settings = quizSettings.find(
            item => item.id === quiz.quizId
        );

        return `

            <div class="admin-item">

                <h3>${escapeHTML(quiz.question || quiz.questionText)}</h3>

                <p>Course: ${escapeHTML(course?.title || "Unknown Course")}</p>

                <p>Quiz: ${escapeHTML(settings?.title || "Legacy / General Quiz")}</p>

                <p>Marks: ${escapeHTML(quiz.marks ?? 1)}</p>

                <ol>
                    ${(quiz.options || []).map(option => `
                        <li>${escapeHTML(option)}</li>
                    `).join("")}
                </ol>

                <button
                    type="button"
                    onclick="editQuiz('${escapeHTML(quiz.id)}')"
                >
                    Edit Question
                </button>

                <button
                    type="button"
                    onclick="deleteQuiz('${escapeHTML(quiz.id)}')"
                >
                    Delete Quiz
                </button>

            </div>

        `;

    }).join("");

}


// =====================================================
// 46. DISPLAY STUDENTS
// =====================================================

function displayStudents() {

    const container = getElement("adminStudentList");

    if (!container) return;

    const search = getValue("adminStudentSearch").toLowerCase();

    const filtered = students.filter(student => {

        return (

            String(student.fullName || "").toLowerCase().includes(search) ||

            String(student.email || "").toLowerCase().includes(search) ||

            String(student.department || "").toLowerCase().includes(search) ||

            String(student.level || "").toLowerCase().includes(search)

        );

    });

    if (!filtered.length) {

        container.innerHTML = "<p>No students found.</p>";
        return;

    }

    container.innerHTML = filtered.map(student => `

        <div class="admin-item">

            <h3>${escapeHTML(student.fullName || "Unnamed Student")}</h3>

            <p>Email: ${escapeHTML(student.email || "Not available")}</p>

            <p>University: ${escapeHTML(student.university || "Not available")}</p>

            <p>Department: ${escapeHTML(student.department || "Not available")}</p>

            <p>Level: ${escapeHTML(student.level || "Not available")}</p>

        </div>

    `).join("");

}


// =====================================================
// 47. DISPLAY RESULTS
// =====================================================

function displayResults() {

    const container = getElement("adminResultList");

    if (!container) return;

    const search = getValue("adminResultSearch").toLowerCase();

    const filtered = results.filter(result => {

        const student = students.find(
            item => item.id === result.studentId
        );

        const course = courses.find(
            item => item.id === result.courseId
        );

        return (

            String(student?.fullName || result.studentName || "")
                .toLowerCase().includes(search) ||

            String(course?.title || result.courseTitle || "")
                .toLowerCase().includes(search)

        );

    });

    if (!filtered.length) {

        container.innerHTML = "<p>No student results found.</p>";
        return;

    }

    container.innerHTML = filtered.map(result => {

        const student = students.find(
            item => item.id === result.studentId
        );

        const course = courses.find(
            item => item.id === result.courseId
        );

        return `

            <div class="admin-item">

                <h3>${escapeHTML(student?.fullName || result.studentName || "Unknown Student")}</h3>

                <p>Course: ${escapeHTML(course?.title || result.courseTitle || "Unknown Course")}</p>

                <p>Score: ${escapeHTML(result.score ?? "Not available")}</p>

                <p>Percentage: ${escapeHTML(result.percentage ?? "Not available")}%</p>

                <p>Status: ${result.passed ? "Passed" : "Not passed"}</p>

                <button
                    type="button"
                    onclick="editResult('${escapeHTML(result.id)}')"
                >
                    Edit Marks
                </button>

            </div>

        `;

    }).join("");

}


// =====================================================
// 48. EDIT STUDENT MARKS
// =====================================================

window.editResult = async function(resultId) {

    const result = results.find(item => item.id === resultId);

    if (!result) {

        notify("Result not found.");
        return;

    }

    const totalMarks = Number(
        result.totalMarks ||
        result.totalQuestions ||
        0
    );

    if (!totalMarks || totalMarks <= 0) {

        notify(
            "This result does not contain a valid totalMarks or totalQuestions value."
        );

        return;

    }

    const newScore = prompt(
        `Enter the new score for ${result.studentName || "this student"}.\nMaximum: ${totalMarks}`,
        result.score ?? 0
    );

    if (newScore === null) return;

    const score = Number(newScore);

    if (
        !Number.isFinite(score) ||
        score < 0 ||
        score > totalMarks
    ) {

        notify("Enter a valid score between 0 and " + totalMarks);
        return;

    }

    const percentage = Math.round((score / totalMarks) * 100);
    const passed = percentage >= 70;

    try {

        await updateDoc(
            doc(db, "results", resultId),
            {
                score,
                percentage,
                passed,
                updatedAt: serverTimestamp(),
                updatedBy: currentAdmin.uid
            }
        );

        await loadResults();

        displayResults();

        notify(
            "Student marks updated successfully.\n\n" +
            "Score: " + score + "/" + totalMarks + "\n" +
            "Percentage: " + percentage + "%\n" +
            "Status: " + (passed ? "Passed" : "Not passed")
        );

    } catch (error) {

        console.error("Edit result error:", error);

        notify("Unable to update marks: " + error.message);

    }

};


// =====================================================
// 49. DISPLAY CERTIFICATES
// =====================================================

function displayCertificates() {

    const container = getElement("adminCertificateList");

    if (!container) return;

    const search = getValue("adminCertificateSearch").toLowerCase();

    const filtered = certificates.filter(certificate => {

        const student = students.find(
            item => item.id === certificate.studentId
        );

        const course = courses.find(
            item => item.id === certificate.courseId
        );

        return (

            String(student?.fullName || certificate.studentName || "")
                .toLowerCase().includes(search) ||

            String(course?.title || certificate.courseTitle || "")
                .toLowerCase().includes(search) ||

            String(certificate.id).toLowerCase().includes(search)

        );

    });

    if (!filtered.length) {

        container.innerHTML = "<p>No certificates found.</p>";
        return;

    }

    container.innerHTML = filtered.map(certificate => {

        const student = students.find(
            item => item.id === certificate.studentId
        );

        const course = courses.find(
            item => item.id === certificate.courseId
        );

        return `

            <div class="admin-item">

                <h3>${escapeHTML(student?.fullName || certificate.studentName || "Unknown Student")}</h3>

                <p>Course: ${escapeHTML(course?.title || certificate.courseTitle || "Unknown Course")}</p>

                <p>Certificate ID: ${escapeHTML(certificate.id)}</p>

                <p>Status: ${certificate.revoked ? "Revoked" : "Valid"}</p>

                <button
                    type="button"
                    onclick="editCertificate('${escapeHTML(certificate.id)}')"
                >
                    Edit Certificate
                </button>

                <button
                    type="button"
                    onclick="toggleCertificate('${escapeHTML(certificate.id)}')"
                >
                    ${certificate.revoked ? "Restore Certificate" : "Revoke Certificate"}
                </button>

            </div>

        `;

    }).join("");

}


// =====================================================
// 50. EDIT CERTIFICATE
// =====================================================

window.editCertificate = async function(certificateId) {

    const certificate = certificates.find(
        item => item.id === certificateId
    );

    if (!certificate) {

        notify("Certificate not found.");
        return;

    }

    const newName = prompt(
        "Enter the certificate holder's name:",
        certificate.studentName || ""
    );

    if (newName === null) return;

    const newCourseTitle = prompt(
        "Enter the course title:",
        certificate.courseTitle || ""
    );

    if (newCourseTitle === null) return;

    if (!newName.trim() || !newCourseTitle.trim()) {

        notify("Name and course title cannot be empty.");
        return;

    }

    try {

        await updateDoc(
            doc(db, "certificates", certificateId),
            {
                studentName: newName.trim(),
                courseTitle: newCourseTitle.trim(),
                updatedAt: serverTimestamp(),
                updatedBy: currentAdmin.uid
            }
        );

        await loadCertificates();

        displayCertificates();

        notify("Certificate details updated successfully.");

    } catch (error) {

        console.error("Certificate edit error:", error);

        notify("Unable to edit certificate: " + error.message);

    }

};


// =====================================================
// 51. REVOKE / RESTORE CERTIFICATE
// =====================================================

window.toggleCertificate = async function(certificateId) {

    const certificate = certificates.find(
        item => item.id === certificateId
    );

    if (!certificate) return;

    const newStatus = !certificate.revoked;

    const action = newStatus ? "revoke" : "restore";

    if (!confirm(`Are you sure you want to ${action} this certificate?`)) {
        return;
    }

    try {

        await updateDoc(
            doc(db, "certificates", certificateId),
            {
                revoked: newStatus,
                updatedAt: serverTimestamp(),
                updatedBy: currentAdmin.uid
            }
        );

        await loadCertificates();

        displayCertificates();

        notify(
            newStatus
                ? "Certificate revoked successfully."
                : "Certificate restored successfully."
        );

    } catch (error) {

        console.error("Certificate status error:", error);

        notify("Unable to update certificate: " + error.message);

    }

};


// =====================================================
// 52. INSTRUCTOR MANAGEMENT
// =====================================================

function displayInstructors() {

    const container = getElement("adminInstructorList");

    if (!container) return;

    const search = getValue("adminInstructorSearch").toLowerCase();

    const filter =
        getElement("adminInstructorFilter")?.value || "all";

    const filtered = instructors.filter(instructor => {

        const name = String(instructor.fullName || "").toLowerCase();

        const email = String(instructor.email || "").toLowerCase();

        const status = instructor.status || "pending";

        const matchesSearch =
            name.includes(search) || email.includes(search);

        const matchesFilter =
            filter === "all" || status === filter;

        return matchesSearch && matchesFilter;

    });

    if (!filtered.length) {

        container.innerHTML = "<p>No instructor applications found.</p>";

        updateInstructorStatistics();

        return;

    }

    container.innerHTML = filtered.map(instructor => {

        const status = instructor.status || "pending";

        return `

            <div class="admin-item">

                <h3>${escapeHTML(instructor.fullName || "Unnamed Instructor")}</h3>

                <p>Email: ${escapeHTML(instructor.email || "Not available")}</p>

                <p>University: ${escapeHTML(instructor.university || "Not provided")}</p>

                <p>Department: ${escapeHTML(instructor.department || "Not provided")}</p>

                <p>
                    Status:
                    <strong class="instructor-status ${escapeHTML(status)}">
                        ${escapeHTML(status.toUpperCase())}
                    </strong>
                </p>

                ${
                    status === "pending"
                    ? `
                        <button
                            type="button"
                            onclick="approveInstructor('${escapeHTML(instructor.id)}')"
                            class="approve-instructor-btn"
                        >
                            Approve Instructor
                        </button>

                        <button
                            type="button"
                            onclick="rejectInstructor('${escapeHTML(instructor.id)}')"
                            class="reject-instructor-btn"
                        >
                            Reject Application
                        </button>
                    `
                    : ""
                }

            </div>

        `;

    }).join("");

    updateInstructorStatistics();

}


// =====================================================
// 53. UPDATE INSTRUCTOR STATISTICS
// =====================================================

function updateInstructorStatistics() {

    const pending = instructors.filter(
        item => (item.status || "pending") === "pending"
    ).length;

    const approved = instructors.filter(
        item => item.status === "approved"
    ).length;

    const rejected = instructors.filter(
        item => item.status === "rejected"
    ).length;

    const values = {

        pendingInstructorCount: pending,
        approvedInstructorCount: approved,
        rejectedInstructorCount: rejected,
        totalInstructors: instructors.length,
        totalPendingInstructors: pending,
        pendingInstructorBadge: pending

    };

    Object.entries(values).forEach(([id, value]) => {

        const element = getElement(id);

        if (element) {
            element.textContent = value;
        }

    });

}


// =====================================================
// 54. APPROVE INSTRUCTOR
// =====================================================

window.approveInstructor = async function(instructorId) {

    const instructor = instructors.find(
        item => item.id === instructorId
    );

    if (!instructor) {

        notify("Instructor application not found.");
        return;

    }

    if (!confirm(
        `Approve ${instructor.fullName || "this instructor"}?`
    )) return;

    try {

        await updateDoc(
            doc(db, "instructors", instructorId),
            {
                status: "approved",
                approvedAt: serverTimestamp(),
                approvedBy: currentAdmin.uid
            }
        );

        await loadInstructors();

        displayInstructors();

        notify(
            "Instructor approved successfully. They can now access the instructor dashboard."
        );

    } catch (error) {

        console.error("Instructor approval error:", error);

        notify("Unable to approve instructor: " + error.message);

    }

};


// =====================================================
// 55. REJECT INSTRUCTOR
// =====================================================

window.rejectInstructor = async function(instructorId) {

    const instructor = instructors.find(
        item => item.id === instructorId
    );

    if (!instructor) {

        notify("Instructor application not found.");
        return;

    }

    if (!confirm(
        `Reject ${instructor.fullName || "this instructor"}'s application?`
    )) return;

    try {

        await updateDoc(
            doc(db, "instructors", instructorId),
            {
                status: "rejected",
                rejectedAt: serverTimestamp(),
                rejectedBy: currentAdmin.uid
            }
        );

        await loadInstructors();

        displayInstructors();

        notify("Instructor application rejected.");

    } catch (error) {

        console.error("Instructor rejection error:", error);

        notify("Unable to reject application: " + error.message);

    }

};


// =====================================================
// 56. DASHBOARD STATISTICS
// =====================================================

function updateStatistics() {

    const statistics = {

        totalCourses: courses.length,

        totalStudents: students.length,

        totalLessons: lessons.length,

        totalQuizzes: quizzes.length

    };

    Object.entries(statistics).forEach(([id, value]) => {

        const element = getElement(id);

        if (element) {
            element.textContent = value;
        }

    });

    updateInstructorStatistics();

}


// =====================================================
// 57. END OF LEARNSPHERE ADMIN DASHBOARD
// =====================================================