/* =========================================================
   LEARNSPHERE BATTLE ARENA
   Complete student-side Firebase engine
   Firebase SDK 12.2.1

   Competition battles always use questionLimit and
   durationSeconds saved by the administrator in battleQuizzes.
========================================================= */


/* =========================================================
   1. FIREBASE IMPORTS
========================================================= */

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


/* =========================================================
   2. GLOBAL STATE
========================================================= */

let currentStudent = null;
let currentBattleId = null;
let currentCompetitionId = "random";

let queueUnsubscribe = null;
let incomingChallengesUnsubscribe = null;
let outgoingChallengesUnsubscribe = null;

let matchmakingInProgress = false;
let opponentSearchInProgress = false;
let notificationTimer = null;

let availableCompetitions = [];

const processingChallenges = new Set();


/* =========================================================
   3. HTML ELEMENTS
========================================================= */

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

const incomingChallengesContainer =
    document.getElementById("incomingChallengesContainer");

const competitionsContainer =
    document.getElementById("competitionsContainer");

const battleHistoryContainer =
    document.getElementById("battleHistoryContainer");

const leaderboardContainer =
    document.getElementById("leaderboardContainer");

const notification = document.getElementById("notification");
const backDashboardBtn = document.getElementById("backDashboardBtn");


/* =========================================================
   4. GENERAL HELPERS
========================================================= */

