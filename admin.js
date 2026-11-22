// ======================================================
// LEARNSPHERE ADMIN DASHBOARD
// COMPLETE FIREBASE ADMIN SYSTEM
// Firebase SDK 12.2.1
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
let activeBattleQuizId = "";

let dashboardInitialized = false;


// ======================================================
// 3. BASIC HELPERS
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
    const element = $(id);

    if (element) {
        element.textContent = content ?? "";
    }
}

function html(id, content) {
    const element = $(id);

    if (element) {
        element.innerHTML = content ?? "";
    }
}

function setValue(id, content) {
    const element = $(id);

    if (element) {
        element.value = content ?? "";
    }
}

function setChecked(id, content) {
    const element = $(id);

    if (element) {
        element.checked = Boolean(content);
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

function showError(error) {
    console.error("LearnSphere Admin Error:", error);

    alert(error?.message || "Something went wrong. Please try again.");
}

function formatDate(date) {
    if (!date) return "Not available";

    try {
        if (date.toDate) {
            date = date.toDate();
        }

        return new Date(date).toLocaleString();
    } catch {
        return "Not available";
    }
}

function sortNewest(items) {
    return [...items].sort((a, b) => {

        const first = a.createdAt?.seconds ||
            a.submittedAt?.seconds ||
            a.issuedAt?.seconds || 0;

        const second = b.createdAt?.seconds ||
            b.submittedAt?.seconds ||
            b.issuedAt?.seconds || 0;

        return second - first;
    });
}

function findCourse(id) {
    return courses.find(item => item.id === id);
}

function findLesson(id) {
    return lessons.find(item => item.id === id);
}

function findQuiz(id) {
    return quizzes.find(item => item.id === id);
}

function findBattle(id) {
    return battleQuizzes.find(item => item.id === id);
}

function showLoading() {
    $("adminLoading")?.classList.remove("hidden");
    $("adminArea")?.classList.add("hidden");
}

function hideLoading() {
    $("adminLoading")?.classList.add("hidden");
}

function validImageURL(url) {
    if (!url) return "";

    try {
        const parsed = new URL(String(url).trim());

        if (!["http:", "https:"].includes(parsed.protocol)) {
            return "";
        }

        return parsed.href;
    } catch {
        return "";
    }
}

function isCoursePublished(course) {
    return course.published === true ||
        course.isPublished === true;
}


// ======================================================
// 4. FIRESTORE DATA
// ======================================================

async function getCollectionData(name) {

    const snapshot = await getDocs(collection(db, name));

    return snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

}


async function refreshData() {

    try {

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

    } catch (error) {

        console.error("Dashboard refresh failed:", error);

        showError(error);

    }

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

        const adminRef = doc(db, "admins", user.uid);

        const adminSnapshot = await getDoc(adminRef);


        if (
            !adminSnapshot.exists() ||
            adminSnapshot.data().role !== "admin"
        ) {

            alert("You do not have administrator access.");

            await signOut(auth);

            window.location.href = "auth.html";

            return;
        }


        currentAdmin = user;

        const adminData = adminSnapshot.data();


        text(
            "adminName",
            adminData.fullName || "Administrator"
        );

        text(
            "adminEmail",
            user.email || "Admin Account"
        );


        if (!dashboardInitialized) {

            setupEventListeners();

            dashboardInitialized = true;

        }


        await refreshData();


        $("adminArea")?.classList.remove("hidden");

        hideLoading();

        showPage("overview");


    } catch (error) {

        console.error("Admin authentication failed:", error);

        hideLoading();

        alert(
            "Unable to load the admin dashboard. " +
            "Check your internet connection and Firebase permissions."
        );

    }

});


// ======================================================
// 6. SIDEBAR AND EVENT LISTENERS
// ======================================================

