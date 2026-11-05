/**
 * Meta Muse (Model API) client.
 * Single-key access (META_MODEL_API_KEY from dev.meta.ai) for both the
 * Muse Spark chat model and the Muse Voice speech-to-text model.
 * The API surface is OpenAI-compatible: Chat Completions for chat and a
 * multipart transcription endpoint for audio.
 */

const { execFile } = require('node:child_process');

const DEFAULT_BASE_URL = 'https://api.meta.ai/v1';
const DEFAULT_CHAT_MODEL = 'muse-spark-1.1';
const DEFAULT_STT_MODEL = 'muse-voice-transcribe-1.0';

// Cap accepted audio at ~8 MB so a runaway recording cannot exhaust memory.
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

function getMetaConfig(env = process.env) {
  const apiKey = env.META_MODEL_API_KEY || env.MODEL_API_KEY || '';
  const configuredBaseUrl = String(
    env.META_MODEL_BASE_URL || env.MODEL_API_BASE_URL || DEFAULT_BASE_URL
  ).replace(/\/+$/, '');
  // `api.dev.meta.ai` was used by an early setup guide but no longer resolves.
  // Keep old deployments working while preserving all other explicit overrides.
  const baseUrl = /^https:\/\/api\.dev\.meta\.ai(?:\/v1)?$/i.test(configuredBaseUrl)
    ? DEFAULT_BASE_URL
    : configuredBaseUrl;
  return {
    apiKey,
    baseUrl,
    chatModel: env.MUSE_CHAT_MODEL || DEFAULT_CHAT_MODEL,
    sttModel: env.MUSE_STT_MODEL || DEFAULT_STT_MODEL,
  };
}

function isMuseConfigured(env = process.env) {
  return Boolean(getMetaConfig(env).apiKey);
}

/**
 * Flattens a chat-completion message content part list (or plain string)
 * into a single string. Never throws on unexpected shapes.
 */
function contentToText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((p) => (typeof p === 'string' ? p : p?.text || ''))
      .filter(Boolean)
      .join('');
  }
  return '';
}

/**
 * Asks the Muse Spark chat model for a merchant-assistant reply.
 * Throws when the key is missing, the request fails, or no content comes back.
 */
