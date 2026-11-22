// ======================================================
// LEARNSPHERE BATTLE ROOM
// COMPLETE FIREBASE BATTLE ENGINE
// ======================================================


// ======================================================
// 1. FIREBASE IMPORTS
// ======================================================

import { auth, db } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

import {
    doc,
    getDoc,
    getDocs,
    collection,
    query,
    where,
    updateDoc,
    runTransaction,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ======================================================
// 2. HTML ELEMENTS
// ======================================================

const backToArenaBtn = document.getElementById("backToArenaBtn");
const returnToArenaBtn = document.getElementById("returnToArenaBtn");

const battleStatus = document.getElementById("battleStatus");
const battleTimer = document.getElementById("battleTimer");

const playerOneName = document.getElementById("playerOneName");
const playerTwoName = document.getElementById("playerTwoName");

const playerOneScore = document.getElementById("playerOneScore");
const playerTwoScore = document.getElementById("playerTwoScore");

const questionNumber = document.getElementById("questionNumber");
const questionText = document.getElementById("questionText");
const questionMarks = document.getElementById("questionMarks");

const questionProgressBar = document.getElementById("questionProgressBar");

const answerOptions = document.getElementById("answerOptions");
const answerMessage = document.getElementById("answerMessage");

const nextQuestionBtn = document.getElementById("nextQuestionBtn");

const waitingMessage = document.getElementById("waitingMessage");
const questionSection = document.getElementById("questionSection");

const battleResult = document.getElementById("battleResult");
const winnerText = document.getElementById("winnerText");
const finalScore = document.getElementById("finalScore");

const battleError = document.getElementById("battleError");


// ======================================================
// 3. GLOBAL VARIABLES
// ======================================================

const params = new URLSearchParams(window.location.search);

const battleId = params.get("battleId");

let currentUser = null;
let studentProfile = null;

let battleData = null;
let questions = [];

let currentQuestionIndex = 0;

let unsubscribeBattle = null;

let timerInterval = null;

let battleStarted = false;
let battleFinished = false;
let isSubmittingAnswer = false;

let myAnswers = {};


// ======================================================
// 4. GENERAL FUNCTIONS
// ======================================================

function showError(message) {

    battleError.textContent = message;

    battleError.classList.remove("hidden");

}


function hideError() {

    battleError.classList.add("hidden");

}


function showWaiting() {

    waitingMessage.classList.remove("hidden");

    questionSection.classList.add("hidden");

}


function hideWaiting() {

    waitingMessage.classList.add("hidden");

}


function showQuestions() {

    questionSection.classList.remove("hidden");

    waitingMessage.classList.add("hidden");

}


function formatTime(seconds) {

    const minutes = Math.floor(seconds / 60);

    const remainingSeconds = seconds % 60;

    return (
        String(minutes).padStart(2, "0") +
        ":" +
        String(remainingSeconds).padStart(2, "0")
    );

}


function shuffleArray(array) {

    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {

        const j = Math.floor(Math.random() * (i + 1));

        [shuffled[i], shuffled[j]] = [
            shuffled[j],
            shuffled[i]
        ];

    }

    return shuffled;

}


function getTimestampMilliseconds(value) {

    if (!value) return null;

    if (typeof value === "number") {
        return value;
    }

    if (typeof value.toMillis === "function") {
        return value.toMillis();
    }

    if (typeof value.toDate === "function") {
        return value.toDate().getTime();
    }

    if (typeof value === "string") {

        const parsed = new Date(value).getTime();

        return Number.isNaN(parsed) ? null : parsed;

    }

    return null;

}


// ======================================================
// 5. NAVIGATION
// ======================================================

function returnToArena() {

    cleanupBattle();

    window.location.href = "battle-arena.html";

}


backToArenaBtn?.addEventListener("click", returnToArena);

returnToArenaBtn?.addEventListener("click", returnToArena);


// ======================================================
// 6. CLEANUP
// ======================================================

function cleanupBattle() {

    if (timerInterval) {

        clearInterval(timerInterval);

        timerInterval = null;

    }

    if (unsubscribeBattle) {

        unsubscribeBattle();

        unsubscribeBattle = null;

    }

}


// ======================================================
// 7. AUTHENTICATION
// ======================================================

onAuthStateChanged(auth, async (user) => {

    if (!user) {

        window.location.href = "auth.html";

        return;

    }

    currentUser = user;

    if (!battleId) {

        showError("Battle ID is missing. Return to the Battle Arena.");

        battleStatus.textContent = "Invalid battle";

        return;

    }

    await loadStudentProfile();

});


// ======================================================
// 8. LOAD STUDENT PROFILE
// ======================================================

async function loadStudentProfile() {

    try {

        const profileRef = doc(
            db,
            "students",
            currentUser.uid
        );

        const profileSnap = await getDoc(profileRef);

        if (!profileSnap.exists()) {

            showError("Student profile not found.");

            return;

        }

        studentProfile = profileSnap.data();

        if (studentProfile.role !== "student") {

            showError("Only registered students can enter battles.");

            return;

        }

        await enterBattleRoom();

    } catch (error) {

        console.error(error);

        showError("Unable to load your student profile.");

    }

}


// ======================================================
// 9. ENTER BATTLE ROOM
// ======================================================

async function enterBattleRoom() {

    try {

        const battleRef = doc(
            db,
            "battles",
            battleId
        );

        const battleSnap = await getDoc(battleRef);

        if (!battleSnap.exists()) {

            showError("This battle does not exist.");

            return;

        }

        const data = battleSnap.data();

        const uid = currentUser.uid;

        const isPlayerOne = data.player1Id === uid;

        const isPlayerTwo = data.player2Id === uid;

        if (!isPlayerOne && !isPlayerTwo) {

            showError("You are not a participant in this battle.");

            return;

        }

        if (data.status === "completed") {

            battleData = data;

            displayBattleResult(data);

            return;

        }

        const enteredField = isPlayerOne
            ? "player1Entered"
            : "player2Entered";

       await updateDoc(battleRef, {

    [enteredField]: true

});

        await prepareBattleIfReady();

        listenToBattle();

    } catch (error) {

        console.error(error);

        showError(
            "Unable to enter the battle room. Check your Firebase permissions."
        );

    }

}


// ======================================================
// 10. PREPARE BATTLE
// ======================================================

async function prepareBattleIfReady() {

    try {

        const battleRef = doc(
            db,
            "battles",
            battleId
        );

        const battleSnap = await getDoc(battleRef);

        if (!battleSnap.exists()) return;

        const data = battleSnap.data();

        if (data.status === "active") return;

        if (data.status === "completed") return;

        if (!data.player1Entered || !data.player2Entered) {

            showWaiting();

            battleStatus.textContent = "Waiting for opponent";

            return;

        }

        // Load available questions.

        let questionsQuery;

        if (data.competitionId) {

            questionsQuery = query(

                collection(db, "battleQuestions"),

                where("published", "==", true),

                where("battleQuizId", "==", data.competitionId)

            );

        } else {

            questionsQuery = query(

                collection(db, "battleQuestions"),

                where("published", "==", true)

            );

        }

        const questionSnapshot = await getDocs(questionsQuery);

        let availableQuestions = [];

        questionSnapshot.forEach((questionDoc) => {

            availableQuestions.push({

                id: questionDoc.id,

                ...questionDoc.data()

            });

        });

        if (availableQuestions.length === 0) {

            showError(
                "No published questions are available for this battle."
            );

            return;

        }

        const questionLimit = Math.max(

            1,

            Number(data.questionLimit || 10)

        );

        availableQuestions = shuffleArray(availableQuestions);

        availableQuestions = availableQuestions.slice(
            0,
            questionLimit
        );

        const formattedQuestions = availableQuestions.map((question) => {

            return {

                id: question.id,

                question:
                    question.question ||
                    question.questionText ||
                    "Question unavailable",

                options: question.options || {},

                correctAnswer: question.correctAnswer,

                marks: Number(question.marks || 1)

            };

        });

        // Transaction prevents both players from replacing
        // the shared question list at the same time.

        await runTransaction(db, async (transaction) => {

            const freshSnap = await transaction.get(battleRef);

            if (!freshSnap.exists()) return;

            const freshData = freshSnap.data();

            if (freshData.status !== "waiting") return;

            if (
                !freshData.player1Entered ||
                !freshData.player2Entered
            ) {

                return;

            }

            if (
                Array.isArray(freshData.questions) &&
                freshData.questions.length > 0
            ) {

                return;

            }

            const duration = Number(
                freshData.durationSeconds || 60
            );

            const startTime = Date.now();

            transaction.update(battleRef, {

                questions: formattedQuestions,

                status: "active",

                startedAt: serverTimestamp(),

                endsAt: startTime + duration * 1000,

                player1Score: 0,

                player2Score: 0,

                player1Answers: {},

                player2Answers: {}

            });

        });

    } catch (error) {

        console.error("Battle preparation error:", error);

        showError(
            "Could not prepare the battle. Check your Firestore rules and indexes."
        );

    }

}


// ======================================================
// 11. LISTEN TO BATTLE
// ======================================================

function listenToBattle() {

    const battleRef = doc(
        db,
        "battles",
        battleId
    );

    unsubscribeBattle = onSnapshot(

        battleRef,

        async (snapshot) => {

            if (!snapshot.exists()) {

                showError("Battle not found.");

                return;

            }

            battleData = snapshot.data();

            updatePlayerInformation();

            if (battleData.status === "waiting") {

                showWaiting();

                battleStatus.textContent = "Waiting for opponent";

                await prepareBattleIfReady();

                return;

            }

            if (battleData.status === "active") {

                if (!Array.isArray(battleData.questions)) {

                    showError("Battle questions are not available.");

                    return;

                }

                if (battleData.questions.length === 0) {

                    showError("No questions were added to this battle.");

                    return;

                }

                battleStarted = true;

                battleFinished = false;

                questions = battleData.questions;

                updateMyAnswers();

                showQuestions();

                battleStatus.textContent = "Battle in progress";

                startTimer();

                if (questions.length > 0) {

                    findNextUnansweredQuestion();

                    displayQuestion();

                }

                checkAllQuestionsAnswered();

                return;

            }

            if (battleData.status === "completed") {

                battleFinished = true;

                cleanupBattle();

                displayBattleResult(battleData);

            }

        },

        (error) => {

            console.error(error);

            showError("Lost connection to the battle.");

        }

    );

}


// ======================================================
// 12. UPDATE PLAYER INFORMATION
// ======================================================

function updatePlayerInformation() {

    if (!battleData) return;

    playerOneName.textContent =
        battleData.player1Name || "Player 1";

    playerTwoName.textContent =
        battleData.player2Name || "Player 2";

    playerOneScore.textContent =
        battleData.player1Score || 0;

    playerTwoScore.textContent =
        battleData.player2Score || 0;

    const isPlayerOne =
        currentUser.uid === battleData.player1Id;

    document
        .getElementById("playerOneCard")
        ?.classList.toggle("active", isPlayerOne);

    document
        .getElementById("playerTwoCard")
        ?.classList.toggle("active", !isPlayerOne);

}


// ======================================================
// 13. UPDATE MY ANSWERS
// ======================================================

function updateMyAnswers() {

    if (!battleData) return;

    const isPlayerOne =
        currentUser.uid === battleData.player1Id;

    myAnswers = isPlayerOne

        ? battleData.player1Answers || {}

        : battleData.player2Answers || {};

}


// ======================================================
// 14. FIND NEXT UNANSWERED QUESTION
// ======================================================

function findNextUnansweredQuestion() {

    currentQuestionIndex = questions.findIndex((question) => {

        return !myAnswers[question.id];

    });

    if (currentQuestionIndex === -1) {

        currentQuestionIndex = questions.length;

    }

}


// ======================================================
// 15. DISPLAY QUESTION
// ======================================================

function displayQuestion() {

    if (battleFinished) return;

    if (currentQuestionIndex >= questions.length) {

        questionText.textContent = "You have completed all questions.";

        answerOptions.innerHTML = "";

        answerMessage.textContent =
            "Waiting for the battle to finish.";

        nextQuestionBtn.disabled = true;

        nextQuestionBtn.textContent = "Completed";

        return;

    }

    const question = questions[currentQuestionIndex];

    const savedAnswer = myAnswers[question.id];

    questionNumber.textContent =

        `${currentQuestionIndex + 1} / ${questions.length}`;

    questionText.textContent = question.question;

    questionMarks.textContent = question.marks || 1;

    questionProgressBar.style.width =

        `${((currentQuestionIndex + 1) / questions.length) * 100}%`;

    answerOptions.innerHTML = "";

    answerMessage.textContent = "";

    answerMessage.className = "answer-message";

    nextQuestionBtn.disabled = true;

    nextQuestionBtn.textContent = "Next Question →";

    const options = question.options || {};

    let optionEntries = [];

    if (Array.isArray(options)) {

        optionEntries = options.map((option, index) => {

            return [

                ["A", "B", "C", "D"][index],

                option

            ];

        });

    } else {

        optionEntries = Object.entries(options);

    }

    optionEntries.forEach(([letter, option]) => {

        const button = document.createElement("button");

        button.type = "button";

        button.className = "answer-option";

        const letterSpan = document.createElement("span");

        letterSpan.className = "answer-letter";

        letterSpan.textContent = letter;

        const textSpan = document.createElement("span");

        textSpan.textContent = option;

        button.appendChild(letterSpan);

        button.appendChild(textSpan);

        if (savedAnswer) {

            button.disabled = true;

            if (savedAnswer.answer === letter) {

                button.classList.add("selected");

            }

            if (
                normalizeAnswer(question.correctAnswer) ===
                normalizeAnswer(letter)
            ) {

                button.classList.add("correct");

            }

            if (
                savedAnswer.answer === letter &&
                !savedAnswer.isCorrect
            ) {

                button.classList.add("wrong");

            }

        } else {

            button.addEventListener("click", () => {

                submitBattleAnswer(letter, button);

            });

        }

        answerOptions.appendChild(button);

    });

    if (savedAnswer) {

        answerMessage.textContent = savedAnswer.isCorrect

            ? "Correct answer! You earned points."

            : "Incorrect answer. Better luck on the next question.";

        answerMessage.classList.add(

            savedAnswer.isCorrect ? "success" : "error"

        );

        nextQuestionBtn.disabled = false;

    }

}


// ======================================================
// 16. NORMALIZE ANSWERS
// ======================================================

function normalizeAnswer(value) {

    if (value === undefined || value === null) {

        return "";

    }

    return String(value)
        .trim()
        .toLowerCase();

}


// ======================================================
// 17. CHECK CORRECT ANSWER
// ======================================================

function isAnswerCorrect(selectedAnswer, correctAnswer, options) {

    const selected = normalizeAnswer(selectedAnswer);

    const correct = normalizeAnswer(correctAnswer);

    if (selected === correct) return true;

    if (Array.isArray(options)) {

        const letters = ["A", "B", "C", "D"];

        const selectedIndex = letters.indexOf(
            selectedAnswer.toUpperCase()
        );

        if (selectedIndex >= 0) {

            return normalizeAnswer(options[selectedIndex]) === correct;

        }

    } else if (options && typeof options === "object") {

        const correctOption = options[correctAnswer];

        if (correctOption !== undefined) {

            return normalizeAnswer(selected) ===
                normalizeAnswer(correctOption);

        }

    }

    return false;

}


// ======================================================
// 18. SUBMIT ANSWER
// ======================================================

async function submitBattleAnswer(selectedAnswer, selectedButton) {

    if (isSubmittingAnswer || battleFinished) return;

    const question = questions[currentQuestionIndex];

    if (!question) return;

    if (myAnswers[question.id]) return;

    isSubmittingAnswer = true;

    const isPlayerOne =
        currentUser.uid === battleData.player1Id;

    const answerField = isPlayerOne
        ? "player1Answers"
        : "player2Answers";

    const scoreField = isPlayerOne
        ? "player1Score"
        : "player2Score";

    const correct = isAnswerCorrect(

        selectedAnswer,

        question.correctAnswer,

        question.options

    );

    const marks = correct
        ? Number(question.marks || 1)
        : 0;

    const battleRef = doc(
        db,
        "battles",
        battleId
    );

    try {

        await runTransaction(db, async (transaction) => {

            const snapshot = await transaction.get(battleRef);

            if (!snapshot.exists()) {

                throw new Error("Battle no longer exists.");

            }

            const data = snapshot.data();

            if (data.status !== "active") {

                throw new Error("This battle is no longer active.");

            }

            const answers = data[answerField] || {};

            if (answers[question.id]) {

                return;

            }

            const updatedAnswers = {

                ...answers,

                [question.id]: {

                    answer: selectedAnswer,

                    isCorrect: correct,

                    marks: marks,

                    answeredAt: Date.now()

                }

            };

            transaction.update(battleRef, {

                [answerField]: updatedAnswers,

                [scoreField]:

                    Number(data[scoreField] || 0) + marks

            });

        });

        selectedButton.classList.add("selected");

        answerMessage.textContent = correct

            ? `Correct! You earned ${marks} points.`

            : "Incorrect answer. Keep going!";

        answerMessage.className = correct

            ? "answer-message success"

            : "answer-message error";

        const buttons = answerOptions.querySelectorAll("button");

        buttons.forEach((button) => {

            button.disabled = true;

        });

        nextQuestionBtn.disabled = false;

    } catch (error) {

        console.error(error);

        showError(error.message || "Unable to submit your answer.");

    } finally {

        isSubmittingAnswer = false;

    }

}


// ======================================================
// 19. NEXT QUESTION
// ======================================================

nextQuestionBtn.addEventListener("click", () => {

    if (nextQuestionBtn.disabled) return;

    if (currentQuestionIndex < questions.length - 1) {

        currentQuestionIndex++;

        while (

            currentQuestionIndex < questions.length &&

            myAnswers[questions[currentQuestionIndex].id]

        ) {

            currentQuestionIndex++;

        }

        displayQuestion();

    } else {

        currentQuestionIndex = questions.length;

        displayQuestion();

        checkAllQuestionsAnswered();

    }

});


// ======================================================
// 20. CHECK COMPLETION
// ======================================================

async function checkAllQuestionsAnswered() {

    if (!battleData || battleFinished) return;

    const playerOneAnswers =
        battleData.player1Answers || {};

    const playerTwoAnswers =
        battleData.player2Answers || {};

    const playerOneCompleted = questions.every((question) => {

        return Boolean(playerOneAnswers[question.id]);

    });

    const playerTwoCompleted = questions.every((question) => {

        return Boolean(playerTwoAnswers[question.id]);

    });

    if (playerOneCompleted && playerTwoCompleted) {

        await finishBattle("completed");

    }

}


// ======================================================
// 21. START TIMER
// ======================================================

function startTimer() {

    if (timerInterval) return;

    if (!battleData.endsAt) {

        showError("Battle timer is unavailable.");

        return;

    }

    const endTime = getTimestampMilliseconds(
        battleData.endsAt
    );

    if (!endTime) {

        showError("Invalid battle timer.");

        return;

    }

    function updateTimer() {

        const remaining = Math.max(

            0,

            Math.ceil((endTime - Date.now()) / 1000)

        );

        battleTimer.textContent = formatTime(remaining);

        if (remaining <= 10) {

            battleTimer.classList.add("danger");

        } else {

            battleTimer.classList.remove("danger");

        }

        if (remaining <= 0) {

            clearInterval(timerInterval);

            timerInterval = null;

            finishBattle("time");

        }

    }

    updateTimer();

    timerInterval = setInterval(updateTimer, 1000);

}


// ======================================================
// 22. FINISH BATTLE
// ======================================================

async function finishBattle(reason) {

    if (battleFinished) return;

    const battleRef = doc(
        db,
        "battles",
        battleId
    );

    try {

        await runTransaction(db, async (transaction) => {

            const snapshot = await transaction.get(battleRef);

            if (!snapshot.exists()) return;

            const data = snapshot.data();

            if (data.status !== "active") return;

            const scoreOne = Number(data.player1Score || 0);

            const scoreTwo = Number(data.player2Score || 0);

            let winnerId = null;

            let winnerName = "Draw";

            if (scoreOne > scoreTwo) {

                winnerId = data.player1Id;

                winnerName = data.player1Name;

            } else if (scoreTwo > scoreOne) {

                winnerId = data.player2Id;

                winnerName = data.player2Name;

            }

            transaction.update(battleRef, {

                status: "completed",

                winnerId: winnerId,

                winnerName: winnerName,

                finalScore: `${scoreOne} - ${scoreTwo}`,

                completedAt: serverTimestamp(),

                completionReason: reason

            });

        });

    } catch (error) {

        console.error("Battle completion error:", error);

    }

}


// ======================================================
// 23. DISPLAY BATTLE RESULT
// ======================================================

function displayBattleResult(data) {

    cleanupBattle();

    battleFinished = true;

    questionSection.classList.add("hidden");

    waitingMessage.classList.add("hidden");

    battleResult.classList.remove("hidden");

    battleStatus.textContent = "Battle completed";

    battleTimer.textContent = "00:00";

    const myScore = currentUser.uid === data.player1Id

        ? Number(data.player1Score || 0)

        : Number(data.player2Score || 0);

    const opponentScore = currentUser.uid === data.player1Id

        ? Number(data.player2Score || 0)

        : Number(data.player1Score || 0);

    if (!data.winnerId) {

        winnerText.textContent = "It's a Draw!";

    } else if (data.winnerId === currentUser.uid) {

        winnerText.textContent = "Congratulations! You Won!";

    } else {

        winnerText.textContent = "You Lost This Battle";

    }

    finalScore.textContent =

        `Your score: ${myScore} | Opponent's score: ${opponentScore}`;

}


// ======================================================
// 24. INITIAL PAGE STATE
// ======================================================

showWaiting();

battleStatus.textContent = "Connecting...";
