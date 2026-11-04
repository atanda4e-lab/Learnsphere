// ========================================
// LEARNSPHERE ADMIN DASHBOARD
// ========================================


// ========================================
// 1. CHECK ADMIN LOGIN
// ========================================

if (localStorage.getItem("learnsphereAdminLoggedIn") !== "true") {

    window.location.href = "auth.html?mode=admin";

}


// ========================================
// 2. LOCAL STORAGE KEYS
// ========================================

const COURSES_KEY = "learnsphereCourses";
const LESSONS_KEY = "learnsphereLessons";
const QUIZZES_KEY = "learnsphereQuizzes";
const STUDENTS_KEY = "learnsphereStudents";
const RESULTS_KEY = "learnsphereResults";
const CERTIFICATES_KEY = "learnsphereCertificates";


// ========================================
// 3. GET HTML ELEMENTS
// ========================================

const adminArea = document.getElementById("adminArea");

const adminNavButtons = document.querySelectorAll(".admin-nav-btn");

const adminPages = document.querySelectorAll(".admin-page");

const adminLogoutBtn = document.getElementById("adminLogoutBtn");


// COURSE ELEMENTS

const adminCourseList = document.getElementById("adminCourseList");

const adminCourseSearch = document.getElementById("adminCourseSearch");

const adminCourseFilter = document.getElementById("adminCourseFilter");

const addNewCourseBtn = document.getElementById("addNewCourseBtn");


// COURSE EDITOR ELEMENTS

const courseEditor = document.getElementById("courseEditor");

const backToCoursesBtn = document.getElementById("backToCoursesBtn");

const editCourseForm = document.getElementById("editCourseForm");

const editCourseId = document.getElementById("editCourseId");

const editCourseTitle = document.getElementById("editCourseTitle");

const editCourseCategory = document.getElementById("editCourseCategory");

const editCourseDepartment = document.getElementById("editCourseDepartment");

const editCourseLevel = document.getElementById("editCourseLevel");

const editCourseDescription = document.getElementById("editCourseDescription");

const editCourseImage = document.getElementById("editCourseImage");

const editorCourseTitle = document.getElementById("editorCourseTitle");


// LESSON ELEMENTS

const editorLessonForm = document.getElementById("editorLessonForm");

const editorLessonCourseId = document.getElementById("editorLessonCourseId");

const editorLessonTitle = document.getElementById("editorLessonTitle");

const editorLessonDescription = document.getElementById("editorLessonDescription");

const editorLessonContent = document.getElementById("editorLessonContent");

const editorLessonPDF = document.getElementById("editorLessonPDF");

const editorLessonVideo = document.getElementById("editorLessonVideo");

const editorLessonList = document.getElementById("editorLessonList");


// QUIZ ELEMENTS

const editorQuizForm = document.getElementById("editorQuizForm");

const editorQuizCourseId = document.getElementById("editorQuizCourseId");

const editorQuestionText = document.getElementById("editorQuestionText");

const editorOptionA = document.getElementById("editorOptionA");

const editorOptionB = document.getElementById("editorOptionB");

const editorOptionC = document.getElementById("editorOptionC");

const editorOptionD = document.getElementById("editorOptionD");

const editorCorrectAnswer = document.getElementById("editorCorrectAnswer");

const editorQuizList = document.getElementById("editorQuizList");


// PUBLICATION ELEMENTS

const coursePublishStatus = document.getElementById("coursePublishStatus");

const previewCourseBtn = document.getElementById("previewCourseBtn");

const publishEditorCourseBtn = document.getElementById("publishEditorCourseBtn");

const unpublishCourseBtn = document.getElementById("unpublishCourseBtn");

const coursePreview = document.getElementById("coursePreview");

const closePreviewBtn = document.getElementById("closePreviewBtn");

const coursePreviewContent = document.getElementById("coursePreviewContent");


// ADMIN LIST ELEMENTS

const adminLessonList = document.getElementById("adminLessonList");

const adminQuizList = document.getElementById("adminQuizList");

const adminStudentList = document.getElementById("adminStudentList");

const adminResultList = document.getElementById("adminResultList");

const adminCertificateList = document.getElementById("adminCertificateList");


// DASHBOARD STATISTICS

const totalCourses = document.getElementById("totalCourses");

const totalStudents = document.getElementById("totalStudents");

