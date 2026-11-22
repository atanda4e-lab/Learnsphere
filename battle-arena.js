
/* =====================================================
   LEARNSPHERE BATTLE ARENA
   COMPLETE FIREBASE ARENA ENGINE
   Firebase SDK 12.2.1
===================================================== */

/* =====================================================
   1. FIREBASE IMPORTS
===================================================== */

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
    updateDoc,
    addDoc,
    runTransaction,
    onSnapshot,
    serverTimestamp,
    limit
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";

/* =====================================================
   2. GLOBAL VARIABLES
===================================================== */

let currentStudent = null;
let currentBattleId = null;
let currentCompetitionId = "random";

let queueUnsubscribe = null;
let matchmakingInProgress = false;
let opponentSearchInProgress = false;
let notificationTimer = null;

let availableCompetitions = [];

/* =====================================================
   3. HTML ELEMENTS
===================================================== */

const studentName = document.getElementById("studentName");
const studentLevel = document.getElementById("studentLevel");

const totalBattles = document.getElementById("totalBattles");
const totalWins = document.getElementById("totalWins");
const totalLosses = document.getElementById("totalLosses");
const totalXP = document.getElementById("totalXP");

const randomMatchBtn = document.getElementById("randomMatchBtn");
const cancelMatchBtn = document.getElementById("cancelMatchBtn");

const matchmakingStatus = document.getElementById("matchmakingStatus");
const matchStatusTitle = document.getElementById("matchStatusTitle");
const matchStatusMessage = document.getElementById("matchStatusMessage");

const matchedOpponentBox = document.getElementById("matchedOpponentBox");
const matchedOpponentName = document.getElementById("matchedOpponentName");
const enterBattleBtn = document.getElementById("enterBattleBtn");

const challengeStudentId = document.getElementById("challengeStudentId");
const sendChallengeBtn = document.getElementById("sendChallengeBtn");
const challengeStatus = document.getElementById("challengeStatus");

const competitionsContainer =
    document.getElementById("competitionsContainer");

const battleHistoryContainer =
    document.getElementById("battleHistoryContainer");

const leaderboardContainer =
    document.getElementById("leaderboardContainer");

const notification = document.getElementById("notification");

const backDashboardBtn =
    document.getElementById("backDashboardBtn");

/* =====================================================
   4. GENERAL FUNCTIONS
===================================================== */

function showNotification(message) {

    if (!notification) return;

    notification.textContent = message;
    notification.classList.add("show");

    clearTimeout(notificationTimer);

    notificationTimer = setTimeout(() => {
        notification.classList.remove("show");
    }, 4000);
}

function normalize(value) {

    return String(value || "")
        .trim()
        .toLowerCase();
}

function escapeHTML(value) {

    return String(value ?? "").replace(/[&<>"']/g, character => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return entities[character];
    });
}

function setMatchStatus(title, message) {

    if (matchStatusTitle) {
        matchStatusTitle.textContent = title;
    }

    if (matchStatusMessage) {
        matchStatusMessage.textContent = message;
    }
}

function setMatchButtons(searching) {

    if (randomMatchBtn) {
        randomMatchBtn.disabled = searching;
    }

    if (cancelMatchBtn) {
        cancelMatchBtn.hidden = !searching;
    }
}

function getCompetition(competitionId) {

    return availableCompetitions.find(item =>
        item.id === competitionId
    );
}

function getCompetitionTitle(competitionId) {

    const competition = getCompetition(competitionId);

    return competition?.title ||
        competition?.courseTitle ||
        "Battle Competition";
}

/* =====================================================
   5. AUTHENTICATION
===================================================== */

onAuthStateChanged(auth, async user => {

    if (!user) {

        window.location.href = "auth.html";
        return;
    }

    try {

        await loadStudentProfile(user.uid);

        await loadCompetitions();

        await loadStudentStats();

        await loadBattleHistory();

        await loadLeaderboard();

        listenToOwnQueue();

        await recoverExistingBattle();

    } catch (error) {

        console.error("Arena initialization error:", error);

        showNotification(
            "Unable to load Battle Arena: " + error.message
        );
    }

});

/* =====================================================
   6. LOAD STUDENT PROFILE
===================================================== */

