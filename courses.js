// ==========================================
// LEARNSPHERE COURSE CATALOGUE
// FIREBASE VERSION
// ==========================================

import { auth, db } from "./firebase.js";

import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";


// ==========================================
// 1. GET HTML ELEMENTS
// ==========================================

const courseGrid = document.getElementById("courseGrid");
const courseSearch = document.getElementById("courseSearch");
const departmentFilter = document.getElementById("departmentFilter");
const levelFilter = document.getElementById("levelFilter");
const courseCount = document.getElementById("courseCount");
const emptyMessage = document.getElementById("emptyMessage");


// ==========================================
// 2. GLOBAL VARIABLES
// ==========================================

let allCourses = [];
let currentUser = null;
let authReady = false;

let resolveAuthReady;

const authReadyPromise = new Promise(function(resolve) {
    resolveAuthReady = resolve;
});


// ==========================================
// 3. WAIT FOR FIREBASE AUTHENTICATION
// ==========================================

onAuthStateChanged(auth, function(user) {

    currentUser = user;
    authReady = true;

    resolveAuthReady();

});


// ==========================================
// 4. ESCAPE HTML
// ==========================================

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, function(character) {

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


// ==========================================
// 5. GET SAFE IMAGE URL
// ==========================================

function getSafeImageURL(course) {

    const image = course.image || course.imageUrl || "";

    if (!image) {
        return "";
    }

    try {

        const url = new URL(image);

        if (url.protocol === "https:" || url.protocol === "http:") {
            return url.href;
        }

    } catch (error) {

        console.error("Invalid course image URL:", error);

    }

    return "";

}


// ==========================================
// 6. LOAD PUBLISHED COURSES FROM FIREBASE
// ==========================================

async function getCourses() {

    try {

        const coursesCollection = collection(db, "courses");

        // Get courses published using the published field.

        const publishedQuery = query(
            coursesCollection,
            where("published", "==", true)
        );

        // Also support courses using isPublished.

        const isPublishedQuery = query(
            coursesCollection,
            where("isPublished", "==", true)
        );

        const results = await Promise.all([
            getDocs(publishedQuery),
            getDocs(isPublishedQuery)
        ]);

        // Combine results and remove duplicates.

        const courseMap = new Map();

        results.forEach(function(result) {

            result.forEach(function(documentSnapshot) {

                courseMap.set(
                    documentSnapshot.id,
                    {
                        id: documentSnapshot.id,
                        ...documentSnapshot.data()
                    }
                );

            });

        });

        return Array.from(courseMap.values());

    } catch (error) {

        console.error("Firebase course loading error:", error);

        throw error;

    }

}


// ==========================================
// 7. LOAD DEPARTMENTS
// ==========================================

function loadDepartments() {

    if (!departmentFilter) {
        return;
    }

    const departments = [
        ...new Set(
            allCourses
                .map(function(course) {
                    return course.department;
                })
                .filter(Boolean)
        )
    ];

    departmentFilter.innerHTML = `
        <option value="">All Departments</option>
    `;

    departments.sort().forEach(function(department) {

        const option = document.createElement("option");

        option.value = department;
        option.textContent = department;

        departmentFilter.appendChild(option);

    });

}


// ==========================================
// 8. CREATE COURSE CARD
// ==========================================

function createCourseCard(course) {

    const card = document.createElement("div");

    card.className = "course-card";

    const imageURL = getSafeImageURL(course);

    const imageContent = imageURL
        ? `<img src="${escapeHTML(imageURL)}"
                 alt="${escapeHTML(course.title || "Course image")}"
                 loading="lazy">`
        : `<i class="fa-solid fa-book-open"></i>`;

    card.innerHTML = `

        <div class="course-image">
            ${imageContent}
        </div>

        <div class="course-content">

            <span class="course-category">
                ${escapeHTML(course.category || "General Course")}
            </span>

            <h3>
                ${escapeHTML(course.title || "Untitled Course")}
            </h3>

            <p class="course-description">
                ${escapeHTML(
                    course.description ||
                    "Explore this course and improve your knowledge."
                )}
            </p>

            <div class="course-details">

                <span>
                    <i class="fa-solid fa-building"></i>
                    ${escapeHTML(course.department || "General")}
                </span>

                <span>
                    <i class="fa-solid fa-user-graduate"></i>
                    ${escapeHTML(course.level || "All Levels")}
                </span>

            </div>

            <button class="course-button enrol-button" type="button">

                <i class="fa-solid fa-user-plus"></i>
                Enrol Course

            </button>

        </div>

    `;

    const enrolButton = card.querySelector(".enrol-button");

    enrolButton.addEventListener("click", function() {

        enrolStudent(course.id);

    });

    return card;

}


// ==========================================
// 9. ENROL STUDENT
// ==========================================

async function enrolStudent(courseId) {

    try {

        // Wait until Firebase checks the login status.

        if (!authReady) {
            await authReadyPromise;
        }

        // Check student login.

        if (!currentUser) {

            alert("Please log in as a student before enrolling.");

            window.location.href = "auth.html?mode=login";

            return;

        }

        // Check whether the student is already enrolled.

        const enrollmentQuery = query(
            collection(db, "enrollments"),
            where("studentId", "==", currentUser.uid),
            where("courseId", "==", courseId)
        );

        const enrollmentResults = await getDocs(enrollmentQuery);

        if (!enrollmentResults.empty) {

            alert("You are already enrolled in this course.");

            window.location.href =
                "course.html?id=" + encodeURIComponent(courseId);

            return;

        }

        // Save enrollment in Firestore.

        await addDoc(collection(db, "enrollments"), {

            studentId: currentUser.uid,

            courseId: courseId,

            enrolledAt: serverTimestamp()

        });

        alert("You have successfully enrolled in this course!");

        window.location.href = "student-dashboard.html";

    } catch (error) {

        console.error("Enrollment error:", error);

        alert(
            "Unable to enrol in this course. Please make sure you are logged in with a student account."
        );

    }

}


// ==========================================
// 10. DISPLAY COURSES
// ==========================================

function displayCourses() {

    if (!courseGrid) {
        return;
    }

    const searchValue = courseSearch
        ? courseSearch.value.toLowerCase().trim()
        : "";

    const selectedDepartment = departmentFilter
        ? departmentFilter.value
        : "";

    const selectedLevel = levelFilter
        ? levelFilter.value
        : "";

    // Start with published courses only.

    let filteredCourses = allCourses.filter(function(course) {

        return (
            course.published === true ||
            course.isPublished === true
        );

    });

    // Search courses.

    filteredCourses = filteredCourses.filter(function(course) {

        const title = (course.title || "").toLowerCase();

        const description = (course.description || "").toLowerCase();

        const department = (course.department || "").toLowerCase();

        const category = (course.category || "").toLowerCase();

        return (
            title.includes(searchValue) ||
            description.includes(searchValue) ||
            department.includes(searchValue) ||
            category.includes(searchValue)
        );

    });

    // Filter by department.

    if (selectedDepartment !== "") {

        filteredCourses = filteredCourses.filter(function(course) {

            return course.department === selectedDepartment;

        });

    }

    // Filter by level.

    if (selectedLevel !== "") {

        filteredCourses = filteredCourses.filter(function(course) {

            return String(course.level || "").replace(/\D/g, "") === selectedLevel;

        });

    }

    // Clear previous cards.

    courseGrid.innerHTML = "";

    // Update course count.

    if (courseCount) {

        courseCount.textContent = filteredCourses.length + " Courses";

    }

    // Display empty message.

    if (filteredCourses.length === 0) {

        if (emptyMessage) {
            emptyMessage.classList.remove("hidden");
        }

        return;

    }

    // Hide empty message.

    if (emptyMessage) {
        emptyMessage.classList.add("hidden");
    }

    // Display course cards.

    filteredCourses.forEach(function(course) {

        courseGrid.appendChild(
            createCourseCard(course)
        );

    });

}


// ==========================================
// 11. SEARCH EVENT
// ==========================================

if (courseSearch) {

    courseSearch.addEventListener("input", function() {

        displayCourses();

    });

}


// ==========================================
// 12. DEPARTMENT FILTER EVENT
// ==========================================

if (departmentFilter) {

    departmentFilter.addEventListener("change", function() {

        displayCourses();

    });

}


// ==========================================
// 13. LEVEL FILTER EVENT
// ==========================================

if (levelFilter) {

    levelFilter.addEventListener("change", function() {

        displayCourses();

    });

}


// ==========================================
// 14. INITIALIZE COURSE CATALOGUE
// ==========================================

async function initializeCourses() {

    if (!courseGrid) {
        return;
    }

    courseGrid.innerHTML = `
        <p>Loading published courses...</p>
    `;

    try {

        allCourses = await getCourses();

        loadDepartments();

        displayCourses();

    } catch (error) {

        courseGrid.innerHTML = "";

        if (courseCount) {
            courseCount.textContent = "Unable to load courses";
        }

        if (emptyMessage) {

            emptyMessage.textContent =
                "We could not load courses at the moment. Please try again later.";

            emptyMessage.classList.remove("hidden");

        }

    }

}


// ==========================================
// 15. START COURSE CATALOGUE
// ==========================================

initializeCourses();