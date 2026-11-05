// ==========================================
// LEARNSPHERE STUDENT DASHBOARD
// COMPLETE FIREBASE VERSION
// ==========================================


// ==========================================
// 1. FIREBASE IMPORTS
// ==========================================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc,
    collection,
    query,
    where,
    getDocs,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ==========================================
// 2. GLOBAL VARIABLES
// ==========================================

let currentStudent = null;

let studentCourses = [];

let studentEnrollments = [];

let studentResults = [];

let studentCertificates = [];

let completedLessons = [];


// ==========================================
// 3. HELPER FUNCTIONS
// ==========================================

// GET ELEMENT

function getElement(id) {
    return document.getElementById(id);
}


// GET STUDENT ID

function getStudentId() {
    return currentStudent ? currentStudent.uid : "";
}


// GET STUDENT NAME

function getStudentName() {
    return currentStudent ? currentStudent.fullName : "Student";
}


// CHECK IF ELEMENT EXISTS

function setText(id, value) {

    const element = getElement(id);

    if (element) {
        element.textContent = value;
    }

}


// ESCAPE HTML

function escapeHTML(value) {

    const element = document.createElement("div");

    element.textContent = value ?? "";

    return element.innerHTML;

}


// FORMAT DATE

function formatDate(dateValue) {

    if (!dateValue) {
        return "Date not available";
    }

    const date = typeof dateValue.toDate === "function"
        ? dateValue.toDate()
        : new Date(dateValue);

    if (isNaN(date.getTime())) {
        return "Date not available";
    }

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });

}


// CHECK COURSE PUBLICATION STATUS

function isCoursePublished(course) {

    if (typeof course.published === "boolean") {
        return course.published;
    }

    return course.isPublished === true;

}


// GET COURSE BY ID

function getCourseById(courseId) {

    return studentCourses.find(function (course) {

        return String(course.id) === String(courseId);

    });

}


// EMPTY STATE

function displayEmptyState(message, icon) {

    return `
        <div class="empty-state">

            <i class="${icon}"></i>

            <p>${escapeHTML(message)}</p>

        </div>
    `;

}


// ==========================================
// 4. FIREBASE AUTHENTICATION
// ==========================================

onAuthStateChanged(auth, async function (user) {

    if (!user) {

        window.location.href = "auth.html?mode=student";

        return;

    }

    console.log("Checking student account...");

    // DISPLAY BASIC PROFILE IMMEDIATELY

    currentStudent = {

        uid: user.uid,

        fullName: user.displayName || "Student",

        email: user.email || "",

        university: "",

        department: "",

        level: ""

    };

    loadStudentInformation();

    // SHOW LOADING MESSAGES

    setText("enrolledCourses", "...");
    setText("completedLessons", "...");
    setText("completedQuizzes", "...");
    setText("earnedCertificates", "...");

    const overviewList = getElement("overviewCourseList");
    const fullCourseList = getElement("studentCourseList");
    const exploreList = getElement("exploreCourseList");

    if (overviewList) {
        overviewList.innerHTML = "<p>Loading your courses...</p>";
    }

    if (fullCourseList) {
        fullCourseList.innerHTML = "<p>Loading your courses...</p>";
    }

    if (exploreList) {
        exploreList.innerHTML = "<p>Loading available courses...</p>";
    }

    try {

        // GET STUDENT PROFILE

        const studentRef = doc(db, "students", user.uid);

        const studentSnapshot = await getDoc(studentRef);

        if (!studentSnapshot.exists()) {

            alert("Student profile not found.");

            await signOut(auth);

            window.location.href = "auth.html?mode=student";

            return;

        }

        const studentData = studentSnapshot.data();

        // CHECK STUDENT ROLE

        if (studentData.role !== "student") {

            alert("You do not have student access.");

            await signOut(auth);

            window.location.href = "auth.html?mode=student";

            return;

        }

        // UPDATE STUDENT INFORMATION

        currentStudent = {

            uid: user.uid,

            fullName: studentData.fullName || user.displayName || "Student",

            email: studentData.email || user.email || "",

            university: studentData.university || "",

            department: studentData.department || "",

            level: studentData.level || ""

        };

        console.log("Student authenticated:", currentStudent);

        // DISPLAY COMPLETE PROFILE IMMEDIATELY

        loadStudentInformation();

        // LOAD OTHER DATA IN THE BACKGROUND

        await loadAllStudentData();

        // REFRESH DASHBOARD AFTER DATA LOADS

        loadDashboard();

        console.log("Student dashboard loaded successfully.");

    }

    catch (error) {

        console.error("Dashboard authentication error:", error);

        alert(
            "Unable to load your dashboard.\n\n" +
            error.message
        );

    }

});
// ==========================================
// 5. LOAD ALL STUDENT DATA
// ==========================================

