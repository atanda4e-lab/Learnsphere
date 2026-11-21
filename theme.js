// ======================================
// LEARNSPHERE FIREBASE THEME SYSTEM
// ======================================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

const themeToggle = document.getElementById("themeToggle");

let currentUser = null;


// ======================================
// APPLY THEME
// ======================================

function applyTheme(theme) {

    document.body.classList.toggle("dark-mode", theme === "dark");

    localStorage.setItem("learnSphereTheme", theme);

    updateThemeIcon();
}


// ======================================
// UPDATE BUTTON ICON
// ======================================

function updateThemeIcon() {

    if (!themeToggle) return;

    const icon = themeToggle.querySelector("i");

    if (!icon) return;

    if (document.body.classList.contains("dark-mode")) {

        icon.className = "fa-solid fa-sun";

        themeToggle.setAttribute("aria-label", "Switch to light mode");

    } else {

        icon.className = "fa-solid fa-moon";

        themeToggle.setAttribute("aria-label", "Switch to dark mode");

    }
}


// ======================================
// LOAD USER THEME FROM FIRESTORE
// ======================================

onAuthStateChanged(auth, async (user) => {

    currentUser = user;

    if (user) {

        try {

            const preferenceRef = doc(db, "userPreferences", user.uid);

            const preferenceSnap = await getDoc(preferenceRef);

            if (preferenceSnap.exists()) {

                const savedTheme = preferenceSnap.data().theme;

                applyTheme(savedTheme);

            } else {

                applyTheme(
                    localStorage.getItem("learnSphereTheme") || "light"
                );

            }

        } catch (error) {

            console.error("Unable to load theme:", error);

            applyTheme(
                localStorage.getItem("learnSphereTheme") || "light"
            );

        }

    } else {

        applyTheme(
            localStorage.getItem("learnSphereTheme") || "light"
        );

    }

});


// ======================================
// SAVE THEME TO FIRESTORE
// ======================================

if (themeToggle) {

    themeToggle.addEventListener("click", async () => {

        const newTheme = document.body.classList.contains("dark-mode")
            ? "light"
            : "dark";

        applyTheme(newTheme);

        if (currentUser) {

            try {

                await setDoc(
                    doc(db, "userPreferences", currentUser.uid),
                    {
                        theme: newTheme
                    },
                    { merge: true }
                );

            } catch (error) {

                console.error("Unable to save theme:", error);

            }

        }

    });

}