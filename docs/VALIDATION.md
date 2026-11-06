# Validation report

Run on 2026-11-06 with Node.js 24.22.1.

- npm install --ignore-scripts: successful (59 packages).
- FFMPEG_PATH=/usr/bin/ffmpeg npm test: all four test groups passed.
- node --check bot.js and lib.js: successful.
- Audio conversion used installed FFmpeg; the ffmpeg-static download/install script was not run in this environment.
- No Telegram, OpenAI or Gemini live requests were made.
- The 24 manual scenarios are prepared but have not been completed by two human testers.

The normal installation instructions use npm install so ffmpeg-static can download its executable. Keep package-lock.json for dependency reproducibility. This report does not claim an audit or production readiness.

## User-provided recording

Reviewed sampled frames from the 66.94-second recording. Shows catalog answers, budget handling, demo shipping policies, human handoff messages, refusal to invent discounts and a voice-mode toggle. Created a silent 27-second excerpt using source ranges 0-20s and 60-66.94s, excluding visible chat identifiers. Audio playback was not assessed; this is not a complete live API test.

## Separate voice sample

User supplied an OGG/Opus sample: duration 21.53 seconds, mono, 48 kHz. FFmpeg decoding checked separately. No transcription or listening-based content assessment was performed. Included as docs/demo-voice.ogg, with an explicit .gitignore exception.
