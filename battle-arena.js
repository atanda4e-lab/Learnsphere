// ========================================
// LEARNSPHERE BATTLE ARENA
// RANDOM MATCHMAKING
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
    updateDoc,
    runTransaction,
    onSnapshot,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.2.1/firebase-firestore.js";


// ========================================
// HTML ELEMENTS
// ========================================

const playerName = document.getElementById("playerName");

const totalBattles = document.getElementById("totalBattles");
const totalWins = document.getElementById("totalWins");
const totalXP = document.getElementById("totalXP");

const battleMessage = document.getElementById("battleMessage");

const battleHistoryList = document.getElementById("battleHistoryList");

const randomMatchBtn = document.getElementById("randomMatchBtn");
const challengeStudentBtn = document.getElementById("challengeStudentBtn");
const leaderboardBtn = document.getElementById("leaderboardBtn");


// ========================================
// GLOBAL VARIABLES
// ========================================

let currentStudent = null;

let currentBattleId = null;

let queueListener = null;

let matchmakingInProgress = false;


// ========================================
// DISPLAY MESSAGE
// ========================================

function showMessage(message) {

    if (battleMessage) {
        battleMessage.textContent = message;
    }

}


// ========================================
// ENTER BATTLE ROOM BUTTON
// ========================================

function showEnterBattleButton() {

    if (!currentBattleId) return;

    let enterButton = document.getElementById("enterBattleRoomBtn");

    if (!enterButton) {

        enterButton = document.createElement("button");

        enterButton.id = "enterBattleRoomBtn";

        enterButton.textContent = "⚔️ Enter Battle Room";

        enterButton.style.display = "block";
        enterButton.style.margin = "15px auto";
        enterButton.style.padding = "14px 25px";
        enterButton.style.cursor = "pointer";
        enterButton.style.borderRadius = "8px";
        enterButton.style.border = "none";
        enterButton.style.fontWeight = "bold";
        enterButton.style.background = "#f5b942";
        enterButton.style.color = "#111";

        if (battleMessage) {

            battleMessage.insertAdjacentElement(
                "afterend",
                enterButton
            );

        }

    }

    enterButton.onclick = function () {

        window.location.href =
            "battle-room.html?battleId=" + currentBattleId;

    };

}


// ========================================
// LOAD STUDENT PROFILE
// ========================================

async function loadStudentProfile(user) {

    try {

        const studentRef = doc(db, "students", user.uid);

        const studentSnap = await getDoc(studentRef);

        if (!studentSnap.exists()) {

            showMessage("Student profile not found.");

            return;

        }

        const studentData = studentSnap.data();

        if (studentData.role !== "student") {

            showMessage("Only students can enter Battle Arena.");

            return;

        }

        currentStudent = {

            uid: user.uid,

            email: user.email,

            fullName: studentData.fullName || user.displayName || "Student",

            department: studentData.department || "",

            level: studentData.level || ""

        };

        if (playerName) {

            playerName.textContent = currentStudent.fullName;

        }

        showMessage("Welcome to LearnSphere Battle Arena!");

        listenToOwnQueue();

    }

    catch (error) {

        console.error("Profile loading error:", error);

        showMessage("Unable to load student profile.");

    }

}


// ========================================
// FIND EXISTING BATTLE
// ========================================

async function findExistingBattle() {

    try {

        showMessage("Recovering your battle room...");

        const battlesRef = collection(db, "battles");

        const firstQuery = query(
            battlesRef,
            where("player1Id", "==", currentStudent.uid)
        );

        const secondQuery = query(
            battlesRef,
            where("player2Id", "==", currentStudent.uid)
        );

        const firstResults = await getDocs(firstQuery);

        const secondResults = await getDocs(secondQuery);

        const allBattles = [
            ...firstResults.docs,
            ...secondResults.docs
        ];

        const existingBattle = allBattles.find(function (item) {

            return ["waiting", "active"].includes(item.data().status);

        });

        if (!existingBattle) {

            showMessage("No active battle room was found.");

            return;

        }

        currentBattleId = existingBattle.id;

        showMessage("Your battle room is ready!");

        showEnterBattleButton();

        if (randomMatchBtn) {

            randomMatchBtn.disabled = true;

        }

    }

    catch (error) {

        console.error("Battle recovery error:", error);

        showMessage("Unable to recover your battle room.");

    }

}


// ========================================
// LISTEN TO OWN MATCHMAKING QUEUE
// ========================================

function listenToOwnQueue() {

    if (!currentStudent) return;

    const queueRef = doc(db, "battleQueue", currentStudent.uid);

    if (queueListener) {

        queueListener();

    }

    queueListener = onSnapshot(queueRef, function (snapshot) {

        if (!snapshot.exists()) return;

        const queueData = snapshot.data();

        if (queueData.status === "matched") {

            if (queueData.matchedBattleId) {

                currentBattleId = queueData.matchedBattleId;

                showMessage("Your opponent is ready!");

                showEnterBattleButton();

                if (randomMatchBtn) {

                    randomMatchBtn.disabled = true;

                }

            }

            else {

                findExistingBattle();

            }

        }

    }, function (error) {

        console.error("Queue listener error:", error);

        showMessage("Unable to monitor matchmaking queue.");

    });

}


// ========================================
// ENTER MATCHMAKING QUEUE
// ========================================

