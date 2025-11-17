const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_KEY || '');

async function askAI(sock, msg, args, sender) {
  const question = args.slice(1).join(' ');
  
  if (!question) {
    await sock.sendMessage(sender, { text: '❌ Please provide a question!' });
    return;
  }

  if (!process.env.GOOGLE_AI_KEY) {
    await sock.sendMessage(sender, { 
      text: '❌ AI feature not configured. Please set GOOGLE_AI_KEY environment variable.' 
    });
    return;
  }

  await sock.sendMessage(sender, { text: '🤖 Thinking...' });

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    const result = await model.generateContent(question);
    const response = await result.response;
    const text = response.text();

    await sock.sendMessage(sender, { text: `🤖 *AI Response:*\n\n${text}` });
  } catch (error) {
    console.error(error);
    await sock.sendMessage(sender, { 
      text: '❌ Error getting AI response. Please check your API key and try again.' 
    });
  }
}

async function chatWithAI(sock, msg, args, sender) {
  // Similar to askAI but can maintain context
  await askAI(sock, msg, args, sender);
}

async function generateImage(sock, msg, args, sender) {
  const prompt = args.slice(1).join(' ');
  
  if (!prompt) {
    await sock.sendMessage(sender, { text: '❌ Please provide a description!' });
    return;
  }

  await sock.sendMessage(sender, { 
    text: '🎨 Image generation requires additional API setup (DALL-E, Stability AI, etc.)\n\nThis is a placeholder for the feature.' 
  });
}

module.exports = {
  '!ai': askAI,
  '!chat': chatWithAI,
  '!imagine': generateImage,
};
