// ==========================================
// LEARNSPHERE STUDENT DASHBOARD
// ==========================================

// FIREBASE IMPORTS

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
// GLOBAL VARIABLES
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


// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getElement(id) {
    return document.getElementById(id);
}

function setText(id, value) {
    const element = getElement(id);

    if (element) {
        element.textContent = value ?? "";
    }
}

function getStudentId() {
    return currentStudent ? currentStudent.uid : "";
}

function getStudentName() {
    return currentStudent ? currentStudent.fullName : "Student";
}

function escapeHTML(value) {
    const element = document.createElement("div");
    element.textContent = value ?? "";
    return element.innerHTML;
}

function formatDate(value) {
    if (!value) return "Date not available";

    const date = typeof value.toDate === "function"
        ? value.toDate()
        : new Date(value);

    if (isNaN(date.getTime())) {
        return "Date not available";
    }

    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric"
    });
}

function displayEmptyState(message, icon = "fa-solid fa-book-open") {
    return `
        <div class="empty-state">
            <i class="${icon}"></i>
            <p>${escapeHTML(message)}</p>
        </div>
    `;
}

function isCoursePublished(course) {
    return course.published === true || course.isPublished === true;
}

function getCourseById(courseId) {
    return studentCourses.find(course =>
        String(course.id) === String(courseId)
    );
}

function isStudentEnrolled(courseId) {
    return studentEnrollments.some(enrollment =>
        String(enrollment.courseId) === String(courseId)
    );
}


// ==========================================
// MOBILE SIDEBAR / HAMBURGER MENU
// ==========================================

const menuBtn = getElement("menuBtn");
const closeSidebarBtn = getElement("closeSidebarBtn");
const sidebar = getElement("sidebar");
const sidebarOverlay = getElement("sidebarOverlay");

function openSidebar() {
    if (!sidebar || !sidebarOverlay) return;

    sidebar.classList.add("open");
    sidebarOverlay.classList.add("active");

    if (menuBtn) {
        menuBtn.setAttribute("aria-expanded", "true");
    }
}

function closeSidebar() {
    if (!sidebar || !sidebarOverlay) return;

    sidebar.classList.remove("open");
    sidebarOverlay.classList.remove("active");

    if (menuBtn) {
        menuBtn.setAttribute("aria-expanded", "false");
    }
}

if (menuBtn) {
    menuBtn.addEventListener("click", openSidebar);
}

if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", closeSidebar);
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeSidebar);
}

document.addEventListener("keydown", function(event) {
    if (event.key === "Escape") {
        closeSidebar();
    }
});

window.addEventListener("resize", function() {
    if (window.innerWidth > 992) {
        closeSidebar();
    }
});


// ==========================================
// DASHBOARD NAVIGATION
// ==========================================

function showDashboardSection(sectionName) {

    document.querySelectorAll(".dashboard-section").forEach(section => {
        section.classList.remove("active");
    });

    document.querySelectorAll(".sidebar-link").forEach(link => {
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

    closeSidebar();

    if (notificationDropdown) {
        notificationDropdown.classList.remove("show");
    }
}


// SIDEBAR NAVIGATION

document.querySelectorAll(".sidebar-link").forEach(link => {

    link.addEventListener("click", function(event) {

        // Allow normal links such as Battle Arena to open
        if (!this.dataset.section) {
            closeSidebar();
            return;
        }

        // Prevent default only for dashboard sections
        event.preventDefault();

        showDashboardSection(this.dataset.section);

    });

});


// OTHER DASHBOARD BUTTONS

document.querySelectorAll("[data-section]").forEach(button => {

    if (button.classList.contains("sidebar-link")) return;

    button.addEventListener("click", function(event) {

        event.preventDefault();

        showDashboardSection(this.dataset.section);

    });

});
// ==========================================
// NOTIFICATION SYSTEM
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

        if (!Array.isArray(parsed)) return [];

        return parsed.map((item, index) => ({
            id: String(item.id || item.notificationId || "legacy-" + index),
            studentId: getStudentId(),
            title: item.title || item.heading || "LearnSphere Update",
            message: item.message || item.description || item.body || "",
            type: item.type || item.category || "general",
            createdAt: item.createdAt || item.date || new Date(),
            read: item.read === true || item.isRead === true,
            source: "localStorage"
        }));

    } catch (error) {
        console.error("Legacy notification error:", error);
        return [];
    }
}

function saveLegacyNotifications() {
    const items = studentNotifications
        .filter(item => item.source === "localStorage")
        .map(item => ({
            id: item.id,
            title: item.title,
            message: item.message,
            type: item.type,
            createdAt: item.createdAt,
            read: item.read
        }));

    try {
        localStorage.setItem(
            getLegacyNotificationStorageKey(),
            JSON.stringify(items)
        );
    } catch (error) {
        console.error("Unable to save notifications:", error);
    }
}

async function loadStudentNotifications() {
    if (!getStudentId()) return;

    const legacy = getLegacyNotifications();
    let firestoreItems = [];

    try {
        const notificationQuery = query(
            collection(db, "notifications"),
            where("studentId", "==", getStudentId())
        );

        const snapshot = await getDocs(notificationQuery);

        firestoreItems = snapshot.docs.map(document => {
            const data = document.data();

            return {
                id: document.id,
                studentId: data.studentId,
                title: data.title || "LearnSphere Update",
                message: data.message || "",
                type: data.type || "general",
                createdAt: data.createdAt || new Date(),
                read: data.isRead === true || data.read === true,
                source: "firestore"
            };
        });

    } catch (error) {
        console.warn("Unable to load Firestore notifications:", error);
    }

    const merged = new Map();

    legacy.forEach(item => merged.set(String(item.id), item));

    firestoreItems.forEach(item => merged.set(String(item.id), item));

    studentNotifications = Array.from(merged.values()).sort((a, b) => {
        const dateA = a.createdAt?.toDate
            ? a.createdAt.toDate().getTime()
            : new Date(a.createdAt || 0).getTime();

        const dateB = b.createdAt?.toDate
            ? b.createdAt.toDate().getTime()
            : new Date(b.createdAt || 0).getTime();

        return dateB - dateA;
    });

    displayNotifications();
}