async function loadAllStudentData() {

    console.log("Loading student dashboard data...");

    const loadingTasks = [

        {
            name: "Courses",
            task: loadCourses
        },

        {
            name: "Enrolments",
            task: loadStudentEnrollments
        },

        {
            name: "Results",
            task: loadStudentResults
        },

        {
            name: "Certificates",
            task: loadStudentCertificates
        },

        {
            name: "Completed Lessons",
            task: loadCompletedLessons
        }

    ];

    const results = await Promise.allSettled(

        loadingTasks.map(function (item) {

            return item.task();

        })

    );

    results.forEach(function (result, index) {

        if (result.status === "rejected") {

            console.error(
                loadingTasks[index].name + " failed:",
                result.reason
            );

        }

    });

    console.log("Student data loading completed.");

}


// ==========================================
// 6. LOAD COURSES FROM FIRESTORE
// ==========================================

async function loadCourses() {

    try {

        const coursesQuery = query(

            collection(db, "courses"),

            where("published", "==", true)

        );

        const snapshot = await getDocs(coursesQuery);

        studentCourses = snapshot.docs.map(function (document) {

            return {
                ...document.data(),
                id: document.id
            };

        });

        console.log("Published courses:", studentCourses);

    }

    catch (error) {

        console.error("Course loading error:", error);

        throw error;

    }

}


// ==========================================
// 7. LOAD STUDENT ENROLMENTS
// ==========================================

async function loadStudentEnrollments() {

    try {

        const enrollmentQuery = query(

            collection(db, "enrollments"),

            where("studentId", "==", getStudentId())

        );


        const snapshot = await getDocs(enrollmentQuery);


        studentEnrollments = snapshot.docs.map(function (document) {

            return {

                ...document.data(),

                id: document.id

            };

        });


        console.log("Student enrolments:", studentEnrollments);


    }

    catch (error) {

        console.error("Enrolment loading error:", error);

        throw error;

    }

}


// ==========================================
// 8. LOAD STUDENT QUIZ RESULTS
// ==========================================

async function loadStudentResults() {

    try {

        const resultQuery = query(

            collection(db, "results"),

            where("studentId", "==", getStudentId())

        );


        const snapshot = await getDocs(resultQuery);


        studentResults = snapshot.docs.map(function (document) {

            return {

                ...document.data(),

                id: document.id

            };

        });


        console.log("Student results:", studentResults);


    }

    catch (error) {

        console.error("Results loading error:", error);

        throw error;

    }

}


// ==========================================
// 9. LOAD STUDENT CERTIFICATES
// ==========================================

async function loadStudentCertificates() {

    try {

        const certificateQuery = query(

            collection(db, "certificates"),

            where("studentId", "==", getStudentId())

        );


        const snapshot = await getDocs(certificateQuery);


        studentCertificates = snapshot.docs.map(function (document) {

            return {

                ...document.data(),

                id: document.id

            };

        });


        console.log("Student certificates:", studentCertificates);


    }

    catch (error) {

        console.error("Certificate loading error:", error);

        throw error;

    }

}


