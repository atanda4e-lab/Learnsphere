// ======================================
// LEARNSPHERE HOMEPAGE JAVASCRIPT
// ======================================


// 1. MOBILE NAVIGATION MENU

const menuBtn = document.getElementById("menuBtn");
const navbar = document.getElementById("navbar");

if (menuBtn && navbar) {

    menuBtn.addEventListener("click", function () {

        navbar.classList.toggle("active");

        const isOpen = navbar.classList.contains("active");

        menuBtn.setAttribute("aria-expanded", isOpen);

    });

    navbar.querySelectorAll("a").forEach(function (link) {

        link.addEventListener("click", function () {

            navbar.classList.remove("active");

            menuBtn.setAttribute("aria-expanded", "false");

        });

    });

}


// 2. GET HOMEPAGE ELEMENTS

const courseContainer = document.getElementById("courseContainer");

const courseSearch = document.getElementById("courseSearch");

const searchCourseBtn = document.getElementById("searchCourseBtn");

const courseCategoryFilter = document.getElementById("courseCategoryFilter");

const courseLevelFilter = document.getElementById("courseLevelFilter");

const learningCourseList = document.getElementById("learningCourseList");

const lessonContent = document.getElementById("lessonContent");

const homeCourseCount = document.getElementById("homeCourseCount");

const homeStudentCount = document.getElementById("homeStudentCount");


// 3. GET DATA FROM LOCAL STORAGE

function getStoredData(key) {

    try {

        const data = JSON.parse(localStorage.getItem(key));

        return Array.isArray(data) ? data : [];

    } catch (error) {

        console.error("Error reading:", key, error);

        return [];

    }

}


let courses = getStoredData("learnsphereCourses");

let lessons = getStoredData("learnsphereLessons");

let students = getStoredData("learnsphereStudents");

let currentStudent = null;


try {

    currentStudent = JSON.parse(
        localStorage.getItem("learnsphereCurrentStudent")
    );

} catch (error) {

    console.error("Error reading current student:", error);

}


// 4. ESCAPE HTML

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


// 5. CHECK LINKS BEFORE DISPLAYING

function safeLink(url) {

    if (!url) return "";

    try {

        const link = new URL(url, window.location.origin);

        if (
            link.protocol === "http:" ||
            link.protocol === "https:"
        ) {

            return escapeHTML(link.href);

        }

        return "";

    } catch (error) {

        return "";

    }

}


// 6. UPDATE HOMEPAGE STATISTICS

function updateHomepageStatistics() {

    if (homeCourseCount) {

        homeCourseCount.textContent = courses.length;

    }

    if (homeStudentCount) {

        homeStudentCount.textContent = students.length;

    }

}


// 7. DISPLAY COURSES

function displayCourses(courseList = courses) {

    if (!courseContainer) return;

    if (courseList.length === 0) {

        courseContainer.innerHTML = `
            <p class="empty-message">
                No courses available yet.
            </p>
        `;

        return;

    }

    courseContainer.innerHTML = courseList.map(function (course) {

        return `

            <div class="course-card">

                <img
                    src="${safeLink(course.image) || 'https://placehold.co/600x400?text=Course'}"
                    alt="${escapeHTML(course.title || 'Course image')}"
                >

                <div class="course-card-content">

                    <h3>
                        ${escapeHTML(course.title || "Untitled Course")}
                    </h3>

                    <p>
                        ${escapeHTML(course.description || "No description available.")}
                    </p>

                    <p>
                        ${escapeHTML(course.department || "General")}
                    </p>

                    <p>
                        ${escapeHTML(course.level || "All Levels")}
                    </p>

                    <button
                        class="course-button"
                        data-course-id="${escapeHTML(course.id)}"
                    >
                        View Lessons
                    </button>

                </div>

            </div>

        `;

    }).join("");


    courseContainer.querySelectorAll(".course-button").forEach(function (button) {

        button.addEventListener("click", function () {

            displayCourseLessons(button.dataset.courseId);

        });

    });

}


// 8. FILTER COURSES

function filterCourses() {

    const searchText = courseSearch
        ? courseSearch.value.toLowerCase().trim()
        : "";

    const selectedCategory = courseCategoryFilter
        ? courseCategoryFilter.value
        : "";

    const selectedLevel = courseLevelFilter
        ? courseLevelFilter.value
        : "";


    const filteredCourses = courses.filter(function (course) {

        const title = String(course.title || "").toLowerCase();

        const department = String(course.department || "").toLowerCase();

        const description = String(course.description || "").toLowerCase();


        const matchesSearch =

            title.includes(searchText) ||
            department.includes(searchText) ||
            description.includes(searchText);


        const matchesCategory =

            !selectedCategory ||
            course.category === selectedCategory;


        const matchesLevel =

            !selectedLevel ||
            course.level === selectedLevel;


        return matchesSearch && matchesCategory && matchesLevel;

    });


    displayCourses(filteredCourses);

}


