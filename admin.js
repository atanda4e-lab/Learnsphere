// =============================================
// LEARNSPHERE ADMIN DASHBOARD
// FIREBASE FIRESTORE INTEGRATION
// =============================================


// =============================================
// 1. FIREBASE IMPORTS
// =============================================

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


// =============================================
// 2. GLOBAL VARIABLES
// =============================================

let courses = [];
let students = [];
let lessons = [];
let quizzes = [];
let results = [];
let certificates = [];

let currentCourseId = null;
let dashboardInitialized = false;
let currentAdmin = null;


// =============================================
// 3. HTML ELEMENT HELPER
// =============================================

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


// =============================================
// 4. HTML SECURITY
// =============================================

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


// =============================================
// 5. NOTIFICATION HELPER
// =============================================

function notify(message) {

    alert(message);

}


// =============================================
// 6. ADMIN AUTHENTICATION
// =============================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "auth.html";

        return;

    }

    try {

        const adminRef = doc(db, "admins", user.uid);

        const adminSnapshot = await getDoc(adminRef);

        if (!adminSnapshot.exists() ||
            adminSnapshot.data().role !== "admin") {

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

        notify(
            "Unable to verify administrator access: " +
            error.message
        );

    }

});


// =============================================
// 7. INITIALIZE DASHBOARD
// =============================================

async function initializeDashboard() {

    setupNavigation();

    setupEventListeners();

    createImportButton();

    await loadAllData();

    showPage("overview");

    console.log("LearnSphere Admin Dashboard Ready.");

}


// =============================================
// 8. LOAD ALL DATA
// =============================================

async function loadAllData() {

    console.log("Loading LearnSphere data...");

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

            console.log(name + " loaded successfully.");

        } catch (error) {

            console.error(name + " loading error:", error);

            failed.push(name);

        }

    }

    refreshDashboard();

    if (failed.length > 0) {

        notify(
            "Some information could not load: " +
            failed.join(", ") +
            ". Check your Firestore permissions."
        );

    }

}


// =============================================
// 9. REFRESH DASHBOARD
// =============================================

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


// =============================================
// 10. LOAD COURSES
// =============================================

async function loadCourses() {

    const snapshot = await getDocs(
        collection(db, "courses")
    );

    courses = snapshot.docs.map(item => {

        const data = item.data();

        let published = false;

        // The published field takes priority.
        // Use isPublished only for older documents
        // that do not have the published field.

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


// =============================================
// 11. LOAD STUDENTS
// =============================================

async function loadStudents() {

    const snapshot = await getDocs(
        collection(db, "students")
    );

    students = snapshot.docs.map(item => ({

        id: item.id,

        ...item.data()

    }));

    // Keep student records unique.

    const uniqueStudents = new Map();

    students.forEach(student => {

        const key = student.uid ||
            student.userId ||
            student.id;

        uniqueStudents.set(key, student);

    });

    students = Array.from(uniqueStudents.values());

}


// =============================================
// 12. LOAD LESSONS
// =============================================

async function loadLessons() {

    const snapshot = await getDocs(
        collection(db, "lessons")
    );

    lessons = snapshot.docs.map(item => ({

        id: item.id,

        ...item.data()

    }));

}


// =============================================
// 13. LOAD QUIZZES
// =============================================

async function loadQuizzes() {

    const snapshot = await getDocs(
        collection(db, "quizzes")
    );

    quizzes = snapshot.docs.map(item => ({

        id: item.id,

        ...item.data()

    }));

}


// =============================================
// 14. LOAD RESULTS
// =============================================

async function loadResults() {

    const snapshot = await getDocs(
        collection(db, "results")
    );

    results = snapshot.docs.map(item => ({

        id: item.id,

        ...item.data()

    }));

}


// =============================================
// 15. LOAD CERTIFICATES
// =============================================

async function loadCertificates() {

    const snapshot = await getDocs(
        collection(db, "certificates")
    );

    certificates = snapshot.docs.map(item => ({

        id: item.id,

        ...item.data()

    }));

}


// =============================================
// 16. NAVIGATION
// =============================================

function setupNavigation() {

    document.querySelectorAll(".admin-nav-btn").forEach(button => {

        button.addEventListener("click", () => {

            showPage(button.dataset.page);

        });

    });

}


// =============================================
// 17. SHOW PAGE
// =============================================

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

    getElement("courseEditor")?.classList.add("hidden");

    getElement("coursePreview")?.classList.add("hidden");

    const selectedPage = getElement(pageName);

    if (!selectedPage) {

        console.warn("Page not found:", pageName);

        return;

    }

    selectedPage.classList.remove("hidden");

    selectedPage.classList.add("active");

    document.querySelectorAll(".admin-nav-btn").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === pageName
        );

    });

}


