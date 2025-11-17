const ytdl = require('ytdl-core');
const yts = require('yt-search');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function downloadYouTubeVideo(sock, msg, args, sender) {
  const query = args.slice(1).join(' ');
  
  if (!query) {
    await sock.sendMessage(sender, { text: '❌ Please provide a URL or search query!' });
    return;
  }

  await sock.sendMessage(sender, { text: '⏳ Searching and downloading video...' });

  try {
    let videoUrl = query;
    
    // If not a URL, search YouTube
    if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
      const searchResults = await yts(query);
      if (!searchResults.videos.length) {
        await sock.sendMessage(sender, { text: '❌ No results found!' });
        return;
      }
      videoUrl = searchResults.videos[0].url;
    }

    const info = await ytdl.getInfo(videoUrl);
    const title = info.videoDetails.title;
    const fileName = `${Date.now()}.mp4`;
    const filePath = path.join(__dirname, '../../temp', fileName);

    // Ensure temp directory exists
    if (!fs.existsSync(path.join(__dirname, '../../temp'))) {
      fs.mkdirSync(path.join(__dirname, '../../temp'), { recursive: true });
    }

    // Download video (lowest quality for WhatsApp compatibility)
    const stream = ytdl(videoUrl, { quality: 'lowest', filter: 'videoandaudio' });
    const writer = fs.createWriteStream(filePath);
    
    stream.pipe(writer);

    writer.on('finish', async () => {
      await sock.sendMessage(sender, {
        video: { url: filePath },
        caption: `🎥 *${title}*`,
        mimetype: 'video/mp4'
      });

      // Clean up
      fs.unlinkSync(filePath);
    });

    writer.on('error', async (err) => {
      console.error(err);
      await sock.sendMessage(sender, { text: '❌ Failed to download video. Try a different video or use audio mode (!yta)' });
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

  } catch (error) {
    console.error(error);
    await sock.sendMessage(sender, { text: '❌ Error downloading video. Please try again.' });
  }
}

async function downloadYouTubeAudio(sock, msg, args, sender) {
  const query = args.slice(1).join(' ');
  
  if (!query) {
    await sock.sendMessage(sender, { text: '❌ Please provide a URL or search query!' });
    return;
  }

  await sock.sendMessage(sender, { text: '⏳ Searching and downloading audio...' });

  try {
    let videoUrl = query;
    
    if (!query.includes('youtube.com') && !query.includes('youtu.be')) {
      const searchResults = await yts(query);
      if (!searchResults.videos.length) {
        await sock.sendMessage(sender, { text: '❌ No results found!' });
        return;
      }
      videoUrl = searchResults.videos[0].url;
    }

    const info = await ytdl.getInfo(videoUrl);
    const title = info.videoDetails.title;
    const fileName = `${Date.now()}.mp3`;
    const filePath = path.join(__dirname, '../../temp', fileName);

    if (!fs.existsSync(path.join(__dirname, '../../temp'))) {
      fs.mkdirSync(path.join(__dirname, '../../temp'), { recursive: true });
    }

    const stream = ytdl(videoUrl, { quality: 'lowestaudio', filter: 'audioonly' });
    const writer = fs.createWriteStream(filePath);
    
    stream.pipe(writer);

    writer.on('finish', async () => {
      await sock.sendMessage(sender, {
        audio: { url: filePath },
        mimetype: 'audio/mp4',
        ptt: false,
        fileName: `${title}.mp3`
      });

      fs.unlinkSync(filePath);
    });

    writer.on('error', async (err) => {
      console.error(err);
      await sock.sendMessage(sender, { text: '❌ Failed to download audio.' });
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    });

  } catch (error) {
    console.error(error);
    await sock.sendMessage(sender, { text: '❌ Error downloading audio. Please try again.' });
  }
}

async function searchImage(sock, msg, args, sender) {
  const query = args.slice(1).join(' ');
  
  if (!query) {
    await sock.sendMessage(sender, { text: '❌ Please provide a search query!' });
    return;
  }

  await sock.sendMessage(sender, { text: '⏳ Searching for images...' });

  try {
    // Using Unsplash API (you can use other APIs)
    const response = await axios.get(`https://api.unsplash.com/search/photos`, {
      params: {
        query: query,
        client_id: process.env.UNSPLASH_ACCESS_KEY || 'demo',
        per_page: 1
      }
    });

    if (response.data.results.length === 0) {
      await sock.sendMessage(sender, { text: '❌ No images found!' });
      return;
    }

    const imageUrl = response.data.results[0].urls.regular;
    
    await sock.sendMessage(sender, {
      image: { url: imageUrl },
      caption: `🖼️ *${query}*`
    });

  } catch (error) {
    console.error(error);
    // Fallback to a simple method
    await sock.sendMessage(sender, { 
      text: '❌ Error searching images. Please make sure UNSPLASH_ACCESS_KEY is set in environment variables.' 
    });
  }
}

module.exports = {
  '!ytv': downloadYouTubeVideo,
  '!yta': downloadYouTubeAudio,
  '!img': searchImage,
};
