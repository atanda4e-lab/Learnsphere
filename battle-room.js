// ========================================
// LEARNSPHERE BATTLE ROOM
// BATTLE ENGINE
// ========================================


// ========================================
// 1. FIREBASE IMPORTS
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
    updateDoc,
    runTransaction,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ========================================
// 2. HTML ELEMENTS
// ========================================

const battleStatus = document.getElementById("battleStatus");

const battleTimer = document.getElementById("battleTimer");

const playerOneName = document.getElementById("playerOneName");
const playerTwoName = document.getElementById("playerTwoName");

const playerOneScore = document.getElementById("playerOneScore");
const playerTwoScore = document.getElementById("playerTwoScore");

const questionNumber = document.getElementById("questionNumber");
const questionText = document.getElementElementById
    ? document.getElementElementById("questionText")
    : document.getElementById("questionText");

const answerOptions = document.getElementById("answerOptions");

const answerMessage = document.getElementById("answerMessage");

const nextQuestionBtn = document.getElementById("nextQuestionBtn");

const battleResult = document.getElementById("battleResult");

const winnerText = document.getElementById("winnerText");

const finalScore = document.getElementById("finalScore");

// BACK TO BATTLE ARENA BUTTON

const backToArenaBtn = document.getElementById("backToArenaBtn");

if (backToArenaBtn) {
    backToArenaBtn.addEventListener("click", function () {

        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        if (battleListener) {
            battleListener();
            battleListener = null;
        }

        window.location.href = "battle-arena.html";

    });
}


// ========================================
// 3. GLOBAL VARIABLES
// ========================================

let currentStudent = null;

let currentBattleId = null;

let currentBattle = null;

let battleQuestions = [];

let currentQuestionIndex = 0;

let myScore = 0;

let opponentScore = 0;
let lastRenderedQuestionIndex = -1;

let selectedAnswer = null;

let battleStarted = false;

let battleEnded = false;

let timerInterval = null;

let battleListener = null;

let questionListener = null;

let answerSubmitted = false;

let remainingSeconds = 60;


// ========================================
// 4. DISPLAY MESSAGE
// ========================================

function showStatus(message) {

    if (battleStatus) {
        battleStatus.textContent = message;
    }

}


// ========================================
// 5. GET BATTLE ID FROM URL
// ========================================

const urlParams = new URLSearchParams(window.location.search);

currentBattleId = urlParams.get("battleId");


// ========================================
// 6. LOAD STUDENT
// ========================================

async function loadStudent(user) {

    try {

        const studentRef = doc(db, "students", user.uid);

        const studentSnap = await getDoc(studentRef);

        if (!studentSnap.exists()) {

            showStatus("Student profile not found.");

            return;

        }

        const studentData = studentSnap.data();

        if (studentData.role !== "student") {

            showStatus("Only students can enter this battle.");

            return;

        }

        currentStudent = {

            uid: user.uid,

            fullName: studentData.fullName || "Student",

            department: studentData.department || "",

            level: studentData.level || ""

        };

        console.log("Battle student:", currentStudent);

        await loadBattle();

    }

    catch (error) {

        console.error("Student loading error:", error);

        showStatus("Unable to load your student profile.");

    }

}


// ========================================
// 7. LOAD BATTLE DOCUMENT
// ========================================

async function loadBattle() {

    if (!currentBattleId) {

        showStatus("Battle ID is missing.");

        return;

    }

    try {

        showStatus("Loading battle room...");

        const battleRef = doc(db, "battles", currentBattleId);

        const battleSnap = await getDoc(battleRef);

        if (!battleSnap.exists()) {

            showStatus("Battle room not found.");

            return;

        }

        currentBattle = {

            ...battleSnap.data(),

            id: battleSnap.id

        };


        // Check that student belongs to battle

        const isPlayerOne =
            currentBattle.player1Id === currentStudent.uid;

        const isPlayerTwo =
            currentBattle.player2Id === currentStudent.uid;

        if (!isPlayerOne && !isPlayerTwo) {

            showStatus("You are not a participant in this battle.");

            return;

        }


        // Display player names

        if (playerOneName) {

            playerOneName.textContent =
                currentBattle.player1Name || "Player 1";

        }

        if (playerTwoName) {

            playerTwoName.textContent =
                currentBattle.player2Name || "Player 2";

        }


       showStatus("Battle room loaded successfully!");

console.log("Battle room:", currentBattle);

// Load questions and initialize the battle

await loadBattleQuestions();

    }

    catch (error) {

        console.error("Battle loading error:", error);

        showStatus("Unable to load battle room.");

    }

}


// ========================================
// 8. AUTHENTICATION
// ========================================

