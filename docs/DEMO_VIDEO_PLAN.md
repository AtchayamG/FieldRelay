# Demo Video Plan

How the submission video gets made. Owns tooling, sequence and gates. `docs/GOLDEN_DEMO_SCRIPT.md` owns the shot list; `docs/DEMO_NARRATION.md` owns the audio cue sheet.

Supersedes the Higgsfield narration approach. **Everything here uses tools already installed on this machine at zero cost.**

## What the reference project proves

`OpenAI Hackathon/Sahaaya` shipped a submission video with exactly this toolchain:

| | Sahaaya's result |
|---|---|
| Narration | edge-tts → `narration.mp3`, 48 kbps, 24 kHz mono, 130.8s |
| Video | `sahaaya-demo.mp4`, 1920x1080, 30 fps, h264, 132s, 4.7 MB |
| Captions | hand-checked `narration.srt` |
| Assets | SVG title/closing cards rasterised to PNG via a `manifest.json` |

Verified installed here: **edge-tts 7.2.7**, **ffmpeg/ffprobe** (winget). Nothing needs buying.

Note the audio spec: edge-tts outputs **24 kHz mono** — the same sample rate as the paid Higgsfield output. For voiceover under screen capture there is no quality argument for paying.

## Where FieldRelay must NOT copy Sahaaya

Sahaaya's video is **stills plus narration**: a title card, six screenshots, a closing card. That was the right call for a planning tool whose output is a document.

It is the wrong call here, and the winning-strategy evidence says so directly:

> Demo gate: "The system visibly acting, **not slides**" · "**The refusal or human gate shown on screen** — this is the money shot"

FieldRelay has footage Sahaaya could not have had: **a real phone ringing, answered on camera, returning a validated answer.** A slideshow throws away the single most persuasive asset in the project.

**Decision: borrow Sahaaya's pipeline, reject its format.** Screen recording throughout, with cards only at the open and close.

## Format

| | |
|---|---|
| Resolution | 1920x1080, 30 fps |
| Runtime | **2:59 hard ceiling** (Devpost limit is 3:00) |
| Video | h264, screen capture of the live deployment |
| Audio | edge-tts narration, mono, ducked under the real call audio |
| Captions | SRT, hand-corrected, uploaded to YouTube rather than relying on auto-captions |
| Cards | Opening title (~3s) and closing links (~5s) only |

## Voice

Four candidates generated free and waiting in `assets/demo/voice-samples/`:

| Voice | Microsoft's descriptor | Fit |
|---|---|---|
| **en-US-AndrewNeural** | Warm, Confident, **Authentic, Honest** | **Recommended.** Newest-generation voice; the descriptor is the project's own thesis |
| en-US-ChristopherNeural | Reliable, Authority | Documentary gravitas, slightly stiffer |
| en-GB-RyanNeural | Friendly, Positive | British — furthest from CALL-E's US phone voice |
| en-US-SteffanNeural | Rational | Flattest; good under dense technical passages |

All four read the money-shot line so they can be compared on the sentence that matters most. **Listen and pick before anything else is recorded** — changing voice later invalidates every segment.

`--rate=-4%` applied. Edge-tts has no emotion parameter, so per-segment intensity is expressed through `--rate` and `--pitch` rather than the Higgsfield `expression_intensity` lever:

| Beat | Setting | Why |
|---|---|---|
| 1 problem | `--rate=-6%` | Measured, lets the figures land |
| 3 mechanism | `--rate=-2%` | Slightly brisker under screen action |
| 5 answer as data | `--rate=-8%` | Reading validated fields aloud needs air |
| 6 **the refusal** | `--rate=-10% --pitch=-2Hz` | Slowest and lowest. The peak |
| 8 close | `--rate=-6%` | Resolute |

Slowing down is how this voice conveys weight. Everything else at `--rate=-4%`.

## Production sequence

1. **Pick the voice** from the samples. Blocks everything downstream.
2. **Fix the currency line** (below), then regenerate all eight narration segments with the chosen voice.
3. **Pre-flight** per `GOLDEN_DEMO_SCRIPT.md`: reset and reseed the database, `CALL_E_MODE=live`, dial target set to the phone on camera, no credentials or `.env` on screen, notifications off.
4. **Rehearse to the cue sheet** before recording anything. Narration is 121s against a 180s budget; the slack is deliberate and beat 4 must keep all of it.
5. **Record** at 1920x1080. One continuous take per beat, no cuts away from the running system.
6. **Reliability gate** — five consecutive clean runs from reset, one declined-vendor run, one `CALL_E_MODE=demo` fallback recording captured and stored.
7. **Assemble** with ffmpeg: mux narration, duck under the call audio in beat 4, add cards.
8. **Verify runtime** with `ffprobe`. Anything at or over 3:00 fails the submission.
9. **Captions**: generate SRT from the segment texts and durations, then read every line against the audio.
10. **Upload** public, with thumbnail and description; confirm the URL loads signed out.

## The one content fix needed

The closing line says **"refuses to commit a rupee"** while the demo shows a **$35** quote. A judge hears the mismatch.

**Fix: "and it refuses to commit a single dollar without them."** Matches what is on screen, keeps the cadence, costs one regeneration — which is now free.

This is the only wording change recommended. Every other line traces to `PROBLEM_EVIDENCE.md` or the real call.

## Gate before upload

From the winning-strategy demo gate, all must hold:

- [ ] Value legible in the first 20 seconds
- [ ] One scenario start to finish, inside the limit
- [ ] The system visibly acting, not slides
- [ ] **The refusal shown on screen** — the approval raising itself, with its reason
- [ ] A failure or verification path exercised (the declined-vendor run)
- [ ] Five consecutive clean runs from a reset state
- [ ] Fallback recording exists
- [ ] No credentials, tokens or real personal data on screen
- [ ] `ffprobe` reports under 3:00
- [ ] Captions proofread against the audio

## What this plan deliberately excludes

- **No music.** Nothing may compete with the call audio in beat 4.
- **No B-roll or stock footage.** Every frame is the running system.
- **No walk past disabled nav items.** Nine routes are unbuilt; the write-up discloses that, the video does not tour it.
- **No architecture diagram in the video.** It belongs in the write-up.
- **No figure not in `PROBLEM_EVIDENCE.md`.**
