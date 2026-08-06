"""Generate the demo video narration with edge-tts.

Free, local, reproducible. No paid service is involved and none should be added.

    python scripts/generate-narration.py

Writes MP3 segments and per-segment SRT into assets/demo/narration/, then prints
a duration table checked against the 180s Devpost ceiling.

Voice choice is deliberate: the narrator must not be mistaken for CALL-E's own
phone voice, because the most persuasive footage in the video is a real call
playing through a phone speaker. Edge-tts exposes no emotion parameter, so
per-beat intensity is carried by rate and pitch instead.
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

import edge_tts

VOICE = "en-US-SteffanNeural"
OUT = Path(__file__).resolve().parent.parent / "assets" / "demo" / "narration"

# (slug, rate, pitch, text)
SEGMENTS: list[tuple[str, str, str, str]] = [
    (
        "01-problem",
        "-6%",
        "+0Hz",
        "A maintenance request is supposed to be acknowledged in twenty-four hours, "
        "and fixed in about forty-eight. Almost none of that is spent fixing anything. "
        "It's spent on the phone, chasing vendors who don't pick up.",
    ),
    (
        "02-what-it-does",
        "-4%",
        "+0Hz",
        "FieldRelay makes those calls. It gets a price and an arrival time back as "
        "structured data. And then it refuses to act on any of it until a person says yes.",
    ),
    (
        "03-raise-incident",
        "-2%",
        "+0Hz",
        "Kitchen sink leak at Oakridge, unit twelve B. FieldRelay authorises the contact, "
        "checks the purpose is one this vendor is allowed to be called about, and writes a "
        "queued call task to the database before it dials. So if anything fails after this "
        "point, the record already exists.",
    ),
    (
        "04-phone-rings",
        "-4%",
        "+0Hz",
        "That's CALL-E, on a real line. It opens with a disclosure, asks whether they can "
        "take the job, when, and roughly what it costs. And it refers to the job only by "
        "reference number. The vendor never hears the tenant's name, or their address.",
    ),
    (
        "05-answer-as-data",
        "-8%",
        "+0Hz",
        "Not a transcript. A validated answer. Available: yes. Quoted: thirty-five dollars. "
        "Confidence: zero point eight two. Anything the model volunteered that we didn't ask "
        "for was dropped. And a value outside the declared options would have been refused, "
        "rather than turned into a decision. No transcript is stored. That's deliberate, not missing.",
    ),
    (
        # The money shot. Slowest and lowest in the whole video.
        "06-the-refusal",
        "-10%",
        "-2Hz",
        "FieldRelay stopped. It raised this itself, and it says why: the vendor quoted a price. "
        "CALL-E can find out that a job costs thirty-five dollars. Only a person can agree to "
        "pay it. That decision is recorded against my name. And if the vendor's answer had "
        "changed since this was raised, the system would have refused my approval, because I'd "
        "be agreeing to something I never read.",
    ),
    (
        "07-guardrails",
        "-4%",
        "+0Hz",
        "Everything FieldRelay refuses to do, reported live from configuration. Not a marketing "
        "list. It won't redial an ambiguous outcome. It can't call a number an operator didn't "
        "provision. One authorised task can only ever place one call. And when a guardrail is "
        "relaxed, it says so.",
    ),
    (
        # Matches the $35 shown on screen.
        "08-close",
        "-6%",
        "+0Hz",
        "FieldRelay makes the calls a property manager doesn't have time to make. And it refuses "
        "to commit a single dollar without them.",
    ),
    (
        # Alternate, keeping the original tagline wording. Pick one in the edit.
        "08-close-alt-rupee",
        "-6%",
        "+0Hz",
        "FieldRelay makes the calls a property manager doesn't have time to make. And it refuses "
        "to commit a rupee without them.",
    ),
]

# Beat windows in seconds, re-timed for this voice. See docs/DEMO_NARRATION.md.
#
# Steffan reads slower than the original timings assumed, so the windows were
# rebalanced rather than the reads rushed. Beat 4 keeps its full 30s on purpose:
# the slack there is the real call playing, which is the most persuasive footage
# in the video. Every other beat gives up slack before beat 4 does.
WINDOWS = {
    "01-problem": 18.0,
    "02-what-it-does": 13.0,
    "03-raise-incident": 21.0,
    "04-phone-rings": 30.0,
    "05-answer-as-data": 30.0,
    "06-the-refusal": 30.0,
    "07-guardrails": 22.0,
    "08-close": 10.0,
}


async def render(slug: str, rate: str, pitch: str, text: str) -> None:
    communicate = edge_tts.Communicate(text, VOICE, rate=rate, pitch=pitch)
    submaker = edge_tts.SubMaker()
    audio_path = OUT / f"{slug}.mp3"
    with audio_path.open("wb") as handle:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                handle.write(chunk["data"])
            else:
                # This service emits SentenceBoundary, not WordBoundary. Feed every
                # non-audio chunk rather than naming one type, so a change upstream
                # degrades into different cue granularity instead of empty captions.
                submaker.feed(chunk)
    (OUT / f"{slug}.srt").write_text(_declash(submaker.get_srt()), encoding="utf-8")


def _declash(srt: str) -> str:
    """Stop each cue before the next one starts.

    The service returns boundaries that overlap by a few tens of milliseconds.
    Players tolerate it inconsistently and YouTube's uploader flags it, so clamp
    each cue's end to the following cue's start.
    """
    import re

    stamp = re.compile(
        r"(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})"
    )

    def to_ms(value: str) -> int:
        hh, mm, rest = value.split(":")
        ss, ms = rest.split(",")
        return ((int(hh) * 60 + int(mm)) * 60 + int(ss)) * 1000 + int(ms)

    def to_stamp(value: int) -> str:
        ms = value % 1000
        total = value // 1000
        return f"{total // 3600:02d}:{total // 60 % 60:02d}:{total % 60:02d},{ms:03d}"

    lines = srt.splitlines()
    marks = [(i, m) for i, line in enumerate(lines) if (m := stamp.match(line))]
    for position, (index, match) in enumerate(marks):
        end = to_ms(match.group(2))
        if position + 1 < len(marks):
            next_start = to_ms(marks[position + 1][1].group(1))
            end = min(end, max(next_start - 1, to_ms(match.group(1))))
        lines[index] = f"{match.group(1)} --> {to_stamp(end)}"
    return "\n".join(lines) + "\n"


def duration(path: Path) -> float:
    """Read duration with ffprobe, which the video pipeline already requires."""
    import subprocess

    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return float(result.stdout.strip())


async def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    for slug, rate, pitch, text in SEGMENTS:
        await render(slug, rate, pitch, text)
        print(f"  rendered {slug}")

    print(f"\n  voice: {VOICE}\n")
    print(f"  {'segment':<22} {'runs':>7}   {'window':>7}   {'slack':>7}")
    print(f"  {'-' * 22} {'-' * 7}   {'-' * 7}   {'-' * 7}")

    total = 0.0
    over: list[str] = []
    for slug, *_ in SEGMENTS:
        secs = duration(OUT / f"{slug}.mp3")
        if slug.startswith("08-close-alt"):
            print(f"  {slug:<22} {secs:6.1f}s   {'alt':>7}   {'—':>7}")
            continue
        total += secs
        window = WINDOWS[slug]
        slack = window - secs
        if slack < 0:
            over.append(slug)
        print(f"  {slug:<22} {secs:6.1f}s   {window:6.1f}s   {slack:+6.1f}s")

    print(f"  {'-' * 22} {'-' * 7}   {'-' * 7}   {'-' * 7}")
    print(f"  {'TOTAL NARRATION':<22} {total:6.1f}s   of a 180.0s video")
    print(f"  {'breathing room':<22} {180.0 - total:6.1f}s\n")

    if over:
        print(f"  OVER ITS WINDOW: {', '.join(over)}")
        print("  Re-time the beat or slow the neighbours; do not speed up the read.\n")
    return 0


if __name__ == "__main__":
    sys.exit(asyncio.run(main()))
