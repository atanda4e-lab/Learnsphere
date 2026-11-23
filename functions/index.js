// ======================================================
// LEARNSPHERE AUTOMATIC BATTLE LEADERBOARD
// ======================================================

const { initializeApp } = require("firebase-admin/app");

const { getFirestore } = require("firebase-admin/firestore");

const {
    onDocumentUpdated
} = require("firebase-functions/v2/firestore");

const logger = require("firebase-functions/logger");

initializeApp();

const db = getFirestore();


// ======================================================
// XP SETTINGS
// ======================================================

const XP_REWARDS = {
    win: 20,
    loss: 5,
    draw: 10
};


// ======================================================
// AUTOMATIC BATTLE COMPLETION TRIGGER
// ======================================================

exports.updateBattleLeaderboard = onDocumentUpdated(
    {
        document: "battles/{battleId}",
        maxInstances: 5
    },

    async (event) => {

        const before = event.data.before.data();
        const after = event.data.after.data();

        const battleId = event.params.battleId;

        // Only process newly completed battles.

        if (
            before.status === "completed" ||
            after.status !== "completed"
        ) {
            return;
        }

        const player1Id = after.player1Id;
        const player2Id = after.player2Id;

        if (
            !player1Id ||
            !player2Id ||
            player1Id === player2Id
        ) {
            logger.error("Invalid battle participants:", battleId);
            return;
        }

        const player1Score = Number(after.player1Score || 0);
        const player2Score = Number(after.player2Score || 0);

        // Determine the result using the final scores.

        let player1XP;
        let player2XP;

        let player1Result;
        let player2Result;

        if (player1Score > player2Score) {

            player1XP = XP_REWARDS.win;
            player2XP = XP_REWARDS.loss;

            player1Result = "win";
            player2Result = "loss";

        } else if (player2Score > player1Score) {

            player1XP = XP_REWARDS.loss;
            player2XP = XP_REWARDS.win;

            player1Result = "loss";
            player2Result = "win";

        } else {

            player1XP = XP_REWARDS.draw;
            player2XP = XP_REWARDS.draw;

            player1Result = "draw";
            player2Result = "draw";

        }

        const player1Ref = db
            .collection("battleLeaderboard")
            .doc(player1Id);

        const player2Ref = db
            .collection("battleLeaderboard")
            .doc(player2Id);

        const awardRef = db
            .collection("battleAwards")
            .doc(battleId);


        // ==================================================
        // ATOMIC TRANSACTION
        // ==================================================

        try {

            await db.runTransaction(async (transaction) => {

                const awardSnap = await transaction.get(awardRef);

                // Prevent duplicate XP if Firebase retries.

                if (awardSnap.exists) {
                    return;
                }

                const player1Snap = await transaction.get(player1Ref);

                const player2Snap = await transaction.get(player2Ref);

                const player1Data = player1Snap.exists
                    ? player1Snap.data()
                    : {};

                const player2Data = player2Snap.exists
                    ? player2Snap.data()
                    : {};


                // PLAYER ONE

                transaction.set(player1Ref, {

                    studentId: player1Id,

                    fullName:
                        after.player1Name ||
                        player1Data.fullName ||
                        "Student",

                    xp: Number(player1Data.xp || 0) + player1XP,

                    wins:
                        Number(player1Data.wins || 0) +
                        (player1Result === "win" ? 1 : 0),

                    losses:
                        Number(player1Data.losses || 0) +
                        (player1Result === "loss" ? 1 : 0),

                    draws:
                        Number(player1Data.draws || 0) +
                        (player1Result === "draw" ? 1 : 0),

                    battles: Number(player1Data.battles || 0) + 1,

                    updatedAt:
                        require("firebase-admin/firestore").FieldValue.serverTimestamp()

                }, { merge: true });


                // PLAYER TWO

                transaction.set(player2Ref, {

                    studentId: player2Id,

                    fullName:
                        after.player2Name ||
                        player2Data.fullName ||
                        "Student",

                    xp: Number(player2Data.xp || 0) + player2XP,

                    wins:
                        Number(player2Data.wins || 0) +
                        (player2Result === "win" ? 1 : 0),

                    losses:
                        Number(player2Data.losses || 0) +
                        (player2Result === "loss" ? 1 : 0),

                    draws:
                        Number(player2Data.draws || 0) +
                        (player2Result === "draw" ? 1 : 0),

                    battles: Number(player2Data.battles || 0) + 1,

                    updatedAt:
                        require("firebase-admin/firestore").FieldValue.serverTimestamp()

                }, { merge: true });


                // RECORD THAT THIS BATTLE HAS BEEN AWARDED.

                transaction.set(awardRef, {

                    battleId: battleId,

                    player1Id: player1Id,

                    player2Id: player2Id,

                    player1XP: player1XP,

                    player2XP: player2XP,

                    createdAt:
                        require("firebase-admin/firestore").FieldValue.serverTimestamp()

                });

            });

            logger.info(
                "Battle leaderboard successfully updated:",
                battleId
            );

        } catch (error) {

            logger.error(
                "Leaderboard update failed:",
                battleId,
                error
            );

            throw error;

        }

    }
);