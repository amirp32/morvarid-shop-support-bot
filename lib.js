// lib.js — توابع کمکی بات (جدا شده تا قابل تست باشند)
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(fileURLToPath(import.meta.url));

// ۱) تبدیل اعداد فارسی و عربی به انگلیسی: «۱۲۳۴۵» → "12345"
export function normalizeDigits(text = "") {
  return text
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

// ۲) خواندن فایل‌های دانش فروشگاه از پوشه data
export function loadKnowledge(dir = path.join(ROOT, "data")) {
  const shopInfo = fs.readFileSync(path.join(dir, "shop-info.md"), "utf8");
  const products = JSON.parse(fs.readFileSync(path.join(dir, "products.json"), "utf8"));
  const orders = JSON.parse(fs.readFileSync(path.join(dir, "orders.json"), "utf8"));
  return { shopInfo, products, orders };
}

// ۳) ساخت پرامپت سیستم: جای {{SHOP_INFO}} و {{PRODUCTS}} را پر می‌کند
export function buildSystemPrompt(kb, file = path.join(ROOT, "prompts", "system-prompt.md")) {
  const template = fs.readFileSync(file, "utf8");
  const productLines = kb.products
    .map(
      (p) =>
        `- ${p.name} | کد ${p.sku} | قیمت ${p.price.toLocaleString("en-US")} تومان | موجودی: ${
          p.stock > 0 ? p.stock + " عدد" : "ناموجود"
        } | ${p.description}`
    )
    .join("\n");
  return template.replace("{{SHOP_INFO}}", kb.shopInfo).replace("{{PRODUCTS}}", productLines);
}

// ۴) پیدا کردن کد سفارش در پیام مشتری (عدد ۵ تا ۸ رقمی)
export function findOrder(text, orders) {
  const match = normalizeDigits(text).match(/\b\d{5,8}\b/);
  if (!match) return null;
  return orders.find((o) => o.code === match[0]) || { code: match[0], notFound: true };
}

// ۵) متن وضعیت سفارش برای اضافه شدن به پیام (هوش مصنوعی فقط از همین داده جواب می‌دهد)
export function orderContext(order) {
  if (!order) return "";
  if (order.notFound) {
    return `\n\n[داده سیستم: سفارشی با کد ${order.code} پیدا نشد. از مشتری بخواه کد را دوباره چک کند.]`;
  }
  return `\n\n[داده سیستم درباره سفارش ${order.code}: وضعیت «${order.status}»، تاریخ ثبت ${order.date}، روش ارسال ${order.shipping}، کد رهگیری پستی: ${order.tracking || "هنوز صادر نشده"}]`;
}

// ۶) تبدیل صدای خام PCM (خروجی Gemini) به OGG/Opus که تلگرام و بله به‌عنوان ویس قبول می‌کنند
export function pcmToOgg(pcmBuffer, ffmpegBin, sampleRate = 24000) {
  return new Promise((resolve, reject) => {
    const ff = spawn(ffmpegBin, [
      "-hide_banner", "-loglevel", "error",
      "-f", "s16le", "-ar", String(sampleRate), "-ac", "1", "-i", "pipe:0",
      "-c:a", "libopus", "-b:a", "32k", "-f", "ogg", "pipe:1",
    ]);
    const chunks = [];
    let err = "";
    ff.stdout.on("data", (c) => chunks.push(c));
    ff.stderr.on("data", (c) => (err += c));
    ff.on("error", reject);
    ff.on("close", (code) => (code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(err))));
    ff.stdin.end(pcmBuffer);
  });
}

// ۷) آماده‌سازی متن برای خواندن با صدا: حذف ایموجی و علامت‌های اضافه
export function cleanForSpeech(text) {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
    .replace(/[*_`#>]/g, "")
    .slice(0, 900);
}
