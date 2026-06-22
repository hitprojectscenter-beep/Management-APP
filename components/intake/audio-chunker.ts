/**
 * Client-side audio re-encoding + chunking.
 *
 * Why this exists: Vercel's serverless functions cap inbound request
 * bodies at ~4.5 MB. Gemini's resumable upload protocol requires
 * non-final chunks to be a multiple of 8 MB — bigger than the Vercel
 * cap. So neither approach works on the user's deployment without
 * external storage (Vercel Blob, etc.) which they've declined.
 *
 * What this does instead: decode the audio in the BROWSER with Web
 * Audio API, downsample to 16 kHz mono 16-bit PCM (good enough for
 * speech transcription, ~32 kB/s), and slice into ~2-minute WAV
 * chunks of ~3.8 MB each. Each chunk goes through the existing
 * multipart upload (under the 4.5 MB cap) and Gemini transcribes it
 * independently. The transcripts are concatenated client-side and
 * sent as text for task extraction.
 *
 * Tradeoffs:
 *   • Memory: the entire decoded audio sits in browser memory (16 kHz
 *     mono ≈ 32 kB/s, so 1h of audio ≈ 115 MB of Float32 + 58 MB
 *     of Int16). For very large recordings on mobile this can OOM.
 *   • Quality: 16 kHz mono is the standard speech-recognition rate;
 *     for music or fine audio detail it's lossy.
 *   • Time: 1h of audio = ~30 chunks × ~10s upload+transcribe each =
 *     ~5 min total.
 *   • Boundary words: a word that spans the chunk seam may be cut.
 *     Mitigated by ~1.5 sec of overlap between consecutive chunks.
 */

/** Sample rate we downsample to. 16 kHz is the speech-recognition standard. */
const TARGET_SAMPLE_RATE = 16_000;

/** Target chunk size in WAV bytes — well under Vercel's 4.5 MB cap. */
const TARGET_CHUNK_BYTES = 3_500_000;

/** ~1.5 seconds of audio overlap between consecutive chunks so we don't
 *  cut a word in half. */
const OVERLAP_SECONDS = 1.5;

/** Result of one transcribable chunk. */
export interface AudioChunk {
  /** A complete WAV file (44-byte header + PCM payload). */
  blob: Blob;
  /** Approximate start offset in the original audio, in seconds. */
  startSec: number;
  /** Approximate end offset in the original audio, in seconds. */
  endSec: number;
}

/**
 * Decode an audio File into chunked WAV blobs.
 * Throws if the browser can't decode the format (rare — Web Audio API
 * handles MP3/WAV/M4A/OGG/FLAC in all modern browsers).
 */
export async function decodeAndChunkAudio(file: File): Promise<AudioChunk[]> {
  // 1. Read the file bytes
  const arrayBuffer = await file.arrayBuffer();

  // 2. Decode with Web Audio API
  // We need a non-Offline AudioContext to call decodeAudioData; Safari
  // historically required Webkit-prefixed version, so keep the fallback.
  const Ctx =
    typeof window !== "undefined" &&
    ((window.AudioContext as unknown as typeof AudioContext) ||
      ((window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext));
  if (!Ctx) throw new Error("Web Audio API not available in this browser");
  const decodeCtx = new Ctx();
  let decoded: AudioBuffer;
  try {
    // decodeAudioData consumes the ArrayBuffer in some browsers, so pass
    // a copy. (slice(0) returns a fresh ArrayBuffer with same data.)
    decoded = await decodeCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await decodeCtx.close().catch(() => {});
  }

  // 3. Resample + mix-down to 16 kHz mono using an OfflineAudioContext.
  // This is hardware-accelerated in most browsers and handles arbitrary
  // input sample rates cleanly.
  const targetSampleCount = Math.ceil((decoded.duration * TARGET_SAMPLE_RATE));
  const offline = new OfflineAudioContext(1, targetSampleCount, TARGET_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start(0);
  const resampled = await offline.startRendering();

  // 4. Convert Float32 → Int16 (PCM s16le, the format inside a WAV file)
  const float32 = resampled.getChannelData(0);
  const int16 = new Int16Array(float32.length);
  for (let i = 0; i < float32.length; i++) {
    const s = Math.max(-1, Math.min(1, float32[i]));
    // Asymmetric scaling: -32768 for negatives, 32767 for positives
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  // 5. Slice into chunks. Each chunk is a complete WAV file with its own
  // header. We choose a samples-per-chunk so the resulting WAV is around
  // TARGET_CHUNK_BYTES. PCM s16 mono = 2 bytes/sample; WAV header = 44.
  const bytesPerSample = 2;
  const samplesPerChunk = Math.floor((TARGET_CHUNK_BYTES - 44) / bytesPerSample);
  const overlapSamples = Math.floor(OVERLAP_SECONDS * TARGET_SAMPLE_RATE);
  const stride = Math.max(1, samplesPerChunk - overlapSamples);

  const chunks: AudioChunk[] = [];
  for (let offset = 0; offset < int16.length; offset += stride) {
    const end = Math.min(offset + samplesPerChunk, int16.length);
    const slice = int16.subarray(offset, end);
    const blob = buildWavBlob(slice, TARGET_SAMPLE_RATE, 1);
    chunks.push({
      blob,
      startSec: offset / TARGET_SAMPLE_RATE,
      endSec: end / TARGET_SAMPLE_RATE,
    });
    if (end >= int16.length) break;
  }
  return chunks;
}

/**
 * Wrap an Int16 PCM buffer with a minimal RIFF/WAVE header. Output is
 * a complete WAV file that any audio tool — including Gemini — can
 * decode standalone.
 */
function buildWavBlob(samples: Int16Array, sampleRate: number, channels: number): Blob {
  const bytesPerSample = 2;
  const byteRate = sampleRate * channels * bytesPerSample;
  const blockAlign = channels * bytesPerSample;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // "RIFF" chunk descriptor
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true); // file size − 8
  writeAscii(view, 8, "WAVE");

  // "fmt " subchunk
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);     // subchunk1 size (16 for PCM)
  view.setUint16(20, 1, true);      // audio format = 1 (PCM)
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);     // bits per sample

  // "data" subchunk
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);

  // PCM payload — little-endian
  let p = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(p, samples[i], true);
    p += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}
