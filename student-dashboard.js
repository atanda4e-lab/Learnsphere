// ======================================
// LEARNSPHERE STUDENT DASHBOARD
// ======================================


// ======================================
// GET DATA FROM LOCAL STORAGE
// ======================================

function getData(key) {

    try {

        const data = JSON.parse(localStorage.getItem(key));

        return Array.isArray(data) ? data : [];

    } catch (error) {

        console.log("Error loading " + key, error);

        return [];

    }

}


// SAVE DATA TO LOCAL STORAGE

function saveData(key, data) {

    localStorage.setItem(key, JSON.stringify(data));

}


// ======================================
// CURRENT STUDENT
// ======================================

let currentStudent = null;

try {

    currentStudent = JSON.parse(
        localStorage.getItem("learnsphereCurrentStudent")
    );

} catch (error) {

    currentStudent = null;

}


if (!currentStudent) {

    window.location.href = "auth.html?mode=student";

}


function getStudentId() {

    return String(currentStudent?.id ?? currentStudent?.uid ?? "");

}


function getStudentName() {

    return currentStudent?.fullName ||
        currentStudent?.name ||
        "Student";

}


// ======================================
// HELPER FUNCTIONS
// ======================================

function escapeHTML(value) {

    const element = document.createElement("div");

    element.textContent = value ?? "";

    return element.innerHTML;

}


function formatDate(dateValue) {

    if (!dateValue) {

        return "Date not available";

    }

    const date = new Date(dateValue);

    if (isNaN(date.getTime())) {

        return "Date not available";

    }

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

}


// ======================================
// STUDENT PROFILE
// ======================================

function loadStudentInformation() {

    const name = getStudentName();

    document.getElementById("studentName").textContent = name;

    document.getElementById("welcomeName").textContent =
        name.split(" ")[0];


    document.getElementById("profileFullName").textContent =
        name;

    document.getElementById("profileEmail").textContent =
        currentStudent.email || "Not available";

    document.getElementById("profileDepartment").textContent =
        currentStudent.department || "Not available";

    document.getElementById("profileLevel").textContent =
        currentStudent.level || "Not available";

    document.getElementById("profileUniversity").textContent =
        currentStudent.university ||
        currentStudent.school ||
        "Not available";

}


// ======================================
// GET STUDENT ENROLLMENTS
// ======================================

function getStudentEnrollments() {

    const enrollments = getData("learnsphereEnrollments");

    const studentId = getStudentId();

    return enrollments.filter(function (enrollment) {

        return String(enrollment.studentId) === studentId;

    });

}


// CHECK IF STUDENT IS ENROLLED

function isStudentEnrolled(courseId) {

    const enrollments = getStudentEnrollments();

    return enrollments.some(function (enrollment) {

        return String(enrollment.courseId) === String(courseId);

    });

}


// ======================================
// COURSE CARD
// ======================================

function createCourseCard(course) {

    const image = course.image || course.thumbnail || "";

    return `

        <div class="course-card">

            <div class="course-image">

                ${
                    image
                    ?
                    `<img src="${escapeHTML(image)}" alt="${escapeHTML(course.title)}">`
                    :
                    `<i class="fa-solid fa-book-open"></i>`
                }

            </div>

            <div class="course-info">

                <h3>${escapeHTML(course.title)}</h3>

                <p>
                    ${escapeHTML(course.description || "Learn new skills with this course.")}
                </p>

                <div class="course-meta">

                    <span>
                        <i class="fa-solid fa-building"></i>
                        ${escapeHTML(course.department || "General")}
                    </span>

                    <span>
                        <i class="fa-solid fa-layer-group"></i>
                        ${escapeHTML(course.level || "All Levels")}
                    </span>

                </div>

                <a href="course.html?id=${encodeURIComponent(course.id)}"
                    class="course-button">

                    Continue Learning
                    <i class="fa-solid fa-arrow-right"></i>

                </a>

            </div>

        </div>

    `;

}


// ======================================
// EMPTY STATE
// ======================================

function displayEmptyState(message, icon) {

    return `

        <div class="empty-state">

            <i class="${icon}"></i>

            <p>${escapeHTML(message)}</p>

        </div>

    `;

}


// ======================================
// LOAD STUDENT COURSES
// ======================================

