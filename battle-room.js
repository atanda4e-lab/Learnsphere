// ======================================================
// LEARNSPHERE BATTLE ROOM
// COMPLETE FIREBASE BATTLE ENGINE
// Firebase SDK 12.2.1
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

const backToArenaBtn =
    document.getElementById("backToArenaBtn");

const returnToArenaBtn =
    document.getElementById("returnToArenaBtn");

const battleStatus =
    document.getElementById("battleStatus");

const battleTimer =
    document.getElementById("battleTimer");

const playerOneName =
    document.getElementById("playerOneName");

const playerTwoName =
    document.getElementById("playerTwoName");

const playerOneScore =
    document.getElementById("playerOneScore");

const playerTwoScore =
    document.getElementById("playerTwoScore");

const questionNumber =
    document.getElementById("questionNumber");

const questionText =
    document.getElementById("questionText");

const questionMarks =
    document.getElementById("questionMarks");

const questionProgressBar =
    document.getElementById("questionProgressBar");

const answerOptions =
    document.getElementById("answerOptions");

const answerMessage =
    document.getElementById("answerMessage");

const nextQuestionBtn =
    document.getElementById("nextQuestionBtn");

const waitingMessage =
    document.getElementById("waitingMessage");

const questionSection =
    document.getElementById("questionSection");

const battleResult =
    document.getElementById("battleResult");

const winnerText =
    document.getElementById("winnerText");

const finalScore =
    document.getElementById("finalScore");

const battleError =
    document.getElementById("battleError");


// ======================================================
// 3. GLOBAL VARIABLES
// ======================================================

const params = new URLSearchParams(
    window.location.search
);

const battleId = params.get("battleId");

let currentUser = null;

let studentProfile = null;

let battleData = null;

let questions = [];

let currentQuestionIndex = 0;

let myAnswers = {};

let unsubscribeBattle = null;

let timerInterval = null;

let battleFinished = false;

let isSubmittingAnswer = false;

let isPreparingBattle = false;

let isFinishingBattle = false;

let leaderboardUpdateStarted = false;


// ======================================================
// 4. GENERAL FUNCTIONS
// ======================================================

function showError(message) {

    if (!battleError) return;

    battleError.textContent = message;

    battleError.classList.remove("hidden");

}


function hideError() {

    battleError?.classList.add("hidden");

}


function showWaiting() {

    waitingMessage?.classList.remove("hidden");

    questionSection?.classList.add("hidden");

}