function setupEventListeners() {


    // NAVIGATION

    document.querySelectorAll(".nav-link").forEach(button => {

        button.addEventListener("click", () => {

            const page = button.dataset.page;

            if (page) {
                showPage(page);
            }

        });

    });


    // MOBILE SIDEBAR

    $("mobileMenuBtn")?.addEventListener("click", event => {

        event.stopPropagation();

        toggleSidebar();

    });


    document.addEventListener("click", event => {

        const sidebar = $("sidebar");

        const menuButton = $("mobileMenuBtn");

        if (!sidebar || window.innerWidth > 768) return;

        if (
            !sidebar.contains(event.target) &&
            !menuButton?.contains(event.target)
        ) {

            closeSidebar();

        }

    });


    window.addEventListener("resize", () => {

        if (window.innerWidth > 768) {
            closeSidebar();
        }

    });


    document.addEventListener("keydown", event => {

        if (event.key === "Escape") {

            closeSidebar();

            closePreview();

        }

    });


    $("adminLogoutBtn")?.addEventListener("click", logoutAdmin);


    // COURSE EVENTS

    $("addNewCourseBtn")?.addEventListener("click", openNewCourse);

    $("backToCoursesBtn")?.addEventListener("click", closeCourseEditor);

    $("editCourseForm")?.addEventListener("submit", saveCourse);

    $("courseScheduleForm")?.addEventListener("submit", saveCourseSchedule);

    $("publishEditorCourseBtn")?.addEventListener("click", publishCourse);

    $("unpublishCourseBtn")?.addEventListener("click", unpublishCourse);

    $("previewCourseBtn")?.addEventListener("click", previewCourse);

    $("closePreviewBtn")?.addEventListener("click", closePreview);


    // COURSE IMAGE

    $("editCourseImage")?.addEventListener(
        "input",
        updateCourseImagePreview
    );

    $("editCourseImage")?.addEventListener(
        "change",
        updateCourseImagePreview
    );


    // COURSE SEARCH AND FILTER

    $("adminCourseSearch")?.addEventListener(
        "input",
        renderCourses
    );

    $("adminCourseFilter")?.addEventListener(
        "change",
        renderCourses
    );


    // LESSON EVENTS

    $("editorLessonForm")?.addEventListener("submit", saveLesson);

    $("cancelLessonEditBtn")?.addEventListener("click", clearLessonForm);

    $("adminLessonSearch")?.addEventListener("input", renderLessons);


    // QUIZ EVENTS

    $("editorQuizSettingsForm")?.addEventListener(
        "submit",
        saveQuizSettings
    );

    $("editorQuizForm")?.addEventListener(
        "submit",
        saveQuizQuestion
    );

    $("cancelQuizEditBtn")?.addEventListener(
        "click",
        clearQuestionForm
    );

    $("editorQuestionType")?.addEventListener(
        "change",
        toggleQuestionType
    );

    $("editorQuizType")?.addEventListener(
        "change",
        toggleLessonQuizSelector
    );

    $("adminQuizSearch")?.addEventListener(
        "input",
        renderQuizzes
    );


    // BATTLE EVENTS

    $("battleQuizForm")?.addEventListener(
        "submit",
        createBattleQuiz
    );

    $("battleQuestionForm")?.addEventListener(
        "submit",
        saveBattleQuestion
    );


    // ANNOUNCEMENTS

    $("announcementForm")?.addEventListener(
        "submit",
        publishAnnouncement
    );


    // STUDENTS

    $("adminStudentSearch")?.addEventListener(
        "input",
        renderStudents
    );


    // INSTRUCTORS

    $("adminInstructorSearch")?.addEventListener(
        "input",
        renderInstructors
    );

    $("adminInstructorFilter")?.addEventListener(
        "change",
        renderInstructors
    );


    $("refreshInstructorsBtn")?.addEventListener(
        "click",
        async () => {

            try {

                instructors = await getCollectionData("instructors");

                renderInstructors();

                renderOverview();

            } catch (error) {

                showError(error);

            }

        }
    );


    // RESULTS

    $("adminResultSearch")?.addEventListener(
        "input",
        renderResults
    );


    // CERTIFICATES

    $("adminCertificateSearch")?.addEventListener(
        "input",
        renderCertificates
    );


    // QUIZ LESSON SELECTOR

    $("editorQuizLessonId")?.addEventListener("change", () => {

        setValue("editorQuizSettingsCourseId", activeCourseId);

    });


    // COURSE CATALOGUE IMPORT BUTTON

    createImportButton();


    // DYNAMIC BUTTONS

    document.addEventListener("click", handleDynamicButtons);


    toggleQuestionType();

    toggleLessonQuizSelector();

}


function toggleSidebar() {

    const sidebar = $("sidebar");

    if (!sidebar) return;

    sidebar.classList.toggle("open");

}


function closeSidebar() {

    $("sidebar")?.classList.remove(
        "open",
        "active",
        "sidebar-open"
    );

}


function showPage(page) {

    const allowedPages = [

        "overview",
        "courses",
        "lessons",
        "quizzes",
        "battles",
        "students",
        "instructors",
        "results",
        "certificates",
        "announcements"

    ];


    if (!allowedPages.includes(page)) {

        console.warn("Unknown dashboard page:", page);

        return;

    }


    document.querySelectorAll(".admin-page").forEach(section => {

        section.classList.add("hidden");

    });


    $(page + "Page")?.classList.remove("hidden");


    document.querySelectorAll(".nav-link").forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.page === page
        );

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


    text("pageHeading", headings[page]);

    closeSidebar();


    if (page === "courses") {
        renderCourses();
    }

    if (page === "battles") {

        renderBattleQuizzes();

        renderBattleQuestions();

        renderBattleMatches();

    }

}


// ======================================================
// 7. LOGOUT
// ======================================================

async function logoutAdmin() {

    if (!confirm("Are you sure you want to logout?")) {
        return;
    }


    try {

        await signOut(auth);

        window.location.href = "auth.html";

    } catch (error) {

        showError(error);

    }

}


// ======================================================
// 8. DASHBOARD REFRESH
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
// 9. OVERVIEW
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
// 10. COURSE IMAGE PREVIEW
// ======================================================

function createCourseImagePreview() {

    const imageInput = $("editCourseImage");

    if (!imageInput) return;


    let preview = $("courseImagePreview");


    if (!preview) {

        preview = document.createElement("div");

        preview.id = "courseImagePreview";

        preview.style.width = "100%";

        preview.style.marginTop = "15px";

        preview.style.display = "none";


        preview.innerHTML = `

            <p style="margin-bottom:10px;font-weight:600;">
                Course Image Preview
            </p>

            <img
                id="courseImagePreviewElement"
                alt="Course image preview"
                style="
                    width:100%;
                    max-width:420px;
                    height:220px;
                    object-fit:cover;
                    border-radius:12px;
                    display:block;
                    border:1px solid rgba(255,255,255,0.15);
                "
            >

            <p
                id="courseImagePreviewError"
                style="display:none;color:#ef4444;margin-top:8px;"
            >
                Unable to load this image. Check the image URL.
            </p>

        `;


        imageInput.parentElement.appendChild(preview);

    }

}


function updateCourseImagePreview() {

    createCourseImagePreview();


    const url = validImageURL(value("editCourseImage"));

    const preview = $("courseImagePreview");

    const image = $("courseImagePreviewElement");

    const error = $("courseImagePreviewError");


    if (!preview || !image || !error) return;


    if (!url) {

        preview.style.display = "none";

        image.removeAttribute("src");

        error.style.display = "none";

        return;

    }


    preview.style.display = "block";

    error.style.display = "none";


    image.onerror = () => {

        error.style.display = "block";

    };


    image.onload = () => {

        error.style.display = "none";

    };


    image.src = url;

}