async function loadStudentProfile(uid) {

    const studentRef = doc(db, "students", uid);

    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {

        throw new Error(
            "Student profile was not found. Please contact the administrator."
        );
    }

    currentStudent = {
        uid: uid,
        ...studentSnap.data()
    };

    if (currentStudent.role &&
        currentStudent.role !== "student") {

        throw new Error("Only student accounts can enter the Battle Arena.");
    }

    if (studentName) {

        studentName.textContent =
            currentStudent.fullName || "Student";
    }

    if (studentLevel) {

        studentLevel.textContent =
            currentStudent.level || "--";
    }

}

/* =====================================================
   7. LOAD AVAILABLE COMPETITIONS
===================================================== */

async function loadCompetitions() {

    if (!competitionsContainer) return;

    competitionsContainer.innerHTML =
        "<p>Loading competitions...</p>";

    const competitionsRef = collection(db, "battleQuizzes");

    const competitionsQuery = query(
        competitionsRef,
        where("published", "==", true),
        limit(30)
    );

    const snapshot = await getDocs(competitionsQuery);

    availableCompetitions = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

    if (availableCompetitions.length === 0) {

        competitionsContainer.innerHTML =
            "<p>No published competitions are available yet.</p>";

        return;
    }

    competitionsContainer.innerHTML =
        availableCompetitions.map(item => {

            const title = escapeHTML(
                item.title || item.courseTitle || "Competition"
            );

            const description = escapeHTML(
                item.description || "Test your knowledge against another student."
            );

            return `
                <div class="competition-card">

                    <h3>${title}</h3>

                    <p>${description}</p>

                    <button
                        class="primary-btn competition-match-btn"
                        data-competition="${escapeHTML(item.id)}"
                    >
                        Join Competition
                    </button>

                </div>
            `;

        }).join("");

    document.querySelectorAll(".competition-match-btn")
        .forEach(button => {

            button.addEventListener("click", () => {

                const competitionId =
                    button.dataset.competition;

                startMatchmaking(competitionId);

            });

        });

}

/* =====================================================
   8. START RANDOM MATCH
===================================================== */

async function startRandomMatch() {

    await startMatchmaking("random");

}

/* =====================================================
   9. START MATCHMAKING
===================================================== */

async function startMatchmaking(competitionId = "random") {

    if (!currentStudent) {
        showNotification("Student profile is not ready.");
        return;
    }

    if (matchmakingInProgress) return;

    matchmakingInProgress = true;

    currentCompetitionId = competitionId;

    setMatchButtons(true);

    try {

        const ownQueueRef = doc(
            db,
            "battleQueue",
            currentStudent.uid
        );

        const ownQueueSnap = await getDoc(ownQueueRef);

        // =====================================
        // CHECK PREVIOUS QUEUE
        // =====================================

        if (ownQueueSnap.exists()) {

            const oldData = ownQueueSnap.data();

            if (
                oldData.status === "matched" &&
                oldData.matchedBattleId
            ) {

                const oldBattleRef = doc(
                    db,
                    "battles",
                    oldData.matchedBattleId
                );

                const oldBattleSnap = await getDoc(oldBattleRef);

                // Previous battle is still active.
                if (
                    oldBattleSnap.exists() &&
                    oldBattleSnap.data().status !== "completed"
                ) {

                    currentBattleId = oldData.matchedBattleId;

                    showEnterBattleButton();

                    showNotification(
                        "You already have an active battle."
                    );

                    return;
                }

                // Previous battle is completed or missing.
                // Release the old matchmaking entry.

                await updateDoc(ownQueueRef, {

                    status: "cancelled",

                    matchedBattleId: null,

                    opponentName: null,

                    cancelledAt: serverTimestamp()

                });

                currentBattleId = null;

                if (matchedOpponentBox) {
                    matchedOpponentBox.hidden = true;
                }

            }

            // Already waiting for an opponent.
            else if (oldData.status === "waiting") {

                if (
                    normalize(oldData.competitionId) ===
                    normalize(competitionId)
                ) {

                    setMatchStatus(
                        "Searching for Opponent",
                        "You are already in the queue. Searching for another student..."
                    );

                    await findAvailableOpponent(competitionId);

                    return;

                } else {

                    await updateDoc(ownQueueRef, {

                        status: "cancelled",

                        cancelledAt: serverTimestamp()

                    });

                }

            }

        }

        // =====================================
        // CREATE NEW MATCHMAKING REQUEST
        // =====================================

        await setDoc(ownQueueRef, {

            studentId: currentStudent.uid,

            fullName: currentStudent.fullName || "Student",

            department: currentStudent.department || "",

            level: currentStudent.level || "",

            competitionId: competitionId,

            status: "waiting",

            createdAt: serverTimestamp(),

            matchedBattleId: null,

            opponentName: null

        });

        currentBattleId = null;

        setMatchStatus(
            "Searching for Opponent",
            "Your new matchmaking request is active."
        );

        await findAvailableOpponent(competitionId);

    } catch (error) {

        console.error("Matchmaking error:", error);

        showNotification(
            "Matchmaking failed: " + error.message
        );

        setMatchStatus(
            "Matchmaking Failed",
            "Please try again."
        );

    } finally {

        matchmakingInProgress = false;

        if (!currentBattleId) {
            setMatchButtons(false);
        }

    }

}