async function addStudentNotification(title, message, type = "general") {
    if (!getStudentId()) return false;

    try {
        const notificationData = {
            studentId: getStudentId(),
            title: title,
            message: message,
            type: type,
            isRead: false,
            read: false,
            createdAt: serverTimestamp()
        };

        const reference = await addDoc(
            collection(db, "notifications"),
            notificationData
        );

        studentNotifications.unshift({
            id: reference.id,
            studentId: getStudentId(),
            title: title,
            message: message,
            type: type,
            createdAt: new Date(),
            isRead: false,
            read: false,
            source: "firestore"
        });

        displayNotifications();

        return true;

    } catch (error) {
        console.error("Notification creation error:", error);

        return false;
    }
}
async function detectNewNotificationItems(
    items,
    trackingType,
    title,
    messageFunction
) {
    const key = getNotificationTrackingKey(trackingType);

    const currentIds = items.map(item => String(item.id));

    let previousIds = [];

    try {
        const saved = localStorage.getItem(key);

        if (saved === null) {
            localStorage.setItem(key, JSON.stringify(currentIds));
            return;
        }

        previousIds = JSON.parse(saved);

        if (!Array.isArray(previousIds)) {
            previousIds = [];
        }

    } catch (error) {
        console.error("Notification tracking error:", error);
        return;
    }

    const newItems = items.filter(item =>
        !previousIds.includes(String(item.id))
    );

    const successfullyProcessedIds = [...previousIds];

    for (const item of newItems) {
        const created = await addStudentNotification(
            title,
            messageFunction(item),
            trackingType
        );

        if (created) {
            successfullyProcessedIds.push(String(item.id));
        }
    }

    localStorage.setItem(
        key,
        JSON.stringify([...new Set(successfullyProcessedIds)])
    );
}

async function checkForNewStudentActivity() {
    await detectNewNotificationItems(
        studentCourses.filter(isCoursePublished),
        "course",
        "New Course Available",
        course => course.title + " is now available on LearnSphere."
    );

    await detectNewNotificationItems(
        studentResults,
        "result",
        "New Quiz Result",
        result => (
            result.courseTitle ||
            getCourseById(result.courseId)?.title ||
            "Your course"
        ) + " quiz result is now available."
    );

    await detectNewNotificationItems(
        studentCertificates,
        "certificate",
        "Certificate Earned",
        certificate => "Your certificate for " +
            (certificate.courseTitle || "a completed course") +
            " is now available."
    );

    await detectNewNotificationItems(
        studentAnnouncements,
        "announcement",
        "New Announcement",
        announcement => (
            announcement.title || "A new announcement"
        ) + " has been posted on LearnSphere."
    );
}

function getUnreadNotificationCount() {
    return studentNotifications.filter(item => !item.read).length;
}

