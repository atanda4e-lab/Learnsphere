// ==========================================
// LEARNSPHERE STUDENT HOMEPAGE
// ==========================================


// ==========================================
// 1. GET HTML ELEMENTS
// ==========================================

const courseContainer = document.getElementById("courseContainer");

const courseSearch = document.getElementById("courseSearch");

const searchCourseBtn = document.getElementById("searchCourseBtn");

const courseCategoryFilter = document.getElementById("courseCategoryFilter");

const courseLevelFilter = document.getElementById("courseLevelFilter");

const learningCourseList = document.getElementById("learningCourseList");

const lessonContent = document.getElementById("lessonContent");

const homeCourseCount = document.getElementById("homeCourseCount");

const homeStudentCount = document.getElementById("homeStudentCount");


// ==========================================
// 2. GET DATA FROM LOCAL STORAGE
// ==========================================

let courses = JSON.parse(
    localStorage.getItem("learnsphereCourses")
) || [];

let lessons = JSON.parse(
    localStorage.getItem("learnsphereLessons")
) || [];

let students = JSON.parse(
    localStorage.getItem("learnsphereStudents")
) || [];

let currentStudent = JSON.parse(
    localStorage.getItem("learnsphereCurrentStudent")
);


// ==========================================
// 3. ESCAPE HTML
// ==========================================

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


// ==========================================
// 4. CHECK SAFE LINKS
// ==========================================

function safeLink(value) {

    try {

        const url = new URL(value);

        if (url.protocol === "https:" || url.protocol === "http:") {

            return escapeHTML(url.href);

        }

    } catch (error) {

        return "";

    }

    return "";

}


// ==========================================
// 5. UPDATE HOMEPAGE STATISTICS
// ==========================================

function updateHomepageStatistics() {

    if (homeCourseCount) {

        homeCourseCount.textContent = courses.length;

    }

    if (homeStudentCount) {

        homeStudentCount.textContent = students.length;

    }

}


// ==========================================
// 6. DISPLAY COURSES
// ==========================================

function displayCourses(courseList) {

    if (!courseContainer) {

        return;

    }


    if (courseList.length === 0) {

        courseContainer.innerHTML = `

            <p class="empty-message">

                No courses found. Try another search.

            </p>

        `;

        return;

    }


    courseContainer.innerHTML = "";


    courseList.forEach(function (course) {

        const courseCard = document.createElement("div");

        courseCard.className = "course-card";


        const imageLink = safeLink(course.image);


        courseCard.innerHTML = `

            ${imageLink ? `

                <img
                    src="${imageLink}"
                    alt="${escapeHTML(course.title)}"
                    class="course-image"
                >

            ` : ""}


            <div class="course-card-content">

                <span class="course-category">

                    ${escapeHTML(course.category)}

                </span>


                <h3>

                    ${escapeHTML(course.title)}

                </h3>


                <p>

                    ${escapeHTML(course.description)}

                </p>


                <div class="course-details">

                    <span>

                        ${escapeHTML(course.department)}

                    </span>


                    <span>

                        ${escapeHTML(course.level)} Level

                    </span>

                </div>


                <button
                    type="button"
                    class="course-button"
                    data-course-id="${course.id}"
                >

                    View Lessons

                </button>

            </div>

        `;


        courseContainer.appendChild(courseCard);

    });


    // VIEW LESSON BUTTON EVENTS

    const lessonButtons = courseContainer.querySelectorAll(".course-button");


    lessonButtons.forEach(function (button) {

        button.addEventListener("click", function () {

            const courseId = Number(button.dataset.courseId);

            displayCourseLessons(courseId);

        });

    });

}


// ==========================================
// 7. SEARCH AND FILTER COURSES
// ==========================================

function filterCourses() {

    const searchValue = courseSearch
        ? courseSearch.value.trim().toLowerCase()
        : "";

    const categoryValue = courseCategoryFilter
        ? courseCategoryFilter.value
        : "";

    const levelValue = courseLevelFilter
        ? courseLevelFilter.value
        : "";


    const filteredCourses = courses.filter(function (course) {

        const matchesSearch =

            course.title.toLowerCase().includes(searchValue) ||

            course.department.toLowerCase().includes(searchValue) ||

            course.description.toLowerCase().includes(searchValue);


        const matchesCategory =

            categoryValue === "" || course.category === categoryValue;


        const matchesLevel =

            levelValue === "" || course.level === levelValue;


        return matchesSearch && matchesCategory && matchesLevel;

    });


    displayCourses(filteredCourses);

}


