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
    updateDoc,
    deleteDoc,
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
let studentAnnouncements = [];
let studentNotifications = [];

let activeNotificationFilter = "all";

const WEEKLY_LEARNING_GOAL = 5;


// ==========================================
// 3. GENERAL HELPER FUNCTIONS
// ==========================================

function getElement(id) {
    return document.getElementById(id);
}


function getStudentId() {
    return currentStudent ? currentStudent.uid : "";
}


function getStudentName() {
    return currentStudent
        ? currentStudent.fullName
        : "Student";
}


function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value ?? "";
    }
}


function escapeHTML(value) {
    const element = document.createElement("div");

    element.textContent = value ?? "";

    return element.innerHTML;
}


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


function getDateValue(value) {
    if (!value) return 0;

    const date = typeof value.toDate === "function"
        ? value.toDate()
        : new Date(value);

    return isNaN(date.getTime()) ? 0 : date.getTime();
}


function isCoursePublished(course) {
    if (typeof course.published === "boolean") {
        return course.published;
    }

    return course.isPublished === true;
}


function getCourseById(courseId) {
    return studentCourses.find(function (course) {
        return String(course.id) === String(courseId);
    });
}


function displayEmptyState(
    message,
    icon = "fa-solid fa-circle-info"
) {
    return `
        <div class="empty-state">
            <i class="${icon}"></i>
            <p>${escapeHTML(message)}</p>
        </div>
    `;
}


function getLessonDate(lesson) {
    return (
        lesson.completedAt ||
        lesson.completedOn ||
        lesson.createdAt ||
        lesson.timestamp ||
        lesson.date ||
        null
    );
}


function getResultDate(result) {
    return (
        result.submittedAt ||
        result.date ||
        result.createdAt ||
        null
    );
}


function getEnrollmentDate(enrollment) {
    return (
        enrollment.enrolledAt ||
        enrollment.createdAt ||
        enrollment.date ||
        null
    );
}


// ==========================================
// 4. STUDENT PROFILE
// ==========================================