function loadStudentCourses() {

    const courses = getData("learnsphereCourses");

    const enrollments = getStudentEnrollments();

    const overviewList =
        document.getElementById("overviewCourseList");

    const fullCourseList =
        document.getElementById("studentCourseList");


    const studentCourses = enrollments.map(function (enrollment) {

        return courses.find(function (course) {

            return String(course.id) === String(enrollment.courseId);

        });

    }).filter(function (course) {

        return course && course.published === true;

    });


    if (studentCourses.length === 0) {

        overviewList.innerHTML = displayEmptyState(
            "You have not enrolled in any courses yet.",
            "fa-solid fa-book-open"
        );

        fullCourseList.innerHTML = displayEmptyState(
            "No enrolled courses found. Explore available courses to get started.",
            "fa-solid fa-book"
        );

        return;

    }


    overviewList.innerHTML = studentCourses
        .slice(0, 2)
        .map(createCourseCard)
        .join("");


    fullCourseList.innerHTML = studentCourses
        .map(createCourseCard)
        .join("");

}


// ======================================
// EXPLORE COURSES
// ======================================

function loadExploreCourses() {

    const courses = getData("learnsphereCourses");

    const exploreList =
        document.getElementById("exploreCourseList");

    const availableCourses = courses.filter(function (course) {

        return course.published === true;

    });


    if (availableCourses.length === 0) {

        exploreList.innerHTML = displayEmptyState(
            "No published courses are available yet.",
            "fa-solid fa-book-open"
        );

        document.getElementById("availableCourseCount").textContent = 0;

        return;

    }


    displayDepartmentFilters(availableCourses);

    displayExploreCourseCards(availableCourses);

}


// ======================================
// DEPARTMENT FILTER
// ======================================

function displayDepartmentFilters(courses) {

    const departmentFilter =
        document.getElementById("departmentFilter");

    const previousValue = departmentFilter.value;

    const departments = [
        ...new Set(
            courses
                .map(function (course) {
                    return course.department;
                })
                .filter(Boolean)
        )
    ];


    departmentFilter.innerHTML =
        `<option value="">All Departments</option>`;


    departments.sort().forEach(function (department) {

        const option = document.createElement("option");

        option.value = department;

        option.textContent = department;

        departmentFilter.appendChild(option);

    });


    departmentFilter.value = departments.includes(previousValue)
        ? previousValue
        : "";

}


// ======================================
// DISPLAY EXPLORE COURSE CARDS
// ======================================

function displayExploreCourseCards(courses) {

    const exploreList =
        document.getElementById("exploreCourseList");


    document.getElementById("availableCourseCount").textContent =
        courses.length;


    if (courses.length === 0) {

        exploreList.innerHTML = displayEmptyState(
            "No courses match your search.",
            "fa-solid fa-magnifying-glass"
        );

        return;

    }


    exploreList.innerHTML = courses.map(function (course) {

        const enrolled = isStudentEnrolled(course.id);

        const image = course.image || course.thumbnail || "";


        return `

            <div class="course-card">

                <div class="course-image">

                    ${
                        image
                        ?
                        `<img src="${escapeHTML(image)}" alt="${escapeHTML(course.title)}">`
                        :
                        `<i class="fa-solid fa-book-open"></i>`
                    }

                </div>


                <div class="course-info">

                    <h3>${escapeHTML(course.title)}</h3>

                    <p>
                        ${escapeHTML(course.description || "Explore this course and develop your knowledge.")}
                    </p>


                    <div class="course-meta">

                        <span>
                            <i class="fa-solid fa-building"></i>
                            ${escapeHTML(course.department || "General")}
                        </span>

                        <span>
                            <i class="fa-solid fa-layer-group"></i>
                            ${escapeHTML(course.level || "All Levels")}
                        </span>

                    </div>


                    <button
                        class="enrol-button ${enrolled ? "enrolled" : ""}"
                        data-course-id="${escapeHTML(course.id)}"
                        ${enrolled ? "disabled" : ""}>

                        ${
                            enrolled
                            ?
                            `<i class="fa-solid fa-circle-check"></i> Already Enrolled`
                            :
                            `<i class="fa-solid fa-plus"></i> Enrol Now`
                        }

                    </button>

                </div>

            </div>

        `;

    }).join("");


    // ENROL BUTTON EVENTS

    document.querySelectorAll(".enrol-button").forEach(function (button) {

        button.addEventListener("click", function () {

            const courseId = this.dataset.courseId;

            enrolStudentInCourse(courseId);

        });

    });

}