function showNotification(message) {
    if (!notification) {
        console.log(message);
        return;
    }

    notification.textContent = message;
    notification.classList.add("show");

    clearTimeout(notificationTimer);

    notificationTimer = setTimeout(() => {
        notification.classList.remove("show");
    }, 4000);
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


function normalize(value) {
    return String(value ?? "").trim().toLowerCase();
}


function setMatchStatus(title, message) {
    if (matchStatusTitle) {
        matchStatusTitle.textContent = title;
    }

    if (matchStatusMessage) {
        matchStatusMessage.textContent = message;
    }

    if (matchmakingStatus) {
        matchmakingStatus.hidden = false;
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
    return availableCompetitions.find(item => item.id === competitionId);
}


function getCompetitionTitle(competitionId) {
    const competition = getCompetition(competitionId);

    return competition?.title ||
        competition?.courseTitle ||
        "Battle Competition";
}


/*
   Random battles and direct challenges do not have a selected
   competition document of their own. In those cases, use the
   settings from the first published competition configured by
   the administrator. Never replace an admin-entered competition
   duration with a hardcoded 60-second value.
*/

function getBattleSettings(competitionId = "random") {
    let settingsCompetition = null;

    if (competitionId && competitionId !== "random") {
        settingsCompetition = getCompetition(competitionId);
    } else {
        settingsCompetition = availableCompetitions[0] || null;
    }

    if (!settingsCompetition) {
        throw new Error(
            "No published competition settings are available. Ask the administrator to publish a competition first."
        );
    }

    const questionLimit = Number(settingsCompetition.questionLimit);
    const durationSeconds = Number(settingsCompetition.durationSeconds);

    if (!Number.isInteger(questionLimit) || questionLimit < 1) {
        throw new Error(
            "The administrator has not configured a valid question limit for this competition."
        );
    }

    if (!Number.isInteger(durationSeconds) || durationSeconds < 1) {
        throw new Error(
            "The administrator has not configured a valid battle duration for this competition."
        );
    }

    return {
        questionLimit,
        durationSeconds,
        settingsCompetitionId: settingsCompetition.id
    };
}


function showEnterBattleButton() {
    if (!currentBattleId) return;

    if (matchedOpponentBox) {
        matchedOpponentBox.hidden = false;
    }

    setMatchStatus(
        "Opponent Found!",
        "Your battle room is ready. Enter the battle."
    );

    setMatchButtons(false);
}


function setMatchedOpponent(name) {
    if (matchedOpponentName) {
        matchedOpponentName.textContent = "Matched with " + (name || "Student");
    }
}


function getTimestampValue(timestamp) {
    if (timestamp?.toMillis) {
        return timestamp.toMillis();
    }

    if (typeof timestamp === "number") {
        return timestamp;
    }

    return 0;
}


/* =========================================================
   5. AUTHENTICATION AND INITIALIZATION
========================================================= */

onAuthStateChanged(auth, async user => {
    if (!user) {
        window.location.href = "auth.html";
        return;
    }

    try {
        await loadStudentProfile(user.uid);
        await loadCompetitions();

        await Promise.all([
            loadStudentStats(),
            loadBattleHistory(),
            loadLeaderboard()
        ]);

        listenToOwnQueue();
        listenToIncomingChallenges();
        listenToOutgoingChallenges();

        await recoverExistingBattle();

    } catch (error) {
        console.error("Battle Arena initialization error:", error);

        showNotification(
            "Unable to load Battle Arena: " + error.message
        );
    }
});


/* =========================================================
   6. STUDENT PROFILE
========================================================= */

async function loadStudentProfile(uid) {
    const studentRef = doc(db, "students", uid);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
        throw new Error(
            "Student profile was not found. Please contact the administrator."
        );
    }

    currentStudent = {
        uid,
        ...studentSnap.data()
    };

    if (
        currentStudent.role &&
        currentStudent.role !== "student"
    ) {
        throw new Error(
            "Only student accounts can enter the Battle Arena."
        );
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


/* =========================================================
   7. LOAD PUBLISHED COMPETITIONS
========================================================= */

async function loadCompetitions() {
    if (!competitionsContainer) return;

    competitionsContainer.innerHTML =
        "<p>Loading competitions...</p>";

    const competitionsQuery = query(
        collection(db, "battleQuizzes"),
        where("published", "==", true),
        limit(50)
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
                item.description ||
                "Test your knowledge against another student."
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

    competitionsContainer
        .querySelectorAll(".competition-match-btn")
        .forEach(button => {
            button.addEventListener("click", () => {
                startMatchmaking(button.dataset.competition);
            });
        });
}


/* =========================================================
   8. RANDOM MATCH BUTTON
========================================================= */

async function startRandomMatch() {
    await startMatchmaking("random");
}


/* =========================================================
   9. START MATCHMAKING
========================================================= */

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
        // Validate the configured battle settings before joining.
        const battleSettings = getBattleSettings(competitionId);

        const ownQueueRef = doc(
            db,
            "battleQueue",
            currentStudent.uid
        );

        const ownQueueSnap = await getDoc(ownQueueRef);

        if (ownQueueSnap.exists()) {
            const oldData = ownQueueSnap.data();

            // Do not overwrite an active direct challenge.
            if (
                oldData.challengeId &&
                (
                    oldData.status === "waiting" ||
                    oldData.status === "matched"
                )
            ) {
                if (
                    oldData.status === "matched" &&
                    oldData.matchedBattleId
                ) {
                    currentBattleId = oldData.matchedBattleId;
                    setMatchedOpponent(oldData.opponentName);
                    showEnterBattleButton();
                } else {
                    setMatchStatus(
                        "Direct Challenge Active",
                        "You already have an active direct challenge."
                    );
                }

                showNotification(
                    "You already have an active direct challenge."
                );
                return;
            }

            // Recover an existing active battle.
            if (
                oldData.status === "matched" &&
                oldData.matchedBattleId
            ) {
                const oldBattleSnap = await getDoc(
                    doc(db, "battles", oldData.matchedBattleId)
                );

                if (
                    oldBattleSnap.exists() &&
                    oldBattleSnap.data().status !== "completed"
                ) {
                    currentBattleId = oldData.matchedBattleId;
                    setMatchedOpponent(oldData.opponentName);
                    showEnterBattleButton();
                    showNotification("You already have an active battle.");
                    return;
                }

                await updateDoc(ownQueueRef, {
                    status: "cancelled",
                    matchedBattleId: null,
                    opponentName: null,
                    cancelledAt: serverTimestamp()
                });
            }

            // Reuse an existing queue if it is already waiting
            // for the same matchmaking type.
            else if (oldData.status === "waiting") {
                if (
                    normalize(oldData.competitionId) ===
                    normalize(competitionId)
                ) {
                    setMatchStatus(
                        "Searching for Opponent",
                        "You are already in the queue. Searching for another student..."
                    );

                    await findAvailableOpponent(
                        competitionId,
                        battleSettings
                    );
                    return;
                }

                await updateDoc(ownQueueRef, {
                    status: "cancelled",
                    cancelledAt: serverTimestamp()
                });
            }
        }

        await setDoc(ownQueueRef, {
            studentId: currentStudent.uid,
            fullName: currentStudent.fullName || "Student",
            department: currentStudent.department || "",
            level: currentStudent.level || "",
            competitionId,
            status: "waiting",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            matchedBattleId: null,
            opponentName: null,
            challengeId: null
        });

        currentBattleId = null;

        if (matchedOpponentBox) {
            matchedOpponentBox.hidden = true;
        }

        setMatchStatus(
            "Searching for Opponent",
            "Your matchmaking request is active. Waiting for another student..."
        );

        await findAvailableOpponent(
            competitionId,
            battleSettings
        );

    } catch (error) {
        console.error("Matchmaking error:", error);

        showNotification("Matchmaking failed: " + error.message);

        setMatchStatus(
            "Matchmaking Failed",
            "Please try again."
        );

    } finally {
        matchmakingInProgress = false;

        // Keep the cancel button visible while the queue is waiting.
        if (!currentBattleId) {
            const queueSnap = await getDoc(
                doc(db, "battleQueue", currentStudent.uid)
            ).catch(() => null);

            const stillWaiting =
                queueSnap?.exists() &&
                queueSnap.data().status === "waiting" &&
                !queueSnap.data().challengeId;

            setMatchButtons(Boolean(stillWaiting));
        }
    }
}


/* =========================================================
   10. FIND AN AVAILABLE OPPONENT
========================================================= */

async function findAvailableOpponent(
    competitionId,
    battleSettings
) {
    if (opponentSearchInProgress) return;

    opponentSearchInProgress = true;

    try {
        const waitingQuery = query(
            collection(db, "battleQueue"),
            where("status", "==", "waiting"),
            limit(100)
        );

        const queueSnapshot = await getDocs(waitingQuery);

        for (const opponentDocument of queueSnapshot.docs) {
            const opponentId = opponentDocument.id;
            const opponentData = opponentDocument.data();

            if (opponentId === currentStudent.uid) continue;

            // Direct challenge queues must never enter normal matchmaking.
            if (opponentData.challengeId) continue;

            if (
                normalize(opponentData.competitionId) !==
                normalize(competitionId)
            ) {
                continue;
            }

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
                        ownData.challengeId ||
                        opponentCurrent.challengeId
                    ) {
                        throw new Error(
                            "Direct challenge queues cannot enter normal matchmaking."
                        );
                    }

                    if (
                        normalize(ownData.competitionId) !==
                        normalize(opponentCurrent.competitionId)
                    ) {
                        throw new Error("Competition mismatch.");
                    }

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

                        questionLimit: battleSettings.questionLimit,
                        durationSeconds: battleSettings.durationSeconds,

                        status: "waiting",
                        createdAt: serverTimestamp(),

                        player1Score: 0,
                        player2Score: 0,
                        player1Answers: {},
                        player2Answers: {}
                    };

                    transaction.set(battleRef, battleData);

                    transaction.update(ownQueueRef, {
                        status: "matched",
                        matchedBattleId: battleRef.id,
                        opponentName:
                            opponentCurrent.fullName || "Student",
                        updatedAt: serverTimestamp()
                    });

                    transaction.update(opponentQueueRef, {
                        status: "matched",
                        matchedBattleId: battleRef.id,
                        opponentName:
                            currentStudent.fullName || "Student",
                        updatedAt: serverTimestamp()
                    });
                });

                currentBattleId = battleRef.id;

                setMatchedOpponent(
                    opponentData.fullName || "Student"
                );

                showEnterBattleButton();
                showNotification("Opponent found!");

                return;

            } catch (error) {
                // Another student may have claimed this queue first.
                // Continue looking instead of stopping the whole search.
                console.info(
                    "This opponent was not available:",
                    error.message
                );
            }
        }

        if (!currentBattleId) {
            setMatchStatus(
                "Waiting for Opponent",
                "You are in the queue. Waiting for another student."
            );
        }

    } finally {
        opponentSearchInProgress = false;
    }
}