// =============================================
// 18. EVENT LISTENERS
// =============================================

function setupEventListeners() {

    // LOGOUT

    getElement("adminLogoutBtn")?.addEventListener("click", async () => {

        try {

            await signOut(auth);

            window.location.href = "auth.html";

        } catch (error) {

            console.error(error);

            notify("Unable to log out.");

        }

    });


    // ADD COURSE

    getElement("addNewCourseBtn")?.addEventListener("click", () => {

        openCourseEditor();

    });


    // BACK TO COURSES

    getElement("backToCoursesBtn")?.addEventListener("click", () => {

        showPage("manageCourses");

    });


    // SAVE COURSE

    getElement("editCourseForm")?.addEventListener(
        "submit",
        saveCourse
    );


    // ADD LESSON

    getElement("editorLessonForm")?.addEventListener(
        "submit",
        saveLesson
    );


    // ADD QUIZ

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


    // PUBLISH

    getElement("publishEditorCourseBtn")?.addEventListener(
        "click",
        () => changeCourseStatus(true)
    );


    // UNPUBLISH

    getElement("unpublishCourseBtn")?.addEventListener(
        "click",
        () => changeCourseStatus(false)
    );


    // PREVIEW

    getElement("previewCourseBtn")?.addEventListener(
        "click",
        previewCourse
    );


    // CLOSE PREVIEW

    getElement("closePreviewBtn")?.addEventListener("click", () => {

        getElement("coursePreview")?.classList.add("hidden");

    });

}


// =============================================
// 19. DISPLAY COURSES
// =============================================

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

                <p>
                    Department:
                    ${escapeHTML(course.department || "Not specified")}
                </p>

                <p>
                    Category:
                    ${escapeHTML(course.category || "Not specified")}
                </p>

                <p>
                    Level:
                    ${escapeHTML(course.level || "Not specified")}
                </p>

                <p>Lessons: ${lessonCount}</p>

                <p>Quizzes: ${quizCount}</p>

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


// =============================================
// 20. OPEN COURSE EDITOR
// =============================================

function openCourseEditor(course = null) {

    currentCourseId = course?.id || null;

    document.querySelectorAll(".admin-page").forEach(page => {

        page.classList.remove("active");

        page.classList.add("hidden");

    });

    getElement("courseEditor")?.classList.remove("hidden");

    getElement("editCourseForm")?.reset();

    getElement("editorLessonForm")?.reset();

    getElement("editorQuizForm")?.reset();

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
            ? course.title
            : "Create New Course";

    }

    setValue("editorLessonCourseId", course?.id);

    setValue("editorQuizCourseId", course?.id);

    updateCoursePublicationStatus();

    displayEditorLessons();

    displayEditorQuizzes();

}


// =============================================
// 21. EDIT COURSE
// =============================================

window.editCourse = function(courseId) {

    const course = courses.find(item => item.id === courseId);

    if (!course) {

        notify("Course not found.");

        return;

    }

    openCourseEditor(course);

};


// =============================================
// 22. SAVE COURSE
// =============================================

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

            notify("Course created successfully. It is currently unpublished.");

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


// =============================================
// 23. DELETE COURSE
// =============================================

window.removeCourse = async function(courseId) {

    const course = courses.find(item => item.id === courseId);

    if (!course) return;

    const confirmed = confirm(

        `Delete "${course.title}" and all its lessons and quizzes?`

    );

    if (!confirmed) return;

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

        notify("Course and its lessons and quizzes deleted successfully.");

    } catch (error) {

        console.error("Delete course error:", error);

        notify("Unable to delete course: " + error.message);

    }

};


// =============================================
// 24. PUBLISH / UNPUBLISH COURSE
// =============================================

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

        notify(
            status
                ? "Course published successfully."
                : "Course unpublished successfully."
        );

    } catch (error) {

        console.error("Publication error:", error);

        notify("Unable to update publication status: " + error.message);

    }

}