// ======================================================
// 11. COURSE MANAGEMENT
// ======================================================

function renderCourses() {

    const container = $("adminCourseList");

    if (!container) return;


    const search = value("adminCourseSearch").toLowerCase();

    const filter = value("adminCourseFilter").toLowerCase() || "all";


    const filtered = courses.filter(course => {

        const title = String(course.title || "").toLowerCase();

        const department = String(course.department || "").toLowerCase();

        const level = String(course.level || "").toLowerCase();

        const category = String(course.category || "").toLowerCase();


        const matchesSearch =

            title.includes(search) ||

            department.includes(search) ||

            level.includes(search) ||

            category.includes(search);


        const published = isCoursePublished(course);


        // Supports publication status filters
        // and category filters.

        let matchesFilter = true;


        if (
            filter === "published" ||
            filter === "unpublished"
        ) {

            matchesFilter = filter === "published"
                ? published
                : !published;

        } else if (filter !== "all") {

            matchesFilter = category === filter;

        }


        return matchesSearch && matchesFilter;

    });


    if (!filtered.length) {

        container.innerHTML = `
            <p>No courses found matching your search or filter.</p>
        `;

        return;

    }


    container.innerHTML = filtered.map(course => {

        const published = isCoursePublished(course);

        const imageURL = validImageURL(
            course.image || course.imageUrl || course.thumbnailUrl || ""
        );


        return `

            <div class="admin-card">

                ${
                    imageURL
                    ? `

                        <img
                            src="${escapeHTML(imageURL)}"
                            alt="${escapeHTML(course.title)}"
                            loading="lazy"
                            style="
                                width:100%;
                                height:190px;
                                object-fit:cover;
                                border-radius:10px;
                                margin-bottom:15px;
                                display:block;
                            "
                            onerror="this.style.display='none';"
                        >

                    `
                    : `

                        <div style="
                            width:100%;
                            height:140px;
                            display:flex;
                            align-items:center;
                            justify-content:center;
                            background:#17253a;
                            border-radius:10px;
                            margin-bottom:15px;
                            color:#94a3b8;
                        ">
                            No Course Image
                        </div>

                    `
                }

                <h3>${escapeHTML(course.title)}</h3>

                <p>${escapeHTML(course.department)}</p>

                <p>${escapeHTML(course.level)} Level</p>

                <p>${escapeHTML(course.category)}</p>

                <p>
                    Status:
                    ${published ? "Published" : "Unpublished"}
                </p>

                <button
                    type="button"
                    class="primary-btn"
                    data-action="edit-course"
                    data-id="${escapeHTML(course.id)}">
                    Manage Course
                </button>

                <button
                    type="button"
                    class="secondary-btn"
                    data-action="toggle-course"
                    data-id="${escapeHTML(course.id)}">
                    ${published ? "Unpublish" : "Publish"}
                </button>

            </div>

        `;

    }).join("");

}


// ======================================================
// 12. COURSE CATALOGUE IMPORT
// ======================================================

// Read the catalogue in different possible formats.

function getCourseCatalogue() {

    const source = window.learnSphereCourseCatalog;

    if (!source) return [];


    if (Array.isArray(source)) {
        return source;
    }


    if (Array.isArray(source.courses)) {
        return source.courses;
    }


    if (Array.isArray(source.catalogue)) {
        return source.catalogue;
    }


    return Object.values(source).filter(item =>

        item && typeof item === "object" && !Array.isArray(item)

    );

}


// Create an import button if HTML does not contain one.

function createImportButton() {

    let button = $("importCatalogueBtn");

    if (button) {

        button.addEventListener(
            "click",
            importCourseCatalogue
        );

        return;

    }


    button = document.createElement("button");

    button.id = "importCatalogueBtn";

    button.type = "button";

    button.className = "primary-btn";

    button.textContent = "Import Course Catalogue";


    const coursePage = $("coursesPage");

    const courseList = $("adminCourseList");


    const toolbar = document.querySelector(".course-toolbar");


    if (toolbar) {

        toolbar.prepend(button);

    } else if (courseList?.parentElement) {

        courseList.parentElement.insertBefore(
            button,
            courseList
        );

    } else if (coursePage) {

        coursePage.prepend(button);

    }


    button.addEventListener(
        "click",
        importCourseCatalogue
    );

}


// Import catalogue into Firestore.

