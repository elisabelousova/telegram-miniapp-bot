import TelegramBot from "node-telegram-bot-api";
import { GoogleSpreadsheet } from "google-spreadsheet";
import fs from "fs";

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
await doc.useServiceAccountAuth(
  JSON.parse(process.env.GOOGLE_CREDENTIALS)
);
await doc.loadInfo();
const sheet = doc.sheetsByIndex[0];

function parsePost(text) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  const title = lines[0];
  const price = (lines.find(l => l.includes("₽")) || "").replace(/\D/g, "");
  const sizes = lines.find(l => /^[XSMLXL,\s]+$/.test(l)) || "";

  const description = lines.slice(1).join("\n");
  const sold = text.includes("❌ПРОДАНО❌");

  return { title, description, price, sizes, sold };
}

bot.on("message", async msg => {
  if (!msg.forward_from_chat || !msg.text) return;

  const { title, description, price, sizes, sold } = parsePost(msg.text);

  const rows = await sheet.getRows();
  const existing = rows.find(r => r.title === title);

  if (sold && existing) {
    existing.status = "sold";
    await existing.save();
    return;
  }

  if (!existing) {
    await sheet.addRow({
      id: Date.now(),
      title,
      description,
      sizes,
      price,
      photos: "",
      status: "available",
      admin_username: "jersey_lab_admin",
      created_at: new Date().toISOString()
    });
  }
});