function loadStudentInformation() {
    if (!currentStudent) return;

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
// 5. NOTIFICATION STORAGE
// ==========================================

function getLegacyNotificationStorageKey() {
    return "learnsphere_notifications_" + getStudentId();
}


function getNotificationTrackingKey(type) {
    return "learnsphere_seen_" + type + "_" + getStudentId();
}


function getLegacyNotifications() {
    try {
        const saved = localStorage.getItem(
            getLegacyNotificationStorageKey()
        );

        const parsed = saved ? JSON.parse(saved) : [];

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed.map(function (item, index) {
            return {
                id: String(
                    item.id ||
                    item.notificationId ||
                    "legacy-" + index
                ),

                studentId: getStudentId(),

                title: item.title ||
                    item.heading ||
                    "LearnSphere Update",

                message: item.message ||
                    item.description ||
                    item.body ||
                    "You have a new update.",

                type: item.type ||
                    item.category ||
                    "general",

                createdAt: item.createdAt ||
                    item.date ||
                    item.timestamp ||
                    new Date(),

                read: item.read === true ||
                    item.isRead === true,

                source: "localStorage"
            };
        });

    } catch (error) {
        console.error("Old notification loading error:", error);
        return [];
    }
}


function saveLegacyNotifications() {
    const oldNotifications = studentNotifications
        .filter(function (item) {
            return item.source === "localStorage";
        })
        .map(function (item) {
            return {
                id: item.id,
                title: item.title,
                message: item.message,
                type: item.type,
                createdAt: item.createdAt,
                read: item.read
            };
        });

    try {
        localStorage.setItem(
            getLegacyNotificationStorageKey(),
            JSON.stringify(oldNotifications)
        );

    } catch (error) {
        console.error("Unable to save old notifications:", error);
    }
}


// ==========================================
// 6. LOAD FIRESTORE NOTIFICATIONS
// ==========================================

async function loadStudentNotifications() {
    if (!getStudentId()) {
        studentNotifications = [];
        displayNotifications();
        return;
    }

    const legacyNotifications = getLegacyNotifications();

    let firestoreNotifications = [];

    try {
        const notificationsQuery = query(
            collection(db, "notifications"),
            where("studentId", "==", getStudentId())
        );

        const snapshot = await getDocs(notificationsQuery);

        firestoreNotifications = snapshot.docs.map(function (document) {
            const data = document.data();

            return {
                id: document.id,
                studentId: data.studentId || getStudentId(),

                title: data.title || "LearnSphere Update",

                message: data.message ||
                    "You have a new update.",

                type: data.type || "general",

                createdAt: data.createdAt || new Date(),

                read: data.isRead === true ||
                    data.read === true,

                source: "firestore"
            };
        });

    } catch (error) {
        console.warn(
            "Firestore notifications unavailable:",
            error
        );
    }

    const merged = new Map();

    legacyNotifications.forEach(function (item) {
        merged.set(String(item.id), item);
    });

    firestoreNotifications.forEach(function (item) {
        merged.set(String(item.id), item);
    });

    studentNotifications = Array.from(merged.values());

    studentNotifications.sort(function (a, b) {
        return getDateValue(b.createdAt) -
            getDateValue(a.createdAt);
    });

    displayNotifications();
}


// ==========================================
// 7. CREATE NOTIFICATION
// ==========================================

async function addStudentNotification(
    title,
    message,
    type = "general"
) {
    if (!getStudentId()) return null;

    try {
        const notificationData = {
            studentId: getStudentId(),
            title: title,
            message: message,
            type: type,
            isRead: false,
            createdAt: serverTimestamp()
        };

        const notificationRef = await addDoc(
            collection(db, "notifications"),
            notificationData
        );

        const notification = {
            id: notificationRef.id,
            studentId: getStudentId(),
            title: title,
            message: message,
            type: type,
            createdAt: new Date(),
            read: false,
            source: "firestore"
        };

        studentNotifications.unshift(notification);

        displayNotifications();

        return notification;

    } catch (error) {
        console.error("Notification creation error:", error);

        const localNotification = {
            id: "legacy-" + Date.now(),
            studentId: getStudentId(),
            title: title,
            message: message,
            type: type,
            createdAt: new Date(),
            read: false,
            source: "localStorage"
        };

        studentNotifications.unshift(localNotification);

        saveLegacyNotifications();
        displayNotifications();

        return localNotification;
    }
}


// ==========================================
// 8. DETECT NEW STUDENT ACTIVITY
// ==========================================

async function detectNewNotificationItems(
    items,
    trackingType,
    title,
    messageFunction
) {
    const trackingKey = getNotificationTrackingKey(trackingType);

    const currentIds = items.map(function (item) {
        return String(item.id);
    });

    let previousIds = [];

    try {
        const saved = localStorage.getItem(trackingKey);

        if (saved === null) {
            localStorage.setItem(
                trackingKey,
                JSON.stringify(currentIds)
            );

            return;
        }

        previousIds = JSON.parse(saved);

        if (!Array.isArray(previousIds)) {
            previousIds = [];
        }

    } catch (error) {
        console.error("Activity tracking error:", error);
    }

    const newItems = items.filter(function (item) {
        return !previousIds.includes(String(item.id));
    });

    for (const item of newItems) {
        await addStudentNotification(
            title,
            messageFunction(item),
            trackingType
        );
    }

    localStorage.setItem(
        trackingKey,
        JSON.stringify(currentIds)
    );
}


async function checkForNewStudentActivity() {
    const publishedCourses = studentCourses.filter(
        isCoursePublished
    );

    await detectNewNotificationItems(
        publishedCourses,
        "course",
        "New Course Available",
        function (course) {
            return course.title +
                " is now available on LearnSphere.";
        }
    );

    await detectNewNotificationItems(
        studentResults,
        "result",
        "New Quiz Result",
        function (result) {
            const course = getCourseById(result.courseId);

            return (
                result.courseTitle ||
                course?.title ||
                "Your course"
            ) + " quiz result is now available.";
        }
    );

    await detectNewNotificationItems(
        studentCertificates,
        "certificate",
        "Certificate Earned",
        function (certificate) {
            return "Your certificate for " +
                (certificate.courseTitle || "a completed course") +
                " is now available.";
        }
    );

    await detectNewNotificationItems(
        studentAnnouncements,
        "announcement",
        "New Announcement",
        function (announcement) {
            return (announcement.title || "A new announcement") +
                " has been posted on LearnSphere.";
        }
    );
}


// ==========================================
// 9. NOTIFICATION DISPLAY
// ==========================================

function getUnreadNotificationCount() {
    return studentNotifications.filter(function (item) {
        return !item.read;
    }).length;
}


function formatNotificationTime(value) {
    const date = value && typeof value.toDate === "function"
        ? value.toDate()
        : new Date(value);

    if (isNaN(date.getTime())) {
        return "Recently";
    }

    const difference = Math.max(0, Date.now() - date.getTime());

    const minutes = Math.floor(difference / 60000);
    const hours = Math.floor(difference / 3600000);
    const days = Math.floor(difference / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return minutes + " minutes ago";
    if (hours < 24) return hours + " hours ago";
    if (days < 7) return days + " days ago";

    return date.toLocaleDateString("en-GB");
}


function getNotificationIcon(type) {
    const icons = {
        course: "fa-solid fa-book-open",
        result: "fa-solid fa-chart-column",
        certificate: "fa-solid fa-certificate",
        announcement: "fa-solid fa-bullhorn",
        enrollment: "fa-solid fa-circle-check",
        general: "fa-solid fa-bell"
    };

    return icons[type] || icons.general;
}


function createNotificationHTML(notification) {
    return `
        <div class="notification-item ${notification.read ? "" : "unread"}"
             data-notification-id="${escapeHTML(notification.id)}">

            <div class="notification-item-icon">
                <i class="${getNotificationIcon(notification.type)}"></i>
            </div>

            <div class="notification-item-content">
                <h4>${escapeHTML(notification.title)}</h4>

                <p>${escapeHTML(notification.message)}</p>

                <span class="notification-item-time">
                    ${formatNotificationTime(notification.createdAt)}
                </span>
            </div>

            <div class="notification-item-actions">

                ${!notification.read ? `
                    <button
                        type="button"
                        data-notification-read="${escapeHTML(notification.id)}"
                        title="Mark as read">
                        <i class="fa-solid fa-check"></i>
                    </button>
                ` : ""}

                <button
                    type="button"
                    data-notification-delete="${escapeHTML(notification.id)}"
                    title="Delete notification">
                    <i class="fa-solid fa-trash"></i>
                </button>

            </div>
        </div>
    `;
}


function notificationEmptyMessage() {
    return `
        <div class="notification-empty">
            <i class="fa-regular fa-bell-slash"></i>
            <h3>No notifications</h3>
            <p>You are all caught up.</p>
        </div>
    `;
}


function displayNotifications() {
    const unreadCount = getUnreadNotificationCount();

    const badge = getElement("notificationBadge");

    if (badge) {
        badge.textContent = unreadCount;
        badge.style.display = unreadCount > 0 ? "flex" : "none";
    }

    setText("dropdownUnreadCount", unreadCount);

    const sidebarCount = getElement("sidebarUnreadCount");

    if (sidebarCount) {
        sidebarCount.textContent = unreadCount;

        sidebarCount.style.display = unreadCount > 0
            ? "inline-flex"
            : "none";
    }

    setText("totalNotifications", studentNotifications.length);
    setText("pageUnreadNotifications", unreadCount);

    const dropdownList = getElement("notificationDropdownList");

    if (dropdownList) {
        const latest = studentNotifications.slice(0, 5);

        dropdownList.innerHTML = latest.length
            ? latest.map(createNotificationHTML).join("")
            : notificationEmptyMessage();
    }

    const pageList = getElement("notificationPageList");

    if (pageList) {
        let filtered = studentNotifications;

        if (activeNotificationFilter === "unread") {
            filtered = filtered.filter(function (item) {
                return !item.read;
            });
        }

        if (activeNotificationFilter === "read") {
            filtered = filtered.filter(function (item) {
                return item.read;
            });
        }

        pageList.innerHTML = filtered.length
            ? filtered.map(createNotificationHTML).join("")
            : notificationEmptyMessage();
    }

    document.querySelectorAll("[data-notification-filter]").forEach(
        function (button) {
            button.classList.toggle(
                "active",
                button.dataset.notificationFilter === activeNotificationFilter
            );
        }
    );
}


// ==========================================
// 10. NOTIFICATION ACTIONS
// ==========================================

async function markNotificationAsRead(notificationId) {
    const notification = studentNotifications.find(function (item) {
        return String(item.id) === String(notificationId);
    });

    if (!notification || notification.read) return;

    try {
        if (notification.source === "firestore") {
            await updateDoc(
                doc(db, "notifications", notification.id),
                { isRead: true }
            );
        }

        notification.read = true;

        saveLegacyNotifications();
        displayNotifications();

    } catch (error) {
        console.error("Mark as read error:", error);
        alert("Unable to update this notification.");
    }
}


async function markAllNotificationsAsRead() {
    const unread = studentNotifications.filter(function (item) {
        return !item.read;
    });

    if (!unread.length) return;

    try {
        for (const item of unread) {
            if (item.source === "firestore") {
                await updateDoc(
                    doc(db, "notifications", item.id),
                    { isRead: true }
                );
            }

            item.read = true;
        }

        saveLegacyNotifications();
        displayNotifications();

    } catch (error) {
        console.error("Mark all notifications error:", error);
        alert("Unable to update all notifications.");
    }
}


async function deleteStudentNotification(notificationId) {
    const notification = studentNotifications.find(function (item) {
        return String(item.id) === String(notificationId);
    });

    if (!notification) return;

    try {
        if (notification.source === "firestore") {
            await deleteDoc(
                doc(db, "notifications", notification.id)
            );
        }

        studentNotifications = studentNotifications.filter(
            function (item) {
                return String(item.id) !== String(notificationId);
            }
        );

        saveLegacyNotifications();
        displayNotifications();

    } catch (error) {
        console.error("Delete notification error:", error);
        alert("Unable to delete this notification.");
    }
}


// ==========================================
// 11. NOTIFICATION EVENTS
// ==========================================

document.querySelectorAll("[data-notification-filter]").forEach(
    function (button) {
        button.addEventListener("click", function () {
            activeNotificationFilter =
                this.dataset.notificationFilter;

            displayNotifications();
        });
    }
);


const markAllReadBtn = getElement("markAllReadBtn");

if (markAllReadBtn) {
    markAllReadBtn.addEventListener(
        "click",
        markAllNotificationsAsRead
    );
}


const notificationPageMarkAllBtn =
    getElement("notificationPageMarkAllBtn");

if (notificationPageMarkAllBtn) {
    notificationPageMarkAllBtn.addEventListener(
        "click",
        markAllNotificationsAsRead
    );
}


const notificationBell = getElement("notificationBell");

const notificationDropdown =
    getElement("notificationDropdown");


if (notificationBell && notificationDropdown) {
    notificationBell.addEventListener("click", function (event) {
        event.stopPropagation();
        notificationDropdown.classList.toggle("show");
    });
}


document.addEventListener("click", function (event) {
    if (!notificationDropdown || !notificationBell) return;

    if (
        !notificationDropdown.contains(event.target) &&
        !notificationBell.contains(event.target)
    ) {
        notificationDropdown.classList.remove("show");
    }
});


document.addEventListener("click", function (event) {
    const readButton = event.target.closest(
        "[data-notification-read]"
    );

    if (readButton) {
        markNotificationAsRead(
            readButton.dataset.notificationRead
        );

        return;
    }

    const deleteButton = event.target.closest(
        "[data-notification-delete]"
    );

    if (deleteButton) {
        deleteStudentNotification(
            deleteButton.dataset.notificationDelete
        );
    }
});


// ==========================================
// 12. LOAD COURSES
// ==========================================

async function loadCourses() {
    const snapshot = await getDocs(
        query(
            collection(db, "courses"),
            where("published", "==", true)
        )
    );

    studentCourses = snapshot.docs.map(function (document) {
        return {
            ...document.data(),
            id: document.id
        };
    });
}


// ==========================================
// 13. LOAD ENROLLMENTS
// ==========================================

async function loadStudentEnrollments() {
    const snapshot = await getDocs(
        query(
            collection(db, "enrollments"),
            where("studentId", "==", getStudentId())
        )
    );

    studentEnrollments = snapshot.docs.map(function (document) {
        return {
            ...document.data(),
            id: document.id
        };
    });
}


// ==========================================
// 14. LOAD QUIZ RESULTS
// ==========================================

async function loadStudentResults() {
    const snapshot = await getDocs(
        query(
            collection(db, "results"),
            where("studentId", "==", getStudentId())
        )
    );

    studentResults = snapshot.docs.map(function (document) {
        return {
            ...document.data(),
            id: document.id
        };
    });
}


// ==========================================
// 15. LOAD CERTIFICATES
// ==========================================

async function loadStudentCertificates() {
    const snapshot = await getDocs(
        query(
            collection(db, "certificates"),
            where("studentId", "==", getStudentId())
        )
    );

    studentCertificates = snapshot.docs.map(function (document) {
        return {
            ...document.data(),
            id: document.id
        };
    });
}


// ==========================================
// 16. LOAD COMPLETED LESSONS
// ==========================================

async function loadCompletedLessons() {
    const snapshot = await getDocs(
        query(
            collection(db, "completedLessons"),
            where("studentId", "==", getStudentId())
        )
    );

    completedLessons = snapshot.docs.map(function (document) {
        return {
            ...document.data(),
            id: document.id
        };
    });
}


// ==========================================
// 17. LOAD ANNOUNCEMENTS
// ==========================================

async function loadStudentAnnouncements() {
    try {
        const snapshot = await getDocs(
            collection(db, "announcements")
        );

        studentAnnouncements = snapshot.docs.map(function (document) {
            const data = document.data();

            return {
                ...data,
                id: document.id,

                title: data.title ||
                    "LearnSphere Announcement",

                message: data.message ||
                    data.content ||
                    "",

                createdAt: data.createdAt || null
            };
        }).filter(function (announcement) {
            const targetDepartment =
                String(announcement.targetDepartment || "").toLowerCase();

            const targetLevel =
                String(announcement.targetLevel || "").toLowerCase();

            const studentDepartment =
                String(currentStudent.department || "").toLowerCase();

            const studentLevel =
                String(currentStudent.level || "").toLowerCase();

            const departmentMatches =
                !targetDepartment ||
                targetDepartment === studentDepartment;

            const levelMatches =
                !targetLevel ||
                targetLevel === studentLevel;

            return departmentMatches && levelMatches;
        });

        studentAnnouncements.sort(function (a, b) {
            return getDateValue(b.createdAt) -
                getDateValue(a.createdAt);
        });

        displayStudentAnnouncements();

    } catch (error) {
        console.error("Announcement loading error:", error);

        studentAnnouncements = [];

        displayStudentAnnouncements();
    }
}


// ==========================================
// 18. DISPLAY ANNOUNCEMENTS
// ==========================================

function displayStudentAnnouncements() {
    const list = getElement("announcementsList");

    if (!list) return;

    if (!studentAnnouncements.length) {
        list.innerHTML = `
            <div class="announcement-empty">
                <i class="fa-solid fa-bullhorn"></i>
                <h3>No announcements yet</h3>
                <p>New announcements will appear here.</p>
            </div>
        `;

        return;
    }

    list.innerHTML = studentAnnouncements.map(function (item) {
        return `
            <article class="announcement-card">

                <div class="announcement-meta">
                    <span class="announcement-tag">
                        Announcement
                    </span>

                    <span class="announcement-date">
                        ${formatDate(item.createdAt)}
                    </span>
                </div>

                <h3>${escapeHTML(item.title)}</h3>

                <p>${escapeHTML(item.message)}</p>

            </article>
        `;
    }).join("");
}


// ==========================================
// 19. LOAD ALL STUDENT DATA
// ==========================================

async function loadAllStudentData() {
    const tasks = [
        ["Courses", loadCourses],
        ["Enrollments", loadStudentEnrollments],
        ["Results", loadStudentResults],
        ["Certificates", loadStudentCertificates],
        ["Completed lessons", loadCompletedLessons],
        ["Announcements", loadStudentAnnouncements]
    ];

    const results = await Promise.allSettled(
        tasks.map(function (item) {
            return item[1]();
        })
    );

    results.forEach(function (result, index) {
        if (result.status === "rejected") {
            console.error(
                tasks[index][0] + " loading failed:",
                result.reason
            );
        }
    });
}


// ==========================================
// 20. CHECK ENROLLMENT
// ==========================================

function isStudentEnrolled(courseId) {
    return studentEnrollments.some(function (item) {
        return String(item.courseId) === String(courseId);
    });
}


// ==========================================
// 21. COURSE CARD
// ==========================================

function createCourseCard(course) {
    const image = course.image || course.thumbnail || "";

    return `
        <div class="course-card">

            <div class="course-image">
                ${
                    image
                        ? `<img src="${escapeHTML(image)}"
                               alt="${escapeHTML(course.title)}">`
                        : `<i class="fa-solid fa-book-open"></i>`
                }
            </div>

            <div class="course-info">

                <h3>${escapeHTML(course.title || "Untitled Course")}</h3>

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
                    class="course-button">

                    Continue Learning

                    <i class="fa-solid fa-arrow-right"></i>

                </a>

            </div>
        </div>
    `;
}


// ==========================================
// 22. DISPLAY ENROLLED COURSES
// ==========================================

function loadStudentCourses() {
    const overviewList = getElement("overviewCourseList");
    const fullCourseList = getElement("studentCourseList");

    const enrolledCourses = studentEnrollments.map(function (item) {
        return getCourseById(item.courseId);
    }).filter(function (course) {
        return course && isCoursePublished(course);
    });

    if (overviewList) {
        overviewList.innerHTML = enrolledCourses.length
            ? enrolledCourses.slice(0, 2).map(createCourseCard).join("")
            : displayEmptyState(
                "You have not enrolled in any courses yet.",
                "fa-solid fa-book-open"
            );
    }

    if (fullCourseList) {
        fullCourseList.innerHTML = enrolledCourses.length
            ? enrolledCourses.map(createCourseCard).join("")
            : displayEmptyState(
                "No enrolled courses found. Explore available courses.",
                "fa-solid fa-book"
            );
    }
}


// ==========================================
// 23. EXPLORE COURSES
// ==========================================

function loadExploreCourses() {
    const availableCourses = studentCourses.filter(
        isCoursePublished
    );

    setText("availableCourseCount", availableCourses.length);

    displayDepartmentFilters(availableCourses);
    displayExploreCourseCards(availableCourses);
}


function displayDepartmentFilters(courses) {
    const filter = getElement("departmentFilter");

    if (!filter) return;

    const previousValue = filter.value;

    const departments = [
        ...new Set(
            courses.map(function (course) {
                return course.department;
            }).filter(Boolean)
        )
    ].sort();

    filter.innerHTML = `
        <option value="">All Departments</option>
    `;

    departments.forEach(function (department) {
        const option = document.createElement("option");

        option.value = department;
        option.textContent = department;

        filter.appendChild(option);
    });

    filter.value = departments.includes(previousValue)
        ? previousValue
        : "";
}


function displayExploreCourseCards(courses) {
    const list = getElement("exploreCourseList");

    if (!list) return;

    setText("availableCourseCount", courses.length);

    if (!courses.length) {
        list.innerHTML = displayEmptyState(
            "No courses match your search.",
            "fa-solid fa-magnifying-glass"
        );

        return;
    }

    list.innerHTML = courses.map(function (course) {
        const enrolled = isStudentEnrolled(course.id);

        const image = course.image || course.thumbnail || "";

        return `
            <div class="course-card">

                <div class="course-image">
                    ${
                        image
                            ? `<img src="${escapeHTML(image)}"
                                   alt="${escapeHTML(course.title)}">`
                            : `<i class="fa-solid fa-book-open"></i>`
                    }
                </div>

                <div class="course-info">

                    <h3>${escapeHTML(course.title || "Untitled Course")}</h3>

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
                        ${enrolled ? "disabled" : ""}>

                        ${
                            enrolled
                                ? `<i class="fa-solid fa-circle-check"></i>
                                   Already Enrolled`
                                : `<i class="fa-solid fa-plus"></i>
                                   Enrol Now`
                        }

                    </button>

                </div>
            </div>
        `;
    }).join("");
}


// ==========================================
// 24. SEARCH AND FILTER COURSES
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
        if (!isCoursePublished(course)) return false;

        const title = (course.title || "").toLowerCase();

        const description =
            (course.description || "").toLowerCase();

        const department = course.department || "";

        const level = String(course.level || "")
            .replace(/\s*level/i, "")
            .trim();

        const matchesSearch =
            title.includes(searchValue) ||
            description.includes(searchValue);

        const matchesDepartment =
            !departmentValue ||
            department === departmentValue;

        const matchesLevel =
            !levelValue ||
            level === levelValue;

        return matchesSearch &&
            matchesDepartment &&
            matchesLevel;
    });

    displayExploreCourseCards(filteredCourses);
}


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
// 25. ENROLL STUDENT IN COURSE
// ==========================================

