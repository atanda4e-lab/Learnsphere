import { db } from "./firebase.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


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


// =====================================
// SHOW MESSAGE
// =====================================

function showMessage(message, type = "") {

    verificationMessage.textContent = message;

    verificationMessage.className = type;

}


// =====================================
// FORMAT DATE
// =====================================

function formatIssueDate(timestamp) {

    if (!timestamp) {
        return "Not available";
    }

    let date;

    if (typeof timestamp.toDate === "function") {

        date = timestamp.toDate();

    } else {

        date = new Date(timestamp);

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


// =====================================
// DISPLAY CERTIFICATE
// =====================================

function displayCertificate(certificate) {

    studentName.textContent =
        certificate.studentName || "Not available";

    courseTitle.textContent =
        certificate.courseTitle || "Not available";

    percentage.textContent =
        certificate.percentage !== undefined
            ? certificate.percentage + "%"
            : "Not available";

    displayCertificateId.textContent =
        certificate.certificateId || "Not available";

    issueDate.textContent =
        formatIssueDate(certificate.issuedAt);

    certificateDetails.classList.remove("hidden");

}


// =====================================
// VERIFY CERTIFICATE
// =====================================

async function verifyCertificate(certificateId) {

    certificateDetails.classList.add("hidden");

    showMessage("");

    if (!certificateId) {

        showMessage(
            "Please enter a Certificate ID.",
            "error-message"
        );

        return;

    }

    verifyButton.disabled = true;

    verifyButton.textContent = "Verifying...";


    try {

        // Search the original certificates collection
        const certificateReference = doc(
            db,
            "certificates",
            certificateId
        );

        const certificateDocument = await getDoc(
            certificateReference
        );


        if (!certificateDocument.exists()) {

            showMessage(
                "Certificate not found. Please check the ID and try again.",
                "error-message"
            );

            return;

        }


        const certificate = certificateDocument.data();


        if (certificate.certificateId !== certificateId) {

            showMessage(
                "This certificate could not be verified.",
                "error-message"
            );

            return;

        }


        if (
            typeof certificate.percentage !== "number" ||
            certificate.percentage < 70
        ) {

            showMessage(
                "This certificate could not be verified.",
                "error-message"
            );

            return;

        }


        displayCertificate(certificate);

        showMessage(
            "This is a valid LearnSphere certificate.",
            "success-message"
        );


    } catch (error) {

        console.error(
            "Certificate verification error:",
            error
        );

        showMessage(
            "Verification failed. Please try again.",
            "error-message"
        );

    } finally {

        verifyButton.disabled = false;

        verifyButton.innerHTML =
            '<i class="fa-solid fa-shield-check"></i> Verify Certificate';

    }

}


// =====================================
// FORM SUBMISSION
// =====================================

verificationForm.addEventListener("submit", function (event) {

    event.preventDefault();

    const certificateId = certificateInput.value.trim();

    verifyCertificate(certificateId);

});


// =====================================
// INPUT CHANGE
// =====================================

certificateInput.addEventListener("input", function () {

    certificateDetails.classList.add("hidden");

    showMessage("");

});


// =====================================
// VERIFY FROM URL
// =====================================

const urlParameters = new URLSearchParams(
    window.location.search
);

const certificateFromURL = urlParameters.get("id");

if (certificateFromURL) {

    certificateInput.value = certificateFromURL.trim();

    verifyCertificate(certificateFromURL.trim());

}