/* =========================================================
   11. LISTEN TO THE STUDENT'S QUEUE
========================================================= */

function listenToOwnQueue() {
    if (!currentStudent) return;

    if (queueUnsubscribe) {
        queueUnsubscribe();
        queueUnsubscribe = null;
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

                setMatchedOpponent(data.opponentName);
                showEnterBattleButton();
                return;
            }

            if (data.status === "waiting") {
                currentBattleId = null;

                if (matchedOpponentBox) {
                    matchedOpponentBox.hidden = true;
                }

                if (data.challengeId) {
                    setMatchStatus(
                        "Direct Challenge Accepted",
                        "Waiting for the student who challenged you to connect the battle."
                    );
                } else {
                    setMatchStatus(
                        "Waiting for Opponent",
                        "You are in the matchmaking queue."
                    );
                }

                setMatchButtons(true);
                return;
            }

            if (data.status === "cancelled") {
                currentBattleId = null;

                if (matchedOpponentBox) {
                    matchedOpponentBox.hidden = true;
                }

                setMatchStatus(
                    "Ready to Play Again",
                    "Your previous matchmaking session has ended."
                );

                setMatchButtons(false);
            }
        },
        error => {
            console.error("Queue listener error:", error);
            showNotification(
                "Queue update error: " + error.message
            );
        }
    );
}