async function enrolStudentInCourse(courseId, button) {
    const course = getCourseById(courseId);

    if (!course || !isCoursePublished(course)) {
        alert("This course is not currently available.");
        return;
    }

    if (!getStudentId()) {
        alert("Please log in before enrolling.");
        window.location.href = "auth.html?mode=student";
        return;
    }

    if (isStudentEnrolled(courseId)) {
        alert("You are already enrolled in this course.");
        return;
    }

    const originalHTML = button.innerHTML;

    button.disabled = true;
    button.textContent = "Enrolling...";

    try {
        await addDoc(collection(db, "enrollments"), {
            studentId: getStudentId(),
            courseId: course.id,
            courseTitle: course.title || "",
            studentName: getStudentName(),
            enrolledAt: serverTimestamp()
        });

        await loadStudentEnrollments();

        await addStudentNotification(
            "Course Enrollment Successful",
            "You have successfully enrolled in " +
                course.title + ".",
            "enrollment"
        );

        loadStudentCourses();
        loadExploreCourses();
        updateDashboardStatistics();
        updateNewDashboardFeatures();

        alert(
            "You have successfully enrolled in " +
            course.title + "!"
        );

    } catch (error) {
        console.error("Enrollment error:", error);

        alert(
            "Enrollment failed.\n\n" +
            (error.code || "Error") +
            "\n" +
            error.message
        );

        button.disabled = false;
        button.innerHTML = originalHTML;
    }
}


