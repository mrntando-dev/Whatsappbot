const downloadCommands = require('./download');
const aiCommands = require('./ai');
const groupCommands = require('./group');

const commands = {
  ...downloadCommands,
  ...aiCommands,
  ...groupCommands,
};

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
!img <query> - Search and download image
!igdl <url> - Download Instagram media

🤖 *AI Commands:*
!ai <question> - Ask AI anything
!imagine <prompt> - Generate AI image
!chat <message> - Chat with AI

👥 *Group Commands:* (Admin only)
!promote @user - Promote to admin
!demote @user - Demote from admin
!kick @user - Remove user
!tagall <message> - Tag everyone
!groupinfo - Get group info

Type any command to get started!
    `.trim();

    await sock.sendMessage(sender, { text: helpText });
    return;
  }

  // Execute command
  if (commands[command]) {
    try {
      await commands[command](sock, msg, args, sender, isGroup);
    } catch (error) {
      console.error(`Error executing command ${command}:`, error);
      await sock.sendMessage(sender, { 
        text: '❌ An error occurred while executing the command.' 
      });
    }
  }
}

module.exports = handleCommand;