/* =====================================================
   10. FIND AVAILABLE OPPONENT
===================================================== */

async function findAvailableOpponent(competitionId) {

    if (opponentSearchInProgress) return;

    opponentSearchInProgress = true;

    try {

        const queueRef = collection(db, "battleQueue");

        const waitingQuery = query(
            queueRef,
            where("status", "==", "waiting"),
            limit(50)
        );

        const queueSnapshot = await getDocs(waitingQuery);

        let opponentFound = false;

        for (const opponentDocument of queueSnapshot.docs) {

            const opponentId = opponentDocument.id;

            const opponentData = opponentDocument.data();

            if (opponentId === currentStudent.uid) continue;

            if (
                normalize(opponentData.competitionId) !==
                normalize(competitionId)
            ) continue;

            if (!opponentData.studentId) continue;

            const ownQueueRef = doc(
                db,
                "battleQueue",
                currentStudent.uid
            );

            const opponentQueueRef = doc(
                db,
                "battleQueue",
                opponentId
            );

            const battleRef = doc(collection(db, "battles"));

            try {

                await runTransaction(db, async transaction => {

                    const ownSnap =
                        await transaction.get(ownQueueRef);

                    const opponentSnap =
                        await transaction.get(opponentQueueRef);

                    if (!ownSnap.exists() || !opponentSnap.exists()) {

                        throw new Error("Queue entry no longer exists.");
                    }

                    const ownData = ownSnap.data();

                    const opponentCurrent = opponentSnap.data();

                    if (
                        ownData.status !== "waiting" ||
                        opponentCurrent.status !== "waiting"
                    ) {

                        throw new Error(
                            "One student has already been matched."
                        );
                    }

                    if (
                        normalize(ownData.competitionId) !==
                        normalize(opponentCurrent.competitionId)
                    ) {

                        throw new Error("Competition mismatch.");
                    }

                    const competition =
                        getCompetition(competitionId);

                    const battleData = {

                        player1Id: currentStudent.uid,

                        player2Id: opponentId,

                        player1Name:
                            currentStudent.fullName || "Student",

                        player2Name:
                            opponentCurrent.fullName || "Student",

                        competitionId:
                            competitionId === "random"
                                ? null
                                : competitionId,

                        competitionTitle:
                            competitionId === "random"
                                ? "Random Battle"
                                : getCompetitionTitle(competitionId),

                        questionLimit:
                            Number(competition?.questionLimit || 10),

                        durationSeconds:
                            Number(competition?.durationSeconds || 60),

                        status: "waiting",

                        createdAt: serverTimestamp(),

                        player1Score: 0,

                        player2Score: 0,

                        player1Answers: {},

                        player2Answers: {}

                    };
                    console.log("MATCH DATA CHECK", {
    currentUid: currentStudent.uid,
    opponentId,
    durationSeconds: battleData.durationSeconds,
    durationType: typeof battleData.durationSeconds,
    battleDataKeys: Object.keys(battleData)
});
                    transaction.set(battleRef, battleData);

                    transaction.update(ownQueueRef, {

                        status: "matched",

                        matchedBattleId: battleRef.id,

                        opponentName:
                            opponentCurrent.fullName || "Student"

                    });

                    transaction.update(opponentQueueRef, {

                        status: "matched",

                        matchedBattleId: battleRef.id,

                        opponentName:
                            currentStudent.fullName || "Student"

                    });

                });

              currentBattleId = battleRef.id;

opponentFound = true;

matchedOpponentName.textContent =
    "Matched with " +
    (opponentData.fullName || "Student");

showEnterBattleButton();

showNotification("Opponent found!");

break;

            } catch (error) {

                if (error.code === "resource-exhausted") {
                    throw error;
                }

              console.error("OPPONENT MATCHING FAILED:", {
    code: error.code,
    message: error.message,
    error: error
});
            }

        }

        if (!opponentFound && !currentBattleId) {

            setMatchStatus(
                "Waiting for Opponent",
                "You are in the queue. Waiting for another student."
            );

        }

    } finally {

        opponentSearchInProgress = false;

    }

}