// ======================================
// SEARCH AND FILTER COURSES
// ======================================

function filterExploreCourses() {

    const courses = getData("learnsphereCourses");

    const searchValue = document
        .getElementById("courseSearch")
        .value
        .toLowerCase()
        .trim();

    const departmentValue =
        document.getElementById("departmentFilter").value;

    const levelValue =
        document.getElementById("levelFilter").value;


    const filteredCourses = courses.filter(function (course) {

        if (course.published !== true) {

            return false;

        }


        const title = (course.title || "").toLowerCase();

        const description = (course.description || "").toLowerCase();

        const department = course.department || "";

        const level = String(course.level || "")
            .replace(/\s*level/i, "")
            .trim();


        const matchesSearch =
            title.includes(searchValue) ||
            description.includes(searchValue);

        const matchesDepartment =
            !departmentValue || department === departmentValue;

        const matchesLevel =
            !levelValue || level === levelValue;


        return matchesSearch &&
            matchesDepartment &&
            matchesLevel;

    });


    displayExploreCourseCards(filteredCourses);

}


// SEARCH EVENT

document.getElementById("courseSearch").addEventListener(
    "input",
    filterExploreCourses
);


// DEPARTMENT FILTER EVENT

document.getElementById("departmentFilter").addEventListener(
    "change",
    filterExploreCourses
);


// LEVEL FILTER EVENT

document.getElementById("levelFilter").addEventListener(
    "change",
    filterExploreCourses
);


// ======================================
// ENROL STUDENT IN COURSE
// ======================================

function enrolStudentInCourse(courseId) {

    const courses = getData("learnsphereCourses");

    const enrollments = getData("learnsphereEnrollments");

    const course = courses.find(function (item) {

        return String(item.id) === String(courseId);

    });


    if (!course || course.published !== true) {

        alert("This course is not currently available.");

        return;

    }


    if (isStudentEnrolled(courseId)) {

        alert("You are already enrolled in this course.");

        return;

    }


    const newEnrollment = {

        id: "ENR-" + Date.now(),

        studentId: getStudentId(),

        courseId: course.id,

        courseTitle: course.title,

        studentName: getStudentName(),

        enrolledAt: new Date().toISOString()

    };


    enrollments.push(newEnrollment);


    saveData("learnsphereEnrollments", enrollments);


    alert("You have successfully enrolled in " + course.title + "!");


    // REFRESH COURSE LISTS

    loadExploreCourses();

    loadStudentCourses();

    updateDashboardStatistics();

}


// ======================================
// LOAD QUIZ RESULTS
// ======================================

function loadStudentResults() {

    const results = getData("learnsphereResults");

    const studentId = getStudentId();

    const courses = getData("learnsphereCourses");

    const resultList =
        document.getElementById("studentResultList");


    const studentResults = results.filter(function (result) {

        return String(result.studentId) === studentId;

    });


    if (studentResults.length === 0) {

        resultList.innerHTML = displayEmptyState(
            "You have not completed any quizzes yet.",
            "fa-solid fa-chart-column"
        );

        return;

    }


    resultList.innerHTML = studentResults
        .slice()
        .reverse()
        .map(function (result) {

            const course = courses.find(function (item) {

                return String(item.id) === String(result.courseId);

            });


            const courseTitle =
                result.courseTitle ||
                course?.title ||
                "Course";

            const percentage = Number(result.percentage) || 0;


            return `

                <div class="result-card">

                    <h3>${escapeHTML(courseTitle)}</h3>

                    <div class="result-details">

                        <span>
                            Score:
                            ${escapeHTML(result.score ?? 0)}
                            /
                            ${escapeHTML(result.totalQuestions ?? 0)}
                        </span>

                        <span class="result-score">
                            ${percentage}%
                        </span>

                        <span>
                            Date:
                            ${formatDate(result.submittedAt || result.date)}
                        </span>

                    </div>

                </div>

            `;

        }).join("");

}


// ======================================
// LOAD CERTIFICATES
// ======================================