const totalLessons = document.getElementById("totalLessons");

const totalQuizzes = document.getElementById("totalQuizzes");


// ========================================
// 4. GET DATA FROM LOCAL STORAGE
// ========================================

function getData(key) {

    try {

        const data = localStorage.getItem(key);

        return data ? JSON.parse(data) : [];

    } catch (error) {

        console.error("Could not read:", key, error);

        return [];

    }

}


// ========================================
// 5. SAVE DATA TO LOCAL STORAGE
// ========================================

function saveData(key, data) {

    localStorage.setItem(key, JSON.stringify(data));

}


// ========================================
// 6. GENERATE UNIQUE ID
// ========================================

function generateId() {

    return Date.now().toString() +

        Math.floor(Math.random() * 10000).toString();

}


// ========================================
// 7. ESCAPE HTML
// ========================================

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


// ========================================
// 8. SHOW ADMIN DASHBOARD
// ========================================

function showAdminDashboard() {

    if (adminArea) {

        adminArea.classList.remove("hidden");

    }

    displayAll();

}


// ========================================
// 9. DISPLAY ALL ADMIN DATA
// ========================================

function displayAll() {

    displayStatistics();

    displayCourses();

    displayAllLessons();

    displayAllQuizzes();

    displayStudents();

    displayResults();

    displayCertificates();

}


// ========================================
// 10. DISPLAY DASHBOARD STATISTICS
// ========================================

function displayStatistics() {

    const courses = getData(COURSES_KEY);

    const students = getData(STUDENTS_KEY);

    const lessons = getData(LESSONS_KEY);

    const quizzes = getData(QUIZZES_KEY);


    if (totalCourses) {

        totalCourses.textContent = courses.length;

    }

    if (totalStudents) {

        totalStudents.textContent = students.length;

    }

    if (totalLessons) {

        totalLessons.textContent = lessons.length;

    }

    if (totalQuizzes) {

        totalQuizzes.textContent = quizzes.length;

    }

}


// ========================================
// 11. SHOW ADMIN PAGE
// ========================================

function showPage(pageId) {

    if (courseEditor) {

        courseEditor.classList.add("hidden");

    }


    adminPages.forEach(function (page) {

        page.classList.remove("active");

    });


    adminNavButtons.forEach(function (button) {

        button.classList.remove("active");

    });


    const selectedPage = document.getElementById(pageId);


    if (selectedPage) {

        selectedPage.classList.add("active");

    }


    const selectedButton = document.querySelector(

        '.admin-nav-btn[data-page="' + pageId + '"]'

    );


    if (selectedButton) {

        selectedButton.classList.add("active");

    }


    displayAll();

}


// ========================================
// 12. ADMIN NAVIGATION
// ========================================

adminNavButtons.forEach(function (button) {

    button.addEventListener("click", function () {

        const pageId = button.getAttribute("data-page");

        showPage(pageId);

    });

});


// ========================================
// 13. ADMIN LOGOUT
// ========================================

if (adminLogoutBtn) {

    adminLogoutBtn.addEventListener("click", function () {

        const confirmLogout = confirm(

            "Are you sure you want to log out?"

        );


        if (!confirmLogout) {

            return;

        }


        localStorage.removeItem("learnsphereAdminLoggedIn");

        window.location.href = "auth.html?mode=admin";

    });

}


// ========================================
// 14. DISPLAY COURSES
// ========================================

function displayCourses() {

    if (!adminCourseList) {

        return;

    }


    const courses = getData(COURSES_KEY);


    const searchText = adminCourseSearch

        ? adminCourseSearch.value.toLowerCase().trim()

        : "";


    const filterValue = adminCourseFilter

        ? adminCourseFilter.value

        : "all";


    const filteredCourses = courses.filter(function (course) {

        const matchesSearch =

            String(course.title || "").toLowerCase().includes(searchText) ||

            String(course.department || "").toLowerCase().includes(searchText);


        const isPublished = course.published === true ||

            course.isPublished === true;


        let matchesFilter = true;


        if (filterValue === "published") {

            matchesFilter = isPublished;

        }


        if (filterValue === "unpublished") {

            matchesFilter = !isPublished;

        }


        return matchesSearch && matchesFilter;

    });


    if (filteredCourses.length === 0) {

        adminCourseList.innerHTML =

            "<p>No courses found.</p>";

        return;

    }


    adminCourseList.innerHTML = filteredCourses.map(function (course) {

        const isPublished = course.published === true ||

            course.isPublished === true;


        return `

            <div class="course-card">

                <div class="course-card-info">

                    <h3>${escapeHTML(course.title)}</h3>

                    <p>${escapeHTML(course.department || "General")}</p>

                    <p>${escapeHTML(course.level || "All Levels")}</p>

                    <span class="course-status">

                        ${isPublished ? "Published" : "Unpublished"}

                    </span>

                </div>


                <div class="course-card-actions">

                    <button

                        type="button"

                        class="edit-course-btn"

                        data-id="${escapeHTML(course.id)}"

                    >

                        Edit Course

                    </button>


                    <button

                        type="button"

                        class="delete-course-btn"

                        data-id="${escapeHTML(course.id)}"

                    >

                        Delete

                    </button>

                </div>

            </div>

        `;

    }).join("");

}


