// ========================================
// LEARNSPHERE COURSE REVIEWS
// FIREBASE VERSION
// ========================================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    collection,
    doc,
    getDoc,
    getDocs,
    query,
    where,
    setDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ========================================
// 1. GET COURSE ID
// ========================================

const urlParams = new URLSearchParams(window.location.search);

const courseId = urlParams.get("id");


// ========================================
// 2. HTML ELEMENTS
// ========================================

const reviewForm = document.getElementById("reviewForm");

const reviewText = document.getElementById("reviewText");

const starRating = document.getElementById("starRating");

const ratingText = document.getElementById("ratingText");

const reviewMessage = document.getElementById("reviewMessage");

const reviewsList = document.getElementById("reviewsList");

const averageRating = document.getElementById("averageRating");

const averageStars = document.getElementById("averageStars");

const totalReviews = document.getElementById("totalReviews");

const reviewCharacterCount = document.getElementById("reviewCharacterCount");

const submitReviewBtn = document.getElementById("submitReviewBtn");


// ========================================
// 3. VARIABLES
// ========================================

let currentStudent = null;

let selectedRating = 0;

let reviewStars = [];


// ========================================
// 4. CHECK REQUIRED ELEMENTS
// ========================================

if (
    !courseId ||
    !reviewForm ||
    !reviewText ||
    !starRating ||
    !reviewsList
) {
    console.error("Course review elements could not be found.");
} else {

    reviewStars = starRating.querySelectorAll(".rating-star");

    initializeReviews();

}


// ========================================
// 5. INITIALIZE REVIEWS
// ========================================

function initializeReviews() {

    // Character counter

    reviewText.addEventListener("input", function () {

        reviewCharacterCount.textContent =
            `${reviewText.value.length} / 1000`;

    });


    // Star selection

    reviewStars.forEach(function (star) {

        star.addEventListener("click", function () {

            selectedRating = Number(star.dataset.rating);

            updateStarDisplay();

        });

    });


    // Review form submission

    reviewForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        await submitReview();

    });


    // Check login

    onAuthStateChanged(auth, async function (user) {

        if (!user) {

            currentStudent = null;

            reviewMessage.textContent =
                "Please log in as a student to submit a review.";

            reviewMessage.style.color = "#dc2626";

            await loadReviews();

            return;

        }

        try {

            const studentRef = doc(db, "students", user.uid);

            const studentSnapshot = await getDoc(studentRef);

            if (
                !studentSnapshot.exists() ||
                studentSnapshot.data().role !== "student"
            ) {

                currentStudent = null;

                reviewMessage.textContent =
                    "Only registered students can submit course reviews.";

                reviewMessage.style.color = "#dc2626";

                await loadReviews();

                return;

            }

            currentStudent = {
                uid: user.uid,
                name: studentSnapshot.data().fullName || "LearnSphere Student"
            };

            await loadReviews();

        } catch (error) {

            console.error("Student verification error:", error);

            reviewMessage.textContent =
                "Unable to verify your student account.";

            reviewMessage.style.color = "#dc2626";

        }

    });

}


// ========================================
// 6. UPDATE STAR DISPLAY
// ========================================

function updateStarDisplay() {

    reviewStars.forEach(function (star) {

        const rating = Number(star.dataset.rating);

        if (rating <= selectedRating) {

            star.classList.add("active");

        } else {

            star.classList.remove("active");

        }

    });


    const ratingLabels = {

        1: "Poor",
        2: "Fair",
        3: "Good",
        4: "Very Good",
        5: "Excellent"

    };

    ratingText.textContent =
        ratingLabels[selectedRating] || "Select your rating";

}


// ========================================
// 7. SUBMIT REVIEW
// ========================================

