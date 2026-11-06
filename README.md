# Morvarid Shop Support Bot

A Persian-language Telegram support prototype for a demo computer-accessories store, adapted from an educational starter. Uses a local catalog and store knowledge for AI answers, optional spoken replies and administrator handoff.

**Demo data only:** prices, inventory, policies and orders are synthetic. Recommendations are prompt-guided, not a deterministic compatibility checker or checkout system.

[راهنمای فارسی](docs/README-fa.md)

## Demo

[Watch the short screen recording](docs/demo.mp4)

A 27-second silent excerpt from a user-provided Telegram recording. Shows catalog answers, budget handling and an SSD compatibility question. The administrator-identification segment and recorder toolbar were removed. The voice toggle is visible, but this excerpt does not demonstrate audible TTS playback or comprehensive end-to-end testing.

### Voice reply sample

[Listen to the user-provided voice reply](docs/demo-voice.ogg)

A separate 21.53-second OGG/Opus audio sample from the bot, supplied by the project owner. Container and decoding checks passed (mono, 48 kHz). Speech content, pronunciation and correspondence to a particular question were not independently verified. The short screen recording remains silent; this is a separate audio artifact.

## Features

- Persian answers using store knowledge, 30 realistic FAQ examples and 10 product models.
- Prompt-guided recommendations based on budget, intended use and device compatibility questions.
- Lookup of three synthetic orders with Persian/Arabic digit normalization.
- Optional text-to-speech responses, enabled per chat with `/voice`.
- In-memory history limited to the last 12 user/assistant messages per chat.
- Human handoff, administrator replies and knowledge reload commands.
- Offline assertions for catalog data, order lookup, prompt construction, speech cleanup and real PCM-to-OGG/Opus conversion.

## Stack

Node.js 20+, JavaScript ES modules, grammY, OpenAI JavaScript SDK, dotenv and ffmpeg-static. OpenAI-compatible services are configurable. The source also has Gemini TTS and Bale branches; those paths were not validated in this release.

## Quick start

1. Install Node.js 20 or newer and open a terminal in this directory.
2. Install packages:

   ```bash
   npm install
   ```

3. Copy the environment template (PowerShell):

   ```powershell
   Copy-Item .env.example .env
   ```

   macOS/Linux: `cp .env.example .env`.

4. Set `BOT_TOKEN` and `AI_API_KEY`. Keep the service URL and models aligned with your provider. Do not publish `.env`.
5. Run:

   ```bash
   npm test
   npm start
   ```

6. In Telegram, send `/start`, then `/myid`. Put your numeric ID in `ADMIN_CHAT_ID` and restart to enable administrator functions.

Use `TTS_PROVIDER=off` for text-only operation. Voice starts disabled for each chat; `/voice` enables it, then send a typed question. Incoming voice messages are not transcribed.

## Commands

| Command | Purpose |
| --- | --- |
| `/start` | Welcome and menu; does not reset history |
| `/voice` | Toggle spoken replies |
| `/myid` | Show current chat ID |
| `/reload` | Administrator: reload knowledge and prompt |
| `/reply CHAT_ID message` | Administrator: send a manual reply |

## Data flow

Telegram text → store prompt + catalog + recent history + optional order context → AI response → Telegram text and optional TTS audio. A `[HANDOFF]` marker can trigger administrator forwarding. Files load at startup and on `/reload`; there is no database or live stock connection.

## Files

| Path | Purpose |
| --- | --- |
| `bot.js` | Bot handlers, model calls, TTS and administrator commands |
| `lib.js` | Knowledge, order and audio helpers |
| `test.js` | Offline assertions and audio conversion check |
| `.env.example` | Empty credentials and sample settings |
| `data/shop-info.md` | Brand, demo policies and 30 FAQ examples |
| `data/products.json` | 10 product models and synthetic price/stock |
| `data/orders.json` | Synthetic order fixtures |
| `prompts/system-prompt.md` | Brand voice and recommendation rules |
| `docs/friends-test.md` | 24 manual test scenarios |
| `docs/results.csv` | Blank evaluation and correction log |
| `docs/PORTFOLIO.md` | GitHub description and LinkedIn drafts |
| `SOURCES.md` | Manufacturer specification references |

## Testing

`npm test` makes no live API calls and needs no credentials. The audio test needs FFmpeg: `ffmpeg-static` normally downloads it during installation. Alternatively set `FFMPEG_PATH` to an installed executable.

Manual AI evaluations in `docs/friends-test.md` are separate; no human pass results are claimed. Live Telegram delivery, AI answer quality and provider availability are not covered by the offline tests. Budget arithmetic and recommendation quality remain model-dependent.

## Demo prompts

- `ماوس زیر ۸۰۰ هزار تومان برای کار اداری می‌خوام؛ USB-A دارم.`
- `M170 و K120 با ارسال چقدر می‌شود؟`
- `این رم دسکتاپ روی لپ‌تاپم نصب می‌شود؟`
- `وضعیت سفارش ۱۰۲۵۲ چیه؟`
- `/voice`, followed by `چه محصولاتی دارید؟`

## Limitations and next steps

- Order ownership is not authenticated. Keep orders synthetic; a code alone must not grant real customer data access.
- Any 5-8 digit number may be interpreted as an order code, including a budget. The prompt constrains answers but code-level intent detection is future work.
- Local prices and stock are snapshots, not verified live offers.
- Handoff needs a configured administrator who has started the bot. The starter currently acknowledges forwarding even when ADMIN_CHAT_ID is missing; configure it for demos and do not treat acknowledgement as delivery proof.
- Sessions are lost on restart. No checkout, payments, reservations, refunds, inbound speech recognition or production deployment is included.
- A user-provided, edited screen recording is included. It demonstrates only the shown scenarios, not comprehensive validation.

## Credits and reuse

The supplied starter source credits **AI Lab / Nima Amini** in `bot.js`; that attribution is preserved. This portfolio version customizes store knowledge, catalog, brand prompt, documentation and offline tests. Describe it as an adapted learning project. No upstream license was supplied, so no license or reuse rights are added here; confirm the starter's redistribution terms before publishing its source publicly.