async function importCourseCatalogue() {

    const catalogue = getCourseCatalogue();


    if (!catalogue.length) {

        alert(
            "Course catalogue not found.\n\n" +
            "Check that course-catalog.js is loaded before admin.js."
        );

        return;

    }


    if (!confirm(
        `You are about to import ${catalogue.length} courses. Continue?`
    )) {

        return;

    }


    const button = $("importCatalogueBtn");

    if (button) {

        button.disabled = true;

        button.textContent = "Importing...";

    }


    let imported = 0;

    let skipped = 0;

    let failed = 0;


    try {

        // Load the latest Firestore courses first.

        courses = await getCollectionData("courses");


        // Existing course keys prevent duplicate imports.

        const existingKeys = new Set(

            courses.map(course => makeCourseKey(course))

        );


        for (const item of catalogue) {

            try {

                const title = String(item.title || "").trim();

                const department = String(item.department || "").trim();

                const level = String(item.level || "").trim();

                const category = String(item.category || "Technology").trim();


                if (!title || !department || !level) {

                    skipped++;

                    continue;

                }


                const courseKey = makeCourseKey({

                    title,

                    department,

                    level

                });


                if (existingKeys.has(courseKey)) {

                    skipped++;

                    continue;

                }


                const image = validImageURL(

                    item.image ||
                    item.imageUrl ||
                    item.thumbnail ||
                    item.thumbnailUrl ||
                    ""

                );


                const courseData = {

                    title,

                    department,

                    level,

                    category,

                    description: String(item.description || ""),

                    image,

                    published: false,

                    isPublished: false,

                    createdAt: serverTimestamp(),

                    updatedAt: serverTimestamp()

                };


                const newCourse = await addDoc(

                    collection(db, "courses"),

                    courseData

                );


                courses.push({

                    ...courseData,

                    id: newCourse.id

                });


                existingKeys.add(courseKey);

                imported++;


            } catch (error) {

                console.error(
                    "Failed to import catalogue course:",
                    item,
                    error
                );

                failed++;

            }

        }


        await refreshData();


        alert(

            "COURSE IMPORT COMPLETED\n\n" +

            "Imported: " + imported + "\n" +

            "Skipped: " + skipped + "\n" +

            "Failed: " + failed

        );


    } catch (error) {

        showError(error);

    } finally {

        if (button) {

            button.disabled = false;

            button.textContent = "Import Course Catalogue";

        }

    }

}


function makeCourseKey(course) {

    return [

        String(course.title || "").trim().toLowerCase(),

        String(course.department || "").trim().toLowerCase(),

        String(course.level || "").trim().toLowerCase()

    ].join("|");

}


// ======================================================
// 13. COURSE EDITOR
// ======================================================

function openNewCourse() {

    activeCourseId = "";

    $("courseEditor")?.classList.remove("hidden");

    $("adminCourseList")?.classList.add("hidden");


    $("editCourseForm")?.reset();

    $("courseScheduleForm")?.reset();


    setValue("editCourseId", "");

    setValue("scheduleCourseId", "");


    text("editorCourseHeading", "Add New Course");

    html("editorLessonList", "");

    html("editorQuizList", "");


    text("editorQuizQuestionCount", "0");

    text("editorQuizTotalMarks", "0");


    message("courseScheduleStatus", "");

    message("coursePublishStatus", "");


    clearLessonForm();

    clearQuestionForm();

    updateCourseImagePreview();

    updateCourseSelects();

}


function closeCourseEditor() {

    $("courseEditor")?.classList.add("hidden");

    $("adminCourseList")?.classList.remove("hidden");


    activeCourseId = "";

    renderCourses();

}


function editCourse(id) {

    const course = findCourse(id);

    if (!course) return;


    activeCourseId = id;


    $("courseEditor")?.classList.remove("hidden");

    $("adminCourseList")?.classList.add("hidden");


    text("editorCourseHeading", "Manage Course");


    setValue("editCourseId", id);

    setValue("editCourseTitle", course.title);

    setValue("editCourseCategory", course.category);

    setValue("editCourseDepartment", course.department);

    setValue("editCourseLevel", course.level);

    setValue("editCourseDescription", course.description);

    setValue(
        "editCourseImage",
        course.image || course.imageUrl || ""
    );


    setValue("scheduleCourseId", id);

    setValue("editCourseOpeningDate", course.openingDateTime);

    setValue("editCourseClosingDate", course.closingDateTime);


    message("courseScheduleStatus", "");

    message("coursePublishStatus", "");


    updateCourseImagePreview();

    loadCourseEditor(id);

    updateCourseSelects();

}