/* =====================================================
   11. LISTEN TO OWN QUEUE
===================================================== */

function listenToOwnQueue() {

    if (!currentStudent) return;

    if (queueUnsubscribe) {
        queueUnsubscribe();
    }

    const queueRef = doc(
        db,
        "battleQueue",
        currentStudent.uid
    );

    queueUnsubscribe = onSnapshot(
        queueRef,
        snapshot => {

            if (!snapshot.exists()) return;

            const data = snapshot.data();

            if (
                data.status === "matched" &&
                data.matchedBattleId
            ) {

                currentBattleId = data.matchedBattleId;

                if (matchedOpponentName) {

                    matchedOpponentName.textContent =
                        "Matched with " +
                        (data.opponentName || "Student");

                }

                showEnterBattleButton();

            }

            if (data.status === "waiting") {

                currentBattleId = null;

                if (matchedOpponentBox) {
                    matchedOpponentBox.hidden = true;
                }

                setMatchStatus(
                    "Waiting for Opponent",
                    "You are in the matchmaking queue."
                );

                setMatchButtons(true);

            }

            if (data.status === "cancelled") {

                currentBattleId = null;

                if (matchedOpponentBox) {
                    matchedOpponentBox.hidden = true;
                }

                setMatchStatus(
                    "Ready to Play Again",
                    "Your previous matchmaking session has ended. Find another opponent."
                );

                setMatchButtons(false);

            }

        },
        error => {

            console.error("Queue listener error:", error);

        }
    );

}

/* =====================================================
   12. SHOW ENTER BATTLE BUTTON
===================================================== */

function showEnterBattleButton() {

    if (!currentBattleId) return;

    matchedOpponentBox.hidden = false;

    setMatchStatus(
        "Opponent Found!",
        "Your battle room is ready."
    );

    setMatchButtons(false);

}

/* =====================================================
   13. ENTER BATTLE ROOM
===================================================== */

function enterBattleRoom() {

    if (!currentBattleId) {

        showNotification("No active battle was found.");
        return;
    }

    window.location.href =
        "battle-room.html?battleId=" +
        encodeURIComponent(currentBattleId);

}

/* =====================================================
   14. CANCEL MATCHMAKING
===================================================== */

async function cancelMatchmaking() {

    if (!currentStudent) return;

    if (currentBattleId) {

        showNotification(
            "A battle has already been created. You cannot cancel this queue."
        );

        return;
    }

    try {

        const queueRef = doc(
            db,
            "battleQueue",
            currentStudent.uid
        );

        await updateDoc(queueRef, {

            status: "cancelled",

            cancelledAt: serverTimestamp()

        });

        setMatchStatus(
            "Search Cancelled",
            "You have left the matchmaking queue."
        );

        setMatchButtons(false);

        showNotification("Matchmaking cancelled.");

    } catch (error) {

        console.error("Cancel matchmaking error:", error);

        showNotification(
            "Unable to cancel matchmaking: " + error.message
        );

    }

}

/* =====================================================
   15. RECOVER EXISTING BATTLE
===================================================== */

async function recoverExistingBattle() {

    if (!currentStudent) return;

    const queueRef = doc(
        db,
        "battleQueue",
        currentStudent.uid
    );

    const queueSnap = await getDoc(queueRef);

    if (!queueSnap.exists()) return;

    const data = queueSnap.data();

    if (
        data.status === "matched" &&
        data.matchedBattleId
    ) {

        const battleRef = doc(
            db,
            "battles",
            data.matchedBattleId
        );

        const battleSnap = await getDoc(battleRef);

        // Previous battle is completed or no longer exists.
        if (
            !battleSnap.exists() ||
            battleSnap.data().status === "completed"
        ) {

            await updateDoc(queueRef, {

                status: "cancelled",

                matchedBattleId: null,

                opponentName: null,

                cancelledAt: serverTimestamp()

            });

            currentBattleId = null;

            setMatchStatus(
                "Ready to Play Again",
                "Your previous battle has ended. You can find another opponent."
            );

            setMatchButtons(false);

            return;

        }

        // Previous battle is still active.
        currentBattleId = data.matchedBattleId;

        if (matchedOpponentName) {

            matchedOpponentName.textContent =
                "Matched with " +
                (data.opponentName || "Student");

        }

        showEnterBattleButton();

    } else if (data.status === "waiting") {

        currentBattleId = null;

        setMatchStatus(
            "Waiting for Opponent",
            "You are already in the matchmaking queue."
        );

        setMatchButtons(true);

    }

}