function loadStudentCertificates() {

    const certificates = getData("learnsphereCertificates");

    const studentId = getStudentId();

    const certificateList =
        document.getElementById("studentCertificateList");


    const studentCertificates = certificates.filter(function (certificate) {

        return String(certificate.studentId) === studentId;

    });


    if (studentCertificates.length === 0) {

        certificateList.innerHTML = displayEmptyState(
            "You have not earned any certificates yet.",
            "fa-solid fa-certificate"
        );

        return;

    }


    certificateList.innerHTML = studentCertificates
        .slice()
        .reverse()
        .map(function (certificate) {

            return `

                <div class="certificate-card">

                    <div class="certificate-icon">
                        <i class="fa-solid fa-award"></i>
                    </div>

                    <h3>
                        ${escapeHTML(certificate.courseTitle || "Completed Course")}
                    </h3>

                    <p>
                        Certificate ID:
                        ${escapeHTML(certificate.certificateId || certificate.id)}
                    </p>

                    <p>
                        Score:
                        ${escapeHTML(certificate.percentage ?? 0)}%
                    </p>

                    <p>
                        Issued:
                        ${formatDate(certificate.issuedAt)}
                    </p>

                    <button
                        class="download-btn"
                        data-certificate-id="${escapeHTML(certificate.id)}">

                        <i class="fa-solid fa-download"></i>
                        Download Certificate

                    </button>

                </div>

            `;

        }).join("");


    document.querySelectorAll(".download-btn").forEach(function (button) {

        button.addEventListener("click", function () {

            downloadCertificate(this.dataset.certificateId);

        });

    });

}


// ======================================
// DOWNLOAD CERTIFICATE PDF
// ======================================

function downloadCertificate(certificateId) {

    const certificates = getData("learnsphereCertificates");

    const certificate = certificates.find(function (item) {

        return String(item.id) === String(certificateId);

    });


    if (!certificate) {

        alert("Certificate not found.");

        return;

    }


    if (!window.jspdf || !window.jspdf.jsPDF) {

        alert("PDF library could not load. Check your internet connection.");

        return;

    }


    const { jsPDF } = window.jspdf;

    const pdf = new jsPDF({

        orientation: "landscape",

        unit: "mm",

        format: "a4"

    });


    const studentName =
        certificate.studentName || getStudentName();

    const courseTitle =
        certificate.courseTitle || "Completed Course";

    const certificateNumber =
        certificate.certificateId || certificate.id;

    const score =
        certificate.percentage ?? 0;

    const issueDate =
        formatDate(certificate.issuedAt);


    // BACKGROUND

    pdf.setFillColor(250, 253, 250);

    pdf.rect(0, 0, 297, 210, "F");


    // BORDER

    pdf.setDrawColor(21, 128, 61);

    pdf.setLineWidth(2);

    pdf.rect(10, 10, 277, 190);

    pdf.setLineWidth(0.5);

    pdf.rect(15, 15, 267, 180);


    // PLATFORM NAME

    pdf.setTextColor(21, 128, 61);

    pdf.setFont("helvetica", "bold");

    pdf.setFontSize(25);

    pdf.text("LearnSphere", 148.5, 37, {
        align: "center"
    });


    // CERTIFICATE TITLE

    pdf.setTextColor(30, 41, 59);

    pdf.setFontSize(30);

    pdf.text("CERTIFICATE OF COMPLETION", 148.5, 63, {
        align: "center"
    });


    // INTRODUCTION

    pdf.setFont("helvetica", "normal");

    pdf.setFontSize(15);

    pdf.setTextColor(71, 85, 105);

    pdf.text("This certificate is proudly presented to", 148.5, 83, {
        align: "center"
    });


    // STUDENT NAME

    pdf.setFont("times", "bold");

    pdf.setFontSize(28);

    pdf.setTextColor(21, 128, 61);

    pdf.text(
        pdf.splitTextToSize(studentName, 240),
        148.5,
        105,
        { align: "center" }
    );


    // COURSE

    pdf.setFont("helvetica", "normal");

    pdf.setFontSize(14);

    pdf.setTextColor(71, 85, 105);

    pdf.text("For successfully completing the course", 148.5, 123, {
        align: "center"
    });


    pdf.setFont("helvetica", "bold");

    pdf.setFontSize(20);

    pdf.setTextColor(30, 41, 59);

    pdf.text(
        pdf.splitTextToSize(courseTitle, 230),
        148.5,
        138,
        { align: "center" }
    );


    // SCORE

    pdf.setFont("helvetica", "normal");

    pdf.setFontSize(13);

    pdf.setTextColor(71, 85, 105);

    pdf.text("Final Quiz Score: " + score + "%", 148.5, 157, {
        align: "center"
    });


    // DATE AND CERTIFICATE ID

    pdf.setFontSize(10);

    pdf.text("Date Issued: " + issueDate, 35, 178);

    pdf.text("Certificate ID: " + certificateNumber, 35, 186);


    // FOUNDER

    pdf.setDrawColor(21, 128, 61);

    pdf.line(207, 177, 262, 177);

    pdf.setFont("helvetica", "bold");

    pdf.setFontSize(13);

    pdf.setTextColor(30, 41, 59);

    pdf.text("AKINTAYO IBRAHIM", 234.5, 184, {
        align: "center"
    });

    pdf.setFont("helvetica", "normal");

    pdf.setFontSize(10);

    pdf.text("Founder, LearnSphere", 234.5, 190, {
        align: "center"
    });


    // SAVE FILE

    const safeName = studentName.replace(/[^a-z0-9]/gi, "_");

    pdf.save("LearnSphere_Certificate_" + safeName + ".pdf");

}