// ========================================
// 15. COURSE SEARCH
// ========================================

if (adminCourseSearch) {

    adminCourseSearch.addEventListener("input", displayCourses);

}


// ========================================
// 16. COURSE FILTER
// ========================================

if (adminCourseFilter) {

    adminCourseFilter.addEventListener("change", displayCourses);

}


// ========================================
// 17. OPEN COURSE EDITOR
// ========================================

function openCourseEditor(courseId = null) {

    const courses = getData(COURSES_KEY);


    let selectedCourse = null;


    if (courseId !== null) {

        selectedCourse = courses.find(function (course) {

            return String(course.id) === String(courseId);

        });


        if (!selectedCourse) {

            alert("Course not found.");

            return;

        }

    }


    adminPages.forEach(function (page) {

        page.classList.remove("active");

    });


    if (courseEditor) {

        courseEditor.classList.remove("hidden");

    }


    // CLEAR THE FORM

    editCourseForm.reset();

    editCourseId.value = "";

    editorLessonForm.reset();

    editorQuizForm.reset();


    // CLEAR EDITOR LISTS

    editorLessonList.innerHTML = "";

    editorQuizList.innerHTML = "";


    // NEW COURSE

    if (!selectedCourse) {

        editorCourseTitle.textContent = "Create New Course";

        coursePublishStatus.textContent = "Unpublished";

        publishEditorCourseBtn.disabled = true;

        unpublishCourseBtn.disabled = true;

        editorLessonCourseId.value = "";

        editorQuizCourseId.value = "";

        return;

    }


    // EXISTING COURSE

    editCourseId.value = selectedCourse.id;

    editCourseTitle.value = selectedCourse.title || "";

    editCourseCategory.value = selectedCourse.category || "";

    editCourseDepartment.value = selectedCourse.department || "";

    editCourseLevel.value = selectedCourse.level || "";

    editCourseDescription.value = selectedCourse.description || "";

    editCourseImage.value = selectedCourse.image || "";


    editorCourseTitle.textContent = selectedCourse.title;


    editorLessonCourseId.value = selectedCourse.id;

    editorQuizCourseId.value = selectedCourse.id;


    const isPublished = selectedCourse.published === true ||

        selectedCourse.isPublished === true;


    coursePublishStatus.textContent = isPublished

        ? "Published"

        : "Unpublished";


    publishEditorCourseBtn.disabled = false;

    unpublishCourseBtn.disabled = false;


    displayEditorLessons(selectedCourse.id);

    displayEditorQuizzes(selectedCourse.id);

}


// ========================================
// 18. ADD NEW COURSE BUTTON
// ========================================

if (addNewCourseBtn) {

    addNewCourseBtn.addEventListener("click", function () {

        openCourseEditor();

    });

}


// ========================================
// 19. BACK TO MANAGE COURSES
// ========================================

if (backToCoursesBtn) {

    backToCoursesBtn.addEventListener("click", function () {

        showPage("manageCourses");

    });

}


// ========================================
// 20. SAVE COURSE
// ========================================