// =============================================
// 25. UPDATE PUBLICATION STATUS
// =============================================

function updateCoursePublicationStatus() {

    const statusElement = getElement("coursePublishStatus");

    if (!statusElement) return;

    const courseId = getValue("editCourseId");

    const course = courses.find(item => item.id === courseId);

    statusElement.textContent = course?.published
        ? "Published"
        : "Unpublished";

}


// =============================================
// 26. IMPORT BUTTON
// =============================================

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


// =============================================
// 27. IMPORT COURSE CATALOGUE
// =============================================

async function importCourseCatalogue() {

    const catalogue = window.learnSphereCourseCatalog || [];

    if (!catalogue.length) {

        notify("Course catalogue is empty or course-catalog.js is missing.");

        return;

    }

    if (!confirm(
        "Import missing catalogue courses and set catalogue courses to Unpublished?"
    )) {

        return;

    }

    try {

        const snapshot = await getDocs(
            collection(db, "courses")
        );

        const existingIds = new Set(
            snapshot.docs.map(item => item.id)
        );

        let imported = 0;

        let updated = 0;

        // Firestore allows up to 500 operations per batch.

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

            if (existingIds.has(courseId)) {

                const existing = snapshot.docs.find(
                    item => item.id === courseId
                );

                const data = existing.data();

                // Reset only catalogue-generated courses.
                // Do not change manually created courses.

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

            `Catalogue import completed!\n\n` +
            `New courses: ${imported}\n` +
            `Reset to unpublished: ${updated}`

        );

    } catch (error) {

        console.error("Catalogue import error:", error);

        notify("Catalogue import failed: " + error.message);

    }

}


