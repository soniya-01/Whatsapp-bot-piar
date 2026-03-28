const express = require('express');
const { default: makeWASocket, useMultiFileAuthState, Browsers, delay } = require('@whiskeysockets/baileys');
const pino = require('pino');
const fs = require('fs');
const app = express();
const port = 3000;

app.get('/get-code', async (req, res) => {
    let num = req.query.number;
    const { state, saveCreds } = await useMultiFileAuthState('./temp_session/' + num);

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: "silent" }),
        browser: Browsers.macOS('Desktop')
    });

    if (!sock.authState.creds.registered) {
        try {
            let code = await sock.requestPairingCode(num);
            res.json({ code: code });
        } catch (error) {
            res.json({ error: "Code එක ලබාගන්න බැරි වුණා. අංකය පරීක්ෂා කරන්න." });
        }
    }

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('connection.update', async (update) => {
        const { connection } = update;
        if (connection === 'open') {
            // ලොගින් වුණාම Session ID එක මැසේජ් එකක් විදියට යවනවා
            const sessionData = fs.readFileSync(`./temp_session/${num}/creds.json`, 'utf-8');
            await sock.sendMessage(sock.user.id, { text: `✅ ඔයාගේ SESSION ID එක සාර්ථකව සැකසුවා!\n\n${Buffer.from(sessionData).toString('base64')}` });
            console.log("Session Sent!");
            // පස්සේ temp folder එක මකන්න පුළුවන්
        }
    });
});

app.listen(port, () => console.log(`Server started on port ${port}`));