/* =====================================================
   16. SEND STUDENT CHALLENGE
===================================================== */

async function sendStudentChallenge() {

    if (!currentStudent) return;

    const opponentId =
        challengeStudentId.value.trim();

    if (!opponentId) {

        challengeStatus.textContent =
            "Enter the student's ID first.";

        return;
    }

    if (opponentId === currentStudent.uid) {

        challengeStatus.textContent =
            "You cannot challenge yourself.";

        return;
    }

    sendChallengeBtn.disabled = true;

    challengeStatus.textContent =
        "Sending challenge...";

    try {

        const opponentRef = doc(
            db,
            "students",
            opponentId
        );

        const opponentSnap = await getDoc(opponentRef);

        if (!opponentSnap.exists()) {

            throw new Error("Student account was not found.");
        }

        const opponentData = opponentSnap.data();

        await addDoc(
            collection(db, "battleChallenges"),
            {

                challengerId: currentStudent.uid,

                challengerName:
                    currentStudent.fullName || "Student",

                opponentId: opponentId,

                opponentName:
                    opponentData.fullName || "Student",

                status: "pending",

                createdAt: serverTimestamp()

            }
        );

        challengeStatus.textContent =
            "Challenge sent successfully.";

        challengeStudentId.value = "";

        showNotification("Challenge sent.");

    } catch (error) {

        console.error("Challenge error:", error);

        challengeStatus.textContent =
            "Challenge failed: " + error.message;

    } finally {

        sendChallengeBtn.disabled = false;

    }

}

/* =====================================================
   17. LOAD STUDENT BATTLE STATISTICS
===================================================== */

async function loadStudentStats() {

    if (!currentStudent) return;

    const battlesRef = collection(db, "battles");

    const playerOneQuery = query(
        battlesRef,
        where("player1Id", "==", currentStudent.uid),
        limit(100)
    );

    const playerTwoQuery = query(
        battlesRef,
        where("player2Id", "==", currentStudent.uid),
        limit(100)
    );

    const [playerOneSnap, playerTwoSnap] =
        await Promise.all([
            getDocs(playerOneQuery),
            getDocs(playerTwoQuery)
        ]);

    const battleMap = new Map();

    playerOneSnap.docs.forEach(item => {
        battleMap.set(item.id, item.data());
    });

    playerTwoSnap.docs.forEach(item => {
        battleMap.set(item.id, item.data());
    });

    const battles = Array.from(battleMap.values());

    const completed = battles.filter(item =>
        item.status === "completed"
    );

    let wins = 0;
    let losses = 0;
    let xp = 0;

    completed.forEach(battle => {

        const isPlayerOne =
            battle.player1Id === currentStudent.uid;

        const myScore = Number(
            isPlayerOne
                ? battle.player1Score || 0
                : battle.player2Score || 0
        );

        const opponentScore = Number(
            isPlayerOne
                ? battle.player2Score || 0
                : battle.player1Score || 0
        );

        if (myScore > opponentScore) {
            wins++;
            xp += 20;
        } else if (myScore < opponentScore) {
            losses++;
            xp += 5;
        }

    });

    totalBattles.textContent = battles.length;

    totalWins.textContent = wins;

    totalLosses.textContent = losses;

    totalXP.textContent = xp;

}

/* =====================================================
   18. LOAD BATTLE HISTORY
===================================================== */

