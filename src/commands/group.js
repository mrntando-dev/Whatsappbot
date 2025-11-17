async function isAdmin(sock, groupId, userId) {
  try {
    const groupMetadata = await sock.groupMetadata(groupId);
    const participant = groupMetadata.participants.find(p => p.id === userId);
    return participant && (participant.admin === 'admin' || participant.admin === 'superadmin');
  } catch (error) {
    return false;
  }
}

async function promoteUser(sock, msg, args, sender, isGroup) {
  if (!isGroup) {
    await sock.sendMessage(sender, { text: '❌ This command only works in groups!' });
    return;
  }

  const botIsAdmin = await isAdmin(sock, sender, sock.user.id);
  if (!botIsAdmin) {
    await sock.sendMessage(sender, { text: '❌ I need to be an admin to do this!' });
    return;
  }

  const senderIsAdmin = await isAdmin(sock, sender, msg.key.participant || msg.key.remoteJid);
  if (!senderIsAdmin) {
    await sock.sendMessage(sender, { text: '❌ Only admins can use this command!' });
    return;
  }

  const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mentionedJid) {
    await sock.sendMessage(sender, { text: '❌ Please mention a user to promote!' });
    return;
  }

  try {
    await sock.groupParticipantsUpdate(sender, [mentionedJid], 'promote');
    await sock.sendMessage(sender, { text: '✅ User promoted to admin!' });
  } catch (error) {
    console.error(error);
    await sock.sendMessage(sender, { text: '❌ Failed to promote user.' });
  }
}

async function demoteUser(sock, msg, args, sender, isGroup) {
  if (!isGroup) {
    await sock.sendMessage(sender, { text: '❌ This command only works in groups!' });
    return;
  }

  const botIsAdmin = await isAdmin(sock, sender, sock.user.id);
  if (!botIsAdmin) {
    await sock.sendMessage(sender, { text: '❌ I need to be an admin to do this!' });
    return;
  }

  const senderIsAdmin = await isAdmin(sock, sender, msg.key.participant || msg.key.remoteJid);
  if (!senderIsAdmin) {
    await sock.sendMessage(sender, { text: '❌ Only admins can use this command!' });
    return;
  }

  const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mentionedJid) {
    await sock.sendMessage(sender, { text: '❌ Please mention a user to demote!' });
    return;
  }

  try {
    await sock.groupParticipantsUpdate(sender, [mentionedJid], 'demote');
    await sock.sendMessage(sender, { text: '✅ User demoted from admin!' });
  } catch (error) {
    console.error(error);
    await sock.sendMessage(sender, { text: '❌ Failed to demote user.' });
  }
}

async function kickUser(sock, msg, args, sender, isGroup) {
  if (!isGroup) {
    await sock.sendMessage(sender, { text: '❌ This command only works in groups!' });
    return;
  }

  const botIsAdmin = await isAdmin(sock, sender, sock.user.id);
  if (!botIsAdmin) {
    await sock.sendMessage(sender, { text: '❌ I need to be an admin to do this!' });
    return;
  }

  const senderIsAdmin = await isAdmin(sock, sender, msg.key.participant || msg.key.remoteJid);
  if (!senderIsAdmin) {
    await sock.sendMessage(sender, { text: '❌ Only admins can use this command!' });
    return;
  }

  const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
  if (!mentionedJid) {
    await sock.sendMessage(sender, { text: '❌ Please mention a user to remove!' });
    return;
  }

  try {
    await sock.groupParticipantsUpdate(sender, [mentionedJid], 'remove');
    await sock.sendMessage(sender, { text: '✅ User removed from group!' });
  } catch (error) {
    console.error(error);
    await sock.sendMessage(sender, { text: '❌ Failed to remove user.' });
  }
}

async function tagAll(sock, msg, args, sender, isGroup) {
  if (!isGroup) {
    await sock.sendMessage(sender, { text: '❌ This command only works in groups!' });
    return;
  }

  const senderIsAdmin = await isAdmin(sock, sender, msg.key.participant || msg.key.remoteJid);
  if (!senderIsAdmin) {
    await sock.sendMessage(sender, { text: '❌ Only admins can use this command!' });
    return;
  }

  try {
    const groupMetadata = await sock.groupMetadata(sender);
    const participants = groupMetadata.participants;
    const message = args.slice(1).join(' ') || 'Announcement';

    const mentions = participants.map(p => p.id);
    const text = `📢 *Group Announcement*\n\n${message}\n\n` + mentions.map(m => `@${m.split('@')[0]}`).join(' ');

    await sock.sendMessage(sender, { 
      text: text,
      mentions: mentions 
    });
  } catch (error) {
    console.error(error);
    await sock.sendMessage(sender, { text: '❌ Failed to tag all members.' });
  }
}

async function groupInfo(sock, msg, args, sender, isGroup) {
  if (!isGroup) {
    await sock.sendMessage(sender, { text: '❌ This command only works in groups!' });
    return;
  }

  try {
    const groupMetadata = await sock.groupMetadata(sender);
    const admins = groupMetadata.participants.filter(p => p.admin).length;
    
    const info = `
👥 *Group Information*

📝 *Name:* ${groupMetadata.subject}
👤 *Members:* ${groupMetadata.participants.length}
👑 *Admins:* ${admins}
📅 *Created:* ${new Date(groupMetadata.creation * 1000).toLocaleDateString()}
${groupMetadata.desc ? `\n📄 *Description:*\n${groupMetadata.desc}` : ''}
    `.trim();

    await sock.sendMessage(sender, { text: info });
  } catch (error) {
    console.error(error);
    await sock.sendMessage(sender, { text: '❌ Failed to get group information.' });
  }
}

module.exports = {
  '!promote': promoteUser,
  '!demote': demoteUser,
  '!kick': kickUser,
  '!tagall': tagAll,
  '!groupinfo': groupInfo,
};
