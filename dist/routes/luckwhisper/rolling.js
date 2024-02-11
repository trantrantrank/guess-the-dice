"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.goAdventure = void 0;
const hub_nodejs_1 = require("@farcaster/hub-nodejs");
const mainFrame_1 = require("../../routes/luckwhisper/mainFrame");
require("dotenv/config");
const database_1 = require("@planetscale/database");
const config = {
    host: process.env.DATABASE_HOST,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD
};
const conn = (0, database_1.connect)(config);
const HUB_URL = process.env["HUB_URL"] || "nemes.farcaster.xyz:2283";
const client = (0, hub_nodejs_1.getSSLHubRpcClient)(HUB_URL);
const getType = (buttonIdx) => {
    switch (buttonIdx) {
        case 1:
            return "fight";
        case 2:
            return "reroll";
        default:
            return null;
    }
};
const initializeState = () => {
    return {
        player: {
            maxAttempts: 3,
            attempts: 0,
            roll: 0,
            health: 30,
            minAttack: 6,
            maxAttack: 12,
            status: "ready",
        },
        npc: {
            health: 30,
            minAttack: 6,
            maxAttack: 15,
            status: "ready",
        },
        lastOption: null,
    };
};
function saveState(state, user_fid) {
    return __awaiter(this, void 0, void 0, function* () {
        const results = yield conn.execute('UPDATE states SET state = ? WHERE user_fid = ?', [JSON.stringify(state), user_fid]);
        if (results.rowsAffected === 0) {
            return yield conn.execute('INSERT INTO states (user_fid, state) VALUES (?, ?)', [user_fid, JSON.stringify(state)]);
        }
        return results;
    });
}
function loadState(user_fid) {
    return __awaiter(this, void 0, void 0, function* () {
        const results = yield conn.execute('SELECT * FROM states WHERE user_fid = ?', [user_fid]);
        if (results.rows.length === 0) {
            return {
                user_fid,
                state: initializeState(),
            };
        }
        return results.rows[0];
    });
}
function goAdventure(req, res) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let validatedMessage = undefined;
            try {
                if ((_b = (_a = req.body) === null || _a === void 0 ? void 0 : _a.trustedData) === null || _b === void 0 ? void 0 : _b.messageBytes) {
                    const frameMessage = hub_nodejs_1.Message.decode(Buffer.from(((_d = (_c = req.body) === null || _c === void 0 ? void 0 : _c.trustedData) === null || _d === void 0 ? void 0 : _d.messageBytes) || "", "hex"));
                    const result = yield client.validateMessage(frameMessage);
                    if (result.isOk() && result.value.valid) {
                        validatedMessage = result.value.message;
                    }
                }
            }
            catch (e) {
                return res.status(400).send(`Failed to validate message: ${e}`);
            }
            let buttonIndex = (_k = (_g = (_f = (_e = validatedMessage === null || validatedMessage === void 0 ? void 0 : validatedMessage.data) === null || _e === void 0 ? void 0 : _e.frameActionBody) === null || _f === void 0 ? void 0 : _f.buttonIndex) !== null && _g !== void 0 ? _g : (_j = (_h = req === null || req === void 0 ? void 0 : req.body) === null || _h === void 0 ? void 0 : _h.untrustedData) === null || _j === void 0 ? void 0 : _j.buttonIndex) !== null && _k !== void 0 ? _k : 1;
            const fid = (_q = (_m = (_l = validatedMessage === null || validatedMessage === void 0 ? void 0 : validatedMessage.data) === null || _l === void 0 ? void 0 : _l.fid) !== null && _m !== void 0 ? _m : (_p = (_o = req === null || req === void 0 ? void 0 : req.body) === null || _o === void 0 ? void 0 : _o.untrustedData) === null || _p === void 0 ? void 0 : _p.fid) !== null && _q !== void 0 ? _q : 123;
            if (fid == null || buttonIndex == null)
                return res.status(400).send(`Missing required data`);
            const starting = !!req.query.start;
            let type;
            let save = yield loadState(fid);
            let roll = save.state.player.roll;
            starting && (type = "roll");
            if (save.state.lastOption === "roll") {
                type = getType(+buttonIndex);
            }
            if (save.state.lastOption === "fight") {
                type = "roll";
            }
            if (save.state.lastOption === "reroll") {
                type = getType(+buttonIndex);
            }
            if (type === "roll") {
                save.state.player.attempts = 0;
                roll = rollADice();
                save.state.player.attempts++;
            }
            if (save.state.player.attempts < save.state.player.maxAttempts) {
                save.state.player.roll = roll;
            }
            let message = "";
            let buttons;
            message += "You rolled a " + roll + "! Fight or flight?";
            buttons = `
            <meta name="fc:frame:button:1" content="Fight 🥊">
            <meta name="fc:frame:button:2" content="Reroll 🧑‍🦽">
        `;
            if (type === "reroll") {
                save.state.player.attempts++;
                save.state.player.roll = rollADice();
                if (save.state.player.attempts >= save.state.player.maxAttempts) {
                    type = "fight";
                }
            }
            if (type === "fight") {
                message = "";
                let npcRoll = rollADice();
                let playerRoll = save.state.player.roll;
                if (save.state.player.attempts >= save.state.player.maxAttempts) {
                    message += "You've rolled 3 times. You must fight now. \n";
                }
                const tie = playerRoll === npcRoll;
                const playerWins = playerRoll > npcRoll;
                const npcWins = playerRoll < npcRoll;
                if (tie) {
                    message += `You rolled a ${playerRoll} and the NPC rolled a ${npcRoll}. It's a tie! \n`;
                }
                if (playerWins) {
                    save.state.npc.health -= playerRoll;
                    message += `You rolled a ${playerRoll} and the NPC rolled a ${npcRoll}. You hit the NPC for ${playerRoll} damage. \n`;
                }
                if (npcWins) {
                    save.state.player.health -= npcRoll;
                    message += `You rolled a ${playerRoll} and the NPC rolled a ${npcRoll}. The NPC hit you for ${npcRoll} damage. \n`;
                }
                buttons = `
                <meta name="fc:frame:button:1" content="Roll 🎲">
            `;
                save.state.player.attempts = 0;
            }
            if (save.state.player.health <= 0) {
                message = "You died. \n";
                buttons = `
                <meta name="fc:frame:button:1" content="Play again">
            `;
            }
            if (save.state.npc.health <= 0) {
                message = "You killed the NPC. \n";
                buttons = `
                <meta name="fc:frame:button:1" content="Play again">
            `;
            }
            save.state.lastOption = type;
            yield saveState(save.state, fid);
            if (!message) {
                message =
                    "Prepare to die.";
            }
            const postUrl = `https://${req.hostname}/luckwhisper`;
            const image = yield (0, mainFrame_1.generateImage)(message);
            const base64 = `data:image/png;base64,${image.toString("base64")}`;
            res.setHeader("Content-Type", "text/html");
            return res.status(200).send(`

          <!DOCTYPE html>
          <html>
            <head>
              <title>Nethria Response</title>
              <meta property="og:title" content="Are you lucky?">
              <meta property="og:image" content="${base64}">
              <meta name="fc:frame" content="vNext">
              <meta property="fc:frame:image" content="${base64}" />
              <meta property="fc:frame:post_url" content="${postUrl}">
            ${buttons}
            </head>
            <body>

            </body>
          </html>
          `);
        }
        catch (e) {
            console.log(e);
            return res.status(500).json({ response: "something went wrong" });
        }
    });
}
exports.goAdventure = goAdventure;
function rollADice() {
    const roll = Math.floor(Math.random() * 6) + 1;
    return roll;
}