async function loadBattleHistory() {

    if (!currentStudent || !battleHistoryContainer) return;

    battleHistoryContainer.innerHTML =
        "<p>Loading battle history...</p>";

    const battlesRef = collection(db, "battles");

    const firstQuery = query(
        battlesRef,
        where("player1Id", "==", currentStudent.uid),
        limit(20)
    );

    const secondQuery = query(
        battlesRef,
        where("player2Id", "==", currentStudent.uid),
        limit(20)
    );

    const [firstSnap, secondSnap] =
        await Promise.all([
            getDocs(firstQuery),
            getDocs(secondQuery)
        ]);

    const battleMap = new Map();

    firstSnap.docs.forEach(item => {
        battleMap.set(item.id, {
            id: item.id,
            ...item.data()
        });
    });

    secondSnap.docs.forEach(item => {
        battleMap.set(item.id, {
            id: item.id,
            ...item.data()
        });
    });

    const battles = Array.from(battleMap.values());

    battles.sort((a, b) => {

        const timeA = a.createdAt?.toMillis?.() || 0;

        const timeB = b.createdAt?.toMillis?.() || 0;

        return timeB - timeA;

    });

    if (battles.length === 0) {

        battleHistoryContainer.innerHTML =
            "<p>No battle history available yet.</p>";

        return;
    }

    battleHistoryContainer.innerHTML =
        battles.slice(0, 10).map(battle => {

            const isPlayerOne =
                battle.player1Id === currentStudent.uid;

            const opponentName = isPlayerOne
                ? battle.player2Name
                : battle.player1Name;

            const myScore = isPlayerOne
                ? battle.player1Score
                : battle.player2Score;

            const opponentScore = isPlayerOne
                ? battle.player2Score
                : battle.player1Score;

            let result = "In Progress";

            let resultClass = "";

            if (battle.status === "completed") {

                if (Number(myScore) > Number(opponentScore)) {

                    result = "Victory";
                    resultClass = "win-label";

                } else if (Number(myScore) < Number(opponentScore)) {

                    result = "Defeat";
                    resultClass = "loss-label";

                } else {

                    result = "Draw";

                }

            }

            return `
                <div class="history-item">

                    <div>
                        <strong>${escapeHTML(opponentName || "Student")}</strong>
                        <p>${Number(myScore || 0)} - ${Number(opponentScore || 0)}</p>
                    </div>

                    <span class="${resultClass}">
                        ${result}
                    </span>

                </div>
            `;

        }).join("");

}

/* =====================================================
   19. LOAD LEADERBOARD
===================================================== */

async function loadLeaderboard() {

    if (!leaderboardContainer) return;

    leaderboardContainer.innerHTML =
        "<p>Loading leaderboard...</p>";

    const leaderboardRef =
        collection(db, "battleLeaderboard");

    const leaderboardQuery = query(
        leaderboardRef,
        limit(20)
    );

    const snapshot = await getDocs(leaderboardQuery);

    if (snapshot.empty) {

        leaderboardContainer.innerHTML =
            "<p>The leaderboard is not available yet.</p>";

        return;
    }

    const students = snapshot.docs.map(item => ({
        id: item.id,
        ...item.data()
    }));

    students.sort((a, b) =>
        Number(b.xp || 0) - Number(a.xp || 0)
    );

    leaderboardContainer.innerHTML =
        students.slice(0, 10).map((student, index) => {

            return `
                <div class="leaderboard-item">

                    <div>
                        <strong>
                            ${index + 1}. ${escapeHTML(student.fullName || "Student")}
                        </strong>

                        <p>${Number(student.wins || 0)} victories</p>
                    </div>

                    <strong>${Number(student.xp || 0)} XP</strong>

                </div>
            `;

        }).join("");

}

/* =====================================================
   20. BUTTON EVENTS
===================================================== */

if (randomMatchBtn) {

    randomMatchBtn.addEventListener("click", startRandomMatch);

}

if (cancelMatchBtn) {

    cancelMatchBtn.addEventListener(
        "click",
        cancelMatchmaking
    );

}

if (enterBattleBtn) {

    enterBattleBtn.addEventListener(
        "click",
        enterBattleRoom
    );

}

if (sendChallengeBtn) {

    sendChallengeBtn.addEventListener(
        "click",
        sendStudentChallenge
    );

}

if (backDashboardBtn) {

    backDashboardBtn.addEventListener("click", () => {

        window.location.href = "dashboard.html";

    });

}

/* =====================================================
   21. CLEANUP
===================================================== */

window.addEventListener("pagehide", () => {

    if (queueUnsubscribe) {

        queueUnsubscribe();

        queueUnsubscribe = null;

    }

});