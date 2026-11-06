// bot.js — بات پشتیبان هوشمند فروشگاه | AI Lab — نیما امینی
// اجرا: npm start
import "dotenv/config";
import http from "node:http";
import { Bot, InputFile, Keyboard } from "grammy";
import OpenAI from "openai";
import ffmpegStatic from "ffmpeg-static";
import {
  loadKnowledge, buildSystemPrompt, findOrder, orderContext, pcmToOgg, cleanForSpeech,
} from "./lib.js";

const env = process.env;
if (!env.BOT_TOKEN || !env.AI_API_KEY) {
  console.error("❌ BOT_TOKEN یا AI_API_KEY در فایل .env خالی است.");
  process.exit(1);
}

// ---------- ۱) اتصال به پیام‌رسان (تلگرام یا بله) ----------
const apiRoot = env.PLATFORM === "bale" ? "https://tapi.bale.ai" : "https://api.telegram.org";
const bot = new Bot(env.BOT_TOKEN, { client: { apiRoot } });

// ---------- ۲) اتصال به مغز هوش مصنوعی ----------
const ai = new OpenAI({ apiKey: env.AI_API_KEY, baseURL: env.AI_BASE_URL });
const tts = new OpenAI({
  apiKey: env.TTS_API_KEY || env.AI_API_KEY,
  baseURL: env.TTS_BASE_URL || env.AI_BASE_URL,
});

// ---------- ۳) دانش فروشگاه ----------
let kb = loadKnowledge();
let systemPrompt = buildSystemPrompt(kb);

// ---------- ۴) حافظه کوتاه‌مدت هر گفتگو ----------
const sessions = new Map(); // chatId → { history: [], voice: false }
const MAX_MESSAGES = 12;     // فقط ۱۲ پیام آخر را نگه می‌داریم تا هزینه و خطا کم شود
function session(id) {
  if (!sessions.has(id)) sessions.set(id, { history: [], voice: false });
  return sessions.get(id);
}

const menu = new Keyboard()
  .text("🛍 محصولات").text("🚚 پیگیری سفارش").row()
  .text("🔊 جواب صوتی روشن/خاموش").text("👤 صحبت با پشتیبان")
  .resized();

// ---------- ۵) پرسیدن از هوش مصنوعی ----------
async function askAI(chatId, userText) {
  const s = session(chatId);
  const order = findOrder(userText, kb.orders);
  const messages = [
    { role: "system", content: systemPrompt },
    ...s.history,
    { role: "user", content: userText + orderContext(order) },
  ];
  const res = await ai.chat.completions.create({ model: env.AI_MODEL, messages, temperature: 0.3 });
  const answer = res.choices[0].message.content?.trim() || "ببخشید، الان نتونستم جواب بدم.";
  s.history.push({ role: "user", content: userText }, { role: "assistant", content: answer });
  if (s.history.length > MAX_MESSAGES) s.history.splice(0, s.history.length - MAX_MESSAGES);
  return answer;
}