if (editCourseForm) {

    editCourseForm.addEventListener("submit", function (event) {

        event.preventDefault();


        const courses = getData(COURSES_KEY);


        const existingId = editCourseId.value;


        const courseData = {

            id: existingId || generateId(),

            title: editCourseTitle.value.trim(),

            category: editCourseCategory.value,

            department: editCourseDepartment.value,

            level: editCourseLevel.value,

            description: editCourseDescription.value.trim(),

            image: editCourseImage.value.trim(),

            published: false,

            isPublished: false,

            createdAt: new Date().toISOString()

        };


        if (!courseData.title) {

            alert("Please enter a course title.");

            return;

        }


        if (existingId) {

            const courseIndex = courses.findIndex(function (course) {

                return String(course.id) === String(existingId);

            });


            if (courseIndex === -1) {

                alert("Course not found.");

                return;

            }


            // KEEP THE EXISTING PUBLICATION STATUS

            courseData.published =

                courses[courseIndex].published === true ||

                courses[courseIndex].isPublished === true;


            courseData.isPublished = courseData.published;

            courseData.createdAt =

                courses[courseIndex].createdAt || courseData.createdAt;


            courses[courseIndex] = courseData;


            alert("Course updated successfully!");

        } else {

            courses.push(courseData);

            alert("New course created successfully!");

        }


        saveData(COURSES_KEY, courses);


        openCourseEditor(courseData.id);

        displayAll();

    });

}


// ========================================
// 21. DELETE COURSE
// ========================================

if (adminCourseList) {

    adminCourseList.addEventListener("click", function (event) {

        const deleteButton = event.target.closest(".delete-course-btn");

        const editButton = event.target.closest(".edit-course-btn");


        if (editButton) {

            openCourseEditor(editButton.dataset.id);

            return;

        }


        if (!deleteButton) {

            return;

        }


        const confirmDelete = confirm(

            "Are you sure you want to delete this course?\n\n" +

            "Its lessons and quizzes will also be deleted."

        );


        if (!confirmDelete) {

            return;

        }


        const id = deleteButton.dataset.id;


        const courses = getData(COURSES_KEY);

        const lessons = getData(LESSONS_KEY);

        const quizzes = getData(QUIZZES_KEY);


        saveData(

            COURSES_KEY,

            courses.filter(function (course) {

                return String(course.id) !== String(id);

            })

        );


        saveData(

            LESSONS_KEY,

            lessons.filter(function (lesson) {

                return String(lesson.courseId) !== String(id);

            })

        );


        saveData(

            QUIZZES_KEY,

            quizzes.filter(function (quiz) {

                return String(quiz.courseId) !== String(id);

            })

        );


        alert("Course deleted successfully.");

        displayAll();

    });

}


// ========================================
// 22. DISPLAY LESSONS INSIDE EDITOR
// ========================================

function displayEditorLessons(courseId) {

    const lessons = getData(LESSONS_KEY).filter(function (lesson) {

        return String(lesson.courseId) === String(courseId);

    });


    if (!editorLessonList) {

        return;

    }


    if (lessons.length === 0) {

        editorLessonList.innerHTML =

            "<p>No lessons added yet.</p>";

        return;

    }


    editorLessonList.innerHTML = lessons.map(function (lesson) {

        return `

            <div class="content-card">

                <h4>${escapeHTML(lesson.title)}</h4>

                <p>${escapeHTML(lesson.description || "")}</p>


                <button

                    type="button"

                    class="delete-editor-lesson-btn"

                    data-id="${escapeHTML(lesson.id)}"

                >

                    Delete Lesson

                </button>

            </div>

        `;

    }).join("");

}


// ========================================
// 23. ADD LESSON
// ========================================

if (editorLessonForm) {

    editorLessonForm.addEventListener("submit", function (event) {

        event.preventDefault();


        const courseId = editorLessonCourseId.value;


        if (!courseId) {

            alert("Save the course before adding lessons.");

            return;

        }


        const lessons = getData(LESSONS_KEY);


        const newLesson = {

            id: generateId(),

            courseId: courseId,

            title: editorLessonTitle.value.trim(),

            description: editorLessonDescription.value.trim(),

            content: editorLessonContent.value.trim(),

            pdf: editorLessonPDF.value.trim(),

            video: editorLessonVideo.value.trim(),

            createdAt: new Date().toISOString()

        };


        if (!newLesson.title) {

            alert("Please enter a lesson title.");

            return;

        }


        lessons.push(newLesson);


        saveData(LESSONS_KEY, lessons);


        editorLessonForm.reset();

        editorLessonCourseId.value = courseId;


        displayEditorLessons(courseId);

        displayAll();


        alert("Lesson added successfully!");

    });

}


