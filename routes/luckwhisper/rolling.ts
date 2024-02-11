import { Request, Response } from "express";
import { getSSLHubRpcClient, Message } from "@farcaster/hub-nodejs";
import { generateImage } from "../../routes/luckwhisper/mainFrame";
import 'dotenv/config'
import { connect } from '@planetscale/database'

const config = {
    host: process.env.DATABASE_HOST,
    username: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD
}

const conn = connect(config)

const HUB_URL = process.env["HUB_URL"] || "nemes.farcaster.xyz:2283";
const client = getSSLHubRpcClient(HUB_URL);

const getType = (buttonIdx: number) => {
    switch (buttonIdx) {
        case 1:
            return "fight";
        case 2:
            return "reroll";
        default:
            return null;
    }
};

type Option = "fight" | "reroll" | "roll" | null;

type State = {
    player: Player;
    npc: Player;
    lastOption: Option;
};

type Player = {
    maxAttempts?: number;
    attempts?: number;
    roll?: number;
    health: number;
    minAttack: number;
    maxAttack: number;
    status: PlayerStatus;
};

type PlayerStatus =
    | "ready"

type CurrentSave = {
    user_fid: number;
    state: State;
};

const initializeState = (): State => {
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

async function saveState(state: State, user_fid: number) {
    const results = await conn.execute('UPDATE states SET state = ? WHERE user_fid = ?', [JSON.stringify(state), user_fid]);

    if (results.rowsAffected === 0) {
        return await conn.execute('INSERT INTO states (user_fid, state) VALUES (?, ?)', [user_fid, JSON.stringify(state)]);
    }

    return results;
}

async function loadState(user_fid: number) {
    const results = await conn.execute('SELECT * FROM states WHERE user_fid = ?', [user_fid]);

    if (results.rows.length === 0) {
        return {
            user_fid,
            state: initializeState(),
        } as CurrentSave;
    }

    return results.rows[0] as CurrentSave;
}

export async function goAdventure(req: Request, res: Response) {
    try {
        let validatedMessage: Message | undefined = undefined;
        try {
            if (req.body?.trustedData?.messageBytes) {
                const frameMessage = Message.decode(
                    Buffer.from(req.body?.trustedData?.messageBytes || "", "hex")
                );
                const result = await client.validateMessage(frameMessage);
                if (result.isOk() && result.value.valid) {
                    validatedMessage = result.value.message;
                }
            }
        } catch (e) {
            return res.status(400).send(`Failed to validate message: ${e}`);
        }

        let buttonIndex =
            validatedMessage?.data?.frameActionBody?.buttonIndex ??
            req?.body?.untrustedData?.buttonIndex ??
            1;
        const fid =
            validatedMessage?.data?.fid ?? req?.body?.untrustedData?.fid ?? 123;
        if (fid == null || buttonIndex == null)
            return res.status(400).send(`Missing required data`);

        const starting = !!req.query.start;

        let type;
        let save = await loadState(fid);
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
            let playerRoll = save.state.player.roll

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

        save.state.lastOption = type as Option;
        await saveState(save.state, fid);

        if (!message) {
            message =
                "Prepare to die.";
        }
        const postUrl = `https://${req.hostname}/luckwhisper`;

        const image = await generateImage(message);
        const base64 = `data:image/gif;base64,${image.toString("base64")}`;

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
    } catch (e) {
        console.log(e);
        return res.status(500).json({ response: "something went wrong" });
    }
}

function rollADice() {
    const roll = Math.floor(Math.random() * 6) + 1;
    return roll;
}