async function enterMatchmakingQueue() {

    if (!currentStudent) {

        showMessage("Please log in first.");

        return false;

    }

    const queueRef = doc(db, "battleQueue", currentStudent.uid);

    const queueSnap = await getDoc(queueRef);

    if (queueSnap.exists()) {

        const queueData = queueSnap.data();

        if (queueData.status === "matched") {

            if (queueData.matchedBattleId) {

                currentBattleId = queueData.matchedBattleId;

                showMessage("Your opponent is ready!");

                showEnterBattleButton();

            }

            else {

                await findExistingBattle();

            }

            return false;

        }

        await updateDoc(queueRef, {

            status: "waiting"

        });

    }

    else {

        await setDoc(queueRef, {

            studentId: currentStudent.uid,

            fullName: currentStudent.fullName,

            department: currentStudent.department,

            level: currentStudent.level,

            status: "waiting",

            createdAt: serverTimestamp()

        });

    }

    return true;

}


// ========================================
// FIND RANDOM OPPONENT
// ========================================

async function findRandomOpponent() {

    if (!currentStudent) {

        showMessage("Student account not loaded.");

        return;

    }

    if (matchmakingInProgress) return;

    matchmakingInProgress = true;

    if (randomMatchBtn) {

        randomMatchBtn.disabled = true;

        randomMatchBtn.textContent = "Searching...";

    }

    try {

        showMessage("Preparing matchmaking...");

        const ready = await enterMatchmakingQueue();

        if (!ready) return;

        showMessage("Searching for another student...");

        const queueQuery = query(
            collection(db, "battleQueue"),
            where("status", "==", "waiting")
        );

        const queueResults = await getDocs(queueQuery);

        let opponentFound = false;

        for (const opponentDocument of queueResults.docs) {

            const opponentId = opponentDocument.id;

            const opponentData = opponentDocument.data();

            if (opponentId === currentStudent.uid) {

                continue;

            }

            const battleRef = doc(collection(db, "battles"));

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

            try {

                await runTransaction(db, async function (transaction) {

                    const ownQueueSnap = await transaction.get(ownQueueRef);

                    const opponentQueueSnap = await transaction.get(opponentQueueRef);

                    if (!ownQueueSnap.exists()) {

                        throw new Error("Your queue entry no longer exists.");

                    }

                    if (!opponentQueueSnap.exists()) {

                        throw new Error("Opponent is no longer available.");

                    }

                    const ownData = ownQueueSnap.data();

                    const opponentCurrentData = opponentQueueSnap.data();

                    if (ownData.status !== "waiting") {

                        throw new Error("You are no longer waiting.");

                    }

                    if (opponentCurrentData.status !== "waiting") {

                        throw new Error("Opponent is no longer waiting.");

                    }

                    // CREATE BATTLE

                    transaction.set(battleRef, {

                        player1Id: currentStudent.uid,

                        player2Id: opponentId,

                        player1Name: currentStudent.fullName,

                        player2Name: opponentData.fullName || "Student",

                        status: "waiting",

                        durationSeconds: 60,

                        createdAt: serverTimestamp()

                    });

                    // UPDATE OPPONENT QUEUE

                    transaction.update(opponentQueueRef, {

                        status: "matched",

                        matchedBattleId: battleRef.id

                    });

                    // UPDATE OWN QUEUE

                    transaction.update(ownQueueRef, {

                        status: "matched",

                        matchedBattleId: battleRef.id

                    });

                });

                currentBattleId = battleRef.id;

                opponentFound = true;

                showMessage(
                    "Opponent found: " +
                    (opponentData.fullName || "Student") +
                    "! Battle room created."
                );

                showEnterBattleButton();

                console.log("Battle created:", currentBattleId);

                break;

            }

            catch (transactionError) {

                console.log(
                    "Could not match this opponent:",
                    transactionError.message
                );

            }

        }

        if (!opponentFound) {

            showMessage(
                "You are in the matchmaking queue. Waiting for an opponent..."
            );

        }

    }

    catch (error) {

        console.error("Matchmaking error:", error);

        showMessage("Matchmaking failed: " + error.message);

    }

    finally {

        matchmakingInProgress = false;

        if (randomMatchBtn && !currentBattleId) {

            randomMatchBtn.disabled = false;

            randomMatchBtn.textContent = "Find Random Opponent";

        }

    }

}


// ========================================
// BUTTON EVENTS
// ========================================

if (randomMatchBtn) {

    randomMatchBtn.addEventListener("click", findRandomOpponent);

}

if (challengeStudentBtn) {

    challengeStudentBtn.addEventListener("click", function () {

        alert("Direct student challenges are coming next!");

    });

}

if (leaderboardBtn) {

    leaderboardBtn.addEventListener("click", function () {

        alert("Battle Arena leaderboard is coming next!");

    });

}


// ========================================
// INITIAL DISPLAY
// ========================================

if (totalBattles) totalBattles.textContent = "0";

if (totalWins) totalWins.textContent = "0";

if (totalXP) totalXP.textContent = "0";

if (battleHistoryList) {

    battleHistoryList.innerHTML =
        "<p>Your completed battles will appear here.</p>";

}


// ========================================
// AUTHENTICATION
// ========================================

onAuthStateChanged(auth, async function (user) {

    if (!user) {

        window.location.href = "auth.html";

        return;

    }

    await loadStudentProfile(user);

});