// ========================================
// 24. DELETE LESSON FROM EDITOR
// ========================================

if (editorLessonList) {

    editorLessonList.addEventListener("click", function (event) {

        const button = event.target.closest(".delete-editor-lesson-btn");


        if (!button) {

            return;

        }


        if (!confirm("Delete this lesson?")) {

            return;

        }


        const lessonId = button.dataset.id;

        const courseId = editorLessonCourseId.value;


        const lessons = getData(LESSONS_KEY);


        saveData(

            LESSONS_KEY,

            lessons.filter(function (lesson) {

                return String(lesson.id) !== String(lessonId);

            })

        );


        displayEditorLessons(courseId);

        displayAll();

    });

}


// ========================================
// 25. DISPLAY QUIZZES INSIDE EDITOR
// ========================================

function displayEditorQuizzes(courseId) {

    const quizzes = getData(QUIZZES_KEY).filter(function (quiz) {

        return String(quiz.courseId) === String(courseId);

    });


    if (!editorQuizList) {

        return;

    }


    if (quizzes.length === 0) {

        editorQuizList.innerHTML =

            "<p>No quiz questions added yet.</p>";

        return;

    }


    editorQuizList.innerHTML = quizzes.map(function (quiz, index) {

        return `

            <div class="content-card">

                <h4>Question ${index + 1}</h4>

                <p>${escapeHTML(quiz.question)}</p>


                <button

                    type="button"

                    class="delete-editor-quiz-btn"

                    data-id="${escapeHTML(quiz.id)}"

                >

                    Delete Question

                </button>

            </div>

        `;

    }).join("");

}


// ========================================
// 26. ADD QUIZ QUESTION
// ========================================

if (editorQuizForm) {

    editorQuizForm.addEventListener("submit", function (event) {

        event.preventDefault();


        const courseId = editorQuizCourseId.value;


        if (!courseId) {

            alert("Save the course before adding quiz questions.");

            return;

        }


        const quizzes = getData(QUIZZES_KEY);


        const options = [

            editorOptionA.value.trim(),

            editorOptionB.value.trim(),

            editorOptionC.value.trim(),

            editorOptionD.value.trim()

        ];


        if (options.some(function (option) {

            return option === "";

        })) {

            alert("Please fill in all four answer options.");

            return;

        }


        const newQuiz = {

            id: generateId(),

            courseId: courseId,

            question: editorQuestionText.value.trim(),

            options: options,

            correctAnswer: editorCorrectAnswer.value,

            createdAt: new Date().toISOString()

        };


        if (!newQuiz.question) {

            alert("Please enter a question.");

            return;

        }


        quizzes.push(newQuiz);


        saveData(QUIZZES_KEY, quizzes);


        editorQuizForm.reset();

        editorQuizCourseId.value = courseId;


        displayEditorQuizzes(courseId);

        displayAll();


        alert("Quiz question added successfully!");

    });

}


// ========================================
// 27. DELETE QUIZ QUESTION FROM EDITOR
// ========================================

if (editorQuizList) {

    editorQuizList.addEventListener("click", function (event) {

        const button = event.target.closest(".delete-editor-quiz-btn");


        if (!button) {

            return;

        }


        if (!confirm("Delete this quiz question?")) {

            return;

        }


        const quizId = button.dataset.id;

        const courseId = editorQuizCourseId.value;


        const quizzes = getData(QUIZZES_KEY);


        saveData(

            QUIZZES_KEY,

            quizzes.filter(function (quiz) {

                return String(quiz.id) !== String(quizId);

            })

        );


        displayEditorQuizzes(courseId);

        displayAll();

    });

}


// ========================================
// 28. DISPLAY ALL LESSONS
// ========================================

function displayAllLessons() {

    if (!adminLessonList) {

        return;

    }


    const lessons = getData(LESSONS_KEY);


    if (lessons.length === 0) {

        adminLessonList.innerHTML = "<p>No lessons available.</p>";

        return;

    }


    const courses = getData(COURSES_KEY);


    adminLessonList.innerHTML = lessons.map(function (lesson) {

        const course = courses.find(function (item) {

            return String(item.id) === String(lesson.courseId);

        });


        return `

            <div class="content-card">

                <h3>${escapeHTML(lesson.title)}</h3>

                <p>Course: ${escapeHTML(course ? course.title : "Unknown course")}</p>

                <p>${escapeHTML(lesson.description || "")}</p>

            </div>

        `;

    }).join("");

}