onAuthStateChanged(auth, async function (user) {

    if (!user) {

        window.location.href = "auth.html";

        return;

    }

    await loadStudent(user);

});
// ========================================
// 9. LOAD PUBLISHED BATTLE QUESTIONS
// ========================================

async function loadBattleQuestions() {

    try {

        showStatus("Loading published battle questions...");

        const questionsRef = collection(db, "battleQuestions");

        const questionsQuery = query(
            questionsRef,
            where("published", "==", true)
        );

        const questionsSnap = await getDocs(questionsQuery);

        let allQuestions = questionsSnap.docs.map(function (item) {

            return {
                ...item.data(),
                id: item.id
            };

        });

        allQuestions = allQuestions.filter(function (question) {

            return (
                question.question &&
                question.options &&
                question.options.A &&
                question.options.B &&
                question.options.C &&
                question.options.D &&
                question.correctAnswer
            );

        });

       if (allQuestions.length === 0) {
    showStatus("No published battle questions are available.");
    return;
}

        // Shuffle questions

        allQuestions = shuffleBattleArray(allQuestions);

        // Select 10 questions

        battleQuestions = allQuestions.slice(0, 10);

        console.log(
            "Published battle questions loaded:",
            battleQuestions
        );

        await initializeBattle();

    }

    catch (error) {

        console.error("Question loading error:", error);

        showStatus(
            "Failed to load published battle questions: " + error.message
        );

    }

}
// ========================================
// 10. GET QUESTION OPTIONS
// ========================================

function getBattleOptions(question) {

    if (Array.isArray(question.options)) {

        return question.options;

    }

    if (question.options && typeof question.options === "object") {

        return [
            question.options.A,
            question.options.B,
            question.options.C,
            question.options.D
        ].filter(function (option) {

            return option !== undefined && option !== null;

        });

    }

    return [];

}


// ========================================
// 11. SHUFFLE ARRAY
// ========================================

function shuffleBattleArray(array) {

    for (let i = array.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [array[i], array[j]] = [array[j], array[i]];

    }

    return array;

}
// ========================================
// 12. INITIALIZE BATTLE
// ========================================

async function initializeBattle() {

    try {

        const battleRef = doc(db, "battles", currentBattleId);

        await runTransaction(db, async function (transaction) {

            const battleSnap = await transaction.get(battleRef);

            if (!battleSnap.exists()) {

                throw new Error("Battle does not exist.");

            }

            const battleData = battleSnap.data();


            // If battle already started, don't restart it

            if (battleData.status === "active") {

                return;

            }


            // If battle already ended

            if (battleData.status === "completed") {

                return;

            }


            // Prepare shared questions

            const sharedQuestions = battleQuestions.map(function (question) {

                return {

                    id: question.id,

                    question: question.question || question.questionText,

                    options: getBattleOptions(question),

                    correctAnswer: question.correctAnswer

                };

            });


            const startTime = Date.now();

            const endTime = startTime + 60000;


            transaction.update(battleRef, {

                questions: sharedQuestions,

                status: "active",

                player1Score: 0,

                player2Score: 0,

                player1Answers: {},

                player2Answers: {},

                startedAt: startTime,

                endsAt: endTime,

                durationSeconds: 60

            });

        });


        // Listen for battle changes

        listenToBattle();


    }

    catch (error) {

        console.error("Battle initialization error:", error);

        showStatus("Unable to initialize battle: " + error.message);

    }

}
// ========================================
// 13. LIVE BATTLE LISTENER
// ========================================

function listenToBattle() {

    const battleRef = doc(db, "battles", currentBattleId);

    if (battleListener) {
        battleListener();
    }

    battleListener = onSnapshot(battleRef, function (snapshot) {

        if (!snapshot.exists()) {

            showStatus("Battle no longer exists.");

            return;

        }

        currentBattle = {
            ...snapshot.data(),
            id: snapshot.id
        };


        // Get shared questions

        if (currentBattle.questions) {

            battleQuestions = currentBattle.questions;

        }


        // Update scores

        myScore = currentStudent.uid === currentBattle.player1Id
            ? currentBattle.player1Score || 0
            : currentBattle.player2Score || 0;

        opponentScore = currentStudent.uid === currentBattle.player1Id
            ? currentBattle.player2Score || 0
            : currentBattle.player1Score || 0;


        if (playerOneScore) {

            playerOneScore.textContent =
                currentBattle.player1Score || 0;

        }

        if (playerTwoScore) {

            playerTwoScore.textContent =
                currentBattle.player2Score || 0;

        }


        // Battle state

        if (currentBattle.status === "active") {

            battleStarted = true;

            showStatus("⚔️ Battle in progress!");

            startBattleTimer();

          if (lastRenderedQuestionIndex !== currentQuestionIndex) {

    lastRenderedQuestionIndex = currentQuestionIndex;

    displayBattleQuestion();

}

        }


        if (currentBattle.status === "completed") {

            finishBattleDisplay();

        }

    }, function (error) {

        console.error("Battle listener error:", error);

        showStatus("Unable to synchronize battle.");

    });

}
// ========================================
// 14. BATTLE TIMER
// ========================================