/* =========================================================
   12. ENTER THE BATTLE ROOM
========================================================= */

function enterBattleRoom() {
    if (!currentBattleId) {
        showNotification("No active battle was found.");
        return;
    }

    window.location.href =
        "battle-room.html?battleId=" +
        encodeURIComponent(currentBattleId);
}


/* =========================================================
   13. CANCEL MATCHMAKING
========================================================= */

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

        const queueSnap = await getDoc(queueRef);

        if (!queueSnap.exists()) {
            showNotification(
                "No active matchmaking request was found."
            );
            setMatchButtons(false);
            return;
        }

        const queueData = queueSnap.data();

        if (
            queueData.status !== "waiting" ||
            queueData.challengeId
        ) {
            showNotification(
                "This queue cannot be cancelled using the matchmaking controls."
            );
            return;
        }

        await updateDoc(queueRef, {
            status: "cancelled",
            cancelledAt: serverTimestamp(),
            updatedAt: serverTimestamp()
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


/* =========================================================
   14. RECOVER AN EXISTING BATTLE OR QUEUE
========================================================= */

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
        const battleSnap = await getDoc(
            doc(db, "battles", data.matchedBattleId)
        );

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

        currentBattleId = data.matchedBattleId;
        setMatchedOpponent(data.opponentName);
        showEnterBattleButton();
        return;
    }

    if (data.status === "waiting") {
        currentBattleId = null;

        if (data.challengeId) {
            setMatchStatus(
                "Direct Challenge Accepted",
                "Waiting for the challenger to connect the battle."
            );
        } else {
            setMatchStatus(
                "Waiting for Opponent",
                "You are already in the matchmaking queue."
            );
        }

        setMatchButtons(true);
    }
}


/* =========================================================
   15. LISTEN TO INCOMING CHALLENGES
========================================================= */