// ========================================
// 29. DISPLAY ALL QUIZZES
// ========================================

function displayAllQuizzes() {

    if (!adminQuizList) {

        return;

    }


    const quizzes = getData(QUIZZES_KEY);

    const courses = getData(COURSES_KEY);


    if (quizzes.length === 0) {

        adminQuizList.innerHTML = "<p>No quiz questions available.</p>";

        return;

    }


    adminQuizList.innerHTML = quizzes.map(function (quiz) {

        const course = courses.find(function (item) {

            return String(item.id) === String(quiz.courseId);

        });


        return `

            <div class="content-card">

                <h3>${escapeHTML(quiz.question)}</h3>

                <p>Course: ${escapeHTML(course ? course.title : "Unknown course")}</p>

            </div>

        `;

    }).join("");

}


// ========================================
// 30. DISPLAY STUDENTS
// ========================================

function displayStudents() {

    if (!adminStudentList) {

        return;

    }


    const students = getData(STUDENTS_KEY);


    if (students.length === 0) {

        adminStudentList.innerHTML = "<p>No registered students found.</p>";

        return;

    }


    adminStudentList.innerHTML = students.map(function (student) {

        return `

            <div class="content-card">

                <h3>${escapeHTML(student.fullName || "Student")}</h3>

                <p>Email: ${escapeHTML(student.email || "Not provided")}</p>

                <p>Department: ${escapeHTML(student.department || "Not provided")}</p>

                <p>Level: ${escapeHTML(student.level || "Not provided")}</p>

            </div>

        `;

    }).join("");

}


// ========================================
// 31. DISPLAY STUDENT QUIZ RESULTS
// ========================================

function displayResults() {

    if (!adminResultList) {

        return;

    }


    const results = getData(RESULTS_KEY);


    if (results.length === 0) {

        adminResultList.innerHTML = "<p>No student results available.</p>";

        return;

    }


    adminResultList.innerHTML = results.map(function (result) {

        return `

            <div class="content-card">

                <h3>${escapeHTML(result.studentName || "Student")}</h3>

                <p>Course: ${escapeHTML(result.courseTitle || "Unknown course")}</p>

                <p>

                    Score:

                    ${Number(result.score || 0)}

                    /

                    ${Number(result.totalQuestions || 0)}

                </p>

                <p>Percentage: ${Number(result.percentage || 0)}%</p>

                <p>

                    Date:

                    ${escapeHTML(

                        result.submittedAt

                            ? new Date(result.submittedAt).toLocaleString()

                            : "Not available"

                    )}

                </p>


                <button

                    type="button"

                    class="delete-result-btn"

                    data-id="${escapeHTML(result.id)}"

                >

                    Delete Result

                </button>

            </div>

        `;

    }).join("");

}


// ========================================
// 32. DELETE INDIVIDUAL STUDENT RESULT
// ========================================

if (adminResultList) {

    adminResultList.addEventListener("click", function (event) {

        const button = event.target.closest(".delete-result-btn");


        if (!button) {

            return;

        }


        const confirmDelete = confirm(

            "Are you sure you want to delete this student's quiz result?"

        );


        if (!confirmDelete) {

            return;

        }


        const resultId = button.dataset.id;

        const results = getData(RESULTS_KEY);


        const updatedResults = results.filter(function (result) {

            return String(result.id) !== String(resultId);

        });


        saveData(RESULTS_KEY, updatedResults);


        displayResults();

        displayStatistics();


        alert("Student result deleted successfully!");

    });

}


// ========================================
// 33. DISPLAY STUDENT CERTIFICATES
// ========================================

function displayCertificates() {

    if (!adminCertificateList) {

        return;

    }


    const certificates = getData(CERTIFICATES_KEY);


    if (certificates.length === 0) {

        adminCertificateList.innerHTML =

            "<p>No certificates have been issued yet.</p>";

        return;

    }


    adminCertificateList.innerHTML = certificates.map(function (certificate) {

        return `

            <div class="content-card">

                <h3>${escapeHTML(certificate.studentName || "Student")}</h3>

                <p>Course: ${escapeHTML(certificate.courseTitle || "Unknown course")}</p>

                <p>Certificate ID: ${escapeHTML(certificate.certificateId || "Not available")}</p>

                <p>Score: ${Number(certificate.percentage || 0)}%</p>

                <p>

                    Issued:

                    ${escapeHTML(

                        certificate.issuedAt

                            ? new Date(certificate.issuedAt).toLocaleDateString()

                            : "Not available"

                    )}

                </p>


                <button

                    type="button"

                    class="delete-certificate-btn"

                    data-id="${escapeHTML(certificate.id)}"

                >

                    Delete Certificate

                </button>

            </div>

        `;

    }).join("");

}