function startBattleTimer() {

    // Prevent multiple countdown intervals

    if (timerInterval) return;

    timerInterval = setInterval(function () {

        if (!currentBattle || !currentBattle.endsAt) return;

        const remaining = Math.max(
            0,
            Math.ceil((currentBattle.endsAt - Date.now()) / 1000)
        );

        remainingSeconds = remaining;

        if (battleTimer) {
            battleTimer.textContent = remaining;
        }

        if (remaining <= 0) {

            clearInterval(timerInterval);

            timerInterval = null;

            endBattle();

        }

    }, 250);

}


// ========================================
// 15. DISPLAY BATTLE QUESTION
// ========================================

function displayBattleQuestion() {

    if (!battleQuestions.length) {

        showStatus("No battle questions available.");

        return;

    }

    if (battleEnded) return;

    if (currentQuestionIndex >= battleQuestions.length) {

        if (questionText) {
            questionText.textContent = "You have completed all questions!";
        }

        if (answerOptions) {
            answerOptions.innerHTML = "";
        }

        if (questionNumber) {
            questionNumber.textContent = "Completed";
        }

        if (nextQuestionBtn) {
            nextQuestionBtn.disabled = true;
        }

        return;

    }


    const question = battleQuestions[currentQuestionIndex];

    const options = getBattleOptions(question);


    // Display question number

    if (questionNumber) {

        questionNumber.textContent =
            "Question " + (currentQuestionIndex + 1) +
            " of " + battleQuestions.length;

    }


    // Display question text

    if (questionText) {

        questionText.textContent =
            question.question || question.questionText || "Question unavailable.";

    }


    // Clear previous options

    if (answerOptions) {

        answerOptions.innerHTML = "";

    }


    selectedAnswer = null;

    answerSubmitted = false;


    // Display answer options

    options.forEach(function (option, index) {

        const button = document.createElement("button");

        button.className = "answer-option";

        button.textContent =
            String.fromCharCode(65 + index) + ". " + option;

        button.type = "button";

        button.addEventListener("click", function () {

            if (answerSubmitted || battleEnded) return;

            selectedAnswer = index;

            document.querySelectorAll(".answer-option").forEach(function (item) {

                item.classList.remove("selected");

            });

            button.classList.add("selected");

        });

        answerOptions.appendChild(button);

    });


    // Reset message

    if (answerMessage) {

        answerMessage.textContent = "Choose your answer.";

    }


    // Enable next button

   if (nextQuestionBtn) {

    nextQuestionBtn.disabled = false;

    nextQuestionBtn.textContent = "Submit Answer";

}
}
// ========================================
// 16. CHECK CORRECT ANSWER
// ========================================

function isBattleAnswerCorrect(question, selectedIndex) {

    const correct = String(question.correctAnswer ?? "").trim();

    const letters = ["A", "B", "C", "D"];

    const options = getBattleOptions(question);

    if (["0", "1", "2", "3"].includes(correct)) {

        return selectedIndex === Number(correct);

    }

    if (letters.includes(correct.toUpperCase())) {

        return selectedIndex === letters.indexOf(correct.toUpperCase());

    }

    const selectedOption = options[selectedIndex];

    return Boolean(selectedOption) &&
        String(selectedOption).trim().toLowerCase() === correct.toLowerCase();

}


// ========================================
// 17. SUBMIT BATTLE ANSWER
// ========================================