async function submitReview() {

    if (!currentStudent) {

        showReviewMessage(
            "Please log in with your student account first.",
            "error"
        );

        return;

    }


    if (selectedRating < 1 || selectedRating > 5) {

        showReviewMessage(
            "Please select a star rating.",
            "error"
        );

        return;

    }


    const review = reviewText.value.trim();

    if (review.length < 5) {

        showReviewMessage(
            "Your review must contain at least 5 characters.",
            "error"
        );

        return;

    }


    if (review.length > 1000) {

        showReviewMessage(
            "Your review cannot exceed 1000 characters.",
            "error"
        );

        return;

    }


    submitReviewBtn.disabled = true;

    submitReviewBtn.textContent = "Submitting...";


    try {

        // One review per student per course

        const reviewId = `${courseId}_${currentStudent.uid}`;

        const reviewRef = doc(db, "courseReviews", reviewId);

        const existingReview = await getDoc(reviewRef);


        if (existingReview.exists()) {

            // Update existing review

            await setDoc(reviewRef, {

                rating: selectedRating,

                text: review,

                updatedAt: serverTimestamp()

            }, {

                merge: true

            });

        } else {

            // Create new review

            await setDoc(reviewRef, {

                courseId: courseId,

                studentId: currentStudent.uid,

                studentName: currentStudent.name,

                rating: selectedRating,

                text: review,

                createdAt: serverTimestamp(),

                updatedAt: serverTimestamp()

            });

        }


        showReviewMessage(
            "Your review has been submitted successfully!",
            "success"
        );


        reviewText.value = "";

        selectedRating = 0;

        updateStarDisplay();

        reviewCharacterCount.textContent = "0 / 1000";


        await loadReviews();


    } catch (error) {

        console.error("Review submission error:", error);

        showReviewMessage(
            "Unable to submit your review. Please try again.",
            "error"
        );

    } finally {

        submitReviewBtn.disabled = false;

        submitReviewBtn.innerHTML =
            '<i class="fa-solid fa-paper-plane"></i> Submit Review';

    }

}


// ========================================
// 8. LOAD COURSE REVIEWS
// ========================================

async function loadReviews() {

    try {

        const reviewsQuery = query(

            collection(db, "courseReviews"),

            where("courseId", "==", courseId)

        );


        const snapshot = await getDocs(reviewsQuery);

        const reviews = [];


        snapshot.forEach(function (documentSnapshot) {

            reviews.push({

                id: documentSnapshot.id,

                ...documentSnapshot.data()

            });

        });


        // Sort newest first

        reviews.sort(function (a, b) {

            const dateA = a.createdAt?.toMillis?.() || 0;

            const dateB = b.createdAt?.toMillis?.() || 0;

            return dateB - dateA;

        });


        displayReviews(reviews);

        updateRatingSummary(reviews);


    } catch (error) {

        console.error("Loading reviews error:", error);

        reviewsList.innerHTML = `
            <p class="no-reviews">
                Unable to load reviews at the moment.
            </p>
        `;

    }

}


// ========================================
// 9. DISPLAY REVIEWS
// ========================================

function displayReviews(reviews) {

    if (reviews.length === 0) {

        reviewsList.innerHTML = `
            <p class="no-reviews">
                No reviews yet. Be the first to review this course!
            </p>
        `;

        return;

    }


    reviewsList.innerHTML = "";


    reviews.forEach(function (review) {

        const reviewCard = document.createElement("div");

        reviewCard.className = "review-card";


        const name = escapeHTML(
            review.studentName || "LearnSphere Student"
        );

        const text = escapeHTML(review.text || "");

        const rating = Math.max(
            0,
            Math.min(5, Number(review.rating) || 0)
        );

        const stars = "★".repeat(rating) + "☆".repeat(5 - rating);


        const date = review.createdAt?.toDate
            ? review.createdAt.toDate().toLocaleDateString()
            : "Recently";


        reviewCard.innerHTML = `

            <div class="review-card-header">

                <div class="review-student">

                    <h4>${name}</h4>

                    <span>${date}</span>

                </div>

                <div class="review-card-stars">
                    ${stars}
                </div>

            </div>

            <p class="review-card-text">
                ${text}
            </p>

        `;


        reviewsList.appendChild(reviewCard);

    });

}


// ========================================
// 10. UPDATE RATING SUMMARY
// ========================================

function updateRatingSummary(reviews) {

    const count = reviews.length;


    totalReviews.textContent =
        `${count} ${count === 1 ? "review" : "reviews"}`;


    if (count === 0) {

        averageRating.textContent = "0.0";

        averageStars.textContent = "☆☆☆☆☆";

        return;

    }


    let totalRating = 0;


    reviews.forEach(function (review) {

        totalRating += Number(review.rating) || 0;

    });


    const average = totalRating / count;


    averageRating.textContent = average.toFixed(1);


    const roundedAverage = Math.round(average);

    averageStars.textContent =
        "★".repeat(roundedAverage) +
        "☆".repeat(5 - roundedAverage);

}


// ========================================
// 11. REVIEW MESSAGE
// ========================================

function showReviewMessage(message, type) {

    reviewMessage.textContent = message;

    if (type === "success") {

        reviewMessage.style.color = "#16a34a";

    } else {

        reviewMessage.style.color = "#dc2626";

    }

}


// ========================================
// 12. ESCAPE HTML
// ========================================

function escapeHTML(value) {

    return String(value).replace(/[&<>"']/g, function (character) {

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