async function saveCourse(event) {

    event.preventDefault();

    if (!currentAdmin) return;


    const id = value("editCourseId");


    const data = {

        title: value("editCourseTitle"),

        category: value("editCourseCategory"),

        department: value("editCourseDepartment"),

        level: value("editCourseLevel"),

        description: value("editCourseDescription"),

        image: validImageURL(value("editCourseImage")),

        updatedAt: serverTimestamp()

    };


    if (

        !data.title ||
        !data.category ||
        !data.department ||
        !data.level ||
        !data.description

    ) {

        alert("Please complete all required course fields.");

        return;

    }


    try {

        if (id) {

            await updateDoc(
                doc(db, "courses", id),
                data
            );

            activeCourseId = id;

        } else {

            data.published = false;

            data.isPublished = false;

            data.createdAt = serverTimestamp();


            const newCourse = await addDoc(

                collection(db, "courses"),

                data

            );


            activeCourseId = newCourse.id;

            setValue("editCourseId", newCourse.id);

            setValue("scheduleCourseId", newCourse.id);

        }


        alert("Course saved successfully.");

        await refreshData();

        editCourse(activeCourseId);


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


    if (

        opening &&
        closing &&
        new Date(closing) <= new Date(opening)

    ) {

        alert("Closing date must be later than opening date.");

        return;

    }


    try {

        await updateDoc(

            doc(db, "courses", id),

            {

                openingDateTime: opening,

                closingDateTime: closing,

                updatedAt: serverTimestamp()

            }

        );


        message(
            "courseScheduleStatus",
            "Schedule saved successfully."
        );


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

        await updateDoc(

            doc(db, "courses", id),

            {

                published: true,

                isPublished: true,

                updatedAt: serverTimestamp()

            }

        );


        message(
            "coursePublishStatus",
            "Course published successfully."
        );


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

        await updateDoc(

            doc(db, "courses", id),

            {

                published: false,

                isPublished: false,

                updatedAt: serverTimestamp()

            }

        );


        message(
            "coursePublishStatus",
            "Course unpublished."
        );


        await refreshData();


    } catch (error) {

        showError(error);

    }

}


function previewCourse() {

    const title = value("editCourseTitle");

    const department = value("editCourseDepartment");

    const level = value("editCourseLevel");

    const category = value("editCourseCategory");

    const description = value("editCourseDescription");

    const imageURL = validImageURL(value("editCourseImage"));


    if (!title || !description) {

        alert("Enter the course title and description first.");

        return;

    }


    html("coursePreviewContent", `

        ${
            imageURL
            ? `

                <img
                    src="${escapeHTML(imageURL)}"
                    alt="${escapeHTML(title)}"
                    style="
                        width:100%;
                        max-height:300px;
                        object-fit:cover;
                        border-radius:12px;
                        margin-bottom:20px;
                    "
                >

            `
            : ""
        }

        <h2>${escapeHTML(title)}</h2>

        <p>
            <strong>Department:</strong>
            ${escapeHTML(department)}
        </p>

        <p>
            <strong>Level:</strong>
            ${escapeHTML(level)}
        </p>

        <p>
            <strong>Category:</strong>
            ${escapeHTML(category)}
        </p>

        <p>${escapeHTML(description)}</p>

    `);


    $("coursePreview")?.classList.remove("hidden");

}


function closePreview() {

    $("coursePreview")?.classList.add("hidden");

}


// ======================================================
// 14. COURSE EDITOR CONTENT
// ======================================================

async function loadCourseEditor(courseId) {

    const courseLessons = lessons.filter(item =>

        item.courseId === courseId

    );


    renderEditorLessons(courseLessons);


    const courseQuizzes = quizzes.filter(item =>

        item.courseId === courseId

    );


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

        setValue("editorQuizLessonId", settings.lessonId || "");

    } else {

        $("editorQuizSettingsForm")?.reset();

        setValue("editorSettingsCourseId", courseId);

        setValue("editorQuizTimeLimit", "40");

        setValue("editorQuizMaxAttempts", "2");

        setValue("editorQuizQuestionLimit", "20");

    }


    updateCourseSelects();

    toggleLessonQuizSelector();

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

            <button
                type="button"
                class="secondary-btn"
                data-action="edit-lesson"
                data-id="${escapeHTML(item.id)}">
                Edit
            </button>

            <button
                type="button"
                class="danger-btn"
                data-action="delete-lesson"
                data-id="${escapeHTML(item.id)}">
                Delete
            </button>

        </div>

    `).join("");

}


// ======================================================
// 15. LESSON MANAGEMENT
// ======================================================

async function saveLesson(event) {

    event.preventDefault();


    const courseId = activeCourseId || value("editCourseId");


    if (!courseId) {

        alert("Save or select a course first.");

        return;

    }


    const id = value("editorLessonId");


    const data = {

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


    if (!data.title || !data.content) {

        alert("Enter the lesson title and content.");

        return;

    }


    try {

        if (id) {

            await updateDoc(
                doc(db, "lessons", id),
                data
            );

        } else {

            data.createdAt = serverTimestamp();

            await addDoc(
                collection(db, "lessons"),
                data
            );

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

            String(item.title || "").toLowerCase().includes(search) ||

            String(course?.title || "").toLowerCase().includes(search)

        );

    });


    if (!filtered.length) {

        container.innerHTML = "<p>No lessons found.</p>";

        return;

    }


    container.innerHTML = filtered.map(item => `

        <div class="admin-card">

            <h3>${escapeHTML(item.title)}</h3>

            <p>
                Course:
                ${escapeHTML(findCourse(item.courseId)?.title || "Unknown")}
            </p>

            <p>${item.published ? "Published" : "Unpublished"}</p>

            <button
                type="button"
                class="secondary-btn"
                data-action="open-lesson-course"
                data-id="${escapeHTML(item.courseId)}">
                Open Course
            </button>

        </div>

    `).join("");

}


// ======================================================
// 16. QUIZ SETTINGS
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


    if (

        opening &&
        closing &&
        new Date(closing) <= new Date(opening)

    ) {

        alert("Quiz closing date must be later than opening date.");

        return;

    }


    const data = {

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


    if (!data.title) {

        alert("Enter a quiz title.");

        return;

    }


    try {

        const existing = quizSettings.find(item =>

            item.courseId === courseId

        );


        if (existing) {

            await updateDoc(

                doc(db, "quizSettings", existing.id),

                data

            );

        } else {

            data.createdAt = serverTimestamp();

            await addDoc(

                collection(db, "quizSettings"),

                data

            );

        }


        message(
            "quizSettingsStatus",
            "Quiz settings saved successfully."
        );


        await refreshData();


    } catch (error) {

        showError(error);

    }

}


// ======================================================
// 17. QUIZ QUESTIONS
// ======================================================

function toggleQuestionType() {

    const mcqFields = $("mcqQuestionFields");

    if (!mcqFields) return;


    mcqFields.style.display =

        value("editorQuestionType") === "theory"

            ? "none"

            : "block";

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


    const data = {

        courseId,

        quizId: courseId,

        type: questionType,

        question: value("editorQuestionText"),

        marks: Number(value("editorQuestionMark")) || 1,

        updatedAt: serverTimestamp()

    };


    if (!data.question) {

        alert("Enter a question.");

        return;

    }


    if (questionType === "mcq") {

        data.options = [

            value("editorOptionA"),

            value("editorOptionB"),

            value("editorOptionC"),

            value("editorOptionD")

        ];


        data.correctAnswer = Number(
            value("editorCorrectAnswer")
        );


        if (data.options.some(option => !option)) {

            alert("Fill in all four options.");

            return;

        }

    } else {

        data.options = [];

        data.correctAnswer = null;

    }


    try {

        if (id) {

            await updateDoc(
                doc(db, "quizzes", id),
                data
            );

        } else {

            data.createdAt = serverTimestamp();

            await addDoc(
                collection(db, "quizzes"),
                data
            );

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


    const totalMarks = items.reduce((sum, item) => {

        return sum + Number(item.marks || 1);

    }, 0);


    text("editorQuizQuestionCount", items.length);

    text("editorQuizTotalMarks", totalMarks);


    container.innerHTML = items.map((item, index) => `

        <div class="admin-card">

            <h4>Question ${index + 1}</h4>

            <p>${escapeHTML(item.question)}</p>

            <p>Type: ${escapeHTML(item.type || "mcq")}</p>

            <p>Marks: ${Number(item.marks || 1)}</p>

            <button
                type="button"
                class="secondary-btn"
                data-action="edit-question"
                data-id="${escapeHTML(item.id)}">
                Edit
            </button>

            <button
                type="button"
                class="danger-btn"
                data-action="delete-question"
                data-id="${escapeHTML(item.id)}">
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

        String(item.question || "").toLowerCase().includes(search)

    );


    if (!filtered.length) {

        container.innerHTML = "<p>No quiz questions found.</p>";

        return;

    }


    container.innerHTML = filtered.map(item => `

        <div class="admin-card">

            <h3>${escapeHTML(item.question)}</h3>

            <p>
                Course:
                ${escapeHTML(findCourse(item.courseId)?.title || "Unknown")}
            </p>

            <p>Type: ${escapeHTML(item.type || "mcq")}</p>

            <p>Marks: ${Number(item.marks || 1)}</p>

            <button
                type="button"
                class="secondary-btn"
                data-action="open-quiz-course"
                data-id="${escapeHTML(item.courseId)}">
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
// 18. BATTLE ARENA COMPETITIONS
// ======================================================

async function createBattleQuiz(event) {

    event.preventDefault();


    const opening = value("battleOpeningDate");

    const closing = value("battleClosingDate");


    if (

        opening &&
        closing &&
        new Date(closing) <= new Date(opening)

    ) {

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

        await addDoc(
            collection(db, "battleQuizzes"),
            data
        );


        $("battleQuizForm")?.reset();


        message(
            "battleAdminMessage",
            "Competition created successfully."
        );


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

            <button
                type="button"
                class="secondary-btn"
                data-action="select-battle"
                data-id="${escapeHTML(battle.id)}">
                Manage Questions
            </button>

            <button
                type="button"
                class="primary-btn"
                data-action="toggle-battle"
                data-id="${escapeHTML(battle.id)}">
                ${battle.published ? "Unpublish" : "Publish"}
            </button>

            <button
                type="button"
                class="danger-btn"
                data-action="delete-battle"
                data-id="${escapeHTML(battle.id)}">
                Delete
            </button>

        </div>

    `).join("");

}