function listenToIncomingChallenges() {
    if (!currentStudent || !incomingChallengesContainer) return;

    if (incomingChallengesUnsubscribe) {
        incomingChallengesUnsubscribe();
    }

    const challengesQuery = query(
        collection(db, "battleChallenges"),
        where("opponentId", "==", currentStudent.uid),
        where("status", "==", "pending"),
        limit(30)
    );

    incomingChallengesUnsubscribe = onSnapshot(
        challengesQuery,
        snapshot => {
            if (snapshot.empty) {
                incomingChallengesContainer.innerHTML =
                    "<p>You have no pending battle challenges.</p>";
                return;
            }

            incomingChallengesContainer.innerHTML =
                snapshot.docs.map(item => {
                    const challenge = item.data();

                    return `
                        <div class="competition-card">
                            <h3>
                                ${escapeHTML(
                                    challenge.challengerName || "Student"
                                )}
                            </h3>

                            <p>Has challenged you to a battle.</p>

                            <div class="match-options">
                                <button
                                    class="primary-btn accept-challenge-btn"
                                    data-id="${escapeHTML(item.id)}"
                                >
                                    Accept
                                </button>

                                <button
                                    class="danger-btn reject-challenge-btn"
                                    data-id="${escapeHTML(item.id)}"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    `;
                }).join("");

            incomingChallengesContainer
                .querySelectorAll(".accept-challenge-btn")
                .forEach(button => {
                    button.addEventListener("click", () => {
                        respondToChallenge(
                            button.dataset.id,
                            "accepted"
                        );
                    });
                });

            incomingChallengesContainer
                .querySelectorAll(".reject-challenge-btn")
                .forEach(button => {
                    button.addEventListener("click", () => {
                        respondToChallenge(
                            button.dataset.id,
                            "rejected"
                        );
                    });
                });
        },
        error => {
            console.error("Incoming challenges error:", error);

            incomingChallengesContainer.innerHTML =
                "<p>Unable to load incoming challenges.</p>";
        }
    );
}


/* =========================================================
   16. ACCEPT OR REJECT A CHALLENGE
========================================================= */

