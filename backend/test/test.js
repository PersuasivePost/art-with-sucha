import "dotenv/config"; // This replaces require('dotenv').config();
import axios from "axios"; // This replaces const axios = require('axios');

async function testBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat_id = process.env.TELEGRAM_CHAT_ID;

  console.log("Testing Token:", token);
  console.log("Testing Chat ID:", chat_id);

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chat_id,
      text: "🚀 BINGO! Your bot is working perfectly.",
    });
    console.log("✅ Check your Telegram!");
  } catch (error) {
    console.error("❌ Error:", error.message);
  }
}

testBot();