function showQuestions() {

    questionSection?.classList.remove("hidden");

    waitingMessage?.classList.add("hidden");

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


function normalizeAnswer(value) {

    if (value === undefined || value === null) {
        return "";
    }

    return String(value)
        .trim()
        .toLowerCase();

}


function shuffleArray(array) {

    const shuffled = [...array];

    for (let i = shuffled.length - 1; i > 0; i--) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

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


function isPlayerOne() {

    return currentUser?.uid === battleData?.player1Id;

}


function getMyAnswerField() {

    return isPlayerOne()
        ? "player1Answers"
        : "player2Answers";

}


function getMyScoreField() {

    return isPlayerOne()
        ? "player1Score"
        : "player2Score";

}


// ======================================================
// 5. NAVIGATION
// ======================================================

function returnToArena() {

    cleanupBattle();

    window.location.href = "battle-arena.html";

}


backToArenaBtn?.addEventListener(
    "click",
    returnToArena
);

returnToArenaBtn?.addEventListener(
    "click",
    returnToArena
);


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

onAuthStateChanged(auth, async user => {

    if (!user) {

        window.location.href = "auth.html";

        return;

    }

    currentUser = user;

    if (!battleId) {

        showError(
            "Battle ID is missing. Return to the Battle Arena."
        );

        if (battleStatus) {
            battleStatus.textContent = "Invalid battle";
        }

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

            showError(
                "Only registered students can enter battles."
            );

            return;

        }

        await enterBattleRoom();

    } catch (error) {

        console.error(
            "Student profile error:",
            error
        );

        showError(
            "Unable to load your student profile."
        );

    }

}


// ======================================================
// 9. ENTER BATTLE ROOM
// ======================================================

async function enterBattleRoom() {

    try {

        hideError();

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

        const playerOne =
            data.player1Id === uid;

        const playerTwo =
            data.player2Id === uid;

        if (!playerOne && !playerTwo) {

            showError(
                "You are not a participant in this battle."
            );

            return;

        }

        battleData = data;

        updatePlayerInformation();

        if (data.status === "completed") {

            displayBattleResult(data);

            await updateLeaderboardForCompletedBattle(data);

            return;

        }

        const enteredField = playerOne
            ? "player1Entered"
            : "player2Entered";

        if (data[enteredField] !== true) {

            await updateDoc(battleRef, {

                [enteredField]: true

            });

        }

        await prepareBattleIfReady();

        listenToBattle();

    } catch (error) {

        console.error(
            "Enter battle error:",
            error
        );

        showError(
            "Unable to enter the battle room. Check your Firestore permissions."
        );

    }

}


// ======================================================
// 10. LOAD BATTLE QUESTIONS
// ======================================================

async function loadBattleQuestions(data) {

    let questionsQuery;

    if (data.competitionId) {

        questionsQuery = query(

            collection(db, "battleQuestions"),

            where("published", "==", true),

            where(
                "battleQuizId",
                "==",
                data.competitionId
            )

        );

    } else {

        questionsQuery = query(

            collection(db, "battleQuestions"),

            where("published", "==", true)

        );

    }

    const questionSnapshot =
        await getDocs(questionsQuery);

    let availableQuestions = [];

    questionSnapshot.forEach(questionDoc => {

        availableQuestions.push({

            id: questionDoc.id,

            ...questionDoc.data()

        });

    });

    if (availableQuestions.length === 0) {

        throw new Error(
            "No published questions are available for this battle."
        );

    }

    const questionLimit = Math.max(

        1,

        Math.min(
            50,
            Math.floor(Number(data.questionLimit || 10))
        )

    );

    availableQuestions =
        shuffleArray(availableQuestions);

    availableQuestions =
        availableQuestions.slice(0, questionLimit);

    return availableQuestions.map(question => {

        return {

            id: question.id,

            question:
                question.question ||
                question.questionText ||
                "Question unavailable",

            options: question.options || {},

            correctAnswer: question.correctAnswer,

            marks: Math.max(
                1,
                Number(question.marks || 1)
            )

        };

    });

}


// ======================================================
// 11. PREPARE BATTLE
// ======================================================

async function prepareBattleIfReady() {

    if (isPreparingBattle) return;

    isPreparingBattle = true;

    try {

        const battleRef = doc(
            db,
            "battles",
            battleId
        );

        const battleSnap = await getDoc(battleRef);

        if (!battleSnap.exists()) return;

        const data = battleSnap.data();

        if (data.status !== "waiting") return;

        if (
            !data.player1Entered ||
            !data.player2Entered
        ) {

            showWaiting();

            if (battleStatus) {

                battleStatus.textContent =
                    "Waiting for opponent";

            }

            return;

        }

        // Validate the admin-configured duration.

        const durationSeconds =
            Number(data.durationSeconds);

        if (
            !Number.isFinite(durationSeconds) ||
            durationSeconds <= 0
        ) {

            throw new Error(
                "The administrator has not configured a valid battle duration."
            );

        }

        const formattedQuestions =
            await loadBattleQuestions(data);

        await runTransaction(db, async transaction => {

            const freshSnap =
                await transaction.get(battleRef);

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

            // Read the exact duration saved by the admin.

            const adminDuration =
                Number(freshData.durationSeconds);

            if (
                !Number.isFinite(adminDuration) ||
                adminDuration <= 0
            ) {

                throw new Error(
                    "Invalid admin battle duration."
                );

            }

            transaction.update(battleRef, {

                questions: formattedQuestions,

                status: "active",

                startedAt: serverTimestamp(),

                endsAt:
                    Date.now() + adminDuration * 1000,

                player1Score: 0,

                player2Score: 0,

                player1Answers: {},

                player2Answers: {}

            });

        });

    } catch (error) {

        console.error(
            "Battle preparation error:",
            error
        );

        showError(
            error.message ||
            "Could not prepare the battle. Check your Firestore rules and indexes."
        );

    } finally {

        isPreparingBattle = false;

    }

}


// ======================================================
// 12. LISTEN TO BATTLE
// ======================================================

function listenToBattle() {

    if (unsubscribeBattle) return;

    const battleRef = doc(
        db,
        "battles",
        battleId
    );

    unsubscribeBattle = onSnapshot(

        battleRef,

        async snapshot => {

            if (!snapshot.exists()) {

                showError("Battle not found.");

                return;

            }

            battleData = snapshot.data();

            hideError();

            updatePlayerInformation();

            // WAITING

            if (battleData.status === "waiting") {

                showWaiting();

                if (battleStatus) {

                    battleStatus.textContent =
                        "Waiting for opponent";

                }

                await prepareBattleIfReady();

                return;

            }

            // ACTIVE

            if (battleData.status === "active") {

                if (
                    !Array.isArray(battleData.questions) ||
                    battleData.questions.length === 0
                ) {

                    showError(
                        "Battle questions are not available."
                    );

                    return;

                }

                questions = battleData.questions;

                updateMyAnswers();

                showQuestions();

                if (battleStatus) {

                    battleStatus.textContent =
                        "Battle in progress";

                }

                startTimer();

                if (
                    currentQuestionIndex >= questions.length ||
                    (
                        questions[currentQuestionIndex] &&
                        myAnswers[questions[currentQuestionIndex].id]
                    )
                ) {

                    findNextUnansweredQuestion(
                        currentQuestionIndex + 1
                    );

                }

                displayQuestion();

                await checkAllQuestionsAnswered();

                return;

            }

            // COMPLETED

            if (battleData.status === "completed") {

                battleFinished = true;

                cleanupBattle();

                displayBattleResult(battleData);

                await updateLeaderboardForCompletedBattle(
                    battleData
                );

            }

        },

        error => {

            console.error(
                "Battle listener error:",
                error
            );

            showError(
                "Lost connection to the battle. Check your internet connection."
            );

        }

    );

}


// ======================================================
// 13. UPDATE PLAYER INFORMATION
// ======================================================

function updatePlayerInformation() {

    if (!battleData) return;

    if (playerOneName) {

        playerOneName.textContent =
            battleData.player1Name || "Player 1";

    }

    if (playerTwoName) {

        playerTwoName.textContent =
            battleData.player2Name || "Player 2";

    }

    if (playerOneScore) {

        playerOneScore.textContent =
            Number(battleData.player1Score || 0);

    }

    if (playerTwoScore) {

        playerTwoScore.textContent =
            Number(battleData.player2Score || 0);

    }

    const playerOne =
        currentUser?.uid === battleData.player1Id;

    document
        .getElementById("playerOneCard")
        ?.classList.toggle("active", playerOne);

    document
        .getElementById("playerTwoCard")
        ?.classList.toggle("active", !playerOne);

}


// ======================================================
// 14. UPDATE MY ANSWERS
// ======================================================

function updateMyAnswers() {

    if (!battleData) return;

    myAnswers = isPlayerOne()

        ? battleData.player1Answers || {}

        : battleData.player2Answers || {};

}


// ======================================================
// 15. FIND NEXT UNANSWERED QUESTION
// ======================================================

function findNextUnansweredQuestion(startIndex = 0) {

    if (questions.length === 0) {

        currentQuestionIndex = 0;

        return;

    }

    for (
        let i = startIndex;
        i < questions.length;
        i++
    ) {

        if (!myAnswers[questions[i].id]) {

            currentQuestionIndex = i;

            return;

        }

    }

    for (let i = 0; i < questions.length; i++) {

        if (!myAnswers[questions[i].id]) {

            currentQuestionIndex = i;

            return;

        }

    }

    currentQuestionIndex = questions.length;

}


// ======================================================
// 16. CHECK ANSWER CORRECTNESS
// ======================================================

function isAnswerCorrect(
    selectedAnswer,
    correctAnswer,
    options
) {

    const selected =
        normalizeAnswer(selectedAnswer);

    const correct =
        normalizeAnswer(correctAnswer);

    if (selected === correct) {

        return true;

    }

    if (Array.isArray(options)) {

        const letters = [
            "A",
            "B",
            "C",
            "D"
        ];

        const selectedIndex =
            letters.indexOf(
                String(selectedAnswer).toUpperCase()
            );

        if (selectedIndex >= 0) {

            return (
                normalizeAnswer(options[selectedIndex]) ===
                correct
            );

        }

    }

    if (
        options &&
        typeof options === "object"
    ) {

        const correctOption =
            options[correctAnswer];

        if (correctOption !== undefined) {

            return (
                selected ===
                normalizeAnswer(correctOption)
            );

        }

    }

    return false;

}


// ======================================================
// 17. DISPLAY QUESTION
// ======================================================

function displayQuestion() {

    if (battleFinished) return;

    if (!questions.length) return;

    if (currentQuestionIndex >= questions.length) {

        if (questionNumber) {

            questionNumber.textContent =
                `${questions.length} / ${questions.length}`;

        }

        if (questionText) {

            questionText.textContent =
                "You have completed all questions.";

        }

        if (questionMarks) {

            questionMarks.textContent = "0";

        }

        if (questionProgressBar) {

            questionProgressBar.style.width = "100%";

        }

        if (answerOptions) {

            answerOptions.innerHTML = "";

        }

        if (answerMessage) {

            answerMessage.textContent =
                "Waiting for your opponent to finish.";

            answerMessage.className =
                "answer-message";

        }

        if (nextQuestionBtn) {

            nextQuestionBtn.disabled = true;

            nextQuestionBtn.textContent =
                "Completed";

        }

        return;

    }

    const question =
        questions[currentQuestionIndex];

    const savedAnswer =
        myAnswers[question.id];

    if (questionNumber) {

        questionNumber.textContent =
            `${currentQuestionIndex + 1} / ${questions.length}`;

    }

    if (questionText) {

        questionText.textContent =
            question.question || "Question unavailable";

    }

    if (questionMarks) {

        questionMarks.textContent =
            question.marks || 1;

    }

    if (questionProgressBar) {

        questionProgressBar.style.width =
            `${((currentQuestionIndex + 1) / questions.length) * 100}%`;

    }

    if (answerOptions) {

        answerOptions.innerHTML = "";

    }

    if (answerMessage) {

        answerMessage.textContent = "";

        answerMessage.className =
            "answer-message";

    }

    if (nextQuestionBtn) {

        nextQuestionBtn.disabled = true;

        nextQuestionBtn.textContent =
            "Next Question →";

    }

    const options =
        question.options || {};

    let optionEntries = [];

    if (Array.isArray(options)) {

        optionEntries = options.map((option, index) => {

            return [

                ["A", "B", "C", "D"][index] ||
                String(index + 1),

                option

            ];

        });

    } else {

        optionEntries =
            Object.entries(options);

    }

    optionEntries.forEach(([letter, option]) => {

        const button =
            document.createElement("button");

        button.type = "button";

        button.className = "answer-option";

        const letterSpan =
            document.createElement("span");

        letterSpan.className =
            "answer-letter";

        letterSpan.textContent = letter;

        const textSpan =
            document.createElement("span");

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

                submitBattleAnswer(
                    letter,
                    button
                );

            });

        }

        answerOptions.appendChild(button);

    });

    if (savedAnswer) {

        if (answerMessage) {

            answerMessage.textContent =
                savedAnswer.isCorrect
                    ? "Correct answer! You earned points."
                    : "Incorrect answer. Better luck on the next question.";

            answerMessage.classList.add(
                savedAnswer.isCorrect
                    ? "success"
                    : "error"
            );

        }

        if (nextQuestionBtn) {

            nextQuestionBtn.disabled = false;

        }

    }

}