// ---------- ۶) ساخت صدا ----------
async function makeVoice(text) {
  const input = cleanForSpeech(text);
  if (env.TTS_PROVIDER === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${env.TTS_MODEL}:generateContent`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": env.TTS_API_KEY || env.AI_API_KEY },
     body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: input }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: env.TTS_VOICE || "Kore"
            }
          }
        }
      }
    }),
    });
    if (!r.ok) throw new Error(`Gemini TTS ${r.status}: ${await r.text()}`);
    const data = await r.json();
    const b64 = data.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
    if (!b64) throw new Error("Gemini TTS: صدایی برنگشت");
    return pcmToOgg(Buffer.from(b64, "base64"), env.FFMPEG_PATH || ffmpegStatic);
  }
  // سرویس‌های سازگار با OpenAI (AvalAI، GapGPT، OpenAI) مستقیم Opus برمی‌گردانند
  const audio = await tts.audio.speech.create({
    model: env.TTS_MODEL, voice: env.TTS_VOICE || "nova", input, response_format: "opus",
  });
  return Buffer.from(await audio.arrayBuffer());
}

// ---------- ۷) ارجاع به اپراتور انسانی ----------
async function handoff(ctx, reason) {
  const u = ctx.from;
  if (env.ADMIN_CHAT_ID) {
    await bot.api.sendMessage(
      env.ADMIN_CHAT_ID,
      `👤 درخواست پشتیبان انسانی\nمشتری: ${u.first_name || ""} (@${u.username || "-"})\nchat id: ${ctx.chat.id}\nپیام: ${reason}\n\nجواب: /reply ${ctx.chat.id} متن پاسخ`
    );
  }
  await ctx.reply("درخواستت رو برای همکارم فرستادم؛ در ساعت کاری خیلی زود جواب می‌ده 🙏");
}

// ---------- ۸) دستورها ----------
bot.command("start", (ctx) =>
  ctx.reply(
    `سلام! من دستیار هوشمند ${env.SHOP_NAME || "فروشگاه"} هستم.\nسؤالت درباره محصول، قیمت، ارسال یا سفارش رو بپرس. برای پیگیری، کد سفارشت رو بفرست.`,
    { reply_markup: menu }
  )
);

bot.command("voice", (ctx) => toggleVoice(ctx));

// آیدی عددی خودت را برای ADMIN_CHAT_ID پیدا کن
bot.command("myid", (ctx) => ctx.reply(`آیدی عددی تو: ${ctx.chat.id}`));

bot.command("reload", async (ctx) => {
  if (String(ctx.from.id) !== String(env.ADMIN_CHAT_ID)) return;
  kb = loadKnowledge();
  systemPrompt = buildSystemPrompt(kb);
  await ctx.reply("✅ اطلاعات فروشگاه دوباره بارگذاری شد.");
});

bot.command("reply", async (ctx) => {
  if (String(ctx.from.id) !== String(env.ADMIN_CHAT_ID)) return;
  const [id, ...rest] = (ctx.match || "").split(" ");
  if (!id || !rest.length) return ctx.reply("فرمت: /reply chatId متن");
  await bot.api.sendMessage(id, `💬 پاسخ پشتیبان:\n${rest.join(" ")}`);
  await ctx.reply("ارسال شد.");
});

async function toggleVoice(ctx) {
  const s = session(ctx.chat.id);
  s.voice = !s.voice;
  await ctx.reply(s.voice ? "🔊 از این به بعد جواب‌ها صوتی هم می‌آید." : "🔇 جواب صوتی خاموش شد.");
}

// ---------- ۹) پیام‌های متنی ----------
bot.on("message:text", async (ctx) => {
  const text = ctx.message.text;
  if (text.includes("صحبت با پشتیبان")) return handoff(ctx, "مشتری خودش اپراتور خواست");
  if (text.includes("جواب صوتی")) return toggleVoice(ctx);
  const question =
    text === "🛍 محصولات" ? "چه محصولاتی دارید؟ خلاصه بگو." :
    text === "🚚 پیگیری سفارش" ? "می‌خوام سفارشم رو پیگیری کنم." : text;

  try {
    await ctx.replyWithChatAction("typing").catch(() => {});
    let answer = await askAI(ctx.chat.id, question);

    // اگر هوش مصنوعی گفت باید انسان جواب بدهد
    const needsHuman = answer.includes("[HANDOFF]");
    answer = answer.replace("[HANDOFF]", "").trim();
    await ctx.reply(answer);
    if (needsHuman) await handoff(ctx, text);

    if (session(ctx.chat.id).voice && env.TTS_PROVIDER !== "off") {
      await ctx.replyWithChatAction("record_voice").catch(() => {});
      const ogg = await makeVoice(answer);
      await ctx.replyWithVoice(new InputFile(ogg, "answer.ogg"));
    }
  } catch (e) {
    console.error("خطا:", e.message);
    await ctx.reply("یه مشکل فنی پیش اومد. چند لحظه دیگه دوباره بپرس، یا «👤 صحبت با پشتیبان» رو بزن.");
  }
});

bot.on("message:voice", (ctx) =>
  ctx.reply("فعلاً پیام صوتی رو نمی‌تونم گوش بدم؛ لطفاً سؤالت رو تایپ کن 🙏")
);

bot.catch((err) => console.error("خطای بات:", err.message));

// سرویس‌های میزبانی (مثل لیارا) معمولاً می‌خواهند برنامه روی یک پورت جواب بدهد
if (env.PORT) http.createServer((_, res) => res.end("ok")).listen(env.PORT);

bot.start({ onStart: (me) => console.log(`✅ بات @${me.username} روی ${env.PLATFORM || "telegram"} روشن شد.`) });