// 9. DISPLAY STUDENT'S LEARNING COURSES

function displayLearningCourses() {

    if (!learningCourseList) return;

    const studentId = currentStudent?.id;


    if (!studentId) {

        learningCourseList.innerHTML = `
            <p>
                Please log in to view your learning courses.
            </p>
        `;

        return;

    }


    const enrolledCourses = courses.filter(function (course) {

        return Array.isArray(course.enrolledStudents) &&
            course.enrolledStudents.includes(studentId);

    });


    if (enrolledCourses.length === 0) {

        learningCourseList.innerHTML = `
            <p>
                You have not enrolled in any course yet.
            </p>
        `;

        return;

    }


    learningCourseList.innerHTML = enrolledCourses.map(function (course) {

        return `

            <button
                class="learning-course-button"
                data-course-id="${escapeHTML(course.id)}"
            >

                ${escapeHTML(course.title || "Untitled Course")}

            </button>

        `;

    }).join("");


    learningCourseList.querySelectorAll(".learning-course-button").forEach(
        function (button) {

            button.addEventListener("click", function () {

                displayCourseLessons(button.dataset.courseId);

            });

        }
    );

}


// 10. DISPLAY COURSE LESSONS

function displayCourseLessons(courseId) {

    if (!lessonContent) return;


    const course = courses.find(function (item) {

        return String(item.id) === String(courseId);

    });


    const courseLessons = lessons.filter(function (lesson) {

        return String(lesson.courseId) === String(courseId);

    });


    if (!course) {

        lessonContent.innerHTML = "<p>Course not found.</p>";

        return;

    }


    if (courseLessons.length === 0) {

        lessonContent.innerHTML = `

            <h3>${escapeHTML(course.title)}</h3>

            <p>
                No lessons are available for this course yet.
            </p>

        `;

        return;

    }


    lessonContent.innerHTML = `

        <h2>${escapeHTML(course.title)}</h2>

        ${courseLessons.map(function (lesson) {

            const pdfLink = safeLink(lesson.pdfLink);

            const videoLink = safeLink(lesson.youtubeLink);


            return `

                <div class="lesson-card">

                    <h3>
                        ${escapeHTML(lesson.title || "Untitled Lesson")}
                    </h3>

                    <p>
                        ${escapeHTML(lesson.description || "")}
                    </p>

                    <div>
                        ${escapeHTML(lesson.content || "").replace(/\n/g, "<br>")}
                    </div>

                    ${pdfLink ? `

                        <a
                            href="${pdfLink}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View PDF
                        </a>

                    ` : ""}


                    ${videoLink ? `

                        <a
                            href="${videoLink}"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Watch Video
                        </a>

                    ` : ""}

                </div>

            `;

        }).join("")}

    `;


    lessonContent.scrollIntoView({

        behavior: "smooth",

        block: "start"

    });

}


// 11. DISPLAY STUDENT WELCOME MESSAGE

function displayStudentWelcome() {

    const welcomeMessage = document.getElementById("welcomeMessage");

    if (!welcomeMessage) return;


    if (currentStudent && currentStudent.fullName) {

        welcomeMessage.textContent =
            "Welcome back, " + currentStudent.fullName + "!";

    } else {

        welcomeMessage.textContent = "Welcome to LearnSphere!";

    }

}


// 12. INITIALIZE HOMEPAGE

function initializeHomepage() {

    updateHomepageStatistics();

    displayCourses();

    displayLearningCourses();

    displayStudentWelcome();

}


// 13. SEARCH BUTTON

if (searchCourseBtn) {

    searchCourseBtn.addEventListener("click", filterCourses);

}


// 14. SEARCH WHILE TYPING

if (courseSearch) {

    courseSearch.addEventListener("input", filterCourses);

}


// 15. CATEGORY FILTER

if (courseCategoryFilter) {

    courseCategoryFilter.addEventListener("change", filterCourses);

}


// 16. LEVEL FILTER

if (courseLevelFilter) {

    courseLevelFilter.addEventListener("change", filterCourses);

}


// 17. START HOMEPAGE

initializeHomepage();