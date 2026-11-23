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

// Prevent the same accepted challenge from being processed
// repeatedly by the Firestore listener.

const processedAcceptedChallenges = new Set();


/* =====================================================
   3. HTML ELEMENTS
===================================================== */

const studentName =
    document.getElementById("studentName");

const studentLevel =
    document.getElementById("studentLevel");

const totalBattles =
    document.getElementById("totalBattles");

const totalWins =
    document.getElementById("totalWins");

const totalLosses =
    document.getElementById("totalLosses");

const totalXP =
    document.getElementById("totalXP");


const randomMatchBtn =
    document.getElementById("randomMatchBtn");

const cancelMatchBtn =
    document.getElementById("cancelMatchBtn");


const matchmakingStatus =
    document.getElementById("matchmakingStatus");

const matchStatusTitle =
    document.getElementById("matchStatusTitle");

const matchStatusMessage =
    document.getElementById("matchStatusMessage");


const matchedOpponentBox =
    document.getElementById("matchedOpponentBox");

const matchedOpponentName =
    document.getElementById("matchedOpponentName");

const enterBattleBtn =
    document.getElementById("enterBattleBtn");


const challengeStudentId =
    document.getElementById("challengeStudentId");

const sendChallengeBtn =
    document.getElementById("sendChallengeBtn");

const challengeStatus =
    document.getElementById("challengeStatus");

const incomingChallengesContainer =
    document.getElementById("incomingChallengesContainer");


const competitionsContainer =
    document.getElementById("competitionsContainer");

const battleHistoryContainer =
    document.getElementById("battleHistoryContainer");

const leaderboardContainer =
    document.getElementById("leaderboardContainer");


const notification =
    document.getElementById("notification");

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


        // LISTEN TO STUDENT QUEUE

        listenToOwnQueue();


        // LISTEN TO INCOMING CHALLENGES

        listenToIncomingChallenges();


        // LISTEN TO OUTGOING CHALLENGES

        listenToOutgoingChallenges();


        // RECOVER PREVIOUS BATTLE

        await recoverExistingBattle();


    } catch (error) {

        console.error(
            "Arena initialization error:",
            error
        );

        showNotification(
            "Unable to load Battle Arena: " + error.message
        );

    }

});


/* =====================================================
   6. LOAD STUDENT PROFILE
===================================================== */