async function toggleBattle(id) {

    const battle = findBattle(id);

    if (!battle) return;


    try {

        await updateDoc(

            doc(db, "battleQuizzes", id),

            {

                published: !battle.published,

                status: battle.published ? "draft" : "published",

                updatedAt: serverTimestamp()

            }

        );


        await refreshData();


    } catch (error) {

        showError(error);

    }

}


async function deleteBattle(id) {

    if (!confirm("Delete this competition?")) return;


    try {

        await deleteDoc(
            doc(db, "battleQuizzes", id)
        );


        if (activeBattleQuizId === id) {

            activeBattleQuizId = "";

            setValue("battleQuestionQuizId", "");

            html("battleQuestionList", "");

        }


        await refreshData();


    } catch (error) {

        showError(error);

    }

}


// ======================================================
// 19. BATTLE QUESTIONS
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


    if (

        !data.question ||

        Object.values(data.options).some(option => !option)

    ) {

        alert("Complete the question and all four options.");

        return;

    }


    try {

        if (id) {

            await updateDoc(
                doc(db, "battleQuestions", id),
                data
            );

        } else {

            data.createdBy = currentAdmin.uid;

            data.createdAt = serverTimestamp();


            await addDoc(
                collection(db, "battleQuestions"),
                data
            );

        }


        $("battleQuestionForm")?.reset();

        setValue("battleQuestionId", "");

        setValue("battleQuestionQuizId", activeBattleQuizId);


        message(
            "battleQuestionMessage",
            "Battle question saved successfully."
        );


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

            <button
                type="button"
                class="danger-btn"
                data-action="delete-battle-question"
                data-id="${escapeHTML(item.id)}">
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

        await deleteDoc(
            doc(db, "battleQuestions", id)
        );

        await refreshData();


    } catch (error) {

        showError(error);

    }

}