// ======================================
// DASHBOARD STATISTICS
// ======================================

function updateDashboardStatistics() {

    const enrollments = getStudentEnrollments();

    const results = getData("learnsphereResults");

    const certificates = getData("learnsphereCertificates");

    const completedLessons = getData("learnsphereCompletedLessons");

    const studentId = getStudentId();


    const studentResults = results.filter(function (result) {

        return String(result.studentId) === studentId;

    });


    const studentCertificates = certificates.filter(function (certificate) {

        return String(certificate.studentId) === studentId;

    });


    const studentCompletedLessons = completedLessons.filter(function (lesson) {

        return String(lesson.studentId) === studentId;

    });


    document.getElementById("enrolledCourses").textContent =
        enrollments.length;

    document.getElementById("completedLessons").textContent =
        studentCompletedLessons.length;

    document.getElementById("completedQuizzes").textContent =
        studentResults.length;

    document.getElementById("earnedCertificates").textContent =
        studentCertificates.length;

}


// ======================================
// DASHBOARD NAVIGATION
// ======================================

function showDashboardSection(sectionName) {

    const sections = document.querySelectorAll(".dashboard-section");

    const links = document.querySelectorAll(".sidebar-link");


    sections.forEach(function (section) {

        section.classList.remove("active");

    });


    links.forEach(function (link) {

        link.classList.remove("active");

    });


    const selectedSection = document.getElementById(sectionName);

    if (selectedSection) {

        selectedSection.classList.add("active");

    }


    const selectedLink = document.querySelector(
        `.sidebar-link[data-section="${sectionName}"]`
    );

    if (selectedLink) {

        selectedLink.classList.add("active");

    }

}


// SIDEBAR NAVIGATION EVENTS

document.querySelectorAll(".sidebar-link").forEach(function (link) {

    link.addEventListener("click", function (event) {

        event.preventDefault();

        showDashboardSection(this.dataset.section);

    });

});


// OTHER SECTION BUTTONS

document.querySelectorAll("[data-section]").forEach(function (button) {

    if (button.classList.contains("sidebar-link")) {

        return;

    }

    button.addEventListener("click", function () {

        showDashboardSection(this.dataset.section);

    });

});


// ======================================
// LOGOUT
// ======================================

document.getElementById("logoutBtn").addEventListener("click", function () {

    const confirmLogout = confirm(
        "Are you sure you want to log out?"
    );


    if (confirmLogout) {

        localStorage.removeItem("learnsphereCurrentStudent");

        window.location.href = "auth.html?mode=student";

    }

});


// ======================================
// CURRENT YEAR
// ======================================

document.getElementById("currentYear").textContent =
    new Date().getFullYear();


// ======================================
// LOAD EVERYTHING
// ======================================

function loadDashboard() {

    if (!currentStudent) {

        return;

    }

    loadStudentInformation();

    loadStudentCourses();

    loadExploreCourses();

    loadStudentResults();

    loadStudentCertificates();

    updateDashboardStatistics();

}


loadDashboard();