document.addEventListener("click", function (event) {
    const button = event.target.closest(".enrol-button");

    if (!button) return;

    enrolStudentInCourse(
        button.dataset.courseId,
        button
    );
});


// ==========================================
// 26. DISPLAY QUIZ RESULTS
// ==========================================

function displayStudentResults() {
    const resultList = getElement("studentResultList");

    if (!resultList) return;

    if (!studentResults.length) {
        resultList.innerHTML = displayEmptyState(
            "You have not completed any quizzes yet.",
            "fa-solid fa-chart-column"
        );

        return;
    }

    const sortedResults = [...studentResults].sort(function (a, b) {
        return getDateValue(getResultDate(b)) -
            getDateValue(getResultDate(a));
    });

    resultList.innerHTML = sortedResults.map(function (result) {
        const course = getCourseById(result.courseId);

        const courseTitle =
            result.courseTitle ||
            course?.title ||
            "Course";

        const percentage = Number(
            result.percentage ??
            result.scorePercentage ??
            0
        );

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
                        ${formatDate(getResultDate(result))}
                    </span>

                </div>
            </div>
        `;
    }).join("");
}


// ==========================================
// 27. DISPLAY CERTIFICATES
// ==========================================

function displayStudentCertificates() {
    const certificateList = getElement(
        "studentCertificateList"
    );

    if (!certificateList) return;

    if (!studentCertificates.length) {
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
                        ${escapeHTML(
                            certificate.percentage ?? 0
                        )}%
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
        }
    ).join("");
}


// ==========================================
// 28. DOWNLOAD CERTIFICATE PDF
// ==========================================

function downloadCertificate(certificateId) {
    const certificate = studentCertificates.find(
        function (item) {
            return String(item.id) === String(certificateId);
        }
    );

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

    const studentName =
        certificate.studentName || getStudentName();

    const courseTitle =
        certificate.courseTitle || "Completed Course";

    const certificateNumber =
        certificate.certificateId || certificate.id;

    const score = certificate.percentage ?? 0;

    const issueDate = formatDate(certificate.issuedAt);

    pdf.setFillColor(250, 253, 250);
    pdf.rect(0, 0, 297, 210, "F");

    pdf.setDrawColor(21, 128, 61);
    pdf.setLineWidth(2);
    pdf.rect(10, 10, 277, 190);

    pdf.setLineWidth(0.5);
    pdf.rect(15, 15, 267, 180);

    pdf.setTextColor(21, 128, 61);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(25);

    pdf.text("LearnSphere", 148.5, 37, {
        align: "center"
    });

    pdf.setTextColor(30, 41, 59);
    pdf.setFontSize(30);

    pdf.text(
        "CERTIFICATE OF COMPLETION",
        148.5,
        63,
        { align: "center" }
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(15);
    pdf.setTextColor(71, 85, 105);

    pdf.text(
        "This certificate is proudly presented to",
        148.5,
        83,
        { align: "center" }
    );

    pdf.setFont("times", "bold");
    pdf.setFontSize(28);
    pdf.setTextColor(21, 128, 61);

    pdf.text(
        pdf.splitTextToSize(studentName, 240),
        148.5,
        105,
        { align: "center" }
    );

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

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(13);
    pdf.setTextColor(71, 85, 105);

    pdf.text(
        "Final Quiz Score: " + score + "%",
        148.5,
        157,
        { align: "center" }
    );

    pdf.setFontSize(10);

    pdf.text("Date Issued: " + issueDate, 35, 178);
    pdf.text("Certificate ID: " + certificateNumber, 35, 186);

    pdf.setDrawColor(21, 128, 61);
    pdf.line(207, 177, 262, 177);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(30, 41, 59);

    pdf.text(
        "AKINTAYO IBRAHIM",
        234.5,
        184,
        { align: "center" }
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    pdf.text(
        "Founder, LearnSphere",
        234.5,
        190,
        { align: "center" }
    );

    const safeName = studentName.replace(
        /[^a-z0-9]/gi,
        "_"
    );

    pdf.save(
        "LearnSphere_Certificate_" +
        safeName +
        ".pdf"
    );
}


document.addEventListener("click", function (event) {
    const button = event.target.closest(".download-btn");

    if (!button) return;

    downloadCertificate(
        button.dataset.certificateId
    );
});


// ==========================================
// 29. DASHBOARD STATISTICS
// ==========================================

function studentResultsForCurrentStudent() {
    return studentResults.filter(function (result) {
        return String(result.studentId) === getStudentId();
    });
}


function updateDashboardStatistics() {
    const studentId = getStudentId();

    const resultCount =
        studentResultsForCurrentStudent().length;

    const certificateCount =
        studentCertificates.filter(function (certificate) {
            return String(certificate.studentId) === studentId;
        }).length;

    const lessonCount =
        completedLessons.filter(function (lesson) {
            return String(lesson.studentId) === studentId;
        }).length;

    setText("enrolledCourses", studentEnrollments.length);
    setText("completedLessons", lessonCount);
    setText("completedQuizzes", resultCount);
    setText("earnedCertificates", certificateCount);
}


// ==========================================
// 30. NEW FEATURE: COURSE PROGRESS
// ==========================================

function getCompletedLessonsForCourse(courseId) {
    return completedLessons.filter(function (lesson) {
        return String(lesson.courseId) === String(courseId);
    });
}


function getCourseTotalLessons(course) {
    return Number(
        course.totalLessons ||
        course.lessonCount ||
        course.lessonsCount ||
        course.numberOfLessons ||
        0
    );
}


function getCourseProgress(course) {
    const completed = getCompletedLessonsForCourse(course.id).length;
    const total = getCourseTotalLessons(course);

    if (!total) {
        return {
            completed: completed,
            total: 0,
            percentage: 0,
            known: false
        };
    }

    const percentage = Math.min(
        100,
        Math.round((completed / total) * 100)
    );

    return {
        completed: completed,
        total: total,
        percentage: percentage,
        known: true
    };
}


// ==========================================
// 31. NEW FEATURE: CONTINUE LEARNING
// ==========================================

function getLatestLearningItem() {
    const sortedLessons = [...completedLessons].sort(function (a, b) {
        return getDateValue(getLessonDate(b)) -
            getDateValue(getLessonDate(a));
    });

    for (const lesson of sortedLessons) {
        const course = getCourseById(lesson.courseId);

        if (course && isStudentEnrolled(course.id)) {
            return {
                course: course,
                lesson: lesson
            };
        }
    }

    return null;
}


function displayContinueLearning() {
    const container = getElement("continueLearningContainer");

    if (!container) return;

    const latestItem = getLatestLearningItem();

    const enrolledCourses = studentEnrollments
        .map(function (enrollment) {
            return getCourseById(enrollment.courseId);
        })
        .filter(function (course) {
            return course && isCoursePublished(course);
        });

    if (!enrolledCourses.length) {
        container.innerHTML = `
            <div class="continue-learning-empty">
                <div class="continue-learning-empty-icon">
                    <i class="fa-solid fa-book-open"></i>
                </div>

                <h3>Your learning journey starts here</h3>

                <p>
                    Enrol in a course and continue learning
                    from your student dashboard.
                </p>

                <button class="continue-learning-action"
                        data-section="explore">
                    Explore Courses
                    <i class="fa-solid fa-arrow-right"></i>
                </button>
            </div>
        `;

        return;
    }

    let course = latestItem
        ? latestItem.course
        : enrolledCourses[0];

    const progress = getCourseProgress(course);

    const lesson = latestItem ? latestItem.lesson : null;

    const lessonTitle = lesson
        ? lesson.lessonTitle || lesson.title || "Your last completed lesson"
        : "Start learning this course";

    const lessonId = lesson
        ? lesson.lessonId || lesson.id
        : "";

    const courseLink = lessonId
        ? `course.html?id=${encodeURIComponent(course.id)}&lessonId=${encodeURIComponent(lessonId)}`
        : `course.html?id=${encodeURIComponent(course.id)}`;

    container.innerHTML = `
        <article class="continue-learning-card">

            <div class="continue-learning-image">
                ${
                    course.image || course.thumbnail
                        ? `<img src="${escapeHTML(course.image || course.thumbnail)}"
                               alt="${escapeHTML(course.title)}">`
                        : `<i class="fa-solid fa-graduation-cap"></i>`
                }
            </div>

            <div class="continue-learning-content">

                <span class="continue-learning-label">
                    <i class="fa-solid fa-book-open"></i>
                    PICK UP WHERE YOU LEFT OFF
                </span>

                <h3>${escapeHTML(course.title)}</h3>

                <p class="continue-learning-lesson">
                    ${escapeHTML(lessonTitle)}
                </p>

                ${
                    progress.known
                        ? `
                            <div class="continue-learning-progress">
                                <div class="continue-learning-progress-info">
                                    <span>Course progress</span>
                                    <strong>${progress.percentage}%</strong>
                                </div>

                                <div class="continue-learning-progress-track">
                                    <span style="width: ${progress.percentage}%"></span>
                                </div>
                            </div>
                        `
                        : `
                            <p class="continue-learning-progress-note">
                                ${progress.completed} completed lessons
                            </p>
                        `
                }

                <a href="${courseLink}"
                   class="continue-learning-action">
                    Continue Learning
                    <i class="fa-solid fa-arrow-right"></i>
                </a>

            </div>
        </article>
    `;
}


// ==========================================
// 32. NEW FEATURE: OVERALL LEARNING PROGRESS
// ==========================================

function displayOverallLearningProgress() {
    const enrolledCourses = studentEnrollments
        .map(function (enrollment) {
            return getCourseById(enrollment.courseId);
        })
        .filter(function (course) {
            return course && isCoursePublished(course);
        });

    let totalLessons = 0;
    let completedCount = 0;
    let coursesWithLessonCounts = 0;

    enrolledCourses.forEach(function (course) {
        const progress = getCourseProgress(course);

        if (progress.known) {
            totalLessons += progress.total;
            completedCount += progress.completed;
            coursesWithLessonCounts++;
        }
    });

    const progressBar = getElement("overallProgressBar");

    if (!enrolledCourses.length) {
        if (progressBar) {
            progressBar.style.width = "0%";
        }

        setText("overallProgressText", "0%");
        setText("overallProgressDetails", "Enrol in a course to begin tracking your progress.");

        return;
    }

    if (!coursesWithLessonCounts || !totalLessons) {
        const completed = completedLessons.length;

        if (progressBar) {
            progressBar.style.width = "0%";
        }

        setText("overallProgressText", "--");
        setText(
            "overallProgressDetails",
            completed + " lessons completed. Add lesson counts to courses to calculate your overall progress."
        );

        return;
    }

    const percentage = Math.min(
        100,
        Math.round((completedCount / totalLessons) * 100)
    );

    if (progressBar) {
        progressBar.style.width = percentage + "%";
    }

    setText("overallProgressText", percentage + "%");

    setText(
        "overallProgressDetails",
        completedCount + " of " + totalLessons + " lessons completed"
    );
}


// ==========================================
// 33. NEW FEATURE: LEARNING STREAK
// ==========================================

function getLearningDays() {
    const days = new Set();

    completedLessons.forEach(function (lesson) {
        const dateValue = getDateValue(getLessonDate(lesson));

        if (!dateValue) return;

        const date = new Date(dateValue);

        const dayKey = [
            date.getFullYear(),
            date.getMonth() + 1,
            date.getDate()
        ].join("-");

        days.add(dayKey);
    });

    return Array.from(days).sort();
}


function getCurrentLearningStreak() {
    const days = getLearningDays();

    if (!days.length) return 0;

    const daySet = new Set(days);

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayKey = [
        today.getFullYear(),
        today.getMonth() + 1,
        today.getDate()
    ].join("-");

    const yesterdayKey = [
        yesterday.getFullYear(),
        yesterday.getMonth() + 1,
        yesterday.getDate()
    ].join("-");

    let currentDate;

    if (daySet.has(todayKey)) {
        currentDate = today;
    } else if (daySet.has(yesterdayKey)) {
        currentDate = yesterday;
    } else {
        return 0;
    }

    let streak = 0;

    while (true) {
        const key = [
            currentDate.getFullYear(),
            currentDate.getMonth() + 1,
            currentDate.getDate()
        ].join("-");

        if (!daySet.has(key)) {
            break;
        }

        streak++;

        currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
}


function displayLearningStreak() {
    const streak = getCurrentLearningStreak();

    setText("learningStreak", streak);

    const streakMessage = getElement("learningStreakMessage");

    if (streakMessage) {
        streakMessage.textContent = streak > 0
            ? "Keep your learning streak going!"
            : "Complete a lesson today to start your streak.";
    }
}


// ==========================================
// 34. NEW FEATURE: WEEKLY LEARNING GOAL
// ==========================================

function getStartOfWeek() {
    const date = new Date();

    date.setHours(0, 0, 0, 0);

    const day = date.getDay();

    const difference = day === 0 ? 6 : day - 1;

    date.setDate(date.getDate() - difference);

    return date;
}


function getLessonsCompletedThisWeek() {
    const startOfWeek = getStartOfWeek();

    return completedLessons.filter(function (lesson) {
        const timestamp = getDateValue(getLessonDate(lesson));

        return timestamp >= startOfWeek.getTime();
    }).length;
}


function displayWeeklyLearningGoal() {
    const completedThisWeek = getLessonsCompletedThisWeek();

    const goal = WEEKLY_LEARNING_GOAL;

    const percentage = Math.min(
        100,
        Math.round((completedThisWeek / goal) * 100)
    );

    const progressBar = getElement("weeklyGoalProgress");

    if (progressBar) {
        progressBar.style.width = percentage + "%";
    }

    setText(
        "weeklyGoalText",
        completedThisWeek + " of " + goal + " lessons completed this week"
    );
}


// ==========================================
// 35. NEW FEATURE: RECENT ACTIVITY
// ==========================================

function getRecentActivities() {
    let activities = [];

    studentEnrollments.forEach(function (item) {
        activities.push({
            title: "Course Enrolled",
            description: "You enrolled in " +
                (item.courseTitle || "a course"),
            date: getEnrollmentDate(item),
            icon: "fa-solid fa-book-open",
            type: "enrollment"
        });
    });

    completedLessons.forEach(function (item) {
        const course = getCourseById(item.courseId);

        activities.push({
            title: "Lesson Completed",
            description:
                (item.lessonTitle || item.title || "A lesson") +
                (course ? " in " + course.title : ""),
            date: getLessonDate(item),
            icon: "fa-solid fa-circle-check",
            type: "lesson"
        });
    });

    studentResults.forEach(function (item) {
        const course = getCourseById(item.courseId);

        activities.push({
            title: "Quiz Completed",
            description:
                "You completed a quiz in " +
                (item.courseTitle || course?.title || "a course"),
            date: getResultDate(item),
            icon: "fa-solid fa-chart-column",
            type: "result"
        });
    });

    studentCertificates.forEach(function (item) {
        activities.push({
            title: "Certificate Earned",
            description: "You earned a certificate in " +
                (item.courseTitle || "a course"),
            date: item.issuedAt,
            icon: "fa-solid fa-award",
            type: "certificate"
        });
    });

    return activities
        .filter(function (item) {
            return getDateValue(item.date) > 0;
        })
        .sort(function (a, b) {
            return getDateValue(b.date) -
                getDateValue(a.date);
        })
        .slice(0, 6);
}


function displayRecentActivity() {
    const container = getElement("recentActivityList");

    if (!container) return;

    const activities = getRecentActivities();

    if (!activities.length) {
        container.innerHTML = displayEmptyState(
            "Your recent learning activities will appear here.",
            "fa-solid fa-clock"
        );

        return;
    }

    container.innerHTML = activities.map(function (item) {
        return `
            <div class="recent-activity-item">

                <div class="recent-activity-icon">
                    <i class="${item.icon}"></i>
                </div>

                <div class="recent-activity-content">
                    <h4>${escapeHTML(item.title)}</h4>
                    <p>${escapeHTML(item.description)}</p>
                    <span>${formatNotificationTime(item.date)}</span>
                </div>

            </div>
        `;
    }).join("");
}


// ==========================================
// 36. NEW FEATURE: RECENT QUIZ RESULTS
// ==========================================

function displayRecentQuizResults() {
    const container = getElement("recentQuizResults");

    if (!container) return;

    const recentResults = [...studentResults]
        .sort(function (a, b) {
            return getDateValue(getResultDate(b)) -
                getDateValue(getResultDate(a));
        })
        .slice(0, 5);

    if (!recentResults.length) {
        container.innerHTML = displayEmptyState(
            "Your quiz results will appear here after completing a quiz.",
            "fa-solid fa-chart-column"
        );

        return;
    }

    container.innerHTML = recentResults.map(function (result) {
        const course = getCourseById(result.courseId);

        const title =
            result.courseTitle ||
            course?.title ||
            "Course";

        const percentage = Number(
            result.percentage ??
            result.scorePercentage ??
            0
        );

        return `
            <div class="recent-quiz-item">

                <div class="recent-quiz-info">
                    <h4>${escapeHTML(title)}</h4>
                    <span>${formatDate(getResultDate(result))}</span>
                </div>

                <div class="recent-quiz-score ${percentage >= 50 ? "passed" : "failed"}">
                    ${percentage}%
                </div>

            </div>
        `;
    }).join("");
}


// ==========================================
// 37. NEW FEATURE: RECOMMENDED COURSES
// ==========================================

function displayRecommendedCourses() {
    const container = getElement("recommendedCourses");

    if (!container) return;

    const recommendations = studentCourses.filter(function (course) {
        return isCoursePublished(course) &&
            !isStudentEnrolled(course.id);
    }).slice(0, 3);

    if (!recommendations.length) {
        container.innerHTML = displayEmptyState(
            "You are enrolled in all currently available courses.",
            "fa-solid fa-graduation-cap"
        );

        return;
    }

    container.innerHTML = recommendations.map(function (course) {
        const image = course.image || course.thumbnail || "";

        return `
            <article class="recommended-course-card">

                <div class="recommended-course-image">
                    ${
                        image
                            ? `<img src="${escapeHTML(image)}"
                                   alt="${escapeHTML(course.title)}">`
                            : `<i class="fa-solid fa-book-open"></i>`
                    }
                </div>

                <div class="recommended-course-content">
                    <h4>${escapeHTML(course.title || "Untitled Course")}</h4>

                    <p>
                        ${escapeHTML(course.department || "General")}
                        •
                        ${escapeHTML(course.level || "All Levels")}
                    </p>

                    <a href="course.html?id=${encodeURIComponent(course.id)}"
                       class="recommended-course-link">
                        View Course
                        <i class="fa-solid fa-arrow-right"></i>
                    </a>
                </div>

            </article>
        `;
    }).join("");
}


// ==========================================
// 38. UPDATE ALL NEW DASHBOARD FEATURES
// ==========================================

function updateNewDashboardFeatures() {
    displayContinueLearning();

    displayOverallLearningProgress();

    displayLearningStreak();

    displayWeeklyLearningGoal();

    displayRecentActivity();

    displayRecentQuizResults();

    displayRecommendedCourses();
}


// ==========================================
// 39. DASHBOARD NAVIGATION
// ==========================================

function showDashboardSection(sectionName) {
    document.querySelectorAll(".dashboard-section").forEach(
        function (section) {
            section.classList.remove("active");
        }
    );

    document.querySelectorAll(".sidebar-link").forEach(
        function (link) {
            link.classList.remove("active");
        }
    );

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

    if (notificationDropdown) {
        notificationDropdown.classList.remove("show");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}


// ==========================================
// 40. SIDEBAR EVENTS
// ==========================================

document.querySelectorAll(".sidebar-link").forEach(
    function (link) {
        link.addEventListener("click", function (event) {
            event.preventDefault();

            showDashboardSection(
                this.dataset.section
            );
        });
    }
);


document.querySelectorAll("[data-section]").forEach(
    function (button) {
        if (button.classList.contains("sidebar-link")) {
            return;
        }

        button.addEventListener("click", function () {
            showDashboardSection(
                this.dataset.section
            );
        });
    }
);


// ==========================================
// 41. LOGOUT
// ==========================================

const logoutButton = getElement("logoutBtn");

if (logoutButton) {
    logoutButton.addEventListener("click", async function () {
        const confirmLogout = confirm(
            "Are you sure you want to log out?"
        );

        if (!confirmLogout) return;

        try {
            await signOut(auth);

            window.location.href =
                "auth.html?mode=student";

        } catch (error) {
            console.error("Logout error:", error);

            alert("Unable to log out. Please try again.");
        }
    });
}


// ==========================================
// 42. LOAD DASHBOARD
// ==========================================

function loadDashboard() {
    if (!currentStudent) return;

    loadStudentInformation();

    loadStudentCourses();

    loadExploreCourses();

    displayStudentResults();

    displayStudentCertificates();

    displayStudentAnnouncements();

    updateDashboardStatistics();

    displayNotifications();

    updateNewDashboardFeatures();

    setText(
        "currentYear",
        new Date().getFullYear()
    );
}


// ==========================================
// 43. FIREBASE AUTHENTICATION
// ==========================================

onAuthStateChanged(auth, async function (user) {
    if (!user) {
        window.location.href =
            "auth.html?mode=student";

        return;
    }

    currentStudent = {
        uid: user.uid,
        fullName: user.displayName || "Student",
        email: user.email || "",
        university: "",
        department: "",
        level: ""
    };

    loadStudentInformation();

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
        const studentRef = doc(
            db,
            "students",
            user.uid
        );

        const studentSnapshot = await getDoc(studentRef);

        if (!studentSnapshot.exists()) {
            alert("Student profile not found.");

            await signOut(auth);

            window.location.href =
                "auth.html?mode=student";

            return;
        }

        const studentData = studentSnapshot.data();

        if (studentData.role !== "student") {
            alert("You do not have student access.");

            await signOut(auth);

            window.location.href =
                "auth.html?mode=student";

            return;
        }

        currentStudent = {
            uid: user.uid,

            fullName:
                studentData.fullName ||
                user.displayName ||
                "Student",

            email:
                studentData.email ||
                user.email ||
                "",

            university:
                studentData.university || "",

            department:
                studentData.department || "",

            level:
                studentData.level || ""
        };

        loadStudentInformation();

        await loadAllStudentData();

        await loadStudentNotifications();

        await checkForNewStudentActivity();

        loadDashboard();

        console.log(
            "LearnSphere student dashboard loaded successfully."
        );

    } catch (error) {
        console.error(
            "Dashboard authentication error:",
            error
        );

        alert(
            "Unable to load your dashboard.\n\n" +
            error.message
        );
    }
});


// ==========================================
// 44. CURRENT YEAR
// ==========================================

setText(
    "currentYear",
    new Date().getFullYear()
);


// ==========================================
// END OF LEARNSPHERE STUDENT DASHBOARD
// ==========================================