// ================================================
// LEARNSPHERE
// PUBLIC CERTIFICATE VERIFICATION SYSTEM
// ================================================


// ================================================
// FIREBASE IMPORTS
// ================================================

import { db } from "./firebase.js";

import {
    doc,
    getDocFromServer
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ================================================
// DOM ELEMENTS
// ================================================

const verificationForm = document.getElementById("verificationForm");

const certificateInput = document.getElementById("certificateId");

const verifyButton = document.getElementById("verifyButton");

const verificationMessage = document.getElementById("verificationMessage");

const certificateDetails = document.getElementById("certificateDetails");

const studentName = document.getElementById("studentName");

const courseTitle = document.getElementById("courseTitle");

const percentage = document.getElementById("percentage");

const displayCertificateId = document.getElementById("displayCertificateId");

const issueDate = document.getElementById("issueDate");


// ================================================
// COLLECTION NAME
// ================================================

const CERTIFICATE_COLLECTION = "certificateVerifications";


// ================================================
// CHECK REQUIRED HTML ELEMENTS
// ================================================

const requiredElements = [
    verificationForm,
    certificateInput,
    verifyButton,
    verificationMessage,
    certificateDetails,
    studentName,
    courseTitle,
    percentage,
    displayCertificateId,
    issueDate
];

if (requiredElements.some(element => !element)) {

    console.error(
        "Certificate verification error: Required HTML elements are missing."
    );

}


// ================================================
// SHOW MESSAGE
// ================================================

function showMessage(message, type = "") {

    if (!verificationMessage) {
        return;
    }

    verificationMessage.textContent = message;

    verificationMessage.className = type;

}


// ================================================
// RESET CERTIFICATE DETAILS
// ================================================

function resetCertificateDetails() {

    if (!certificateDetails) {
        return;
    }

    certificateDetails.classList.add("hidden");

    studentName.textContent = "";

    courseTitle.textContent = "";

    percentage.textContent = "";

    displayCertificateId.textContent = "";

    issueDate.textContent = "";

}


// ================================================
// FORMAT DATE
// ================================================

function formatIssueDate(timestamp) {

    if (!timestamp) {
        return "Not available";
    }

    let date;

    try {

        // Firestore Timestamp
        if (typeof timestamp.toDate === "function") {

            date = timestamp.toDate();

        }

        // Timestamp stored as seconds
        else if (
            typeof timestamp === "object" &&
            timestamp.seconds !== undefined
        ) {

            date = new Date(timestamp.seconds * 1000);

        }

        // JavaScript Date or date string
        else {

            date = new Date(timestamp);

        }

    } catch (error) {

        console.error(
            "Date formatting error:",
            error
        );

        return "Not available";

    }

    if (isNaN(date.getTime())) {

        return "Not available";

    }

    return date.toLocaleDateString("en-GB", {

        day: "numeric",

        month: "long",

        year: "numeric"

    });

}


// ================================================
// FORMAT PERCENTAGE
// ================================================

function formatPercentage(value) {

    if (
        value === undefined ||
        value === null ||
        value === ""
    ) {

        return "Not available";

    }

    const number = Number(value);

    if (!Number.isFinite(number)) {

        return "Not available";

    }

    return `${number}%`;

}


// ================================================
// CHECK CERTIFICATE REVOCATION
// ================================================

function isCertificateRevoked(certificate) {

    const status = String(
        certificate.status || ""
    ).toLowerCase();

    return (

        certificate.revoked === true ||

        certificate.isRevoked === true ||

        status === "revoked" ||

        status === "cancelled" ||

        status === "canceled"

    );

}


// ================================================
// DISPLAY CERTIFICATE
// ================================================

function displayCertificate(certificate, certificateId) {

    studentName.textContent =

        certificate.studentName ||

        certificate.fullName ||

        certificate.name ||

        "Not available";


    courseTitle.textContent =

        certificate.courseTitle ||

        certificate.courseName ||

        certificate.title ||

        "Not available";


    percentage.textContent = formatPercentage(

        certificate.percentage ??

        certificate.score ??

        certificate.finalScore

    );


    displayCertificateId.textContent =

        certificate.certificateId ||

        certificateId;


    issueDate.textContent = formatIssueDate(

        certificate.issuedAt ||

        certificate.issueDate ||

        certificate.createdAt ||

        certificate.generatedAt

    );


    certificateDetails.classList.remove("hidden");

}


// ================================================
// GET CERTIFICATE FROM FIRESTORE
// ================================================

async function findCertificate(certificateId) {

    console.log(
        "Checking certificate collection:",
        CERTIFICATE_COLLECTION
    );


    // The certificate ID must also be the document ID.
    const certificateReference = doc(

        db,

        CERTIFICATE_COLLECTION,

        certificateId

    );


    console.log(
        "Firestore document path:",
        certificateReference.path
    );


    // Only retrieve this exact document.
    // No public collection queries are performed.
    const certificateSnapshot = await getDocFromServer(
        certificateReference
    );


    console.log(
        "Certificate document exists:",
        certificateSnapshot.exists()
    );


    if (!certificateSnapshot.exists()) {

        return null;

    }


    const certificate = certificateSnapshot.data();


    console.log(
        "Retrieved certificate:",
        certificate
    );


    // Confirm the stored ID matches the requested ID.
    if (
        certificate.certificateId &&
        certificate.certificateId !== certificateId
    ) {

        throw new Error(
            "The stored certificate ID does not match the requested ID."
        );

    }


    return {

        ...certificate,

        certificateId:
            certificate.certificateId || certificateId

    };

}


// ================================================
// VERIFY CERTIFICATE
// ================================================

async function verifyCertificate(certificateId) {

    resetCertificateDetails();

    showMessage("");


    // ============================================
    // VALIDATE INPUT
    // ============================================

    if (!certificateId) {

        showMessage(

            "Please enter a Certificate ID.",

            "error-message"

        );

        return;

    }


    // ============================================
    // PREVENT EMPTY SPACES
    // ============================================

    certificateId = certificateId.trim();


    // ============================================
    // LOADING STATE
    // ============================================

    verifyButton.disabled = true;

    verifyButton.innerHTML =

        '<i class="fa-solid fa-spinner fa-spin"></i> Verifying...';


    try {

        console.log(
            "================================="
        );

        console.log(
            "LEARNSPHERE CERTIFICATE CHECK"
        );

        console.log(
            "Certificate ID:",
            certificateId
        );

        console.log(
            "================================="
        );


        // ========================================
        // GET CERTIFICATE
        // ========================================

        const certificate = await findCertificate(
            certificateId
        );


        // ========================================
        // CERTIFICATE NOT FOUND
        // ========================================

        if (!certificate) {

            showMessage(

                "Certificate not found. Please check the Certificate ID and try again.",

                "error-message"

            );

            console.warn(
                "No public verification record exists for:",
                certificateId
            );

            return;

        }


        // ========================================
        // CHECK REVOCATION
        // ========================================

        if (isCertificateRevoked(certificate)) {

            showMessage(

                "This certificate has been revoked and is no longer valid.",

                "error-message"

            );

            return;

        }


        // ========================================
        // DISPLAY CERTIFICATE
        // ========================================

        displayCertificate(
            certificate,
            certificateId
        );


        // ========================================
        // SUCCESS MESSAGE
        // ========================================

        showMessage(

            "This is a valid LearnSphere certificate.",

            "success-message"

        );


        console.log(
            "Certificate verification successful."
        );


    } catch (error) {

        console.error(
            "Certificate verification error:",
            error
        );


        // ========================================
        // PERMISSION ERROR
        // ========================================

        if (
            error.code === "permission-denied" ||
            error.code === "unauthenticated"
        ) {

            showMessage(

                "Certificate verification is currently unavailable because Firestore access was denied.",

                "error-message"

            );

        }


        // ========================================
        // NETWORK ERROR
        // ========================================

        else if (

            error.code === "unavailable" ||

            error.code === "deadline-exceeded"

        ) {

            showMessage(

                "Connection problem. Please check your internet connection and try again.",

                "error-message"

            );

        }


        // ========================================
        // OTHER ERRORS
        // ========================================

        else {

            showMessage(

                "An error occurred while verifying this certificate. Please try again.",

                "error-message"

            );

        }

    } finally {

        // ========================================
        // RESTORE BUTTON
        // ========================================

        verifyButton.disabled = false;

        verifyButton.innerHTML =

            '<i class="fa-solid fa-shield-check"></i> Verify Certificate';

    }

}


// ================================================
// FORM SUBMISSION
// ================================================

if (verificationForm) {

    verificationForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();

            const certificateId = certificateInput.value.trim();

            verifyCertificate(certificateId);

        }
    );

}


// ================================================
// INPUT CHANGE
// ================================================

if (certificateInput) {

    certificateInput.addEventListener(
        "input",
        function () {

            resetCertificateDetails();

            showMessage("");

        }
    );

}


// ================================================
// AUTOMATIC VERIFICATION FROM URL
// ================================================

const urlParameters = new URLSearchParams(
    window.location.search
);

const certificateFromURL = urlParameters.get("id");


if (certificateFromURL && certificateInput) {

    const certificateId = certificateFromURL.trim();

    certificateInput.value = certificateId;

    verifyCertificate(certificateId);

}


// ================================================
// END OF LEARNSPHERE CERTIFICATE VERIFICATION
// ================================================