// ======================================================
// 18. SUBMIT ANSWER
// ======================================================

async function submitBattleAnswer(
    selectedAnswer,
    selectedButton
) {

    if (
        isSubmittingAnswer ||
        battleFinished ||
        !battleData
    ) {

        return;

    }

    const question =
        questions[currentQuestionIndex];

    if (!question) return;

    if (myAnswers[question.id]) return;

    isSubmittingAnswer = true;

    const answerField =
        getMyAnswerField();

    const scoreField =
        getMyScoreField();

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

        const saved = await runTransaction(
            db,
            async transaction => {

                const snapshot =
                    await transaction.get(battleRef);

                if (!snapshot.exists()) {

                    throw new Error(
                        "Battle no longer exists."
                    );

                }

                const data = snapshot.data();

                if (data.status !== "active") {

                    throw new Error(
                        "This battle is no longer active."
                    );

                }

                // Do not accept answers after the deadline.

                const endTime =
                    getTimestampMilliseconds(data.endsAt);

                if (
                    !endTime ||
                    Date.now() >= endTime
                ) {

                    throw new Error(
                        "Time is up. Your answer was not submitted."
                    );

                }

                const answers =
                    data[answerField] || {};

                if (answers[question.id]) {

                    return false;

                }

                const updatedAnswers = {

                    ...answers,

                    [question.id]: {

                        answer: selectedAnswer,

                        isCorrect: correct,

                        marks,

                        answeredAt: Date.now()

                    }

                };

                transaction.update(battleRef, {

                    [answerField]: updatedAnswers,

                    [scoreField]:
                        Number(data[scoreField] || 0) + marks

                });

                return true;

            }
        );

        if (!saved) {

            updateMyAnswers();

            displayQuestion();

            return;

        }

        myAnswers[question.id] = {

            answer: selectedAnswer,

            isCorrect: correct,

            marks,

            answeredAt: Date.now()

        };

        selectedButton.classList.add("selected");

        if (answerMessage) {

            answerMessage.textContent = correct
                ? `Correct! You earned ${marks} points.`
                : "Incorrect answer. Keep going!";

            answerMessage.className = correct
                ? "answer-message success"
                : "answer-message error";

        }

        answerOptions
            ?.querySelectorAll("button")
            .forEach(button => {

                button.disabled = true;

            });

        if (nextQuestionBtn) {

            nextQuestionBtn.disabled = false;

        }

        if (
            questions.every(
                item => Boolean(myAnswers[item.id])
            )
        ) {

            currentQuestionIndex =
                questions.length;

            displayQuestion();

        }

    } catch (error) {

        console.error(
            "Answer submission error:",
            error
        );

        showError(
            error.message ||
            "Unable to submit your answer."
        );

    } finally {

        isSubmittingAnswer = false;

    }

}


