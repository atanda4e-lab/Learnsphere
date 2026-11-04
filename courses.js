// ======================================
// LEARNSPHERE COURSE CATALOGUE
// ======================================


// GET HTML ELEMENTS

const courseGrid = document.getElementById("courseGrid");
const courseSearch = document.getElementById("courseSearch");
const departmentFilter = document.getElementById("departmentFilter");
const levelFilter = document.getElementById("levelFilter");
const courseCount = document.getElementById("courseCount");
const emptyMessage = document.getElementById("emptyMessage");


// ======================================
// GET DATA FROM LOCAL STORAGE
// ======================================

function getData(key) {

    try {

        const data = localStorage.getItem(key);

        return data ? JSON.parse(data) : [];

    } catch (error) {

        console.error("Error reading " + key + ":", error);

        return [];

    }

}


// ======================================
// SAVE DATA TO LOCAL STORAGE
// ======================================

function saveData(key, data) {

    localStorage.setItem(key, JSON.stringify(data));

}


// ======================================
// GET ALL COURSES
// ======================================

function getCourses() {

    return getData("learnsphereCourses");

}


// ======================================
// LOAD DEPARTMENTS
// ======================================

function loadDepartments() {

    if (!departmentFilter) {
        return;
    }

    const courses = getCourses();

    const publishedCourses = courses.filter(function(course) {

        return course.published === true;

    });

    const departments = [
        ...new Set(
            publishedCourses.map(function(course) {
                return course.department;
            }).filter(Boolean)
        )
    ];

    departmentFilter.innerHTML = `
        <option value="">All Departments</option>
    `;

    departments.forEach(function(department) {

        const option = document.createElement("option");

        option.value = department;
        option.textContent = department;

        departmentFilter.appendChild(option);

    });

}


// ======================================
// CREATE COURSE CARD
// ======================================

function createCourseCard(course) {

    const card = document.createElement("div");

    card.className = "course-card";

    const imageContent = course.image
        ? `<img src="${course.image}" alt="Course image">`
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
                ${escapeHTML(course.description || "Explore this course and improve your knowledge.")}
            </p>

            <div class="course-details">

                <span>
                    <i class="fa-solid fa-building"></i>
                    ${escapeHTML(course.department || "General")}
                </span>

                <span>
                    <i class="fa-solid fa-user-graduate"></i>
                    ${escapeHTML(String(course.level || "All Levels"))}
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


// ======================================
// ENROL STUDENT
// ======================================

function enrolStudent(courseId) {

    let currentStudent = null;

    try {

        currentStudent = JSON.parse(
            localStorage.getItem("learnsphereCurrentStudent")
        );

    } catch (error) {

        console.error("Student information error:", error);

    }


    // CHECK STUDENT LOGIN

    if (!currentStudent || !currentStudent.id) {

        alert("Please log in as a student before enrolling.");

        window.location.href = "auth.html?mode=login";

        return;

    }


    // GET ENROLMENTS

    const enrollments = getData("learnsphereEnrollments");


    // CHECK EXISTING ENROLMENT

    const alreadyEnrolled = enrollments.some(function(enrollment) {

        return (

            String(enrollment.studentId) === String(currentStudent.id) &&

            String(enrollment.courseId) === String(courseId)

        );

    });


    if (alreadyEnrolled) {

        alert("You are already enrolled in this course.");

        window.location.href = "course.html?id=" + encodeURIComponent(courseId);

        return;

    }


    // CREATE NEW ENROLMENT

    const newEnrollment = {

        id: Date.now(),

        studentId: currentStudent.id,

        courseId: courseId,

        enrolledAt: new Date().toISOString()

    };


    // SAVE ENROLMENT

    enrollments.push(newEnrollment);

    saveData("learnsphereEnrollments", enrollments);


    alert("You have successfully enrolled in this course!");


    // OPEN STUDENT DASHBOARD

    window.location.href = "student-dashboard.html";

}


// ======================================
// DISPLAY COURSES
// ======================================

function displayCourses() {

    if (!courseGrid) {
        return;
    }

    const courses = getCourses();

    const searchValue = courseSearch
        ? courseSearch.value.toLowerCase().trim()
        : "";

    const selectedDepartment = departmentFilter
        ? departmentFilter.value
        : "";

    const selectedLevel = levelFilter
        ? levelFilter.value
        : "";


    // SHOW PUBLISHED COURSES ONLY

    let filteredCourses = courses.filter(function(course) {

        return course.published === true;

    });


    // SEARCH COURSES

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


    // FILTER BY DEPARTMENT

    if (selectedDepartment !== "") {

        filteredCourses = filteredCourses.filter(function(course) {

            return course.department === selectedDepartment;

        });

    }


    // FILTER BY LEVEL

    if (selectedLevel !== "") {

        filteredCourses = filteredCourses.filter(function(course) {

            return String(course.level).replace(/\D/g, "") === selectedLevel;

        });

    }


    // CLEAR OLD COURSES

    courseGrid.innerHTML = "";


    // UPDATE COURSE COUNT

    if (courseCount) {

        courseCount.textContent = filteredCourses.length + " Courses";

    }


    // CHECK EMPTY COURSES

    if (filteredCourses.length === 0) {

        if (emptyMessage) {
            emptyMessage.classList.remove("hidden");
        }

        return;

    }


    // HIDE EMPTY MESSAGE

    if (emptyMessage) {
        emptyMessage.classList.add("hidden");
    }


    // DISPLAY COURSE CARDS

    filteredCourses.forEach(function(course) {

        courseGrid.appendChild(
            createCourseCard(course)
        );

    });

}


// ======================================
// ESCAPE HTML
// ======================================

function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, function(character) {

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


// ======================================
// SEARCH EVENT
// ======================================

if (courseSearch) {

    courseSearch.addEventListener("input", function() {

        displayCourses();

    });

}


// ======================================
// DEPARTMENT FILTER EVENT
// ======================================

if (departmentFilter) {

    departmentFilter.addEventListener("change", function() {

        displayCourses();

    });

}


// ======================================
// LEVEL FILTER EVENT
// ======================================

if (levelFilter) {

    levelFilter.addEventListener("change", function() {

        displayCourses();

    });

}


// ======================================
// INITIALIZE COURSE CATALOGUE
// ======================================

function initializeCourses() {

    loadDepartments();

    displayCourses();

}


// ======================================
// START THE PAGE
// ======================================

initializeCourses();