// ======================================================
// 20. BATTLE MATCH HISTORY
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

            <p>
                Player 1:
                ${escapeHTML(match.player1Name || match.player1Id || "Unknown")}
            </p>

            <p>
                Player 2:
                ${escapeHTML(match.player2Name || match.player2Id || "Unknown")}
            </p>

            <p>Status: ${escapeHTML(match.status || "Unknown")}</p>

            <p>
                Winner:
                ${escapeHTML(match.winnerName || match.winnerId || "Not available")}
            </p>

            <p>Date: ${formatDate(match.createdAt)}</p>

        </div>

    `).join("");

}


// ======================================================
// 21. STUDENTS
// ======================================================

function renderStudents() {

    const container = $("adminStudentList");

    if (!container) return;


    const search = value("adminStudentSearch").toLowerCase();


    const filtered = students.filter(student => {

        const name = String(

            student.fullName || student.name || ""

        ).toLowerCase();


        const email = String(

            student.email || ""

        ).toLowerCase();


        const department = String(

            student.department || ""

        ).toLowerCase();


        const matric = String(

            student.matricNumber || ""

        ).toLowerCase();


        return (

            name.includes(search) ||

            email.includes(search) ||

            department.includes(search) ||

            matric.includes(search)

        );

    });


    if (!filtered.length) {

        container.innerHTML = "<p>No students found.</p>";

        return;

    }


    container.innerHTML = filtered.map(student => `

        <div class="admin-card">

            <h3>
                ${escapeHTML(student.fullName || student.name || "Student")}
            </h3>

            <p>Email: ${escapeHTML(student.email)}</p>

            <p>Matric Number: ${escapeHTML(student.matricNumber)}</p>

            <p>Department: ${escapeHTML(student.department)}</p>

            <p>Level: ${escapeHTML(student.level)}</p>

        </div>

    `).join("");

}


// ======================================================
// 22. INSTRUCTORS
// ======================================================

function renderInstructors() {

    const container = $("adminInstructorList");

    if (!container) return;


    const search = value("adminInstructorSearch").toLowerCase();

    const filter = value("adminInstructorFilter") || "all";


    const filtered = instructors.filter(instructor => {

        const status = String(

            instructor.status || "pending"

        ).toLowerCase();


        const name = String(

            instructor.fullName || instructor.name || ""

        ).toLowerCase();


        const email = String(

            instructor.email || ""

        ).toLowerCase();


        const matchesSearch =

            name.includes(search) ||

            email.includes(search);


        const matchesFilter =

            filter === "all" ||

            status === filter;


        return matchesSearch && matchesFilter;

    });


    if (!filtered.length) {

        container.innerHTML = "<p>No instructors found.</p>";

        return;

    }


    container.innerHTML = filtered.map(instructor => `

        <div class="admin-card">

            <h3>
                ${escapeHTML(instructor.fullName || instructor.name || "Instructor")}
            </h3>

            <p>Email: ${escapeHTML(instructor.email)}</p>

            <p>Department: ${escapeHTML(instructor.department)}</p>

            <p>Status: ${escapeHTML(instructor.status || "pending")}</p>

            <button
                type="button"
                class="primary-btn"
                data-action="approve-instructor"
                data-id="${escapeHTML(instructor.id)}">
                Approve
            </button>

            <button
                type="button"
                class="danger-btn"
                data-action="reject-instructor"
                data-id="${escapeHTML(instructor.id)}">
                Reject
            </button>

        </div>

    `).join("");

}


async function updateInstructorStatus(id, status) {

    if (!confirm("Change instructor status to " + status + "?")) {
        return;
    }


    try {

        await updateDoc(

            doc(db, "instructors", id),

            {

                status,

                updatedAt: serverTimestamp()

            }

        );


        await refreshData();


    } catch (error) {

        showError(error);

    }

}


// ======================================================
// 23. RESULTS
// ======================================================

function renderResults() {

    const container = $("adminResultList");

    if (!container) return;


    const search = value("adminResultSearch").toLowerCase();


    const filtered = sortNewest(results).filter(result => {

        const studentName = String(

            result.studentName || ""

        ).toLowerCase();


        const courseTitle = String(

            result.courseTitle || ""

        ).toLowerCase();


        const quizTitle = String(

            result.quizTitle || ""

        ).toLowerCase();


        return (

            studentName.includes(search) ||

            courseTitle.includes(search) ||

            quizTitle.includes(search)

        );

    });


    if (!filtered.length) {

        container.innerHTML = "<p>No student results found.</p>";

        return;

    }


    container.innerHTML = filtered.map(result => `

        <div class="admin-card">

            <h3>${escapeHTML(result.studentName || "Student")}</h3>

            <p>Course: ${escapeHTML(result.courseTitle)}</p>

            <p>Quiz: ${escapeHTML(result.quizTitle)}</p>

            <p>
                Score:
                ${Number(result.score || 0)} /
                ${Number(result.totalMarks || 0)}
            </p>

            <p>Percentage: ${Number(result.percentage || 0)}%</p>

            <p>
                Grading:
                ${escapeHTML(result.gradingStatus || "Completed")}
            </p>

            <p>Date: ${formatDate(result.submittedAt)}</p>

            <button
                type="button"
                class="primary-btn"
                data-action="edit-result"
                data-id="${escapeHTML(result.id)}">
                Edit Marks
            </button>

        </div>

    `).join("");

}


async function editResultMarks(id) {

    const result = results.find(item => item.id === id);

    if (!result) return;


    const currentScore = Number(result.score || 0);

    const total = Number(result.totalMarks || 0);


    const newScore = prompt(

        "Student: " + (result.studentName || "Unknown") +

        "\nQuiz: " + (result.quizTitle || "Quiz") +

        "\nCurrent score: " + currentScore +

        "\nTotal marks: " + total +

        "\n\nEnter the corrected total score:"

    );


    if (newScore === null) return;


    const score = Number(newScore);


    if (

        !Number.isFinite(score) ||

        score < 0 ||

        score > total

    ) {

        alert("Enter a valid score between 0 and " + total + ".");

        return;

    }


    const percentage = total > 0

        ? Number(((score / total) * 100).toFixed(2))

        : 0;


    try {

        await updateDoc(

            doc(db, "results", id),

            {

                score,

                percentage,

                gradingStatus: result.hasTheoryQuestions

                    ? "manually_graded"

                    : (result.gradingStatus || "completed"),

                updatedAt: serverTimestamp(),

                marksUpdatedBy: currentAdmin.uid

            }

        );


        alert("Result marks updated successfully.");

        await refreshData();


    } catch (error) {

        showError(error);

    }

}


// ======================================================
// 24. CERTIFICATES
// ======================================================

function renderCertificates() {

    const container = $("adminCertificateList");

    if (!container) return;


    const search = value("adminCertificateSearch").toLowerCase();


    const filtered = sortNewest(certificates).filter(certificate => {

        const studentName = String(

            certificate.studentName || ""

        ).toLowerCase();


        const courseTitle = String(

            certificate.courseTitle || ""

        ).toLowerCase();


        const certificateId = String(

            certificate.certificateId || ""

        ).toLowerCase();


        return (

            studentName.includes(search) ||

            courseTitle.includes(search) ||

            certificateId.includes(search)

        );

    });


    if (!filtered.length) {

        container.innerHTML = "<p>No certificates found.</p>";

        return;

    }


    container.innerHTML = filtered.map(certificate => {

        const revoked =

            certificate.revoked ||

            certificate.status === "revoked";


        return `

            <div class="admin-card">

                <h3>
                    ${escapeHTML(certificate.studentName || "Student")}
                </h3>

                <p>Course: ${escapeHTML(certificate.courseTitle)}</p>

                <p>
                    Certificate ID:
                    ${escapeHTML(certificate.certificateId)}
                </p>

                <p>Score: ${Number(certificate.score || 0)}</p>

                <p>Percentage: ${Number(certificate.percentage || 0)}%</p>

                <p>Status: ${revoked ? "Revoked" : "Valid"}</p>

                <p>
                    Issued:
                    ${formatDate(certificate.issuedAt || certificate.createdAt)}
                </p>

                ${revoked ? "" : `

                    <button
                        type="button"
                        class="danger-btn"
                        data-action="revoke-certificate"
                        data-id="${escapeHTML(certificate.id)}">
                        Revoke Certificate
                    </button>

                `}

            </div>

        `;

    }).join("");

}


async function revokeCertificate(id) {

    if (!confirm("Are you sure you want to revoke this certificate?")) {
        return;
    }


    try {

        await updateDoc(

            doc(db, "certificates", id),

            {

                status: "revoked",

                revoked: true,

                revokedAt: serverTimestamp(),

                revokedBy: currentAdmin.uid

            }

        );


        alert("Certificate revoked successfully.");

        await refreshData();


    } catch (error) {

        showError(error);

    }

}


// ======================================================
// 25. ANNOUNCEMENTS
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

        await addDoc(

            collection(db, "announcements"),

            data

        );


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

            <p>
                Department:
                ${escapeHTML(item.targetDepartment || "All")}
            </p>

            <p>
                Level:
                ${escapeHTML(item.targetLevel || "All")}
            </p>

            <p>Date: ${formatDate(item.createdAt)}</p>

            <button
                type="button"
                class="danger-btn"
                data-action="delete-announcement"
                data-id="${escapeHTML(item.id)}">
                Delete
            </button>

        </div>

    `).join("");

}