// ======================================================
// 19. NEXT QUESTION
// ======================================================

nextQuestionBtn?.addEventListener(
    "click",
    () => {

        if (
            nextQuestionBtn.disabled ||
            battleFinished
        ) {

            return;

        }

        findNextUnansweredQuestion(
            currentQuestionIndex + 1
        );

        displayQuestion();

    }
);


// ======================================================
// 20. CHECK COMPLETION
// ======================================================

async function checkAllQuestionsAnswered() {

    if (
        !battleData ||
        battleFinished ||
        questions.length === 0
    ) {

        return;

    }

    const playerOneAnswers =
        battleData.player1Answers || {};

    const playerTwoAnswers =
        battleData.player2Answers || {};

    const playerOneCompleted =
        questions.every(question => {

            return Boolean(
                playerOneAnswers[question.id]
            );

        });

    const playerTwoCompleted =
        questions.every(question => {

            return Boolean(
                playerTwoAnswers[question.id]
            );

        });

    if (
        playerOneCompleted &&
        playerTwoCompleted
    ) {

        await finishBattle("completed");

    }

}


// ======================================================
// 21. START TIMER
// ======================================================

function startTimer() {

    if (timerInterval) return;

    if (!battleData.endsAt) {

        showError(
            "Battle timer is unavailable."
        );

        return;

    }

    const endTime =
        getTimestampMilliseconds(
            battleData.endsAt
        );

    if (!endTime) {

        showError(
            "Invalid battle timer."
        );

        return;

    }

    function updateTimer() {

        const remaining = Math.max(

            0,

            Math.ceil(
                (endTime - Date.now()) / 1000
            )

        );

        if (battleTimer) {

            battleTimer.textContent =
                formatTime(remaining);

            if (remaining <= 10) {

                battleTimer.classList.add("danger");

            } else {

                battleTimer.classList.remove("danger");

            }

        }

        if (remaining <= 0) {

            clearInterval(timerInterval);

            timerInterval = null;

            finishBattle("time");

        }

    }

    updateTimer();

    timerInterval = setInterval(
        updateTimer,
        1000
    );

}


