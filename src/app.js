require('dotenv').config();
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure required directories exist
const dirs = ['auth_info_baileys', 'temp', 'data'];
dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Health check endpoint for Render
app.get('/', (req, res) => {
  res.json({ 
    status: 'Bot is running!', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server running on port ${PORT}`);
});

let sock;

async function connectToWhatsApp() {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: true,
      auth: state,
      browser: ['WhatsApp Bot', 'Chrome', '1.0.0'],
      getMessage: async (key) => {
        return { conversation: '' };
      }
    });

    // Store chats
    sock.store = { chats: [] };

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\n📱 Scan this QR code with WhatsApp:\n');
        console.log('QR Code generated at:', new Date().toLocaleString());
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        console.log('Connection closed. Reconnecting:', shouldReconnect);
        
        if (shouldReconnect) {
          setTimeout(() => connectToWhatsApp(), 5000);
        } else {
          console.log('Logged out. Delete auth_info_baileys folder to re-authenticate.');
        }
      } else if (connection === 'open') {
        console.log('✅ WhatsApp connection opened successfully!');
        
        // Send notification to owner
        const OWNER_NUMBER = '263718456744@s.whatsapp.net';
        setTimeout(async () => {
          try {
            await sock.sendMessage(OWNER_NUMBER, { 
              text: `🤖 *Bot Started Successfully!*\n\nOwner: Ntando Mods\n📱 +263 71 845 6744\n\n✅ All systems operational!\n⏰ ${new Date().toLocaleString()}` 
            });
          } catch (error) {
            console.error('Failed to send owner notification:', error);
          }
        }, 3000);
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('chats.set', ({ chats }) => {
      sock.store.chats = chats;
    });

    sock.ev.on('chats.upsert', (chats) => {
      for (const chat of chats) {
        const existingIndex = sock.store.chats.findIndex(c => c.id === chat.id);
        if (existingIndex !== -1) {
          sock.store.chats[existingIndex] = chat;
        } else {
          sock.store.chats.push(chat);
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const msg of messages) {
        if (!msg.message || msg.key.fromMe) continue;

        const messageText = msg.message.conversation || 
                           msg.message.extendedTextMessage?.text || 
                           '';
        const sender = msg.key.remoteJid;
        const isGroup = sender.endsWith('@g.us');

        console.log(`Message from ${sender}: ${messageText}`);

        // Handle commands
        await handleCommand(sock, msg, messageText, sender, isGroup);
      }
    });

    return sock;
  } catch (error) {
    console.error('Error connecting to WhatsApp:', error);
    throw error;
  }
}

// Simple command handler
const OWNER_NUMBER = '263718456744@s.whatsapp.net';

function isOwner(userId) {
  return userId === OWNER_NUMBER;
}

async function handleCommand(sock, msg, messageText, sender, isGroup) {
  const args = messageText.trim().split(' ');
  const command = args[0].toLowerCase();

  // Help command
  if (command === '!help' || command === '!menu') {
    const helpText = `
🤖 *WhatsApp Bot Commands*

📥 *Download Commands:*
!ytv <url/query> - Download YouTube video
!yta <url/query> - Download YouTube audio

👥 *Group Commands:* (Admin only)
!promote @user - Promote to admin
!demote @user - Demote from admin
!kick @user - Remove user
!tagall <message> - Tag everyone
!groupinfo - Get group info

${isOwner(sender) ? `👑 *Owner Commands:*
!stats - Bot statistics
!restart - Restart bot
!broadcast <msg> - Send to all
!block @user - Block user
!unblock @user - Unblock user
!listgroups - List all groups
!cleartemp - Clear temp files` : ''}

💫 *Powered by Ntando Mods*
📱 +263 71 845 6744
    `.trim();

    await sock.sendMessage(sender, { text: helpText });
    return;
  }

  // Stats command (Owner only)
  if (command === '!stats' && isOwner(sender)) {
    const chats = sock.store?.chats || [];
    const groups = chats.filter(c => c.id.endsWith('@g.us')).length;
    const privateChats = chats.filter(c => !c.id.endsWith('@g.us')).length;
    const uptime = process.uptime();
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);

    const stats = `
📊 *Bot Statistics*

👤 *Owner:* Ntando Mods
📱 *Number:* +263 71 845 6744

💬 *Chats:*
• Total: ${chats.length}
• Private: ${privateChats}
• Groups: ${groups}

⏱️ *Uptime:* $${hours}h$$ {minutes}m
💾 *Memory:* ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB
🖥️ *Platform:* ${process.platform}
📦 *Node:* ${process.version}
    `.trim();

    await sock.sendMessage(sender, { text: stats });
    return;
  }

  // Restart command (Owner only)
  if (command === '!restart' && isOwner(sender)) {
    await sock.sendMessage(sender, { text: '🔄 Restarting bot...' });
    setTimeout(() => process.exit(0), 2000);
    return;
  }

  // Clear temp (Owner only)
  if (command === '!cleartemp' && isOwner(sender)) {
    try {
      const tempDir = './temp';
      if (fs.existsSync(tempDir)) {
        const files = fs.readdirSync(tempDir);
        files.forEach(file => fs.unlinkSync(path.join(tempDir, file)));
        await sock.sendMessage(sender, { text: `✅ Cleared ${files.length} files!` });
      }
    } catch (error) {
      await sock.sendMessage(sender, { text: '❌ Error clearing temp files.' });
    }
    return;
  }

  // List groups (Owner only)
  if (command === '!listgroups' && isOwner(sender)) {
    const chats = sock.store?.chats || [];
    const groups = chats.filter(c => c.id.endsWith('@g.us'));
    
    let groupList = `👥 *Bot is in ${groups.length} groups:*\n\n`;
    groups.slice(0, 20).forEach((group, i) => {
      groupList += `$${i + 1}.$$ {group.name || 'Unknown'}\n`;
    });
    
    await sock.sendMessage(sender, { text: groupList });
    return;
  }

  // Group info
  if (command === '!groupinfo' && isGroup) {
    try {
      const groupMetadata = await sock.groupMetadata(sender);
      const admins = groupMetadata.participants.filter(p => p.admin).length;
      
      const info = `
👥 *Group Information*

📝 *Name:* ${groupMetadata.subject}
👤 *Members:* ${groupMetadata.participants.length}
👑 *Admins:* ${admins}
📅 *Created:* ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}
      `.trim();

      await sock.sendMessage(sender, { text: info });
    } catch (error) {
      await sock.sendMessage(sender, { text: '❌ Failed to get group info.' });
    }
    return;
  }
}

// Start the bot
connectToWhatsApp().catch(err => {
  console.error('Failed to start bot:', err);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down gracefully...');
  server.close();
  process.exit(0);
});
