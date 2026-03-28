const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore } = require("@whiskeysockets/baileys");
const fs = require("fs");
const pino = require("pino");

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS("Desktop")
    });

    if (!sock.authState.creds.registered) {
        const phoneNumber = process.env.PHONE_NUMBER;
        if (!phoneNumber) {
            console.log("Error: PHONE_NUMBER env is missing");
            process.exit(1);
        }

        const code = await sock.requestPairingCode(phoneNumber);
        
        // GitHub Step Summary එකට Code එක යැවීම (මෙතනින් තමයි Website එක වගේ පේන්නේ)
        const summary = `
### 🚀 WhatsApp Pairing Code
**Phone Number:** ${phoneNumber}
**Code:** \`${code}\`

> **පියවර:** WhatsApp > Linked Devices > Link a Device > Link with phone number instead ගොස් ඉහත code එක ඇතුළත් කරන්න.
`;
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
        console.log(`Code generated: ${code}`);
    }

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === "open") {
            const sessionData = fs.readFileSync('./session/creds.json', 'utf-8');
            const sessionID = Buffer.from(sessionData).toString('base64');
            
            await sock.sendMessage(sock.user.id, { 
                text: `✅ *සැසිය සාර්ථකයි!*\n\nමෙන්න ඔයාගේ Session ID එක:\n\n\`\`\`${sessionID}\`\`\`\n\nමෙය ආරක්ෂිතව තබාගන්න.` 
            });
            
            fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, "\n✅ **Session එක සාර්ථකව WhatsApp එකට යැවුවා!**");
            process.exit(0);
        }
    });

    // විනාඩි 2කින් වැඩේ ඉවර නොවුණොත් auto stop වෙනවා
    await delay(120000);
    process.exit(0);
}

start();