function formatNotificationTime(value) {
    const date = value?.toDate
        ? value.toDate()
        : new Date(value);

    if (isNaN(date.getTime())) return "Recently";

    const difference = Math.max(0, new Date() - date);

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
                    <button type="button"
                        data-notification-read="${escapeHTML(notification.id)}"
                        title="Mark as read">
                        <i class="fa-solid fa-check"></i>
                    </button>
                ` : ""}

                <button type="button"
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
            <p>You are all caught up. New updates will appear here.</p>
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
    setText("totalNotifications", studentNotifications.length);
    setText("pageUnreadNotifications", unreadCount);
    setText("notificationNavCount", unreadCount);

    const sidebarCount = getElement("sidebarUnreadCount");

    if (sidebarCount) {
        sidebarCount.textContent = unreadCount;
        sidebarCount.style.display = unreadCount > 0
            ? "inline-flex"
            : "none";
    }

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
            filtered = filtered.filter(item => !item.read);
        }

        if (activeNotificationFilter === "read") {
            filtered = filtered.filter(item => item.read);
        }

        pageList.innerHTML = filtered.length
            ? filtered.map(createNotificationHTML).join("")
            : notificationEmptyMessage();
    }

    document.querySelectorAll("[data-notification-filter]").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.notificationFilter === activeNotificationFilter
        );
    });
}

async function markNotificationAsRead(id) {
    const notification = studentNotifications.find(item =>
        String(item.id) === String(id)
    );

    if (!notification || notification.read) return;

    try {
        if (notification.source === "localStorage") {
            notification.read = true;
            saveLegacyNotifications();
        } else {
            await updateDoc(doc(db, "notifications", id), {
                isRead: true,
                read: true
            });

            notification.read = true;
        }

        displayNotifications();

    } catch (error) {
        console.error("Unable to update notification:", error);
        alert("Unable to update this notification.");
    }
}

async function markAllNotificationsAsRead() {
    const unread = studentNotifications.filter(item => !item.read);

    try {
        const firestoreItems = unread.filter(item =>
            item.source !== "localStorage"
        );

        await Promise.all(firestoreItems.map(item =>
            updateDoc(doc(db, "notifications", item.id), {
                isRead: true,
                read: true
            })
        ));

        unread.forEach(item => item.read = true);

        saveLegacyNotifications();
        displayNotifications();

    } catch (error) {
        console.error("Unable to update notifications:", error);
        alert("Some notifications could not be updated.");
        await loadStudentNotifications();
    }
}

async function deleteStudentNotification(id) {
    const notification = studentNotifications.find(item =>
        String(item.id) === String(id)
    );

    if (!notification) return;

    try {
        if (notification.source !== "localStorage") {
            await deleteDoc(doc(db, "notifications", id));
        }

        studentNotifications = studentNotifications.filter(item =>
            String(item.id) !== String(id)
        );

        saveLegacyNotifications();
        displayNotifications();

    } catch (error) {
        console.error("Unable to delete notification:", error);
        alert("Unable to delete this notification.");
    }
}

document.querySelectorAll("[data-notification-filter]").forEach(button => {
    button.addEventListener("click", function() {
        activeNotificationFilter = this.dataset.notificationFilter;
        displayNotifications();
    });
});

const markAllReadBtn = getElement("markAllReadBtn");
const notificationPageMarkAllBtn = getElement("notificationPageMarkAllBtn");

if (markAllReadBtn) {
    markAllReadBtn.addEventListener("click", markAllNotificationsAsRead);
}

if (notificationPageMarkAllBtn) {
    notificationPageMarkAllBtn.addEventListener(
        "click",
        markAllNotificationsAsRead
    );
}

const notificationBell = getElement("notificationBell");
const notificationDropdown = getElement("notificationDropdown");

if (notificationBell && notificationDropdown) {
    notificationBell.addEventListener("click", function(event) {
        event.stopPropagation();
        notificationDropdown.classList.toggle("show");
    });
}

document.addEventListener("click", function(event) {
    if (!notificationDropdown || !notificationBell) return;

    if (
        !notificationDropdown.contains(event.target) &&
        !notificationBell.contains(event.target)
    ) {
        notificationDropdown.classList.remove("show");
    }
});

document.addEventListener("click", function(event) {
    const readButton = event.target.closest("[data-notification-read]");

    if (readButton) {
        markNotificationAsRead(readButton.dataset.notificationRead);
        return;
    }

    const deleteButton = event.target.closest("[data-notification-delete]");

    if (deleteButton) {
        deleteStudentNotification(deleteButton.dataset.notificationDelete);
    }
});


// ==========================================
// LOAD STUDENT DATA FROM FIREBASE
// ==========================================

async function loadCourses() {

    // Load courses published with the published field

    const publishedCourses = await getDocs(
        query(
            collection(db, "courses"),
            where("published", "==", true)
        )
    );

    studentCourses = publishedCourses.docs.map(document => ({
        ...document.data(),
        id: document.id
    }));


    // Also load courses published with isPublished

    const alternativeCourses = await getDocs(
        query(
            collection(db, "courses"),
            where("isPublished", "==", true)
        )
    );


    // Add courses that are not already in the list

    alternativeCourses.docs.forEach(document => {

        const alreadyExists = studentCourses.some(course =>
            course.id === document.id
        );

        if (!alreadyExists) {

            studentCourses.push({
                ...document.data(),
                id: document.id
            });

        }

    });

}

async function loadStudentEnrollments() {
    const snapshot = await getDocs(
        query(
            collection(db, "enrollments"),
            where("studentId", "==", getStudentId())
        )
    );

    studentEnrollments = snapshot.docs.map(document => ({
        ...document.data(),
        id: document.id
    }));
}

async function loadStudentResults() {
    const snapshot = await getDocs(
        query(
            collection(db, "results"),
            where("studentId", "==", getStudentId())
        )
    );

    studentResults = snapshot.docs.map(document => ({
        ...document.data(),
        id: document.id
    }));
}

async function loadStudentCertificates() {
    const snapshot = await getDocs(
        query(
            collection(db, "certificates"),
            where("studentId", "==", getStudentId())
        )
    );

    studentCertificates = snapshot.docs.map(document => ({
        ...document.data(),
        id: document.id
    }));
}

async function loadCompletedLessons() {
    const snapshot = await getDocs(
        query(
            collection(db, "completedLessons"),
            where("studentId", "==", getStudentId())
        )
    );

    completedLessons = snapshot.docs.map(document => ({
        ...document.data(),
        id: document.id
    }));
}

async function loadStudentAnnouncements() {
    try {
        const snapshot = await getDocs(collection(db, "announcements"));

        studentAnnouncements = snapshot.docs.map(document => ({
            ...document.data(),
            id: document.id
        })).filter(announcement => {
            const targetDepartment = announcement.targetDepartment || "";
            const targetLevel = announcement.targetLevel || "";

            const departmentMatches = !targetDepartment ||
                targetDepartment.toLowerCase() ===
                String(currentStudent.department || "").toLowerCase();

            const levelMatches = !targetLevel ||
                String(targetLevel).toLowerCase() ===
                String(currentStudent.level || "").toLowerCase();

            return departmentMatches && levelMatches;
        });

        studentAnnouncements.sort((a, b) => {
            const dateA = a.createdAt?.toDate
                ? a.createdAt.toDate().getTime()
                : new Date(a.createdAt || 0).getTime();

            const dateB = b.createdAt?.toDate
                ? b.createdAt.toDate().getTime()
                : new Date(b.createdAt || 0).getTime();

            return dateB - dateA;
        });

        displayStudentAnnouncements();

    } catch (error) {
        console.error("Announcements loading error:", error);
        studentAnnouncements = [];
        displayStudentAnnouncements();
    }
}

async function loadAllStudentData() {
    const tasks = [
        ["Courses", loadCourses],
        ["Enrolments", loadStudentEnrollments],
        ["Results", loadStudentResults],
        ["Certificates", loadStudentCertificates],
        ["Completed lessons", loadCompletedLessons],
        ["Announcements", loadStudentAnnouncements]
    ];

    const results = await Promise.allSettled(
        tasks.map(item => item[1]())
    );

    results.forEach((result, index) => {
        if (result.status === "rejected") {
            console.error(tasks[index][0] + " loading error:", result.reason);
        }
    });
}


// ==========================================
// STUDENT PROFILE
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
// ANNOUNCEMENTS
// ==========================================

function displayStudentAnnouncements() {
    const list = getElement("announcementsList");

    if (!list) return;

    if (studentAnnouncements.length === 0) {
        list.innerHTML = `
            <div class="announcement-empty">
                <i class="fa-solid fa-bullhorn"></i>
                <h3>No announcements yet</h3>
                <p>New announcements from LearnSphere will appear here.</p>
            </div>
        `;

        return;
    }

    list.innerHTML = studentAnnouncements.map(announcement => `
        <article class="announcement-card">

            <div class="announcement-meta">
                <span class="announcement-tag">Announcement</span>

                <span class="announcement-date">
                    ${formatDate(announcement.createdAt)}
                </span>
            </div>

            <h3>${escapeHTML(announcement.title || "LearnSphere Announcement")}</h3>

            <p>${escapeHTML(
                announcement.message || announcement.content || ""
            )}</p>

        </article>
    `).join("");
}


// ==========================================
// COURSE CARDS
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

                <h3>${escapeHTML(course.title)}</h3>

                <p>${escapeHTML(
                    course.description || "Learn new skills with this course."
                )}</p>

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


// ==========================================
// ENROLLED COURSES
// ==========================================

function loadStudentCourses() {
    const fullCourseList = getElement("studentCourseList");

    // The overviewCourseList element is optional.
    const overviewList = getElement("overviewCourseList");

    const enrolledCourses = studentEnrollments.map(enrollment =>
        getCourseById(enrollment.courseId)
    ).filter(course => course && isCoursePublished(course));

    if (enrolledCourses.length === 0) {
        const empty = displayEmptyState(
            "You have not enrolled in any courses yet. Explore available courses to get started."
        );

        if (fullCourseList) {
            fullCourseList.innerHTML = empty;
        }

        if (overviewList) {
            overviewList.innerHTML = empty;
        }

        return;
    }

    if (fullCourseList) {
        fullCourseList.innerHTML = enrolledCourses
            .map(createCourseCard)
            .join("");
    }

    if (overviewList) {
        overviewList.innerHTML = enrolledCourses
            .slice(0, 2)
            .map(createCourseCard)
            .join("");
    }
}


// ==========================================
// EXPLORE COURSES
// ==========================================

function loadExploreCourses() {
    const availableCourses = studentCourses.filter(isCoursePublished);

    setText("availableCourseCount", availableCourses.length);

    if (availableCourses.length === 0) {
        const list = getElement("exploreCourseList");

        if (list) {
            list.innerHTML = displayEmptyState(
                "No published courses are available yet."
            );
        }

        return;
    }

    displayDepartmentFilters(availableCourses);
    displayExploreCourseCards(availableCourses);
}

function displayDepartmentFilters(courses) {
    const filter = getElement("departmentFilter");

    if (!filter) return;

    const previousValue = filter.value;

    const departments = [
        ...new Set(
            courses.map(course => course.department).filter(Boolean)
        )
    ].sort();

    filter.innerHTML = `<option value="">All Departments</option>`;

    departments.forEach(department => {
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

    if (courses.length === 0) {
        list.innerHTML = displayEmptyState(
            "No courses match your search.",
            "fa-solid fa-magnifying-glass"
        );

        return;
    }

    list.innerHTML = courses.map(course => {
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

                    <h3>${escapeHTML(course.title)}</h3>

                    <p>${escapeHTML(
                        course.description ||
                        "Explore this course and develop your knowledge."
                    )}</p>

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
// COURSE SEARCH AND FILTER
// ==========================================

function filterExploreCourses() {
    const search = getElement("courseSearch");
    const department = getElement("departmentFilter");
    const level = getElement("levelFilter");

    const searchValue = search
        ? search.value.toLowerCase().trim()
        : "";

    const departmentValue = department ? department.value : "";
    const levelValue = level ? level.value : "";

    const filtered = studentCourses.filter(course => {
        if (!isCoursePublished(course)) return false;

        const title = (course.title || "").toLowerCase();
        const description = (course.description || "").toLowerCase();

        const courseDepartment = course.department || "";

        const courseLevel = String(course.level || "")
            .replace(/\s*level/i, "")
            .trim();

        const matchesSearch =
            title.includes(searchValue) ||
            description.includes(searchValue);

        const matchesDepartment =
            !departmentValue || courseDepartment === departmentValue;

        const matchesLevel =
            !levelValue || courseLevel === levelValue;

        return matchesSearch && matchesDepartment && matchesLevel;
    });

    displayExploreCourseCards(filtered);
}

const courseSearch = getElement("courseSearch");
const departmentFilter = getElement("departmentFilter");
const levelFilter = getElement("levelFilter");

if (courseSearch) {
    courseSearch.addEventListener("input", filterExploreCourses);
}

if (departmentFilter) {
    departmentFilter.addEventListener("change", filterExploreCourses);
}

if (levelFilter) {
    levelFilter.addEventListener("change", filterExploreCourses);
}


// ==========================================
// ENROL STUDENT IN COURSE
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

    button.disabled = true;
    button.textContent = "Enrolling...";

    try {
        const enrollmentData = {
            studentId: getStudentId(),
            courseId: course.id,
            courseTitle: course.title || "",
            studentName: getStudentName(),
            enrolledAt: serverTimestamp()
        };

        await addDoc(
            collection(db, "enrollments"),
            enrollmentData
        );

        await loadStudentEnrollments();

        await addStudentNotification(
            "Course Enrollment Successful",
            "You have successfully enrolled in " + course.title + ".",
            "enrollment"
        );

        loadStudentCourses();
        loadExploreCourses();
        updateDashboardStatistics();

        alert("You have successfully enrolled in " + course.title + "!");

    } catch (error) {
        console.error("Enrolment error:", error);

        alert(
            "Enrolment failed.\n\n" +
            "Error: " + (error.code || "Unknown") +
            "\nMessage: " + error.message
        );

        button.disabled = false;
        button.innerHTML =
            '<i class="fa-solid fa-plus"></i> Enrol Now';
    }
}

document.addEventListener("click", function(event) {
    const button = event.target.closest(".enrol-button");

    if (button) {
        enrolStudentInCourse(button.dataset.courseId, button);
    }
});

// ==========================================
// QUIZ RESULTS
// ==========================================

function displayStudentResults() {

    const list = getElement("studentResultList");

    if (!list) return;

    if (studentResults.length === 0) {

        list.innerHTML = displayEmptyState(
            "You have not completed any quizzes yet.",
            "fa-solid fa-chart-column"
        );

        return;
    }

    const results = [...studentResults].reverse();

    list.innerHTML = results.map(result => {

        const course = getCourseById(result.courseId);

        const title = result.courseTitle ||
            course?.title ||
            "Course";

        const isPending = result.gradingStatus === "pending";

        const answers = Array.isArray(result.answers)
            ? result.answers
            : [];

        const theoryAnswers = answers.filter(
            answer => answer.type === "theory"
        );

        const percentage = Number(result.percentage) || 0;

        let theoryHTML = "";

        if (theoryAnswers.length > 0 && !isPending) {

            theoryHTML = `
                <details class="theory-result-details">

                    <summary>
                        View Theory Marks and Feedback
                    </summary>

                    <div class="theory-result-list">

                        ${theoryAnswers.map((answer, index) => {

                            const awardedMarks = Number(
                                answer.awardedMarks || 0
                            );

                            const maximumMarks = Number(
                                answer.marks || 1
                            );

                            return `

                                <div class="theory-result-item">

                                    <h4>Question ${index + 1}</h4>

                                    <p>
                                        <strong>Question:</strong>
                                        ${escapeHTML(answer.question || "")}
                                    </p>

                                    <div>
                                        <strong>Your Answer:</strong>

                                        <p>
                                            ${escapeHTML(answer.answer || "No answer")}
                                        </p>
                                    </div>

                                    <p>
                                        <strong>Marks Awarded:</strong>
                                        ${awardedMarks}/${maximumMarks}
                                    </p>

                                    ${
                                        answer.feedback
                                        ? `
                                            <div class="theory-feedback">
                                                <strong>Instructor Feedback:</strong>

                                                <p>
                                                    ${escapeHTML(answer.feedback)}
                                                </p>
                                            </div>
                                        `
                                        : ""
                                    }

                                </div>

                            `;

                        }).join("")}

                    </div>

                </details>
            `;

        }

        return `

            <div class="result-card">

                <h3>${escapeHTML(title)}</h3>

                <p>
                    <strong>Quiz:</strong>
                    ${escapeHTML(result.quizTitle || "Course Quiz")}
                </p>

                ${
                    isPending
                    ? `
                        <div class="result-pending">

                            <strong>Result Pending</strong>

                            <p>
                                Your Theory answers have been submitted
                                and are waiting for marking.
                            </p>

                        </div>
                    `
                    : `
                        <div class="result-details">

                            <span>
                                Score:
                                ${escapeHTML(result.score ?? 0)}
                                /
                                ${escapeHTML(result.totalMarks ?? result.totalQuestions ?? 0)}
                            </span>

                            <span class="result-score">
                                ${percentage}%
                            </span>

                            <span>
                                Status:
                                ${result.passed ? "Passed" : "Not passed"}
                            </span>

                        </div>

                        ${theoryHTML}
                    `
                }

                <p>
                    Date:
                    ${formatDate(result.submittedAt || result.date)}
                </p>

            </div>

        `;

    }).join("");

}
// ==========================================
// CERTIFICATES
// ==========================================

function displayStudentCertificates() {
    const list = getElement("studentCertificateList");

    if (!list) return;

    if (studentCertificates.length === 0) {
        list.innerHTML = displayEmptyState(
            "You have not earned any certificates yet.",
            "fa-solid fa-certificate"
        );

        return;
    }

    list.innerHTML = studentCertificates.map(certificate => `
        <div class="certificate-card">

            <div class="certificate-icon">
                <i class="fa-solid fa-award"></i>
            </div>

            <h3>${escapeHTML(
                certificate.courseTitle || "Completed Course"
            )}</h3>

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
    `).join("");
}

document.addEventListener("click", function(event) {
    const button = event.target.closest(".download-btn");

    if (button) {
        downloadCertificate(button.dataset.certificateId);
    }
});


// ==========================================
// DOWNLOAD CERTIFICATE PDF
// ==========================================

function downloadCertificate(certificateId) {
    const certificate = studentCertificates.find(item =>
        String(item.id) === String(certificateId)
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

    const studentName = certificate.studentName || getStudentName();
    const courseTitle = certificate.courseTitle || "Completed Course";
    const certificateNumber = certificate.certificateId || certificate.id;
    const score = certificate.percentage ?? 0;

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

    pdf.text("CERTIFICATE OF COMPLETION", 148.5, 63, {
        align: "center"
    });

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

    pdf.text(
        "Date Issued: " + formatDate(certificate.issuedAt),
        35,
        178
    );

    pdf.text(
        "Certificate ID: " + certificateNumber,
        35,
        186
    );

    pdf.setDrawColor(21, 128, 61);
    pdf.line(207, 177, 262, 177);

    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(30, 41, 59);

    pdf.text("LearnSphere", 234.5, 184, {
        align: "center"
    });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);

    pdf.text("Founder, LearnSphere", 234.5, 190, {
        align: "center"
    });
    // GENERATE CERTIFICATE VERIFICATION QR CODE

const verificationURL =
    "https://learnsphere-ng.vercel.app/verify-certificate.html?id=" +
    encodeURIComponent(certificateNumber);

const qrContainer = document.createElement("div");

new QRCode(qrContainer, {
    text: verificationURL,
    width: 150,
    height: 150,
    correctLevel: QRCode.CorrectLevel.M
});

const qrCanvas = qrContainer.querySelector("canvas");

if (qrCanvas) {
    const qrImage = qrCanvas.toDataURL("image/png");

    pdf.addImage(
        qrImage,
        "PNG",
        20,
        22,
        25,
        25
    );

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(71, 85, 105);

    pdf.text("Scan to verify", 32.5, 51, {
        align: "center"
    });
}

    const safeName = studentName.replace(/[^a-z0-9]/gi, "_");

    pdf.save("LearnSphere_Certificate_" + safeName + ".pdf");
}


// ==========================================
// DASHBOARD STATISTICS
// ==========================================

function updateDashboardStatistics() {
    const studentId = getStudentId();

    const currentResults = studentResults.filter(result =>
        String(result.studentId) === studentId
    );

    const currentCertificates = studentCertificates.filter(certificate =>
        String(certificate.studentId) === studentId
    );

    const currentLessons = completedLessons.filter(lesson =>
        String(lesson.studentId) === studentId
    );

    setText("enrolledCourses", studentEnrollments.length);
    setText("completedLessons", currentLessons.length);
    setText("completedQuizzes", currentResults.length);
    setText("earnedCertificates", currentCertificates.length);

    const totalLessons = currentLessons.length;
    const totalCourses = studentEnrollments.length;

    const progress = totalCourses > 0
        ? Math.round((totalLessons / (totalCourses * 10)) * 100)
        : 0;

    const safeProgress = Math.min(progress, 100);

    setText("overallProgressText", safeProgress + "%");
    setText("overallProgressDetails", totalLessons + " lessons completed");

    const progressBar = getElement("overallProgressBar");

    if (progressBar) {
        progressBar.style.width = safeProgress + "%";
    }

    setText("weeklyGoalText", totalLessons + " lessons completed");

    const weeklyBar = getElement("weeklyGoalProgress");

    if (weeklyBar) {
        weeklyBar.style.width = Math.min(totalLessons * 10, 100) + "%";
    }
}


// ==========================================
// LOGOUT
// ==========================================

const logoutButton = getElement("logoutBtn");

if (logoutButton) {
    logoutButton.addEventListener("click", async function() {
        const confirmLogout = confirm(
            "Are you sure you want to log out?"
        );

        if (!confirmLogout) return;

        try {
            await signOut(auth);
            window.location.href = "auth.html?mode=student";

        } catch (error) {
            console.error("Logout error:", error);
            alert("Unable to log out. Please try again.");
        }
    });
}
// ==========================================
// MY STUDY NOTES - FIREBASE
// ==========================================

let studentNotes = [];
let editingNoteId = null;

const addNoteBtn = getElement("addNoteBtn");
const noteForm = getElement("noteForm");
const noteTitle = getElement("noteTitle");
const noteContent = getElement("noteContent");
const saveNoteBtn = getElement("saveNoteBtn");
const cancelNoteBtn = getElement("cancelNoteBtn");
const notesContainer = getElement("notesContainer");
const searchNotes = getElement("searchNotes");


// LOAD STUDENT NOTES

async function loadStudentNotes() {

    if (!currentStudent) return;

    try {

        const notesQuery = query(
            collection(db, "studentNotes"),
            where("studentId", "==", getStudentId())
        );

        const snapshot = await getDocs(notesQuery);

        studentNotes = snapshot.docs.map(note => ({
            id: note.id,
            ...note.data()
        }));

        studentNotes.sort((a, b) => {
            const dateA = a.createdAt?.toMillis?.() || 0;
            const dateB = b.createdAt?.toMillis?.() || 0;

            return dateB - dateA;
        });

        displayStudentNotes();

    } catch (error) {

        console.error("Notes loading error:", error);

        notesContainer.innerHTML =
            displayEmptyState("Unable to load your notes.");

    }
}


// DISPLAY NOTES

function displayStudentNotes(searchTerm = "") {

    if (!notesContainer) return;

    const filteredNotes = studentNotes.filter(note =>
        (note.title || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (note.content || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (filteredNotes.length === 0) {

        notesContainer.innerHTML =
            displayEmptyState("No study notes found.", "fas fa-sticky-note");

        return;
    }

    notesContainer.innerHTML = filteredNotes.map(note => `

        <div class="note-card">

            <h3>${escapeHTML(note.title)}</h3>

            <p>${escapeHTML(note.content).replace(/\n/g, "<br>")}</p>

            <small>Created: ${formatDate(note.createdAt)}</small>

            <div class="note-actions">

                <button onclick="editStudentNote('${note.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>

                <button onclick="deleteStudentNote('${note.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>

            </div>

        </div>

    `).join("");

}


// OPEN NOTE FORM

if (addNoteBtn) {

    addNoteBtn.addEventListener("click", function() {

        editingNoteId = null;

        noteTitle.value = "";
        noteContent.value = "";

        saveNoteBtn.textContent = "Save Note";

        noteForm.style.display = "block";

        noteTitle.focus();

    });

}


// CANCEL NOTE FORM

if (cancelNoteBtn) {

    cancelNoteBtn.addEventListener("click", function() {

        noteForm.style.display = "none";

        noteTitle.value = "";
        noteContent.value = "";

        editingNoteId = null;

    });

}


// SAVE OR UPDATE NOTE

if (saveNoteBtn) {

    saveNoteBtn.addEventListener("click", async function() {

        const title = noteTitle.value.trim();
        const content = noteContent.value.trim();

        if (!title || !content) {

            alert("Please enter both a note title and content.");

            return;
        }

        saveNoteBtn.disabled = true;

        try {

            if (editingNoteId) {

                await updateDoc(
                    doc(db, "studentNotes", editingNoteId),
                    {
                        title: title,
                        content: content,
                        updatedAt: serverTimestamp()
                    }
                );

                alert("Note updated successfully!");

            } else {

                await addDoc(
                    collection(db, "studentNotes"),
                    {
                        studentId: getStudentId(),
                        title: title,
                        content: content,
                        createdAt: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    }
                );

                alert("Note saved successfully!");

            }

            noteForm.style.display = "none";

            noteTitle.value = "";
            noteContent.value = "";

            editingNoteId = null;

            await loadStudentNotes();

        } catch (error) {

            console.error("Note saving error:", error);

            alert("Unable to save note: " + error.message);

        } finally {

            saveNoteBtn.disabled = false;

        }

    });

}


// EDIT NOTE

window.editStudentNote = function(noteId) {

    const note = studentNotes.find(item => item.id === noteId);

    if (!note) return;

    editingNoteId = noteId;

    noteTitle.value = note.title;
    noteContent.value = note.content;

    saveNoteBtn.textContent = "Update Note";

    noteForm.style.display = "block";

    noteTitle.focus();

};


// DELETE NOTE

window.deleteStudentNote = async function(noteId) {

    const confirmed = confirm("Are you sure you want to delete this note?");

    if (!confirmed) return;

    try {

        await deleteDoc(doc(db, "studentNotes", noteId));

        alert("Note deleted successfully!");

        await loadStudentNotes();

    } catch (error) {

        console.error("Note deletion error:", error);

        alert("Unable to delete note: " + error.message);

    }

};


// SEARCH NOTES

if (searchNotes) {

    searchNotes.addEventListener("input", function() {

        displayStudentNotes(this.value.trim());

    });

}

// ==========================================
// LOAD DASHBOARD
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
}


// ==========================================
// FIREBASE AUTHENTICATION
// ==========================================

onAuthStateChanged(auth, async function(user) {
    if (!user) {
        window.location.href = "auth.html?mode=student";
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

    const courseList = getElement("studentCourseList");
    const exploreList = getElement("exploreCourseList");

    if (courseList) {
        courseList.innerHTML = "<p>Loading your courses...</p>";
    }

    if (exploreList) {
        exploreList.innerHTML = "<p>Loading available courses...</p>";
    }

    try {
        const studentRef = doc(db, "students", user.uid);
        const studentSnapshot = await getDoc(studentRef);

        if (!studentSnapshot.exists()) {
            alert("Student profile not found.");
            await signOut(auth);
            window.location.href = "auth.html?mode=student";
            return;
        }

        const studentData = studentSnapshot.data();

        if (studentData.role !== "student") {
            alert("You do not have student access.");
            await signOut(auth);
            window.location.href = "auth.html?mode=student";
            return;
        }

        currentStudent = {
            uid: user.uid,
            fullName: studentData.fullName || user.displayName || "Student",
            email: studentData.email || user.email || "",
            university: studentData.university || "",
            department: studentData.department || "",
            level: studentData.level || ""
        };

        loadStudentInformation();

        await loadAllStudentData();

        await loadStudentNotifications();
        await loadStudentNotes();

        await checkForNewStudentActivity();

        loadDashboard();

        console.log("LearnSphere student dashboard loaded successfully.");

    } catch (error) {
        console.error("Dashboard loading error:", error);

        alert(
            "Unable to load your dashboard.\n\n" +
            error.message
        );
    }
});


// ==========================================
// CURRENT YEAR
// ==========================================

setText("currentYear", new Date().getFullYear());


// ==========================================
// END OF STUDENT DASHBOARD
// ==========================================
// =====================================
// LIGHT AND DARK THEME SYSTEM
// =====================================

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const themeText = document.getElementById("themeText");

// UPDATE THEME BUTTON
function updateThemeButton() {

    const isDark = document.body.classList.contains("dark-theme");

    if (isDark) {
        themeIcon.className = "fas fa-sun";
        themeText.textContent = "Light Mode";
    } else {
        themeIcon.className = "fas fa-moon";
        themeText.textContent = "Dark Mode";
    }

}

// SWITCH THEME
themeToggle.addEventListener("click", function () {

    document.body.classList.toggle("dark-theme");

    updateThemeButton();

});

// INITIAL BUTTON STATE
updateThemeButton();
// ==========================================
// LEARNSPHERE AI - COMPLETE CHAT SYSTEM
// ==========================================

// DOM ELEMENTS
const aiChatForm = document.getElementById("aiChatForm");
const aiUserInput = document.getElementById("aiUserInput");
const aiMessages = document.getElementById("aiMessages");
const clearAIChat = document.getElementById("clearAIChat");
const aiSendButton = document.getElementById("aiSendButton");

// CONVERSATION HISTORY
let aiConversationHistory = [];


// ==========================================
// DISPLAY AI MESSAGE
// ==========================================

function displayAIMessage(message, sender) {

    const messageDiv = document.createElement("div");

    messageDiv.className = `ai-message ${sender}-message`;

    const messageText = document.createElement("p");

    messageText.textContent = message;

    messageDiv.appendChild(messageText);

    aiMessages.appendChild(messageDiv);

    aiMessages.scrollTop = aiMessages.scrollHeight;
}


// ==========================================
// REMOVE WELCOME MESSAGE
// ==========================================

function removeAIWelcomeMessage() {

    const welcomeMessage = aiMessages.querySelector(
        ".ai-welcome-message"
    );

    if (welcomeMessage) {
        welcomeMessage.remove();
    }
}


// ==========================================
// SHOW WELCOME MESSAGE
// ==========================================

function showAIWelcomeMessage() {

    aiMessages.innerHTML = `
        <div class="ai-welcome-message">

            <div class="ai-welcome-icon">
                <i class="fas fa-robot"></i>
            </div>

            <h2>Hello, welcome to LearnSphere AI!</h2>

            <p>
                I'm here to make learning easier.
                What would you like to learn today?
            </p>

        </div>
    `;
}


// ==========================================
// SHOW LOADING MESSAGE
// ==========================================

function showAILoading() {

    const loadingDiv = document.createElement("div");

    loadingDiv.className = "ai-message assistant-message";

    loadingDiv.id = "aiLoadingMessage";

    loadingDiv.innerHTML = `
        <p>
            <i class="fas fa-circle-notch fa-spin"></i>
            LearnSphere AI is thinking...
        </p>
    `;

    aiMessages.appendChild(loadingDiv);

    aiMessages.scrollTop = aiMessages.scrollHeight;
}


// ==========================================
// REMOVE LOADING MESSAGE
// ==========================================

function removeAILoading() {

    const loadingMessage = document.getElementById(
        "aiLoadingMessage"
    );

    if (loadingMessage) {
        loadingMessage.remove();
    }
}


// ==========================================
// SEND MESSAGE TO GEMINI AI
// ==========================================

async function sendAIMessage(message) {

    const cleanMessage = message.trim();

    if (!cleanMessage) return;

    if (aiSendButton.disabled) return;

    // Remove welcome screen
    removeAIWelcomeMessage();

    // Display student's message
    displayAIMessage(cleanMessage, "user");

    // Clear input
    aiUserInput.value = "";

    // Disable send button
    aiSendButton.disabled = true;

    // Show loading animation
    showAILoading();

    try {

        // Connect to LearnSphere backend
        const response = await fetch("/api/chat", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                message: cleanMessage,

                history: aiConversationHistory

            })

        });


       const responseText = await response.text();

let data = {};

try {
    data = responseText ? JSON.parse(responseText) : {};
} catch (error) {
    console.error("Invalid API response:", responseText);
    throw new Error(
        `Server returned an invalid response. HTTP status: ${response.status}`
    );
}

if (!response.ok) {
    throw new Error(
        data.error || `Server error: ${response.status}`
    );
}

if (!data.reply) {
    throw new Error("The AI server returned an empty response.");
}

        // Remove loading animation
        removeAILoading();


        // Check for errors
        if (!response.ok) {

            throw new Error(
                data.error || "Unable to get an AI response."
            );

        }


        // Display AI response
        displayAIMessage(data.reply, "assistant");


        // Save conversation history
        aiConversationHistory.push(

            {
                role: "user",
                text: cleanMessage
            },

            {
                role: "model",
                text: data.reply
            }

        );


        // Keep only the latest 12 messages
        aiConversationHistory = aiConversationHistory.slice(-12);


    } catch (error) {

        removeAILoading();

        console.error("LearnSphere AI Error:", error);


        displayAIMessage(

            error.message ||
            "Something went wrong. Please try again.",

            "assistant"

        );

    } finally {

        // Enable send button again
        aiSendButton.disabled = false;

        aiUserInput.focus();

    }

}


// ==========================================
// CHAT FORM SUBMISSION
// ==========================================

if (aiChatForm) {

    aiChatForm.addEventListener("submit", function (event) {

        event.preventDefault();

        sendAIMessage(aiUserInput.value);

    });

}


// ==========================================
// ENTER KEY TO SEND MESSAGE
// ==========================================

if (aiUserInput) {

    aiUserInput.addEventListener("keydown", function (event) {

        if (
            event.key === "Enter" &&
            !event.shiftKey
        ) {

            event.preventDefault();

            if (aiChatForm) {
                aiChatForm.requestSubmit();
            }

        }

    });

}


// ==========================================
// AI SUGGESTION BUTTONS
// ==========================================

document.querySelectorAll(".ai-suggestion").forEach(function (button) {

    button.addEventListener("click", function () {

        sendAIMessage(this.textContent);

    });

});


// ==========================================
// CLEAR CHAT
// ==========================================

if (clearAIChat) {

    clearAIChat.addEventListener("click", function () {

        // Clear conversation history
        aiConversationHistory = [];

        // Restore welcome screen
        showAIWelcomeMessage();

        // Clear input
        aiUserInput.value = "";

    });

}


// ==========================================
// LEARNSPHERE AI INITIALIZATION
// ==========================================

console.log("LearnSphere AI initialized successfully.");