// ========================================
// 34. DELETE CERTIFICATE
// ========================================

if (adminCertificateList) {

    adminCertificateList.addEventListener("click", function (event) {

        const button = event.target.closest(".delete-certificate-btn");


        if (!button) {

            return;

        }


        const confirmDelete = confirm(

            "Are you sure you want to delete this certificate?"

        );


        if (!confirmDelete) {

            return;

        }


        const certificateId = button.dataset.id;

        const certificates = getData(CERTIFICATES_KEY);


        const updatedCertificates = certificates.filter(function (certificate) {

            return String(certificate.id) !== String(certificateId);

        });


        saveData(CERTIFICATES_KEY, updatedCertificates);


        displayCertificates();

        displayStatistics();


        alert("Certificate deleted successfully!");

    });

}


// ========================================
// 35. PUBLISH COURSE
// ========================================

if (publishEditorCourseBtn) {

    publishEditorCourseBtn.addEventListener("click", function () {

        const courseId = editCourseId.value;


        if (!courseId) {

            alert("Save the course before publishing it.");

            return;

        }


        const courses = getData(COURSES_KEY);


        const courseIndex = courses.findIndex(function (course) {

            return String(course.id) === String(courseId);

        });


        if (courseIndex === -1) {

            alert("Course not found.");

            return;

        }


        courses[courseIndex].published = true;

        courses[courseIndex].isPublished = true;


        saveData(COURSES_KEY, courses);


        coursePublishStatus.textContent = "Published";


        alert("Course published successfully!");


        displayAll();

    });

}


// ========================================
// 36. UNPUBLISH COURSE
// ========================================

if (unpublishCourseBtn) {

    unpublishCourseBtn.addEventListener("click", function () {

        const courseId = editCourseId.value;


        if (!courseId) {

            alert("Please save the course first.");

            return;

        }


        const confirmUnpublish = confirm(

            "Are you sure you want to unpublish this course?"

        );


        if (!confirmUnpublish) {

            return;

        }


        const courses = getData(COURSES_KEY);


        const courseIndex = courses.findIndex(function (course) {

            return String(course.id) === String(courseId);

        });


        if (courseIndex === -1) {

            alert("Course not found.");

            return;

        }


        courses[courseIndex].published = false;

        courses[courseIndex].isPublished = false;


        saveData(COURSES_KEY, courses);


        coursePublishStatus.textContent = "Unpublished";


        alert("Course unpublished successfully!");


        displayAll();

    });

}


// ========================================
// 37. PREVIEW COURSE
// ========================================

if (previewCourseBtn) {

    previewCourseBtn.addEventListener("click", function () {

        const title = editCourseTitle.value.trim();

        const description = editCourseDescription.value.trim();

        const department = editCourseDepartment.value;

        const level = editCourseLevel.value;

        const image = editCourseImage.value.trim();


        if (!title) {

            alert("Enter a course title before previewing.");

            return;

        }


        coursePreviewContent.innerHTML = `

            ${image ? `

                <img

                    src="${escapeHTML(image)}"

                    alt="${escapeHTML(title)}"

                    style="width:100%; max-height:250px; object-fit:cover;"

                >

            ` : ""}


            <h2>${escapeHTML(title)}</h2>

            <p>${escapeHTML(description)}</p>

            <p>Department: ${escapeHTML(department)}</p>

            <p>Level: ${escapeHTML(level)}</p>

        `;


        coursePreview.classList.remove("hidden");

    });

}


// ========================================
// 38. CLOSE COURSE PREVIEW
// ========================================

if (closePreviewBtn) {

    closePreviewBtn.addEventListener("click", function () {

        coursePreview.classList.add("hidden");

    });

}


// ========================================
// 39. START ADMIN DASHBOARD
// ========================================

showAdminDashboard();