async function getMuseChatReply({ system, messages, env = process.env }) {
  const { apiKey, baseUrl, chatModel } = getMetaConfig(env);
  if (!apiKey) {
    throw new Error('META_MODEL_API_KEY not configured');
  }

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: chatModel,
      messages: [
        ...(system ? [{ role: 'system', content: system }] : []),
        ...(Array.isArray(messages) ? messages : []),
      ],
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Muse chat request failed (${res.status})`);
  }
  const text = contentToText(data?.choices?.[0]?.message?.content).trim();
  if (!text) {
    throw new Error('Muse chat returned no content');
  }
  return text;
}


/**
 * Accepts plain base64 or a `data:...;base64,...` URL and returns the raw
 * base64 payload. Some clients send the full data URL; decoding the
 * `data:...` prefix itself as base64 yields 14 garbage bytes that fail WAV
 * validation, so strip the prefix up front.
 */
function stripDataUrlPrefix(input) {
  const s = String(input || '').trim();
  if (/^data:/i.test(s)) {
    const comma = s.indexOf(',');
    return comma >= 0 ? s.slice(comma + 1).trim() : '';
  }
  return s;
}

/**
 * Minimal RIFF/WAVE header reader. The file endpoint only accepts mono
 * 16-bit integer PCM at 16 or 24 kHz, so reject anything else up front
 * with a message the app can show.
 */
function readWavFormat(bytes) {
  if (!bytes || bytes.length < 44) return null;
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    return null;
  }
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const id = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4);
    if (id === 'fmt ') {
      if (size < 16 || offset + 8 + size > bytes.length) return null;
      return {
        audioFormat: bytes.readUInt16LE(offset + 8),
        channels: bytes.readUInt16LE(offset + 10),
        sampleRate: bytes.readUInt32LE(offset + 12),
        bitsPerSample: bytes.readUInt16LE(offset + 22),
      };
    }
    offset += 8 + size;
  }
  return null;
}

// Meta's native sample rates for the file endpoint.
const STT_SAMPLE_RATES = [16000, 24000];

/**
 * ffmpeg arguments that convert any supported input container (m4a/AAC
 * from the Android app, webm, mp3, ...) into the exact shape the Muse
 * file endpoint requires: mono 16-bit PCM WAV at 24 kHz. Pure data —
 * no process is spawned here, so this is unit-testable anywhere.
 */
function buildWavTranscodeArgs() {
  return [
    '-y',
    '-i',
    'pipe:0',
    '-ac',
    '1',
    '-ar',
    '24000',
    '-c:a',
    'pcm_s16le',
    '-map_metadata',
    '-1',
    '-f',
    'wav',
    'pipe:1',
  ];
}

function ffmpegPath(env = process.env) {
  return env.MUSE_FFMPEG_PATH || 'ffmpeg';
}

/**
 * Runs the conversion. Rejects with an actionable message when the
 * ffmpeg binary is missing so the app can show it instead of a
 * generic upstream failure.
 */
function transcodeToWavMono24k(inputBytes, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      ffmpegPath(env),
      buildWavTranscodeArgs(),
      { encoding: 'buffer', maxBuffer: MAX_AUDIO_BYTES * 2 },
      (err, stdout, stderr) => {
        if (err) {
          if (err.code === 'ENOENT') {
            reject(
              new Error(
                'Voice input needs the server audio converter (ffmpeg), which is not installed'
              )
            );
            return;
          }
          const detail = Buffer.isBuffer(stderr)
            ? stderr.toString('utf8').split('\n').filter(Boolean).slice(-2).join(' ')
            : '';
          reject(new Error(`Audio could not be converted to WAV${detail ? `: ${detail}` : ''}`));
          return;
        }
        resolve(Buffer.isBuffer(stdout) ? stdout : Buffer.from(stdout || []));
      }
    );
    child.stdin.on('error', () => {});
    child.stdin.end(inputBytes);
  });
}

/**
 * Transcribes merchant speech via the Muse Voice file endpoint
 * (POST {base}/asr/transcribe). Accepts WAV bytes (mono 16-bit PCM at
 * 16/24 kHz) directly; anything else (Android m4a/AAC, webm, mp3) is
 * transcoded to that shape with ffmpeg first. Returns the transcript.
 */
async function transcribeMuseAudio({ audio, env = process.env }) {
  const { apiKey, baseUrl, sttModel } = getMetaConfig(env);
  if (!apiKey) {
    throw new Error('META_MODEL_API_KEY not configured');
  }
  const bytes = Buffer.isBuffer(audio) ? audio : Buffer.from(audio || []);
  if (bytes.length === 0) {
    throw new Error('No audio provided');
  }
  if (bytes.length > MAX_AUDIO_BYTES) {
    throw new Error('Audio too large (max 8 MB)');
  }
  // Junk too small to hold speech that is not even WAV-shaped is rejected
  // up front with a byte count, skipping a doomed ffmpeg run. Valid WAV of
  // any size always proceeds to validation/upload.
  if (bytes.length < 4096 && !readWavFormat(bytes)) {
    throw new Error(`Audio must be a WAV file (${bytes.length} bytes received — hold the mic longer)`);
  }
  let wav = bytes;
  if (!readWavFormat(wav)) {
    wav = await transcodeToWavMono24k(bytes, env);
  }
  const fmt = readWavFormat(wav);
  if (!fmt) {
    throw new Error('Audio could not be converted to WAV');
  }
  if (fmt.audioFormat !== 1 || fmt.channels !== 1 || fmt.bitsPerSample !== 16) {
    throw new Error('Audio must be mono 16-bit PCM WAV');
  }
  if (!STT_SAMPLE_RATES.includes(fmt.sampleRate)) {
    throw new Error('Audio must be 16 kHz or 24 kHz WAV');
  }

  const sessionId = `mume-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const form = new FormData();
  form.append(
    'request',
    new Blob([JSON.stringify({ mode: 'DIARIZATION', model: sttModel, audioEncoding: 'WAV' })], {
      type: 'application/json',
    }),
    'request.json'
  );
  form.append('audio', new Blob([wav], { type: 'audio/wav' }), 'voice.wav');

  // The default fetch has no timeout: a blackholed connection to the
  // transcription endpoint would hang the request forever. Bound it and
  // retry once on network-level failure (transient blips), then report
  // the underlying cause (DNS, refused, timeout, TLS) instead of a bare
  // "fetch failed".
  const transcribeUrl = `${baseUrl}/asr/transcribe?sessionId=${encodeURIComponent(sessionId)}`;
  let res = null;
  let fetchErr = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      res = await fetch(transcribeUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
        signal: AbortSignal.timeout(30000),
      });
      fetchErr = null;
      break;
    } catch (err) {
      fetchErr = err;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 1000));
    }
  }
  if (!res) {
    const cause = fetchErr && fetchErr.cause ? String(fetchErr.cause.message || fetchErr.cause) : '';
    throw new Error(`Muse transcription unreachable (${fetchErr.message}${cause ? `: ${cause}` : ''})`);
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || `Muse transcription failed (${res.status})`);
  }
  const text = String(data?.transcript || '').trim();
  if (!text) {
    throw new Error('Muse transcription returned no text');
  }
  return text;
}

module.exports = {
  DEFAULT_BASE_URL,
  DEFAULT_CHAT_MODEL,
  DEFAULT_STT_MODEL,
  MAX_AUDIO_BYTES,
  getMetaConfig,
  isMuseConfigured,
  contentToText,
  getMuseChatReply,
  transcribeMuseAudio,
  stripDataUrlPrefix,
  readWavFormat,
  buildWavTranscodeArgs,
  transcodeToWavMono24k,
  STT_SAMPLE_RATES,
};
