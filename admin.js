// =====================================================
// LEARNSPHERE ADMIN DASHBOARD
// COMPLETE FIREBASE ADMIN SYSTEM
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

let currentCourseId = null;
let currentAdmin = null;

let dashboardInitialized = false;


// =====================================================
// 3. ELEMENT HELPERS
// =====================================================

function getElement(id) {
    return document.getElementById(id);
}


function getValue(id) {
    return getElement(id)?.value?.trim() || "";
}


function setValue(id, value) {

    const element = getElement(id);

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
        ["Certificates", loadCertificates]

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

    const snapshot = await getDocs(
        collection(db, "courses")
    );

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

    const snapshot = await getDocs(
        collection(db, "students")
    );

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

    const snapshot = await getDocs(
        collection(db, "lessons")
    );

    lessons = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

}


// =====================================================
// 10. LOAD QUIZZES
// =====================================================

async function loadQuizzes() {

    const snapshot = await getDocs(
        collection(db, "quizzes")
    );

    quizzes = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

}


// =====================================================
// 11. LOAD RESULTS
// =====================================================

async function loadResults() {

    const snapshot = await getDocs(
        collection(db, "results")
    );

    results = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

}


// =====================================================
// 12. LOAD CERTIFICATES
// =====================================================

async function loadCertificates() {

    const snapshot = await getDocs(
        collection(db, "certificates")
    );

    certificates = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

}


// =====================================================
// 13. REFRESH EVERYTHING
// =====================================================

function refreshDashboard() {

    displayCourses();

    displayAllLessons();

    displayAllQuizzes();

    displayStudents();

    displayResults();

    displayCertificates();

    updateStatistics();

    updateCoursePublicationStatus();

}


// =====================================================
// 14. NAVIGATION
// =====================================================

function setupNavigation() {

    document.querySelectorAll(".admin-nav-btn").forEach(button => {

        button.addEventListener("click", () => {

            showPage(button.dataset.page);

        });

    });

}


// =====================================================
// 15. SHOW DASHBOARD PAGE
// =====================================================