async function submitBattleAnswer() {

    if (answerSubmitted || battleEnded) return;

    if (selectedAnswer === null) {

        if (answerMessage) {
            answerMessage.textContent = "Please select an answer first.";
        }

        return;

    }

    if (remainingSeconds <= 0) {

        endBattle();

        return;

    }

    try {

        answerSubmitted = true;

        const question = battleQuestions[currentQuestionIndex];

        const isCorrect = isBattleAnswerCorrect(question, selectedAnswer);

        const battleRef = doc(db, "battles", currentBattleId);

        await runTransaction(db, async function (transaction) {

            const battleSnap = await transaction.get(battleRef);

            if (!battleSnap.exists()) {
                throw new Error("Battle not found.");
            }

            const battleData = battleSnap.data();

            if (battleData.status !== "active") {
                throw new Error("This battle has ended.");
            }

            if (Date.now() >= battleData.endsAt) {
                throw new Error("Time is up.");
            }

            const isPlayerOne =
                currentStudent.uid === battleData.player1Id;

            const answerField = isPlayerOne
                ? "player1Answers"
                : "player2Answers";

            const scoreField = isPlayerOne
                ? "player1Score"
                : "player2Score";

            const answers = battleData[answerField] || {};

            if (answers[question.id] !== undefined) {
                throw new Error("You already answered this question.");
            }

            answers[question.id] = {
                selectedAnswer: selectedAnswer,
                correct: isCorrect
            };

            const newScore =
                (battleData[scoreField] || 0) + (isCorrect ? 1 : 0);

            transaction.update(battleRef, {
                [answerField]: answers,
                [scoreField]: newScore
            });

        });

        if (answerMessage) {

            answerMessage.textContent = isCorrect
                ? "Correct answer! +1 point."
                : "Incorrect answer.";

        }

        if (answerOptions) {

            answerOptions.querySelectorAll("button").forEach(function (button) {

                button.disabled = true;

            });

        }
        if (nextQuestionBtn) {

    nextQuestionBtn.textContent = "Next Question";

}

    }

    catch (error) {

        console.error("Answer submission error:", error);

        answerSubmitted = false;

        if (answerMessage) {
            answerMessage.textContent = error.message;
        }

    }

}


// ========================================
// 18. NEXT QUESTION
// ========================================

function nextBattleQuestion() {

    if (!answerSubmitted || battleEnded) return;

    currentQuestionIndex++;

    lastRenderedQuestionIndex = -1;

    if (currentQuestionIndex < battleQuestions.length) {

        displayBattleQuestion();

    }

    else {

        if (questionText) {
            questionText.textContent = "You have completed all questions!";
        }

        if (answerOptions) {
            answerOptions.innerHTML = "";
        }

        if (questionNumber) {
            questionNumber.textContent = "Completed";
        }

        if (nextQuestionBtn) {
            nextQuestionBtn.disabled = true;
        }

    }

}


// ========================================
// 19. NEXT BUTTON EVENT
// ========================================

if (nextQuestionBtn) {

    nextQuestionBtn.addEventListener("click", async function () {

        if (!answerSubmitted) {

            await submitBattleAnswer();

        }

        else {

            nextBattleQuestion();

        }

    });

}
// ========================================
// 20. END BATTLE
// ========================================

async function endBattle() {

    if (battleEnded) return;

    try {

        const battleRef = doc(db, "battles", currentBattleId);

        await runTransaction(db, async function (transaction) {

            const battleSnap = await transaction.get(battleRef);

            if (!battleSnap.exists()) {
                throw new Error("Battle not found.");
            }

            const battleData = battleSnap.data();

            // Another player may have already ended the battle

            if (battleData.status === "completed") {
                return;
            }

            const scoreOne = battleData.player1Score || 0;
            const scoreTwo = battleData.player2Score || 0;

            let winnerId = null;
            let winnerName = "It's a draw!";

            if (scoreOne > scoreTwo) {

                winnerId = battleData.player1Id;
                winnerName = battleData.player1Name;

            }

            else if (scoreTwo > scoreOne) {

                winnerId = battleData.player2Id;
                winnerName = battleData.player2Name;

            }

            transaction.update(battleRef, {

                status: "completed",

                winnerId: winnerId,

                winnerName: winnerName,

                finalScore: {
                    player1: scoreOne,
                    player2: scoreTwo
                },

                completedAt: Date.now()

            });

        });

        battleEnded = true;

        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }

        showStatus("Battle completed!");

    }

    catch (error) {

        console.error("Battle ending error:", error);

        showStatus("Unable to finish battle: " + error.message);

    }

}


// ========================================
// 21. DISPLAY BATTLE RESULT
// ========================================

function finishBattleDisplay() {

    battleEnded = true;

    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    const scoreOne = currentBattle.player1Score || 0;
    const scoreTwo = currentBattle.player2Score || 0;

    if (battleTimer) {
        battleTimer.textContent = "00";
    }

    if (battleResult) {
        battleResult.hidden = false;
    }

    if (winnerText) {

        if (!currentBattle.winnerId) {

            winnerText.textContent = "🤝 It's a draw!";

        }

        else if (currentBattle.winnerId === currentStudent.uid) {

            winnerText.textContent = "🏆 Congratulations! You won!";

        }

        else {

            winnerText.textContent =
                "The winner is " + currentBattle.winnerName + "!";

        }

    }

    if (finalScore) {

        finalScore.textContent =
            currentBattle.player1Name + ": " + scoreOne +
            " | " +
            currentBattle.player2Name + ": " + scoreTwo;

    }

    showStatus("The battle has ended!");

    if (nextQuestionBtn) {
        nextQuestionBtn.disabled = true;
    }

}