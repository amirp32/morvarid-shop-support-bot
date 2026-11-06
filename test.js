// Offline checks: no Telegram or AI API calls.
import assert from "node:assert/strict";
import ffmpegStatic from "ffmpeg-static";
import {normalizeDigits,loadKnowledge,buildSystemPrompt,findOrder,orderContext,pcmToOgg,cleanForSpeech} from "./lib.js";
const kb=loadKnowledge();
assert.equal(kb.products.length,10);
assert.equal(new Set(kb.products.map(p=>p.sku)).size,kb.products.length);
for(const p of kb.products){
  assert.equal(typeof p.name,"string");assert.equal(typeof p.description,"string");
  assert(Number.isInteger(p.price)&&p.price>0);assert(Number.isInteger(p.stock)&&p.stock>=0);
}
console.log("PASS: catalog schema and unique SKUs");
assert.equal(normalizeDigits("۱۰۲۵۱ / ١٠٢٥٢"),"10251 / 10252");
assert.equal(findOrder("وضعیت سفارش ۱۰۲۵۲ چیه؟",kb.orders)?.code,"10252");
assert.equal(findOrder("سلام",kb.orders),null);
assert.equal(findOrder("کد 99999",kb.orders)?.notFound,true);
assert.equal(orderContext(null),"");
assert(orderContext(findOrder("10252",kb.orders)).includes("هنوز صادر نشده"));
assert(orderContext(findOrder("99999",kb.orders)).includes("پیدا نشد"));
console.log("PASS: digit normalization and sample order lookup");
const prompt=buildSystemPrompt(kb);
assert(!prompt.includes("{{SHOP_INFO}}")&&!prompt.includes("{{PRODUCTS}}"));
for(const p of kb.products)assert(prompt.includes(p.sku)&&prompt.includes(p.description));
assert.equal(cleanForSpeech("**سلام** 🛍"),"سلام ");
assert.equal(cleanForSpeech("a".repeat(1000)).length,900);
console.log("PASS: knowledge injection and speech cleanup");
const pcm=Buffer.alloc(24000*2);
for(let i=0;i<24000;i++)pcm.writeInt16LE(Math.round(8000*Math.sin(2*Math.PI*440*i/24000)),i*2);
const ogg=await pcmToOgg(pcm,process.env.FFMPEG_PATH||ffmpegStatic);
assert.equal(ogg.subarray(0,4).toString(),"OggS");assert(ogg.includes(Buffer.from("OpusHead")));
console.log("PASS: PCM to OGG/Opus conversion");
console.log("All offline checks passed. Live APIs and manual scenarios are separate.");