function showPage(pageName) {

    const pages = [

        "overview",
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
// 16. COURSE EDITOR SAME-PAGE LAYOUT
// =====================================================

function prepareCourseEditorLayout() {

    const manageCourses = getElement("manageCourses");

    const courseEditor = getElement("courseEditor");

    if (!manageCourses || !courseEditor) return;

    // Move editor inside Manage Courses.

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
// 17. EVENT LISTENERS
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


    // ADD COURSE

    getElement("addNewCourseBtn")?.addEventListener("click", () => {

        openCourseEditor();

    });


    // BACK TO COURSE LIST

    getElement("backToCoursesBtn")?.addEventListener("click", () => {

        closeCourseEditor();

    });


    // SAVE COURSE

    getElement("editCourseForm")?.addEventListener(
        "submit",
        saveCourse
    );


    // SAVE LESSON

    getElement("editorLessonForm")?.addEventListener(
        "submit",
        saveLesson
    );


    // SAVE QUIZ

    getElement("editorQuizForm")?.addEventListener(
        "submit",
        saveQuiz
    );


    // COURSE SEARCH

    getElement("adminCourseSearch")?.addEventListener(
        "input",
        displayCourses
    );


    // COURSE FILTER

    getElement("adminCourseFilter")?.addEventListener(
        "change",
        displayCourses
    );


    // STUDENT SEARCH

    getElement("adminStudentSearch")?.addEventListener(
        "input",
        displayStudents
    );


    // RESULT SEARCH

    getElement("adminResultSearch")?.addEventListener(
        "input",
        displayResults
    );


    // CERTIFICATE SEARCH

    getElement("adminCertificateSearch")?.addEventListener(
        "input",
        displayCertificates
    );


    // PUBLISH COURSE

    getElement("publishEditorCourseBtn")?.addEventListener(
        "click",
        () => changeCourseStatus(true)
    );


    // UNPUBLISH COURSE

    getElement("unpublishCourseBtn")?.addEventListener(
        "click",
        () => changeCourseStatus(false)
    );


    // PREVIEW COURSE

    getElement("previewCourseBtn")?.addEventListener(
        "click",
        previewCourse
    );


    // CLOSE PREVIEW

    getElement("closePreviewBtn")?.addEventListener("click", () => {

        getElement("coursePreview")?.classList.add("hidden");

    });


    // COURSE SCHEDULE

    getElement("courseScheduleForm")?.addEventListener(
        "submit",
        saveCourseSchedule
    );

}


// =====================================================
// 18. DISPLAY COURSES
// =====================================================

function displayCourses() {

    const container = getElement("adminCourseList");

    if (!container) return;

    const search = getValue("adminCourseSearch").toLowerCase();

    const filter = getElement("adminCourseFilter")?.value || "all";

    const filteredCourses = courses.filter(course => {

        const title = String(course.title || "").toLowerCase();

        const department = String(
            course.department || ""
        ).toLowerCase();

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
// 19. OPEN COURSE EDITOR
// =====================================================

function openCourseEditor(course = null) {

    prepareCourseEditorLayout();

    currentCourseId = course?.id || null;

    // Keep Manage Courses active.

    showPage("manageCourses");

    const editor = getElement("courseEditor");

    const courseList = getElement("adminCourseList");

    const toolbar = getElement("manageCourses")
        ?.querySelector(".course-toolbar");

    courseList?.classList.add("hidden");

    toolbar?.classList.add("hidden");

    editor?.classList.remove("hidden");

    // Reset forms.

    getElement("editCourseForm")?.reset();

    getElement("editorLessonForm")?.reset();

    getElement("editorQuizForm")?.reset();

    // Course information.

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

    // Schedule fields.

    setValue(
        "editCourseOpeningDate",
        course?.openingDateTime
    );

    setValue(
        "editCourseClosingDate",
        course?.closingDateTime
    );

    updateCoursePublicationStatus();

    displayEditorLessons();

    displayEditorQuizzes();

    updateScheduleStatus();

}


// =====================================================
// 20. EDIT COURSE
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
// 21. SAVE COURSE
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
// 22. DELETE COURSE
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

        const references = [

            doc(db, "courses", courseId),

            ...relatedLessons.map(item =>
                doc(db, "lessons", item.id)
            ),

            ...relatedQuizzes.map(item =>
                doc(db, "quizzes", item.id)
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

        refreshDashboard();

        closeCourseEditor();

        notify("Course and its lessons and quizzes deleted successfully.");

    } catch (error) {

        console.error("Delete course error:", error);

        notify("Unable to delete course: " + error.message);

    }

};


// =====================================================
// 23. PUBLISH / UNPUBLISH
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
// 24. PUBLICATION STATUS
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
// 25. COURSE SCHEDULE
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
// 26. IMPORT COURSE CATALOGUE BUTTON
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
// 27. IMPORT COURSE CATALOGUE
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

        const snapshot = await getDocs(
            collection(db, "courses")
        );

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
// 28. DISPLAY EDITOR LESSONS
// =====================================================

function displayEditorLessons() {

    const container = getElement("editorLessonList");

    if (!container) return;

    const courseLessons = lessons.filter(
        item => item.courseId === currentCourseId
    );

    if (!courseLessons.length) {

        container.innerHTML = "<p>No lessons added yet.</p>";

        return;

    }

    container.innerHTML = courseLessons.map(lesson => `

        <div class="admin-item">

            <h4>${escapeHTML(lesson.title)}</h4>

            <p>${escapeHTML(lesson.description || "")}</p>

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

}


// =====================================================
// 29. ADD / EDIT LESSON
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

    const lessonId = getElement("editorLessonForm")
        ?.dataset.editingId;

    const lessonData = {

        courseId,

        title,

        description: getValue("editorLessonDescription"),

        content: getValue("editorLessonContent"),

        pdf: getValue("editorLessonPDF"),

        video: getValue("editorLessonVideo"),

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

        getElement("editorLessonForm").reset();

        delete getElement("editorLessonForm").dataset.editingId;

        setValue("editorLessonCourseId", courseId);

        await loadLessons();

        refreshDashboard();

    } catch (error) {

        console.error("Lesson save error:", error);

        notify("Unable to save lesson: " + error.message);

    }

}


window.editLesson = function(lessonId) {

    const lesson = lessons.find(item => item.id === lessonId);

    if (!lesson) return;

    const form = getElement("editorLessonForm");

    if (!form) return;

    form.dataset.editingId = lessonId;

    setValue("editorLessonCourseId", lesson.courseId);

    setValue("editorLessonTitle", lesson.title);

    setValue("editorLessonDescription", lesson.description);

    setValue("editorLessonContent", lesson.content);

    setValue("editorLessonPDF", lesson.pdf);

    setValue("editorLessonVideo", lesson.video);

    notify("Edit the lesson details and click Save Lesson.");

};


// =====================================================
// 30. DELETE LESSON
// =====================================================

window.deleteLesson = async function(lessonId) {

    if (!confirm("Delete this lesson?")) return;

    try {

        await deleteDoc(
            doc(db, "lessons", lessonId)
        );

        await loadLessons();

        refreshDashboard();

        notify("Lesson deleted successfully.");

    } catch (error) {

        console.error("Delete lesson error:", error);

        notify("Unable to delete lesson: " + error.message);

    }

};


// =====================================================
// 31. DISPLAY EDITOR QUIZZES
// =====================================================

function displayEditorQuizzes() {

    const container = getElement("editorQuizList");

    if (!container) return;

    const courseQuizzes = quizzes.filter(
        item => item.courseId === currentCourseId
    );

    if (!courseQuizzes.length) {

        container.innerHTML = "<p>No quiz questions added yet.</p>";

        return;

    }

    container.innerHTML = courseQuizzes.map((quiz, index) => `

        <div class="admin-item">

            <h4>${index + 1}. ${escapeHTML(quiz.question)}</h4>

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

    `).join("");

}


// =====================================================
// 32. ADD / EDIT QUIZ
// =====================================================

async function saveQuiz(event) {

    event.preventDefault();

    const courseId = getValue("editorQuizCourseId");

    if (!courseId) {

        notify("Save the course before adding quizzes.");

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

    const quizId = getElement("editorQuizForm")
        ?.dataset.editingId;

    const quizData = {

        courseId,

        question,

        questionText: question,

        options,

        correctAnswer,

        marks,

        updatedAt: serverTimestamp()

    };

    try {

        if (quizId) {

            await updateDoc(
                doc(db, "quizzes", quizId),
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

        getElement("editorQuizForm").reset();

        delete getElement("editorQuizForm").dataset.editingId;

        setValue("editorQuizCourseId", courseId);

        await loadQuizzes();

        refreshDashboard();

    } catch (error) {

        console.error("Quiz save error:", error);

        notify("Unable to save quiz: " + error.message);

    }

}


window.editQuiz = function(quizId) {

    const quiz = quizzes.find(item => item.id === quizId);

    if (!quiz) return;

    const form = getElement("editorQuizForm");

    if (!form) return;

    form.dataset.editingId = quizId;

    const options = Array.isArray(quiz.options)
        ? quiz.options
        : [];

    setValue("editorQuizCourseId", quiz.courseId);

    setValue("editorQuestionText", quiz.question || quiz.questionText);

    setValue("editorOptionA", options[0]);

    setValue("editorOptionB", options[1]);

    setValue("editorOptionC", options[2]);

    setValue("editorOptionD", options[3]);

    setValue("editorCorrectAnswer", quiz.correctAnswer);

    setValue("editorQuestionMark", quiz.marks ?? 1);

    notify("Edit the question and click Save Question.");

};


// =====================================================
// 33. DELETE QUIZ
// =====================================================

window.deleteQuiz = async function(quizId) {

    if (!confirm("Delete this quiz question?")) return;

    try {

        await deleteDoc(
            doc(db, "quizzes", quizId)
        );

        await loadQuizzes();

        refreshDashboard();

        notify("Quiz question deleted successfully.");

    } catch (error) {

        console.error("Delete quiz error:", error);

        notify("Unable to delete quiz: " + error.message);

    }

};


// =====================================================
// 34. COURSE PREVIEW
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
// 35. DISPLAY ALL LESSONS
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
// 36. DISPLAY ALL QUIZZES
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

        return `

            <div class="admin-item">

                <h3>${escapeHTML(quiz.question || quiz.questionText)}</h3>

                <p>Course: ${escapeHTML(course?.title || "Unknown Course")}</p>

                <p>Marks: ${escapeHTML(quiz.marks ?? 1)}</p>

                <ol>

                    ${(quiz.options || []).map(option => `
                        <li>${escapeHTML(option)}</li>
                    `).join("")}

                </ol>

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
// 37. DISPLAY STUDENTS
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
// 38. DISPLAY RESULTS
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
// 39. EDIT STUDENT MARKS
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

    const percentage = Math.round(
        (score / totalMarks) * 100
    );

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
// 40. DISPLAY CERTIFICATES
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

                <p>
                    Status:
                    ${certificate.revoked ? "Revoked" : "Valid"}
                </p>

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
// 41. EDIT CERTIFICATE
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
// 42. REVOKE / RESTORE CERTIFICATE
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
// 43. DASHBOARD STATISTICS
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

}


// =====================================================
// 44. END OF LEARNSPHERE ADMIN DASHBOARD
// =====================================================
