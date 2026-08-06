# Demo Narration — Cue Sheet

Voiceover for the Devpost submission video. Pairs with `docs/GOLDEN_DEMO_SCRIPT.md`, which owns the shot list, and `docs/DEMO_VIDEO_PLAN.md`, which owns the pipeline. This document owns the audio.

## Voice

| | |
|---|---|
| Voice | **en-US-SteffanNeural** (edge-tts), descriptor "Rational" |
| Engine | edge-tts 7.2.7, local, free |
| Format | MP3, 24 kHz mono |
| Regenerate | `python scripts/generate-narration.py` |
| Files | `assets/demo/narration/` — MP3 plus per-segment SRT |

**Why Steffan.** It must not be mistaken for CALL-E's own phone voice, because the most persuasive footage in the video is a real call playing through a phone speaker; if the narrator sounds like the caller, that moment reads as staged. Steffan is flat and unhurried, which suits a script whose content is mostly refusals and validated fields.

No paid service is used. An earlier pass used Higgsfield credits by mistake; that output is superseded and should not be reintroduced.

## Emotion without an emotion parameter

Edge-tts exposes no expression control. Intensity is carried by **rate and pitch** instead — slowing down is how this voice conveys weight.

| # | Segment | Rate | Pitch | Why |
|---|---|---|---|---|
| 1 | The problem | -6% | — | Measured. The figures carry it |
| 2 | What it does | -4% | — | Baseline |
| 3 | Raise the incident | -2% | — | Briskest. Pure mechanism, under screen action |
| 4 | The phone rings | -4% | — | Sits under the real call audio |
| 5 | The answer as data | -8% | — | Reading validated fields aloud needs air |
| 6 | **The refusal** | **-10%** | **-2Hz** | The peak. Slowest and lowest in the video |
| 7 | The guardrails | -4% | — | Declarative |
| 8 | Close | -6% | — | Resolute |

Only one segment is both slowest and lowest. If everything is emphatic, nothing is.

## Cue sheet

Measured with `ffprobe`, not estimated. Beat windows were **re-timed for this voice** — Steffan reads slower than the original script assumed, so the windows were rebalanced rather than the reads rushed.

| # | File | Runs | Beat window | Slack |
|---|---|---:|---|---:|
| 1 | `01-problem.mp3` | 14.2s | 0:00–0:18 | +3.8s |
| 2 | `02-what-it-does.mp3` | 11.3s | 0:18–0:31 | +1.7s |
| 3 | `03-raise-incident.mp3` | 18.0s | 0:31–0:52 | +3.0s |
| 4 | `04-phone-rings.mp3` | 17.1s | 0:52–1:22 | **+12.9s** |
| 5 | `05-answer-as-data.mp3` | 27.5s | 1:22–1:52 | +2.5s |
| 6 | `06-the-refusal.mp3` | 27.6s | 1:52–2:22 | +2.4s |
| 7 | `07-guardrails.mp3` | 20.4s | 2:22–2:44 | +1.6s |
| 8 | `08-close.mp3` | 8.6s | 2:44–2:54 | +1.4s |

**Total narration 144.7s in a 174s timeline, inside the 180s ceiling with 35.3s of breathing room.**

**Beat 4's slack is the point.** Those 12.9 seconds are the real call playing. Every other beat gives up slack before beat 4 does. If a later edit needs time, take it from beats 1, 3 or 5 — never from 4.

## The close — two takes exist

The original tagline says "a rupee" while the demo shows a **$35** quote, which a judge will hear as a mismatch.

| File | Line | Runs |
|---|---|---:|
| `08-close.mp3` | "…refuses to commit **a single dollar** without them." | 8.6s |
| `08-close-alt-rupee.mp3` | "…refuses to commit **a rupee** without them." | 8.2s |

Both are rendered. **`08-close.mp3` is recommended** — it matches what is on screen and keeps the cadence. Pick one in the edit; regenerating either is free.

## Captions

Per-segment `.srt` files are generated alongside the audio, cued at **sentence** granularity.

Two things the generator handles that the raw service output does not:

- The service emits `SentenceBoundary`, not `WordBoundary`. The script feeds every non-audio chunk, so an upstream change degrades into different cue granularity rather than empty captions.
- Raw cues **overlap by a few tens of milliseconds**. Each cue's end is clamped to the next cue's start; YouTube's uploader flags overlaps otherwise.

Segment SRTs still need their offsets shifted to the final timeline when the video is assembled, and every line read against the audio before upload.

## Mixing notes

- Narration sits **under** the real call audio in beat 4, not over it. Duck the narration; do not mute the call.
- Leave ~0.4s of silence at each segment boundary. Segments are rendered independently and butt-splice abruptly.
- No music anywhere, and especially not under beat 4.
- 24 kHz mono is the same sample rate the reference project shipped with. Adequate under screen capture.

## Regenerating

`python scripts/generate-narration.py` re-renders every segment and reprints the duration table with slack against each window. Changing the voice invalidates all timings, so re-check the table before assuming the edit still fits.