// =============================================
// 28. DISPLAY EDITOR LESSONS
// =============================================

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
                onclick="deleteLesson('${escapeHTML(lesson.id)}')"
            >
                Delete Lesson
            </button>

        </div>

    `).join("");

}


// =============================================
// 29. ADD LESSON
// =============================================

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

    const lessonData = {

        courseId,

        title,

        description: getValue("editorLessonDescription"),

        content: getValue("editorLessonContent"),

        pdf: getValue("editorLessonPDF"),

        video: getValue("editorLessonVideo"),

        createdAt: serverTimestamp()

    };

    try {

        const newLesson = await addDoc(
            collection(db, "lessons"),
            lessonData
        );

        lessons.push({

            id: newLesson.id,

            ...lessonData

        });

        getElement("editorLessonForm").reset();

        setValue("editorLessonCourseId", courseId);

        displayEditorLessons();

        displayAllLessons();

        displayCourses();

        updateStatistics();

        notify("Lesson added successfully.");

    } catch (error) {

        console.error("Add lesson error:", error);

        notify("Unable to add lesson: " + error.message);

    }

}


// =============================================
// 30. DELETE LESSON
// =============================================

window.deleteLesson = async function(lessonId) {

    if (!confirm("Delete this lesson?")) return;

    try {

        await deleteDoc(
            doc(db, "lessons", lessonId)
        );

        lessons = lessons.filter(
            item => item.id !== lessonId
        );

        displayEditorLessons();

        displayAllLessons();

        displayCourses();

        updateStatistics();

        notify("Lesson deleted successfully.");

    } catch (error) {

        console.error("Delete lesson error:", error);

        notify("Unable to delete lesson: " + error.message);

    }

};


// =============================================
// 31. DISPLAY EDITOR QUIZZES
// =============================================

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

    container.innerHTML = courseQuizzes.map(quiz => `

        <div class="admin-item">

            <h4>${escapeHTML(quiz.question)}</h4>

            <button
                type="button"
                onclick="deleteQuiz('${escapeHTML(quiz.id)}')"
            >
                Delete Question
            </button>

        </div>

    `).join("");

}


// =============================================
// 32. ADD QUIZ
// =============================================

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

    const correctAnswer = getValue("editorCorrectAnswer");

    if (!question || options.some(option => !option) || !correctAnswer) {

        notify("Complete the question, all four options and correct answer.");

        return;

    }

    const quizData = {

        courseId,

        question,

        options,

        correctAnswer,

        createdAt: serverTimestamp()

    };

    try {

        const newQuiz = await addDoc(
            collection(db, "quizzes"),
            quizData
        );

        quizzes.push({

            id: newQuiz.id,

            ...quizData

        });

        getElement("editorQuizForm").reset();

        setValue("editorQuizCourseId", courseId);

        displayEditorQuizzes();

        displayAllQuizzes();

        displayCourses();

        updateStatistics();

        notify("Quiz question added successfully.");

    } catch (error) {

        console.error("Add quiz error:", error);

        notify("Unable to add quiz: " + error.message);

    }

}


// =============================================
// 33. DELETE QUIZ
// =============================================

window.deleteQuiz = async function(quizId) {

    if (!confirm("Delete this quiz question?")) return;

    try {

        await deleteDoc(
            doc(db, "quizzes", quizId)
        );

        quizzes = quizzes.filter(
            item => item.id !== quizId
        );

        displayEditorQuizzes();

        displayAllQuizzes();

        displayCourses();

        updateStatistics();

        notify("Quiz deleted successfully.");

    } catch (error) {

        console.error("Delete quiz error:", error);

        notify("Unable to delete quiz: " + error.message);

    }

};


// =============================================
// 34. PREVIEW COURSE
// =============================================

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


// =============================================
// 35. DISPLAY ALL LESSONS
// =============================================

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

                <p>
                    Course:
                    ${escapeHTML(course?.title || "Unknown Course")}
                </p>

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


// =============================================
// 36. DISPLAY ALL QUIZZES
// =============================================

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

                <h3>${escapeHTML(quiz.question)}</h3>

                <p>
                    Course:
                    ${escapeHTML(course?.title || "Unknown Course")}
                </p>

                <p>Options:</p>

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


// =============================================
// 37. DISPLAY STUDENTS
// =============================================

function displayStudents() {

    const container = getElement("adminStudentList");

    if (!container) return;

    if (!students.length) {

        container.innerHTML = "<p>No students registered yet.</p>";

        return;

    }

    container.innerHTML = students.map(student => `

        <div class="admin-item">

            <h3>
                ${escapeHTML(student.fullName || "Unnamed Student")}
            </h3>

            <p>
                Email:
                ${escapeHTML(student.email || "Not available")}
            </p>

            <p>
                University:
                ${escapeHTML(student.university || "Not available")}
            </p>

            <p>
                Department:
                ${escapeHTML(student.department || "Not available")}
            </p>

            <p>
                Level:
                ${escapeHTML(student.level || "Not available")}
            </p>

        </div>

    `).join("");

}


// =============================================
// 38. DISPLAY RESULTS
// =============================================

function displayResults() {

    const container = getElement("adminResultList");

    if (!container) return;

    if (!results.length) {

        container.innerHTML = "<p>No student results available yet.</p>";

        return;

    }

    container.innerHTML = results.map(result => {

        const student = students.find(
            item => item.id === result.studentId
        );

        const course = courses.find(
            item => item.id === result.courseId
        );

        return `

            <div class="admin-item">

                <h3>
                    ${escapeHTML(student?.fullName || result.studentId || "Unknown Student")}
                </h3>

                <p>
                    Course:
                    ${escapeHTML(course?.title || "Unknown Course")}
                </p>

                <p>
                    Score:
                    ${escapeHTML(result.score ?? "Not available")}
                </p>

                <p>
                    Date:
                    ${escapeHTML(result.date || "Not available")}
                </p>

            </div>

        `;

    }).join("");

}


// =============================================
// 39. DISPLAY CERTIFICATES
// =============================================

function displayCertificates() {

    const container = getElement("adminCertificateList");

    if (!container) return;

    if (!certificates.length) {

        container.innerHTML = "<p>No certificates issued yet.</p>";

        return;

    }

    container.innerHTML = certificates.map(certificate => {

        const student = students.find(
            item => item.id === certificate.studentId
        );

        const course = courses.find(
            item => item.id === certificate.courseId
        );

        return `

            <div class="admin-item">

                <h3>
                    ${escapeHTML(student?.fullName || "Unknown Student")}
                </h3>

                <p>
                    Course:
                    ${escapeHTML(course?.title || "Unknown Course")}
                </p>

                <p>
                    Certificate ID:
                    ${escapeHTML(certificate.id)}
                </p>

            </div>

        `;

    }).join("");

}


// =============================================
// 40. DASHBOARD STATISTICS
// =============================================

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


// =============================================
// 41. END OF LEARNSPHERE ADMIN DASHBOARD
// =============================================