async function respondToChallenge(challengeId, response) {
    if (!currentStudent) return;

    try {
        const challengeRef = doc(
            db,
            "battleChallenges",
            challengeId
        );

        const queueRef = doc(
            db,
            "battleQueue",
            currentStudent.uid
        );

        await runTransaction(db, async transaction => {
            // All transaction reads happen before any writes.
            const challengeSnap =
                await transaction.get(challengeRef);

            const queueSnap =
                await transaction.get(queueRef);

            if (!challengeSnap.exists()) {
                throw new Error("Challenge no longer exists.");
            }

            const challenge = challengeSnap.data();

            if (challenge.opponentId !== currentStudent.uid) {
                throw new Error(
                    "This invitation belongs to another student."
                );
            }

            if (challenge.status !== "pending") {
                throw new Error(
                    "This invitation has already been answered."
                );
            }

            if (response === "rejected") {
                transaction.update(challengeRef, {
                    status: "rejected",
                    respondedAt: serverTimestamp()
                });
                return;
            }

            if (response !== "accepted") {
                throw new Error("Invalid challenge response.");
            }

            if (queueSnap.exists()) {
                const existingQueue = queueSnap.data();

                if (
                    existingQueue.status === "waiting" ||
                    existingQueue.status === "matched"
                ) {
                    throw new Error(
                        "You already have an active battle session. Finish it first."
                    );
                }
            }

            transaction.set(queueRef, {
                studentId: currentStudent.uid,
                fullName: currentStudent.fullName || "Student",
                department: currentStudent.department || "",
                level: currentStudent.level || "",

                status: "waiting",
                matchedBattleId: null,

                opponentName:
                    challenge.challengerName || "Student",

                competitionId: "direct_" + challengeId,
                competitionTitle: "Direct Challenge",
                challengeId,

                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            transaction.update(challengeRef, {
                status: "accepted",
                respondedAt: serverTimestamp()
            });
        });

        showNotification(
            response === "accepted"
                ? "Challenge accepted! Waiting for the challenger."
                : "Challenge rejected."
        );

    } catch (error) {
        console.error("Challenge response error:", error);
        showNotification(error.message);
    }
}


/* =========================================================
   17. LISTEN TO OUTGOING CHALLENGES
========================================================= */

function listenToOutgoingChallenges() {
    if (!currentStudent) return;

    if (outgoingChallengesUnsubscribe) {
        outgoingChallengesUnsubscribe();
    }

    const challengesQuery = query(
        collection(db, "battleChallenges"),
        where("challengerId", "==", currentStudent.uid),
        limit(50)
    );

    outgoingChallengesUnsubscribe = onSnapshot(
        challengesQuery,
        snapshot => {
            snapshot.docs.forEach(item => {
                const challenge = item.data();

                if (challenge.status !== "accepted") return;
                if (processingChallenges.has(item.id)) return;

                handleAcceptedChallenge(item.id, challenge);
            });
        },
        error => {
            console.error("Outgoing challenges error:", error);
        }
    );
}


/* =========================================================
   18. PROCESS AN ACCEPTED DIRECT CHALLENGE
========================================================= */

async function handleAcceptedChallenge(challengeId, challenge) {
    if (!currentStudent) return;
    if (processingChallenges.has(challengeId)) return;

    processingChallenges.add(challengeId);

    try {
        const battleSettings = getBattleSettings("random");

        const challengeRef = doc(
            db,
            "battleChallenges",
            challengeId
        );

        const ownQueueRef = doc(
            db,
            "battleQueue",
            currentStudent.uid
        );

        const opponentQueueRef = doc(
            db,
            "battleQueue",
            challenge.opponentId
        );

        /*
           PHASE 1:
           Ensure the challenger has a queue entry for this
           exact direct challenge.
        */

        const phaseOneBattleId = await runTransaction(
            db,
            async transaction => {
                const challengeSnap =
                    await transaction.get(challengeRef);

                const ownQueueSnap =
                    await transaction.get(ownQueueRef);

                if (!challengeSnap.exists()) {
                    throw new Error("Challenge no longer exists.");
                }

                const currentChallenge = challengeSnap.data();

                if (currentChallenge.status !== "accepted") {
                    throw new Error(
                        "This challenge has not been accepted."
                    );
                }

                if (
                    currentChallenge.challengerId !==
                    currentStudent.uid
                ) {
                    throw new Error("This is not your challenge.");
                }

                if (
                    currentChallenge.opponentId !==
                    challenge.opponentId
                ) {
                    throw new Error("Challenge opponent mismatch.");
                }

                if (ownQueueSnap.exists()) {
                    const ownQueue = ownQueueSnap.data();

                    if (
                        ownQueue.challengeId === challengeId &&
                        ownQueue.status === "matched" &&
                        ownQueue.matchedBattleId
                    ) {
                        return ownQueue.matchedBattleId;
                    }

                    if (
                        ownQueue.challengeId === challengeId &&
                        ownQueue.status === "waiting"
                    ) {
                        return null;
                    }

                    if (
                        ownQueue.status === "waiting" ||
                        ownQueue.status === "matched"
                    ) {
                        throw new Error(
                            "You already have another active battle session. Finish it first."
                        );
                    }
                }

                transaction.set(ownQueueRef, {
                    studentId: currentStudent.uid,
                    fullName: currentStudent.fullName || "Student",
                    department: currentStudent.department || "",
                    level: currentStudent.level || "",

                    status: "waiting",
                    matchedBattleId: null,

                    opponentName:
                        currentChallenge.opponentName || "Student",

                    competitionId: "direct_" + challengeId,
                    competitionTitle: "Direct Challenge",
                    challengeId,

                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });

                return null;
            }
        );

        if (phaseOneBattleId) {
            currentBattleId = phaseOneBattleId;
            setMatchedOpponent(challenge.opponentName);
            showEnterBattleButton();
            return;
        }

        /*
           PHASE 2:
           Create one battle only. The transaction returns the
           actual existing or newly created battle ID, so a
           second browser tab cannot overwrite it with an unused ID.
        */

        const proposedBattleRef = doc(collection(db, "battles"));

        const actualBattleId = await runTransaction(
            db,
            async transaction => {
                const challengeSnap =
                    await transaction.get(challengeRef);

                const ownQueueSnap =
                    await transaction.get(ownQueueRef);

                const opponentQueueSnap =
                    await transaction.get(opponentQueueRef);

                if (
                    !challengeSnap.exists() ||
                    !ownQueueSnap.exists() ||
                    !opponentQueueSnap.exists()
                ) {
                    throw new Error(
                        "One of the students is not in the battle queue."
                    );
                }

                const currentChallenge = challengeSnap.data();
                const ownQueue = ownQueueSnap.data();
                const opponentQueue = opponentQueueSnap.data();

                if (currentChallenge.status !== "accepted") {
                    throw new Error(
                        "Challenge acceptance is no longer valid."
                    );
                }

                if (
                    currentChallenge.challengerId !==
                    currentStudent.uid
                ) {
                    throw new Error("You are not the challenger.");
                }

                if (
                    ownQueue.studentId !== currentStudent.uid ||
                    opponentQueue.studentId !== currentChallenge.opponentId
                ) {
                    throw new Error("Queue ownership could not be verified.");
                }

                if (
                    ownQueue.challengeId !== challengeId ||
                    opponentQueue.challengeId !== challengeId
                ) {
                    throw new Error(
                        "The students are not waiting for the same challenge."
                    );
                }

                // If another tab already created the battle, reuse it.
                if (
                    ownQueue.status === "matched" &&
                    ownQueue.matchedBattleId
                ) {
                    return ownQueue.matchedBattleId;
                }

                if (
                    opponentQueue.status === "matched" &&
                    opponentQueue.matchedBattleId
                ) {
                    return opponentQueue.matchedBattleId;
                }

                if (
                    ownQueue.status !== "waiting" ||
                    opponentQueue.status !== "waiting"
                ) {
                    throw new Error(
                        "One of the students is no longer waiting."
                    );
                }

                const battleData = {
                    player1Id: currentStudent.uid,
                    player2Id: currentChallenge.opponentId,

                    player1Name:
                        currentStudent.fullName || "Student",

                    player2Name:
                        opponentQueue.fullName || "Student",

                    // Keep null so the existing battle-room.js
                    // loads published battle questions normally.
                    competitionId: null,
                    competitionTitle: "Direct Challenge",

                    questionLimit: battleSettings.questionLimit,
                    durationSeconds: battleSettings.durationSeconds,

                    status: "waiting",
                    createdAt: serverTimestamp(),

                    player1Score: 0,
                    player2Score: 0,
                    player1Answers: {},
                    player2Answers: {},

                    challengeId
                };

                transaction.set(proposedBattleRef, battleData);

                transaction.update(ownQueueRef, {
                    status: "matched",
                    matchedBattleId: proposedBattleRef.id,
                    opponentName:
                        opponentQueue.fullName || "Student",
                    updatedAt: serverTimestamp()
                });

                transaction.update(opponentQueueRef, {
                    status: "matched",
                    matchedBattleId: proposedBattleRef.id,
                    opponentName:
                        currentStudent.fullName || "Student",
                    updatedAt: serverTimestamp()
                });

                return proposedBattleRef.id;
            }
        );

        currentBattleId = actualBattleId;

        setMatchedOpponent(challenge.opponentName || "Student");

        showNotification(
            "Your challenge has been accepted! Your battle is ready."
        );

        setMatchStatus(
            "Direct Battle Ready",
            "Your opponent accepted your challenge. Enter the battle room."
        );

        showEnterBattleButton();

    } catch (error) {
        console.error(
            "Accepted challenge processing error:",
            error
        );

        showNotification(
            "Direct challenge error: " + error.message
        );

    } finally {
        processingChallenges.delete(challengeId);
    }
}


/* =========================================================
   19. SEND A STUDENT CHALLENGE
========================================================= */

async function sendStudentChallenge() {
    if (!currentStudent || !challengeStudentId) return;

    const opponentId = challengeStudentId.value.trim();

    if (!opponentId) {
        if (challengeStatus) {
            challengeStatus.textContent =
                "Enter the student's ID first.";
        }
        return;
    }

    if (opponentId === currentStudent.uid) {
        if (challengeStatus) {
            challengeStatus.textContent =
                "You cannot challenge yourself.";
        }
        return;
    }

    if (sendChallengeBtn) {
        sendChallengeBtn.disabled = true;
    }

    if (challengeStatus) {
        challengeStatus.textContent = "Sending challenge...";
    }

    try {
        // Confirm there are published admin settings for this battle.
        getBattleSettings("random");

        const opponentRef = doc(
            db,
            "students",
            opponentId
        );

        const opponentSnap = await getDoc(opponentRef);

        if (!opponentSnap.exists()) {
            throw new Error(
                "Student account was not found. Check the student ID."
            );
        }

        const opponentData = opponentSnap.data();

        if (
            opponentData.role &&
            opponentData.role !== "student"
        ) {
            throw new Error(
                "You can only challenge another student."
            );
        }

        await addDoc(
            collection(db, "battleChallenges"),
            {
                challengerId: currentStudent.uid,
                challengerName:
                    currentStudent.fullName || "Student",
                opponentId,
                status: "pending",
                createdAt: serverTimestamp()
            }
        );

        if (challengeStatus) {
            challengeStatus.textContent =
                "Challenge sent successfully!";
        }

        challengeStudentId.value = "";

        showNotification("Battle challenge sent.");

    } catch (error) {
        console.error("Challenge error:", error);

        if (challengeStatus) {
            challengeStatus.textContent =
                "Challenge failed: " + error.message;
        }

    } finally {
        if (sendChallengeBtn) {
            sendChallengeBtn.disabled = false;
        }
    }
}


/* =========================================================
   20. LOAD STUDENT BATTLE STATISTICS
========================================================= */

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

    const [playerOneSnap, playerTwoSnap] = await Promise.all([
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

    const completed = battles.filter(
        battle => battle.status === "completed"
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

    if (totalBattles) {
        totalBattles.textContent = battles.length;
    }

    if (totalWins) {
        totalWins.textContent = wins;
    }

    if (totalLosses) {
        totalLosses.textContent = losses;
    }

    if (totalXP) {
        totalXP.textContent = xp;
    }
}


/* =========================================================
   21. LOAD BATTLE HISTORY
========================================================= */

async function loadBattleHistory() {
    if (!currentStudent || !battleHistoryContainer) return;

    battleHistoryContainer.innerHTML =
        "<p>Loading battle history...</p>";

    const battlesRef = collection(db, "battles");

    const firstQuery = query(
        battlesRef,
        where("player1Id", "==", currentStudent.uid),
        limit(50)
    );

    const secondQuery = query(
        battlesRef,
        where("player2Id", "==", currentStudent.uid),
        limit(50)
    );

    const [firstSnap, secondSnap] = await Promise.all([
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
        return (
            getTimestampValue(b.createdAt) -
            getTimestampValue(a.createdAt)
        );
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
                        <strong>
                            ${escapeHTML(opponentName || "Student")}
                        </strong>
                        <p>
                            ${Number(myScore || 0)}
                            -
                            ${Number(opponentScore || 0)}
                        </p>
                    </div>

                    <span class="${resultClass}">
                        ${result}
                    </span>
                </div>
            `;
        }).join("");
}


/* =========================================================
   22. LOAD LEADERBOARD
========================================================= */

async function loadLeaderboard() {
    if (!leaderboardContainer) return;

    leaderboardContainer.innerHTML =
        "<p>Loading leaderboard...</p>";

    const leaderboardQuery = query(
        collection(db, "battleLeaderboard"),
        limit(50)
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

    students.sort((a, b) => {
        return Number(b.xp || 0) - Number(a.xp || 0);
    });

    leaderboardContainer.innerHTML =
        students.slice(0, 10).map((student, index) => {
            return `
                <div class="leaderboard-item">
                    <div>
                        <strong>
                            ${index + 1}.
                            ${escapeHTML(student.fullName || "Student")}
                        </strong>
                        <p>
                            ${Number(student.wins || 0)} victories
                        </p>
                    </div>

                    <strong>
                        ${Number(student.xp || 0)} XP
                    </strong>
                </div>
            `;
        }).join("");
}


/* =========================================================
   23. BUTTON EVENTS
========================================================= */

if (randomMatchBtn) {
    randomMatchBtn.addEventListener(
        "click",
        startRandomMatch
    );
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
        window.location.href = "student-dashboard.html";
    });
}


/* =========================================================
   24. CLEANUP
========================================================= */

window.addEventListener("pagehide", () => {
    if (queueUnsubscribe) {
        queueUnsubscribe();
        queueUnsubscribe = null;
    }

    if (incomingChallengesUnsubscribe) {
        incomingChallengesUnsubscribe();
        incomingChallengesUnsubscribe = null;
    }

    if (outgoingChallengesUnsubscribe) {
        outgoingChallengesUnsubscribe();
        outgoingChallengesUnsubscribe = null;
    }

    clearTimeout(notificationTimer);
});