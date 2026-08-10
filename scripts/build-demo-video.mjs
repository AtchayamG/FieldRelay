// Assemble the demo video from captured frames plus the edge-tts narration.
//
//   node scripts/build-demo-video.mjs
//
// Output: assets/demo/fieldrelay-demo.mp4  (1920x1080, h264, AAC)
// Use --draft to intentionally build the still-image placeholder version.
//
// Each beat is one narration segment paired with one or more frames. Segment
// duration drives the cut, so the picture always changes on the sentence rather
// than on an arbitrary timer.
//
// BEAT 4 IS A PLACEHOLDER. The most persuasive thirty seconds of this demo is a
// real handset ringing while CALL-E talks, and that footage cannot be generated
// - it has to be filmed. The slot is built to the right length so the phone
// clip drops straight in without re-timing anything after it.
//
// IMPLEMENTATION NOTE, learned the expensive way: do NOT feed still images to
// the concat demuxer with `duration` directives. It emits a single frame per
// image and silently ignores the duration on the final entry, which produced a
// 38-second file out of 150 seconds of narration with no error anywhere. Each
// frame gets its own `-loop 1 -t` clip instead.

import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const FRAMES = join(ROOT, 'assets', 'demo', 'frames');
const NARR = join(ROOT, 'assets', 'demo', 'narration');
const OUT = join(ROOT, 'assets', 'demo');
const WORK = join(OUT, '.build');
const PHONE_CLIP = join(OUT, 'phone-call.mp4');
const draft = process.argv.includes('--draft');

if (!existsSync(PHONE_CLIP) && !draft) {
  console.error('  missing assets/demo/phone-call.mp4');
  console.error('  Final evidence must include genuine handset footage. Use --draft only for review builds.');
  process.exit(1);
}

const CANVAS = '0x0C0E13';

// beat slug -> frames shown while that narration plays
const BEATS = [
  ['01-problem', ['02-mission-guardrails.png']],
  ['02-what-it-does', ['02-mission-guardrails.png']],
  ['03-raise-incident', ['05-incidents.png', '06-calls.png']],
  ['04-phone-rings', ['06-calls.png']],
  ['05-answer-as-data', ['07-approvals-approved.png']],
  ['06-the-refusal', ['07-approvals-approved.png', '08-dispatch.png']],
  ['07-guardrails', ['09-vendors.png', '11-analytics.png']],
  ['08-close', ['08-dispatch.png']]
];

const ff = (args) => execFileSync('ffmpeg', ['-y', ...args], { stdio: 'pipe' });

function duration(file) {
  return parseFloat(
    execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file],
      { encoding: 'utf8' }
    ).trim()
  );
}

rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });

// ---- video track ---------------------------------------------------------
const clips = [];
let timeline = 0;

for (const [slug, frames] of BEATS) {
  const audio = join(NARR, `${slug}.mp3`);
  if (!existsSync(audio)) {
    console.error(`  missing narration: ${slug}.mp3`);
    process.exit(1);
  }
  // A little air after each beat so a cut never lands on the last syllable.
  const beatSeconds = duration(audio) + 0.7;

  if (slug === '04-phone-rings' && existsSync(PHONE_CLIP)) {
    const clip = join(WORK, `clip-${clips.length.toString().padStart(2, '0')}.mp4`);
    ff([
      '-stream_loop', '-1', '-i', PHONE_CLIP,
      '-t', beatSeconds.toFixed(3),
      '-an',
      '-vf',
      `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=${CANVAS},fps=30,format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20',
      clip
    ]);
    clips.push(clip);
    timeline += beatSeconds;
    console.log(`  ${slug.padEnd(20)} ${beatSeconds.toFixed(1)}s  genuine phone footage`);
    continue;
  }

  const per = beatSeconds / frames.length;

  frames.forEach((frame, index) => {
    const clip = join(WORK, `clip-${clips.length.toString().padStart(2, '0')}.mp4`);
    ff([
      '-loop', '1',
      '-framerate', '30',
      '-t', per.toFixed(3),
      '-i', join(FRAMES, frame),
      '-vf',
      `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=${CANVAS},format=yuv420p`,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-r', '30',
      clip
    ]);
    clips.push(clip);
    void index;
  });

  timeline += beatSeconds;
  console.log(`  ${slug.padEnd(20)} ${beatSeconds.toFixed(1)}s  ${frames.length} frame${frames.length > 1 ? 's' : ''}`);
}

const videoList = join(WORK, 'video.txt');
writeFileSync(videoList, clips.map((c) => `file '${c.replace(/\\/g, '/')}'`).join('\n'), 'utf8');
const videoTrack = join(WORK, 'video.mp4');
ff(['-f', 'concat', '-safe', '0', '-i', videoList, '-c', 'copy', videoTrack]);

// ---- narration track -----------------------------------------------------
// Each segment is padded to its beat length so audio and picture stay locked
// without any manual offset.
const padded = [];
for (const [slug] of BEATS) {
  const source = join(NARR, `${slug}.mp3`);
  const target = join(WORK, `audio-${slug}.m4a`);
  const beatSeconds = duration(source) + 0.7;
  ff([
    '-i', source,
    '-af', `apad=whole_dur=${beatSeconds.toFixed(3)}`,
    '-t', beatSeconds.toFixed(3),
    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '1',
    target
  ]);
  padded.push(target);
}

const audioList = join(WORK, 'audio.txt');
writeFileSync(audioList, padded.map((a) => `file '${a.replace(/\\/g, '/')}'`).join('\n'), 'utf8');
const audioTrack = join(WORK, 'audio.m4a');
ff(['-f', 'concat', '-safe', '0', '-i', audioList, '-c', 'copy', audioTrack]);

// ---- mux -----------------------------------------------------------------
const outputName = draft && !existsSync(PHONE_CLIP)
  ? 'fieldrelay-demo-DRAFT.mp4'
  : 'fieldrelay-demo.mp4';
const finalPath = join(OUT, outputName);
ff([
  '-i', videoTrack,
  '-i', audioTrack,
  '-c:v', 'copy', '-c:a', 'copy',
  '-movflags', '+faststart',
  '-shortest',
  finalPath
]);

const runtime = duration(finalPath);
console.log(`\n  ${outputName}   ${runtime.toFixed(1)}s   (narration timeline ${timeline.toFixed(1)}s)`);
if (draft && !existsSync(PHONE_CLIP)) {
  console.log('  DRAFT ONLY — placeholder phone segment; do not upload as submission evidence.');
}
if (runtime >= 179) {
  console.log('  OVER THE 3:00 DEVPOST LIMIT — trim a beat before uploading.');
} else {
  console.log(`  ${(180 - runtime).toFixed(1)}s under the 3:00 limit.`);
}