// ======================================================
// 22. FINISH BATTLE
// ======================================================

async function finishBattle(reason) {

    if (
        battleFinished ||
        isFinishingBattle
    ) {

        return;

    }

    isFinishingBattle = true;

    const battleRef = doc(
        db,
        "battles",
        battleId
    );

    try {

        await runTransaction(
            db,
            async transaction => {

                const snapshot =
                    await transaction.get(battleRef);

                if (!snapshot.exists()) {

                    return;

                }

                const data = snapshot.data();

                if (data.status !== "active") {

                    return;

                }

                const scoreOne =
                    Number(data.player1Score || 0);

                const scoreTwo =
                    Number(data.player2Score || 0);

                let winnerId = "";

                let winnerName = "Draw";

                if (scoreOne > scoreTwo) {

                    winnerId = data.player1Id;

                    winnerName =
                        data.player1Name || "Player 1";

                } else if (scoreTwo > scoreOne) {

                    winnerId = data.player2Id;

                    winnerName =
                        data.player2Name || "Player 2";

                }

                transaction.update(battleRef, {

                    status: "completed",

                    winnerId,

                    winnerName,

                    finalScore:
                        `${scoreOne} - ${scoreTwo}`,

                    completedAt: serverTimestamp(),

                    completionReason: reason

                });

            }
        );

    } catch (error) {

        console.error(
            "Battle completion error:",
            error
        );

        showError(
            "Unable to finish the battle. Firestore rejected the completion update. Check your security rules."
        );

    } finally {

        isFinishingBattle = false;

    }

}