async function loadStudentProfile(uid) {

    const studentRef = doc(
        db,
        "students",
        uid
    );

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


/* =====================================================
   7. LOAD AVAILABLE COMPETITIONS
===================================================== */

async function loadCompetitions() {

    if (!competitionsContainer) return;

    competitionsContainer.innerHTML =
        "<p>Loading competitions...</p>";


    const competitionsRef = collection(
        db,
        "battleQuizzes"
    );


    const competitionsQuery = query(
        competitionsRef,
        where("published", "==", true),
        limit(30)
    );


    const snapshot = await getDocs(
        competitionsQuery
    );


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

        showNotification(
            "Student profile is not ready."
        );

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


        const ownQueueSnap = await getDoc(
            ownQueueRef
        );


        /* =====================================
           CHECK PREVIOUS QUEUE
        ===================================== */

        if (ownQueueSnap.exists()) {

            const oldData = ownQueueSnap.data();


            // Do not replace an active direct challenge.

            if (
                oldData.challengeId &&
                (
                    oldData.status === "waiting" ||
                    oldData.status === "matched"
                )
            ) {

                showNotification(
                    "You already have an active direct challenge."
                );

                return;

            }


            // CHECK PREVIOUS MATCHED BATTLE

            if (
                oldData.status === "matched" &&
                oldData.matchedBattleId
            ) {

                const oldBattleRef = doc(
                    db,
                    "battles",
                    oldData.matchedBattleId
                );


                const oldBattleSnap = await getDoc(
                    oldBattleRef
                );


                if (
                    oldBattleSnap.exists() &&
                    oldBattleSnap.data().status !== "completed"
                ) {

                    currentBattleId =
                        oldData.matchedBattleId;

                    showEnterBattleButton();

                    showNotification(
                        "You already have an active battle."
                    );

                    return;

                }


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


            // ALREADY WAITING FOR AN OPPONENT

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
                        competitionId
                    );

                    return;

                } else {

                    await updateDoc(ownQueueRef, {

                        status: "cancelled",

                        cancelledAt: serverTimestamp()

                    });

                }

            }

        }


        /* =====================================
           CREATE NEW MATCHMAKING REQUEST
        ===================================== */

        await setDoc(ownQueueRef, {

            studentId: currentStudent.uid,

            fullName:
                currentStudent.fullName || "Student",

            department:
                currentStudent.department || "",

            level:
                currentStudent.level || "",

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


        await findAvailableOpponent(
            competitionId
        );


    } catch (error) {

        console.error(
            "Matchmaking error:",
            error
        );


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

        const queueRef = collection(
            db,
            "battleQueue"
        );


        const waitingQuery = query(
            queueRef,
            where("status", "==", "waiting"),
            limit(50)
        );


        const queueSnapshot = await getDocs(
            waitingQuery
        );


        let opponentFound = false;


        for (const opponentDocument of queueSnapshot.docs) {

            const opponentId = opponentDocument.id;

            const opponentData =
                opponentDocument.data();


            if (opponentId === currentStudent.uid) {
                continue;
            }


            // NEVER MATCH DIRECT CHALLENGE QUEUES
            // THROUGH RANDOM MATCHMAKING.

            if (opponentData.challengeId) {
                continue;
            }


            if (
                normalize(opponentData.competitionId) !==
                normalize(competitionId)
            ) {
                continue;
            }


            if (!opponentData.studentId) {
                continue;
            }


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


            const battleRef = doc(
                collection(db, "battles")
            );


            try {

                await runTransaction(
                    db,
                    async transaction => {

                        const ownSnap =
                            await transaction.get(ownQueueRef);


                        const opponentSnap =
                            await transaction.get(opponentQueueRef);


                        if (
                            !ownSnap.exists() ||
                            !opponentSnap.exists()
                        ) {

                            throw new Error(
                                "Queue entry no longer exists."
                            );

                        }


                        const ownData = ownSnap.data();

                        const opponentCurrent =
                            opponentSnap.data();


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
                                "Direct challenge queues cannot enter random matchmaking."
                            );

                        }


                        if (
                            normalize(ownData.competitionId) !==
                            normalize(opponentCurrent.competitionId)
                        ) {

                            throw new Error(
                                "Competition mismatch."
                            );

                        }


                        const competition =
                            getCompetition(competitionId);


                        const battleData = {

                            player1Id:
                                currentStudent.uid,

                            player2Id:
                                opponentId,

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
                                Number(
                                    competition?.questionLimit || 10
                                ),

                            durationSeconds:
                                Number(
                                    competition?.durationSeconds || 60
                                ),

                            status: "waiting",

                            createdAt: serverTimestamp(),

                            player1Score: 0,

                            player2Score: 0,

                            player1Answers: {},

                            player2Answers: {}

                        };


                        transaction.set(
                            battleRef,
                            battleData
                        );


                        transaction.update(
                            ownQueueRef,
                            {

                                status: "matched",

                                matchedBattleId: battleRef.id,

                                opponentName:
                                    opponentCurrent.fullName || "Student"

                            }
                        );


                        transaction.update(
                            opponentQueueRef,
                            {

                                status: "matched",

                                matchedBattleId: battleRef.id,

                                opponentName:
                                    currentStudent.fullName || "Student"

                            }
                        );

                    }
                );


                currentBattleId = battleRef.id;

                opponentFound = true;


                if (matchedOpponentName) {

                    matchedOpponentName.textContent =
                        "Matched with " +
                        (opponentData.fullName || "Student");

                }


                showEnterBattleButton();

                showNotification(
                    "Opponent found!"
                );


                break;


            } catch (error) {

                if (error.code === "resource-exhausted") {

                    throw error;

                }


                console.error(
                    "Opponent matching failed:",
                    error
                );

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


            // MATCHED

            if (
                data.status === "matched" &&
                data.matchedBattleId
            ) {

                currentBattleId =
                    data.matchedBattleId;


                if (matchedOpponentName) {

                    matchedOpponentName.textContent =
                        "Matched with " +
                        (data.opponentName || "Student");

                }


                showEnterBattleButton();

            }


            // WAITING

            if (data.status === "waiting") {

                currentBattleId = null;


                if (matchedOpponentBox) {

                    matchedOpponentBox.hidden = true;

                }


                if (data.challengeId) {

                    setMatchStatus(
                        "Direct Challenge Accepted",
                        "Waiting for the student who challenged you to start the battle."
                    );

                } else {

                    setMatchStatus(
                        "Waiting for Opponent",
                        "You are in the matchmaking queue."
                    );

                }


                setMatchButtons(true);

            }


            // CANCELLED

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

            console.error(
                "Queue listener error:",
                error
            );

        }
    );

}


