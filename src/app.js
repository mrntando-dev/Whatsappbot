require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const qrcode = require('qrcode-terminal');
const express = require('express');
const commandHandler = require('./commands');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Health check endpoint for Render
app.get('/', (req, res) => {
  res.json({ status: 'Bot is running!', timestamp: new Date().toISOString() });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
});

async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
    auth: state,
    browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
    getMessage: async (key) => {
      return { conversation: 'Hello' };
    }
  });

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Scan this QR code to connect your WhatsApp:\n');
      qrcode.generate(qr, { small: true });
      logger.info('QR Code generated. Please scan to authenticate.');
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      logger.info('Connection closed. Reconnecting:', shouldReconnect);
      
      if (shouldReconnect) {
        setTimeout(() => connectToWhatsApp(), 5000);
      }
    } else if (connection === 'open') {
      logger.info('✅ WhatsApp connection opened successfully!');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;

      const messageText = msg.message.conversation || 
                         msg.message.extendedTextMessage?.text || 
                         '';
      const sender = msg.key.remoteJid;
      const isGroup = sender.endsWith('@g.us');

      logger.info(`Message from ${sender}: ${messageText}`);

      // Command handler
      await commandHandler(sock, msg, messageText, sender, isGroup);
    }
  });

  return sock;
}

// Start the bot
connectToWhatsApp().catch(err => {
  logger.error('Error starting bot:', err);
  process.exit(1);
});