// ==========================================
// 10. LOAD COMPLETED LESSONS
// ==========================================

async function loadCompletedLessons() {

    try {

        const lessonQuery = query(

            collection(db, "completedLessons"),

            where("studentId", "==", getStudentId())

        );


        const snapshot = await getDocs(lessonQuery);


        completedLessons = snapshot.docs.map(function (document) {

            return {

                ...document.data(),

                id: document.id

            };

        });


        console.log("Completed lessons:", completedLessons);


    }

    catch (error) {

        console.error("Completed lessons loading error:", error);

        throw error;

    }

}


// ==========================================
// 11. STUDENT INFORMATION
// ==========================================

function loadStudentInformation() {

    const name = getStudentName();


    setText("studentName", name);

    setText("welcomeName", name.split(" ")[0]);

    setText("profileFullName", name);

    setText("profileEmail", currentStudent.email);

    setText("profileDepartment", currentStudent.department);

    setText("profileLevel", currentStudent.level);

    setText("profileUniversity", currentStudent.university);

}


// ==========================================
// 12. CHECK STUDENT ENROLMENT
// ==========================================

function isStudentEnrolled(courseId) {

    return studentEnrollments.some(function (enrollment) {

        return String(enrollment.courseId) === String(courseId);

    });

}


// ==========================================
// 13. COURSE CARD
// ==========================================

function createCourseCard(course) {

    const image = course.image || course.thumbnail || "";


    return `

        <div class="course-card">

            <div class="course-image">

                ${
                    image

                    ?

                    `<img src="${escapeHTML(image)}"
                    alt="${escapeHTML(course.title)}">`

                    :

                    `<i class="fa-solid fa-book-open"></i>`

                }

            </div>


            <div class="course-info">

                <h3>${escapeHTML(course.title)}</h3>


                <p>

                    ${escapeHTML(
                        course.description ||
                        "Learn new skills with this course."
                    )}

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


                <a

                    href="course.html?id=${encodeURIComponent(course.id)}"

                    class="course-button"

                >

                    Continue Learning

                    <i class="fa-solid fa-arrow-right"></i>

                </a>

            </div>

        </div>

    `;

}


// ==========================================
// 14. LOAD STUDENT ENROLLED COURSES
// ==========================================