async function deleteAnnouncement(id) {

    if (!confirm("Delete this announcement?")) return;


    try {

        await deleteDoc(
            doc(db, "announcements", id)
        );

        await refreshData();


    } catch (error) {

        showError(error);

    }

}


// ======================================================
// 26. COURSE AND BATTLE DROPDOWNS
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

                <option value="${escapeHTML(item.id)}">
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

                <option value="${escapeHTML(item.id)}">
                    ${escapeHTML(item.title)}
                </option>

            `).join("")}

        `;


        if (battleQuizzes.some(item => item.id === current)) {

            battleSelect.value = current;

        } else if (activeBattleQuizId) {

            battleSelect.value = activeBattleQuizId;

        }

    }

}


// ======================================================
// 27. DYNAMIC BUTTON HANDLING
// ======================================================

async function handleDynamicButtons(event) {

    const button = event.target.closest("[data-action]");

    if (!button) return;


    const action = button.dataset.action;

    const id = button.dataset.id;


    if (!id) return;


    switch (action) {


        // COURSE ACTIONS

        case "edit-course":

            editCourse(id);

            break;


        case "toggle-course": {

            const course = findCourse(id);

            if (!course) break;


            const published = isCoursePublished(course);


            try {

                await updateDoc(

                    doc(db, "courses", id),

                    {

                        published: !published,

                        isPublished: !published,

                        updatedAt: serverTimestamp()

                    }

                );


                await refreshData();


            } catch (error) {

                showError(error);

            }


            break;

        }


        // LESSON ACTIONS

        case "edit-lesson":

            editLesson(id);

            break;


        case "delete-lesson":

            await deleteLesson(id);

            break;


        case "open-lesson-course":

            if (findCourse(id)) {

                showPage("courses");

                editCourse(id);

            }

            break;


        // QUIZ ACTIONS

        case "edit-question":

            editQuestion(id);

            break;


        case "delete-question":

            await deleteQuestion(id);

            break;


        case "open-quiz-course":

            if (findCourse(id)) {

                showPage("courses");

                editCourse(id);

            }

            break;


        // BATTLE ACTIONS

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


        // INSTRUCTOR ACTIONS

        case "approve-instructor":

            await updateInstructorStatus(id, "approved");

            break;


        case "reject-instructor":

            await updateInstructorStatus(id, "rejected");

            break;


        // RESULT ACTIONS

        case "edit-result":

            await editResultMarks(id);

            break;


        // CERTIFICATE ACTIONS

        case "revoke-certificate":

            await revokeCertificate(id);

            break;


        // ANNOUNCEMENT ACTIONS

        case "delete-announcement":

            await deleteAnnouncement(id);

            break;

    }

}


// ======================================================
// 28. INITIAL FORM STATE
// ======================================================

function initializeDashboardForms() {

    clearLessonForm();

    clearQuestionForm();

    toggleQuestionType();

    toggleLessonQuizSelector();

    createCourseImagePreview();

    updateCourseImagePreview();

}


// ======================================================
// 29. STARTUP
// ======================================================

initializeDashboardForms();

console.log("LearnSphere Admin Dashboard loaded successfully.");