// ==========================================
// 8. SEARCH BUTTON
// ==========================================

if (searchCourseBtn) {

    searchCourseBtn.addEventListener("click", function () {

        filterCourses();

    });

}


// ==========================================
// 9. SEARCH WHILE TYPING
// ==========================================

if (courseSearch) {

    courseSearch.addEventListener("input", function () {

        filterCourses();

    });

}


// ==========================================
// 10. CATEGORY FILTER
// ==========================================

if (courseCategoryFilter) {

    courseCategoryFilter.addEventListener("change", function () {

        filterCourses();

    });

}


// ==========================================
// 11. LEVEL FILTER
// ==========================================

if (courseLevelFilter) {

    courseLevelFilter.addEventListener("change", function () {

        filterCourses();

    });

}


// ==========================================
// 12. DISPLAY AVAILABLE COURSES
// IN THE LEARNING CENTRE
// ==========================================

function displayLearningCourses() {

    if (!learningCourseList) {

        return;

    }


    if (courses.length === 0) {

        learningCourseList.innerHTML = `

            <p class="empty-message">

                No courses are available yet.

            </p>

        `;

        return;

    }


    learningCourseList.innerHTML = "";


    courses.forEach(function (course) {

        const courseItem = document.createElement("button");

        courseItem.type = "button";

        courseItem.className = "learning-course-button";

        courseItem.textContent = course.title;


        courseItem.addEventListener("click", function () {

            displayCourseLessons(course.id);

        });


        learningCourseList.appendChild(courseItem);

    });

}


// ==========================================
// 13. DISPLAY LESSONS FOR A COURSE
// ==========================================

function displayCourseLessons(courseId) {

    const selectedCourse = courses.find(function (course) {

        return course.id === courseId;

    });


    if (!selectedCourse || !lessonContent) {

        return;

    }


    const courseLessons = lessons.filter(function (lesson) {

        return lesson.courseId === courseId;

    });


    lessonContent.innerHTML = "";


    const heading = document.createElement("div");

    heading.innerHTML = `

        <h3>${escapeHTML(selectedCourse.title)}</h3>

        <p>${escapeHTML(selectedCourse.description)}</p>

    `;


    lessonContent.appendChild(heading);


    if (courseLessons.length === 0) {

        const emptyMessage = document.createElement("p");

        emptyMessage.textContent = "No lessons have been added to this course yet.";

        lessonContent.appendChild(emptyMessage);

        return;

    }


    courseLessons.forEach(function (lesson, index) {

        const lessonItem = document.createElement("div");

        lessonItem.className = "learning-lesson";


        const pdfLink = safeLink(lesson.pdf);

        const videoLink = safeLink(lesson.video);


        lessonItem.innerHTML = `

            <h4>

                ${index + 1}. ${escapeHTML(lesson.title)}

            </h4>


            <p>

                ${escapeHTML(lesson.description)}

            </p>


            <div class="lesson-notes">

                ${escapeHTML(lesson.content).replace(/\n/g, "<br>")}

            </div>


            ${pdfLink ? `

                <a
                    href="${pdfLink}"
                    target="_blank"
                    rel="noopener noreferrer"
                >

                    Open PDF Resource

                </a>

            ` : ""}


            ${videoLink ? `

                <a
                    href="${videoLink}"
                    target="_blank"
                    rel="noopener noreferrer"
                >

                    Watch Video Lesson

                </a>

            ` : ""}

        `;


        lessonContent.appendChild(lessonItem);

    });


    // MOVE TO LEARNING CENTRE

    const learningSection = document.getElementById("learning");

    if (learningSection) {

        learningSection.scrollIntoView({

            behavior: "smooth"

        });

    }

}


// ==========================================
// 14. DISPLAY LOGGED-IN STUDENT NAME
// ==========================================

function displayStudentWelcome() {

    if (!currentStudent) {

        return;

    }


    const welcomeMessage = document.getElementById("studentWelcome");


    if (welcomeMessage) {

        welcomeMessage.textContent =

            "Welcome, " + currentStudent.fullName;

    }

}


// ==========================================
// 15. INITIALIZE HOMEPAGE
// ==========================================

function initializeHomepage() {

    updateHomepageStatistics();

    displayCourses(courses);

    displayLearningCourses();

    displayStudentWelcome();

}


// ==========================================
// 16. RUN HOMEPAGE
// ==========================================

initializeHomepage();