function loadStudentCourses() {

    const overviewList = getElement("overviewCourseList");

    const fullCourseList = getElement("studentCourseList");


    if (!overviewList || !fullCourseList) {
        return;
    }


    // GET COURSES THE STUDENT HAS ENROLLED IN

    const enrolledCourses = studentEnrollments.map(function (enrollment) {

        return getCourseById(enrollment.courseId);

    }).filter(function (course) {

        return course && isCoursePublished(course);

    });


    if (enrolledCourses.length === 0) {

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


    // OVERVIEW

    overviewList.innerHTML = enrolledCourses

        .slice(0, 2)

        .map(createCourseCard)

        .join("");


    // ALL ENROLLED COURSES

    fullCourseList.innerHTML = enrolledCourses

        .map(createCourseCard)

        .join("");

}


// ==========================================
// 15. LOAD EXPLORE COURSES
// ==========================================

function loadExploreCourses() {

    const availableCourses = studentCourses.filter(function (course) {

        return isCoursePublished(course);

    });


    const count = getElement("availableCourseCount");


    if (count) {

        count.textContent = availableCourses.length;

    }


    if (availableCourses.length === 0) {

        const exploreList = getElement("exploreCourseList");

        if (exploreList) {

            exploreList.innerHTML = displayEmptyState(

                "No published courses are available yet.",

                "fa-solid fa-book-open"

            );

        }

        return;

    }


    displayDepartmentFilters(availableCourses);

    displayExploreCourseCards(availableCourses);

}


// ==========================================
// 16. DEPARTMENT FILTERS
// ==========================================

function displayDepartmentFilters(courses) {

    const departmentFilter = getElement("departmentFilter");


    if (!departmentFilter) {
        return;
    }


    const previousValue = departmentFilter.value;


    const departments = [

        ...new Set(

            courses.map(function (course) {

                return course.department;

            }).filter(Boolean)

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


// ==========================================
// 17. DISPLAY EXPLORE COURSE CARDS
// ==========================================

function displayExploreCourseCards(courses) {

    const exploreList = getElement("exploreCourseList");


    if (!exploreList) {
        return;
    }


    setText("availableCourseCount", courses.length);


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

                        `<img src="${escapeHTML(image)}"
                        alt="${escapeHTML(course.title)}">`

                        :

                        `<i class="fa-solid fa-book-open"></i>`

                    }

                </div>


                <div class="course-info">

                    <h3>${escapeHTML(course.title)}</h3>


                    <p>

                        ${escapeHTML(
                            course.description ||
                            "Explore this course and develop your knowledge."
                        )}

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

                        ${enrolled ? "disabled" : ""}

                    >

                        ${
                            enrolled

                            ?

                            `<i class="fa-solid fa-circle-check"></i>
                            Already Enrolled`

                            :

                            `<i class="fa-solid fa-plus"></i>
                            Enrol Now`

                        }

                    </button>

                </div>

            </div>

        `;

    }).join("");


    // ENROL BUTTON EVENTS

    document.querySelectorAll(".enrol-button").forEach(function (button) {

        button.addEventListener("click", async function () {

            await enrolStudentInCourse(

                this.dataset.courseId,

                this

            );

        });

    });

}


// ==========================================
// 18. SEARCH AND FILTER COURSES
// ==========================================

function filterExploreCourses() {

    const searchInput = getElement("courseSearch");

    const departmentFilter = getElement("departmentFilter");

    const levelFilter = getElement("levelFilter");


    const searchValue = searchInput

        ? searchInput.value.toLowerCase().trim()

        : "";


    const departmentValue = departmentFilter

        ? departmentFilter.value

        : "";


    const levelValue = levelFilter

        ? levelFilter.value

        : "";


    const filteredCourses = studentCourses.filter(function (course) {

        if (!isCoursePublished(course)) {
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


        return matchesSearch && matchesDepartment && matchesLevel;

    });


    displayExploreCourseCards(filteredCourses);

}


// ==========================================
// 19. SEARCH EVENTS
// ==========================================

const courseSearch = getElement("courseSearch");

if (courseSearch) {

    courseSearch.addEventListener(

        "input",

        filterExploreCourses

    );

}


const departmentFilter = getElement("departmentFilter");

if (departmentFilter) {

    departmentFilter.addEventListener(

        "change",

        filterExploreCourses

    );

}


const levelFilter = getElement("levelFilter");

if (levelFilter) {

    levelFilter.addEventListener(

        "change",

        filterExploreCourses

    );

}


// ==========================================
// 20. ENROL STUDENT IN COURSE
// ==========================================

async function enrolStudentInCourse(courseId, button) {

    // FIND COURSE IN FIRESTORE DATA

    const course = getCourseById(courseId);


    // CHECK COURSE AVAILABILITY

    if (!course || !isCoursePublished(course)) {

        alert("This course is not currently available.");

        return;

    }


    // CHECK LOGIN

    if (!getStudentId()) {

        alert("Please log in before enrolling.");

        window.location.href = "auth.html?mode=student";

        return;

    }


    // CHECK EXISTING ENROLMENT

    if (isStudentEnrolled(courseId)) {

        alert("You are already enrolled in this course.");

        return;

    }


    // DISABLE BUTTON

    button.disabled = true;

    button.textContent = "Enrolling...";


    try {

        // PREPARE ENROLMENT DATA

        const enrollmentData = {

            studentId: getStudentId(),

            courseId: course.id,

            courseTitle: course.title || "",

            studentName: getStudentName(),

            enrolledAt: serverTimestamp()

        };


        console.log("Saving enrolment:", enrollmentData);


        // SAVE TO FIRESTORE

        await addDoc(

            collection(db, "enrollments"),

            enrollmentData

        );


        // RELOAD ENROLMENTS

        await loadStudentEnrollments();


        // UPDATE DASHBOARD

        loadStudentCourses();

        loadExploreCourses();

        updateDashboardStatistics();


        alert(

            "You have successfully enrolled in " +

            course.title +

            "!"

        );


    }

    catch (error) {

        console.error("Enrolment error:", error);


        alert(

            "Enrolment failed.\n\n" +

            "Error: " + (error.code || "Unknown") +

            "\n\nMessage: " + error.message

        );


        button.disabled = false;

        button.innerHTML =

            '<i class="fa-solid fa-plus"></i> Enrol Now';

    }

}


// ==========================================
// 21. LOAD QUIZ RESULTS
// ==========================================

function displayStudentResults() {

    const resultList = getElement("studentResultList");


    if (!resultList) {
        return;
    }


    if (studentResults.length === 0) {

        resultList.innerHTML = displayEmptyState(

            "You have not completed any quizzes yet.",

            "fa-solid fa-chart-column"

        );

        return;

    }


    resultList.innerHTML = studentResults.slice().reverse().map(

        function (result) {

            const course = getCourseById(result.courseId);


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

                            ${formatDate(
                                result.submittedAt || result.date
                            )}

                        </span>

                    </div>

                </div>

            `;

        }

    ).join("");

}


// ==========================================
// 22. DISPLAY CERTIFICATES
// ==========================================

function displayStudentCertificates() {

    const certificateList = getElement("studentCertificateList");


    if (!certificateList) {
        return;
    }


    if (studentCertificates.length === 0) {

        certificateList.innerHTML = displayEmptyState(

            "You have not earned any certificates yet.",

            "fa-solid fa-certificate"

        );

        return;

    }


    certificateList.innerHTML = studentCertificates.map(

        function (certificate) {

            return `

                <div class="certificate-card">

                    <div class="certificate-icon">

                        <i class="fa-solid fa-award"></i>

                    </div>


                    <h3>

                        ${escapeHTML(
                            certificate.courseTitle ||
                            "Completed Course"
                        )}

                    </h3>


                    <p>

                        Certificate ID:

                        ${escapeHTML(
                            certificate.certificateId ||
                            certificate.id
                        )}

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

                        data-certificate-id="${escapeHTML(certificate.id)}"

                    >

                        <i class="fa-solid fa-download"></i>

                        Download Certificate

                    </button>

                </div>

            `;

        }

    ).join("");


    // DOWNLOAD BUTTON EVENTS

    document.querySelectorAll(".download-btn").forEach(function (button) {

        button.addEventListener("click", function () {

            downloadCertificate(

                this.dataset.certificateId

            );

        });

    });

}


// ==========================================
// 23. DOWNLOAD CERTIFICATE PDF
// ==========================================

function downloadCertificate(certificateId) {

    const certificate = studentCertificates.find(function (item) {

        return String(item.id) === String(certificateId);

    });


    if (!certificate) {

        alert("Certificate not found.");

        return;

    }


    if (!window.jspdf || !window.jspdf.jsPDF) {

        alert("PDF library could not load.");

        return;

    }


    const { jsPDF } = window.jspdf;


    const pdf = new jsPDF({

        orientation: "landscape",

        unit: "mm",

        format: "a4"

    });


    const studentName = certificate.studentName || getStudentName();

    const courseTitle = certificate.courseTitle || "Completed Course";

    const certificateNumber =

        certificate.certificateId || certificate.id;

    const score = certificate.percentage ?? 0;

    const issueDate = formatDate(certificate.issuedAt);


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

    pdf.text(

        "This certificate is proudly presented to",

        148.5,

        83,

        { align: "center" }

    );


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


    // COURSE TITLE

    pdf.setFont("helvetica", "normal");

    pdf.setFontSize(14);

    pdf.setTextColor(71, 85, 105);

    pdf.text(

        "For successfully completing the course",

        148.5,

        123,

        { align: "center" }

    );


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

    pdf.text(

        "Final Quiz Score: " + score + "%",

        148.5,

        157,

        { align: "center" }

    );


    // DATE AND ID

    pdf.setFontSize(10);

    pdf.text("Date Issued: " + issueDate, 35, 178);

    pdf.text("Certificate ID: " + certificateNumber, 35, 186);


    // SIGNATURE

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


    // SAVE PDF

    const safeName = studentName.replace(/[^a-z0-9]/gi, "_");

    pdf.save(

        "LearnSphere_Certificate_" + safeName + ".pdf"

    );

}


// ==========================================
// 24. DASHBOARD STATISTICS
// ==========================================

function updateDashboardStatistics() {

    const studentId = getStudentId();


    const studentResults = studentResultsForCurrentStudent();

    const studentCertificateCount = studentCertificates.filter(

        function (certificate) {

            return String(certificate.studentId) === studentId;

        }

    ).length;


    const studentLessonCount = completedLessons.filter(

        function (lesson) {

            return String(lesson.studentId) === studentId;

        }

    ).length;


    setText(

        "enrolledCourses",

        studentEnrollments.length

    );


    setText(

        "completedLessons",

        studentLessonCount

    );


    setText(

        "completedQuizzes",

        studentResults.length

    );


    setText(

        "earnedCertificates",

        studentCertificateCount

    );

}


// GET CURRENT STUDENT RESULTS

function studentResultsForCurrentStudent() {

    return studentResults.filter(function (result) {

        return String(result.studentId) === getStudentId();

    });

}


// ==========================================
// 25. DASHBOARD NAVIGATION
// ==========================================

function showDashboardSection(sectionName) {

    const sections = document.querySelectorAll(

        ".dashboard-section"

    );


    const links = document.querySelectorAll(

        ".sidebar-link"

    );


    sections.forEach(function (section) {

        section.classList.remove("active");

    });


    links.forEach(function (link) {

        link.classList.remove("active");

    });


    const selectedSection = getElement(sectionName);


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


// ==========================================
// 26. SIDEBAR EVENTS
// ==========================================

document.querySelectorAll(".sidebar-link").forEach(function (link) {

    link.addEventListener("click", function (event) {

        event.preventDefault();

        showDashboardSection(this.dataset.section);

    });

});


// ==========================================
// 27. OTHER SECTION BUTTONS
// ==========================================

document.querySelectorAll("[data-section]").forEach(function (button) {

    if (button.classList.contains("sidebar-link")) {
        return;
    }


    button.addEventListener("click", function () {

        showDashboardSection(this.dataset.section);

    });

});


// ==========================================
// 28. LOGOUT
// ==========================================

const logoutButton = getElement("logoutBtn");


if (logoutButton) {

    logoutButton.addEventListener("click", async function () {

        const confirmLogout = confirm(

            "Are you sure you want to log out?"

        );


        if (!confirmLogout) {
            return;
        }


        try {

            await signOut(auth);

            window.location.href = "auth.html?mode=student";

        }

        catch (error) {

            console.error("Logout error:", error);

            alert("Unable to log out. Please try again.");

        }

    });

}


// ==========================================
// 29. CURRENT YEAR
// ==========================================

setText(

    "currentYear",

    new Date().getFullYear()

);


// ==========================================
// 30. LOAD DASHBOARD
// ==========================================

function loadDashboard() {

    if (!currentStudent) {
        return;
    }


    // STUDENT PROFILE

    loadStudentInformation();


    // ENROLLED COURSES

    loadStudentCourses();


    // EXPLORE COURSES

    loadExploreCourses();


    // QUIZ RESULTS

    displayStudentResults();


    // CERTIFICATES

    displayStudentCertificates();


    // STATISTICS

    updateDashboardStatistics();

}


// ==========================================
// END OF LEARNSPHERE STUDENT DASHBOARD
// ==========================================