/* =====================================================
   12. SHOW ENTER BATTLE BUTTON
===================================================== */

function showEnterBattleButton() {

    if (!currentBattleId) return;


    if (matchedOpponentBox) {

        matchedOpponentBox.hidden = false;

    }


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

        showNotification(
            "No active battle was found."
        );

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


        const queueSnap = await getDoc(
            queueRef
        );


        if (!queueSnap.exists()) {

            showNotification(
                "No active matchmaking request was found."
            );

            return;

        }


        const queueData = queueSnap.data();


        if (
            queueData.status !== "waiting" ||
            queueData.challengeId
        ) {

            showNotification(
                "This queue cannot be cancelled using random matchmaking controls."
            );

            return;

        }


        await updateDoc(queueRef, {

            status: "cancelled",

            cancelledAt: serverTimestamp()

        });


        setMatchStatus(
            "Search Cancelled",
            "You have left the matchmaking queue."
        );


        setMatchButtons(false);

        showNotification(
            "Matchmaking cancelled."
        );


    } catch (error) {

        console.error(
            "Cancel matchmaking error:",
            error
        );


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


    const queueSnap = await getDoc(
        queueRef
    );


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


        const battleSnap = await getDoc(
            battleRef
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


        currentBattleId =
            data.matchedBattleId;


        if (matchedOpponentName) {

            matchedOpponentName.textContent =
                "Matched with " +
                (data.opponentName || "Student");

        }


        showEnterBattleButton();

    }


    else if (data.status === "waiting") {

        currentBattleId = null;


        if (data.challengeId) {

            setMatchStatus(
                "Direct Challenge Accepted",
                "Waiting for the challenger to connect you to the battle."
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


/* =====================================================
   16. LISTEN TO INCOMING BATTLE CHALLENGES
===================================================== */

function listenToIncomingChallenges() {

    if (
        !currentStudent ||
        !incomingChallengesContainer
    ) {
        return;
    }


    const challengesRef = collection(
        db,
        "battleChallenges"
    );


    const challengesQuery = query(
        challengesRef,

        where(
            "opponentId",
            "==",
            currentStudent.uid
        ),

        where(
            "status",
            "==",
            "pending"
        ),

        limit(30)
    );


    onSnapshot(
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

                            <p>
                                Has challenged you to a battle.
                            </p>

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


            // ACCEPT BUTTON

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


            // REJECT BUTTON

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

            console.error(
                "Incoming challenges error:",
                error
            );


            incomingChallengesContainer.innerHTML =
                "<p>Unable to load incoming challenges.</p>";

        }
    );

}


/* =====================================================
   17. ACCEPT OR REJECT BATTLE CHALLENGE
===================================================== */

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


        await runTransaction(
            db,
            async transaction => {

                // READ DOCUMENTS FIRST

                const challengeSnap =
                    await transaction.get(challengeRef);


                const queueSnap =
                    await transaction.get(queueRef);


                if (!challengeSnap.exists()) {

                    throw new Error(
                        "Challenge no longer exists."
                    );

                }


                const challenge = challengeSnap.data();


                if (
                    challenge.opponentId !==
                    currentStudent.uid
                ) {

                    throw new Error(
                        "This invitation belongs to another student."
                    );

                }


                if (challenge.status !== "pending") {

                    throw new Error(
                        "This invitation has already been answered."
                    );

                }


                // REJECT CHALLENGE

                if (response === "rejected") {

                    transaction.update(
                        challengeRef,
                        {

                            status: "rejected",

                            respondedAt: serverTimestamp()

                        }
                    );

                    return;

                }


                if (response !== "accepted") {

                    throw new Error(
                        "Invalid challenge response."
                    );

                }


                // CHECK EXISTING QUEUE

                if (queueSnap.exists()) {

                    const existingQueue =
                        queueSnap.data();


                    if (
                        existingQueue.status === "waiting" ||
                        existingQueue.status === "matched"
                    ) {

                        throw new Error(
                            "You already have an active battle session. Finish or cancel it first."
                        );

                    }

                }


                // CREATE DIRECT CHALLENGE QUEUE

                const directCompetitionId =
                    "direct_" + challengeId;


                transaction.set(
                    queueRef,
                    {

                        studentId:
                            currentStudent.uid,

                        fullName:
                            currentStudent.fullName || "Student",

                        department:
                            currentStudent.department || "",

                        level:
                            currentStudent.level || "",

                        status: "waiting",

                        matchedBattleId: null,

                        opponentName:
                            challenge.challengerName || "Student",

                        competitionId:
                            directCompetitionId,

                        competitionTitle:
                            "Direct Challenge",

                        challengeId:
                            challengeId,

                        createdAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp()

                    }
                );


                // ACCEPT INVITATION

                transaction.update(
                    challengeRef,
                    {

                        status: "accepted",

                        respondedAt: serverTimestamp()

                    }
                );

            }
        );


        showNotification(
            response === "accepted"
                ? "Challenge accepted! Waiting for the challenger."
                : "Challenge rejected."
        );


    } catch (error) {

        console.error(
            "Challenge response error:",
            error
        );


        showNotification(
            error.message
        );

    }

}


/* =====================================================
   18. LISTEN TO OUTGOING BATTLE CHALLENGES
===================================================== */

function listenToOutgoingChallenges() {

    if (!currentStudent) return;


    const challengesRef = collection(
        db,
        "battleChallenges"
    );


    const challengesQuery = query(
        challengesRef,

        where(
            "challengerId",
            "==",
            currentStudent.uid
        ),

        limit(30)
    );


    onSnapshot(
        challengesQuery,

        snapshot => {

            snapshot.docs.forEach(item => {

                const challenge = item.data();


                if (challenge.status !== "accepted") {
                    return;
                }


                if (
                    processedAcceptedChallenges.has(item.id)
                ) {
                    return;
                }


                handleAcceptedChallenge(
                    item.id,
                    challenge
                );

            });

        },

        error => {

            console.error(
                "Outgoing challenges error:",
                error
            );

        }
    );

}


/* =====================================================
   19. HANDLE ACCEPTED DIRECT CHALLENGE
===================================================== */

async function handleAcceptedChallenge(
    challengeId,
    challenge
) {

    if (!currentStudent) return;


    if (
        processedAcceptedChallenges.has(challengeId)
    ) {
        return;
    }


    processedAcceptedChallenges.add(challengeId);


    try {

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


        /* =====================================
           PHASE 1: CREATE CHALLENGER QUEUE
        ===================================== */

        await runTransaction(
            db,
            async transaction => {

                const challengeSnap =
                    await transaction.get(challengeRef);


                const ownQueueSnap =
                    await transaction.get(ownQueueRef);


                if (!challengeSnap.exists()) {

                    throw new Error(
                        "Challenge no longer exists."
                    );

                }


                const currentChallenge =
                    challengeSnap.data();


                if (
                    currentChallenge.status !== "accepted"
                ) {

                    throw new Error(
                        "This challenge has not been accepted."
                    );

                }


                if (
                    currentChallenge.challengerId !==
                    currentStudent.uid
                ) {

                    throw new Error(
                        "This is not your challenge."
                    );

                }


                if (
                    currentChallenge.opponentId !==
                    challenge.opponentId
                ) {

                    throw new Error(
                        "Challenge opponent mismatch."
                    );

                }


                // CHECK EXISTING QUEUE

                if (ownQueueSnap.exists()) {

                    const ownQueue =
                        ownQueueSnap.data();


                    // Already matched to this challenge.

                    if (
                        ownQueue.status === "matched" &&
                        ownQueue.challengeId === challengeId
                    ) {

                        currentBattleId =
                            ownQueue.matchedBattleId;

                        return;

                    }


                    // Already waiting for this challenge.

                    if (
                        ownQueue.status === "waiting" &&
                        ownQueue.challengeId === challengeId
                    ) {

                        return;

                    }


                    // Do not overwrite another active session.

                    if (
                        ownQueue.status === "waiting" ||
                        ownQueue.status === "matched"
                    ) {

                        throw new Error(
                            "You already have another active battle session. Finish or cancel it before accepting this challenge."
                        );

                    }

                }


                // CREATE CHALLENGER QUEUE

                transaction.set(
                    ownQueueRef,
                    {

                        studentId:
                            currentStudent.uid,

                        fullName:
                            currentStudent.fullName || "Student",

                        department:
                            currentStudent.department || "",

                        level:
                            currentStudent.level || "",

                        status: "waiting",

                        matchedBattleId: null,

                        opponentName:
                            currentChallenge.opponentName || "Student",

                        competitionId:
                            "direct_" + challengeId,

                        competitionTitle:
                            "Direct Challenge",

                        challengeId:
                            challengeId,

                        createdAt:
                            serverTimestamp(),

                        updatedAt:
                            serverTimestamp()

                    }
                );

            }
        );


        // A previous transaction may have already matched us.

        if (currentBattleId) {

            showEnterBattleButton();

            return;

        }


        /* =====================================
           PHASE 2: CREATE ACTUAL BATTLE
        ===================================== */

        const battleRef = doc(
            collection(db, "battles")
        );


        await runTransaction(
            db,
            async transaction => {

                // READ ALL DOCUMENTS FIRST

                const challengeSnap =
                    await transaction.get(challengeRef);


                const ownQueueSnap =
                    await transaction.get(ownQueueRef);


                const opponentQueueSnap =
                    await transaction.get(opponentQueueRef);


                if (!challengeSnap.exists()) {

                    throw new Error(
                        "Challenge no longer exists."
                    );

                }


                if (
                    !ownQueueSnap.exists() ||
                    !opponentQueueSnap.exists()
                ) {

                    throw new Error(
                        "One of the students is not in the battle queue."
                    );

                }


                const currentChallenge =
                    challengeSnap.data();


                const ownQueue =
                    ownQueueSnap.data();


                const opponentQueue =
                    opponentQueueSnap.data();


                // CHECK CHALLENGE

                if (
                    currentChallenge.status !== "accepted"
                ) {

                    throw new Error(
                        "Challenge acceptance is no longer valid."
                    );

                }


                if (
                    currentChallenge.challengerId !==
                    currentStudent.uid
                ) {

                    throw new Error(
                        "You are not the challenger."
                    );

                }


                // CHECK QUEUE OWNERS

                if (
                    ownQueue.studentId !==
                    currentStudent.uid
                ) {

                    throw new Error(
                        "Your queue information is invalid."
                    );

                }


                if (
                    opponentQueue.studentId !==
                    currentChallenge.opponentId
                ) {

                    throw new Error(
                        "Opponent queue information is invalid."
                    );

                }


                // CHECK BOTH CHALLENGE IDS

                if (
                    ownQueue.challengeId !== challengeId ||
                    opponentQueue.challengeId !== challengeId
                ) {

                    throw new Error(
                        "The students are not waiting for the same challenge."
                    );

                }


                // CHECK IF ALREADY MATCHED

                if (
                    ownQueue.status === "matched" &&
                    ownQueue.matchedBattleId
                ) {

                    currentBattleId =
                        ownQueue.matchedBattleId;

                    return;

                }


                if (
                    ownQueue.status !== "waiting" ||
                    opponentQueue.status !== "waiting"
                ) {

                    throw new Error(
                        "One of the students is no longer waiting."
                    );

                }


                // CREATE DIRECT BATTLE

                const battleData = {

                    player1Id:
                        currentStudent.uid,

                    player2Id:
                        currentChallenge.opponentId,

                    player1Name:
                        currentStudent.fullName || "Student",

                    player2Name:
                        opponentQueue.fullName || "Student",

                    competitionId:
                        "direct_" + challengeId,

                    competitionTitle:
                        "Direct Challenge",

                    questionLimit: 10,

                    durationSeconds: 60,

                    status: "waiting",

                    createdAt:
                        serverTimestamp(),

                    player1Score: 0,

                    player2Score: 0,

                    player1Answers: {},

                    player2Answers: {},

                    challengeId:
                        challengeId

                };


                transaction.set(
                    battleRef,
                    battleData
                );


                // UPDATE CHALLENGER QUEUE

                transaction.update(
                    ownQueueRef,
                    {

                        status: "matched",

                        matchedBattleId:
                            battleRef.id,

                        opponentName:
                            opponentQueue.fullName || "Student",

                        updatedAt:
                            serverTimestamp()

                    }
                );


                // UPDATE OPPONENT QUEUE

                transaction.update(
                    opponentQueueRef,
                    {

                        status: "matched",

                        matchedBattleId:
                            battleRef.id,

                        opponentName:
                            currentStudent.fullName || "Student",

                        updatedAt:
                            serverTimestamp()

                    }
                );


            }
        );


        // UPDATE CURRENT BATTLE

        currentBattleId = battleRef.id;


        showNotification(
            "Your challenge has been accepted! Your battle is ready."
        );


        setMatchStatus(
            "Direct Battle Ready",
            "Your opponent accepted your challenge. Enter the battle room."
        );


        if (matchedOpponentName) {

            matchedOpponentName.textContent =
                "Matched with " +
                (challenge.opponentName || "Student");

        }


        showEnterBattleButton();


    } catch (error) {

        console.error(
            "Accepted challenge processing error:",
            error
        );


        processedAcceptedChallenges.delete(
            challengeId
        );


        showNotification(
            "Direct challenge error: " + error.message
        );

    }

}


/* =====================================================
   20. SEND STUDENT CHALLENGE
===================================================== */

async function sendStudentChallenge() {

    if (!currentStudent) return;


    if (!challengeStudentId) return;


    const opponentId =
        challengeStudentId.value.trim();


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

        challengeStatus.textContent =
            "Sending challenge...";

    }


    try {

        // CHECK THAT THE OPPONENT EXISTS

        const opponentRef = doc(
            db,
            "students",
            opponentId
        );


        const opponentSnap = await getDoc(
            opponentRef
        );


        if (!opponentSnap.exists()) {

            throw new Error(
                "Student account was not found. Check the student ID."
            );

        }


        const opponentData =
            opponentSnap.data();


        if (
            opponentData.role &&
            opponentData.role !== "student"
        ) {

            throw new Error(
                "You can only challenge another student."
            );

        }


        // CREATE CHALLENGE

        const challengeRef = collection(
            db,
            "battleChallenges"
        );


        await addDoc(
            challengeRef,
            {

                challengerId:
                    currentStudent.uid,

                challengerName:
                    currentStudent.fullName || "Student",

                opponentId:
                    opponentId,

                status:
                    "pending",

                createdAt:
                    serverTimestamp()

            }
        );


        if (challengeStatus) {

            challengeStatus.textContent =
                "Challenge sent successfully!";

        }


        challengeStudentId.value = "";


        showNotification(
            "Battle challenge sent."
        );


    } catch (error) {

        console.error(
            "Challenge error:",
            error
        );


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


/* =====================================================
   21. LOAD STUDENT BATTLE STATISTICS
===================================================== */

async function loadStudentStats() {

    if (!currentStudent) return;


    const battlesRef = collection(
        db,
        "battles"
    );


    const playerOneQuery = query(
        battlesRef,

        where(
            "player1Id",
            "==",
            currentStudent.uid
        ),

        limit(100)
    );


    const playerTwoQuery = query(
        battlesRef,

        where(
            "player2Id",
            "==",
            currentStudent.uid
        ),

        limit(100)
    );


    const [
        playerOneSnap,
        playerTwoSnap
    ] = await Promise.all([

        getDocs(playerOneQuery),

        getDocs(playerTwoQuery)

    ]);


    const battleMap = new Map();


    playerOneSnap.docs.forEach(item => {

        battleMap.set(
            item.id,
            item.data()
        );

    });


    playerTwoSnap.docs.forEach(item => {

        battleMap.set(
            item.id,
            item.data()
        );

    });


    const battles = Array.from(
        battleMap.values()
    );


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

        }

        else if (myScore < opponentScore) {

            losses++;

            xp += 5;

        }

    });


    if (totalBattles) {

        totalBattles.textContent =
            battles.length;

    }


    if (totalWins) {

        totalWins.textContent =
            wins;

    }


    if (totalLosses) {

        totalLosses.textContent =
            losses;

    }


    if (totalXP) {

        totalXP.textContent =
            xp;

    }

}