// ======================================================
// 23. UPDATE LEADERBOARD
// ======================================================

async function updateLeaderboardForCompletedBattle(data) {

    if (!currentUser || !data) return;

    if (leaderboardUpdateStarted) return;

    const uid = currentUser.uid;

    if (
        uid !== data.player1Id &&
        uid !== data.player2Id
    ) {

        return;

    }

    leaderboardUpdateStarted = true;

    let playerName = "";

    let earnedXP = 0;

    let result = "";

    if (uid === data.player1Id) {

        playerName =
            data.player1Name || "Student";

    } else {

        playerName =
            data.player2Name || "Student";

    }

    if (!data.winnerId) {

        earnedXP = 10;

        result = "draw";

    } else if (data.winnerId === uid) {

        earnedXP = 20;

        result = "win";

    } else {

        earnedXP = 5;

        result = "defeat";

    }

    const leaderboardRef = doc(
        db,
        "battleLeaderboard",
        uid
    );

    try {

        await runTransaction(db, async transaction => {

            const snapshot =
                await transaction.get(leaderboardRef);

            const existing = snapshot.exists()
                ? snapshot.data()
                : {};

            const completedBattles =
                existing.completedBattleIds || [];

            if (
                completedBattles.includes(battleId)
            ) {

                return;

            }

            transaction.set(
                leaderboardRef,
                {

                    studentId: uid,

                    fullName: playerName,

                    xp:
                        Number(existing.xp || 0) + earnedXP,

                    wins:
                        Number(existing.wins || 0) +
                        (result === "win" ? 1 : 0),

                    defeats:
                        Number(existing.defeats || 0) +
                        (result === "defeat" ? 1 : 0),

                    draws:
                        Number(existing.draws || 0) +
                        (result === "draw" ? 1 : 0),

                    battlesPlayed:
                        Number(existing.battlesPlayed || 0) + 1,

                    completedBattleIds: [

                        ...completedBattles,

                        battleId

                    ],

                    updatedAt: serverTimestamp()

                },
                { merge: true }
            );

        });

        console.log(
            "Leaderboard updated successfully."
        );

    } catch (error) {

        console.error(
            "Leaderboard update error:",
            error
        );

        leaderboardUpdateStarted = false;

    }

}


// ======================================================
// 24. DISPLAY BATTLE RESULT
// ======================================================

function displayBattleResult(data) {

    cleanupBattle();

    battleFinished = true;

    questionSection?.classList.add("hidden");

    waitingMessage?.classList.add("hidden");

    battleResult?.classList.remove("hidden");

    if (battleStatus) {

        battleStatus.textContent =
            "Battle completed";

    }

    if (battleTimer) {

        battleTimer.textContent =
            "00:00";

    }

    updatePlayerInformation();

    const playerOne =
        currentUser.uid === data.player1Id;

    const myScore = playerOne

        ? Number(data.player1Score || 0)

        : Number(data.player2Score || 0);

    const opponentScore = playerOne

        ? Number(data.player2Score || 0)

        : Number(data.player1Score || 0);

    if (!data.winnerId) {

        if (winnerText) {

            winnerText.textContent =
                "It's a Draw!";

        }

    } else if (
        data.winnerId === currentUser.uid
    ) {

        if (winnerText) {

            winnerText.textContent =
                "Congratulations! You Won!";

        }

    } else {

        if (winnerText) {

            winnerText.textContent =
                "You Lost This Battle";

        }

    }

    if (finalScore) {

        finalScore.textContent =
            `Your score: ${myScore} | Opponent's score: ${opponentScore}`;

    }

}


// ======================================================
// 25. INITIAL PAGE STATE
// ======================================================

showWaiting();

if (battleStatus) {

    battleStatus.textContent =
        "Connecting...";

}

hideError();


// ======================================================
// END OF LEARNSPHERE BATTLE ROOM
// ======================================================