/* =====================================================
   22. LOAD BATTLE HISTORY
===================================================== */

async function loadBattleHistory() {

    if (
        !currentStudent ||
        !battleHistoryContainer
    ) {
        return;
    }


    battleHistoryContainer.innerHTML =
        "<p>Loading battle history...</p>";


    const battlesRef = collection(
        db,
        "battles"
    );


    const firstQuery = query(
        battlesRef,

        where(
            "player1Id",
            "==",
            currentStudent.uid
        ),

        limit(20)
    );


    const secondQuery = query(
        battlesRef,

        where(
            "player2Id",
            "==",
            currentStudent.uid
        ),

        limit(20)
    );


    const [
        firstSnap,
        secondSnap
    ] = await Promise.all([

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


    const battles = Array.from(
        battleMap.values()
    );


    battles.sort((a, b) => {

        const timeA =
            a.createdAt?.toMillis?.() || 0;

        const timeB =
            b.createdAt?.toMillis?.() || 0;

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

                if (
                    Number(myScore) >
                    Number(opponentScore)
                ) {

                    result = "Victory";

                    resultClass = "win-label";

                }

                else if (
                    Number(myScore) <
                    Number(opponentScore)
                ) {

                    result = "Defeat";

                    resultClass = "loss-label";

                }

                else {

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


/* =====================================================
   23. LOAD LEADERBOARD
===================================================== */

async function loadLeaderboard() {

    if (!leaderboardContainer) return;


    leaderboardContainer.innerHTML =
        "<p>Loading leaderboard...</p>";


    const leaderboardRef = collection(
        db,
        "battleLeaderboard"
    );


    const leaderboardQuery = query(
        leaderboardRef,
        limit(20)
    );


    const snapshot = await getDocs(
        leaderboardQuery
    );


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

        Number(b.xp || 0) -
        Number(a.xp || 0)

    );


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


/* =====================================================
   24. BUTTON EVENTS
===================================================== */

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

    backDashboardBtn.addEventListener(
        "click",
        () => {

            window.location.href =
                "student-dashboard.html";

        }
    );

}


/* =====================================================
   25. CLEANUP
===================================================== */

window.addEventListener("pagehide", () => {

    if (queueUnsubscribe) {

        queueUnsubscribe();

        queueUnsubscribe = null;

    }

});