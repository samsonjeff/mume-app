/**
 * Meta Muse (Model API) client.
 * Single-key access (META_MODEL_API_KEY from dev.meta.ai) for both the
 * Muse Spark chat model and the Muse Voice speech-to-text model.
 * The API surface is OpenAI-compatible: Chat Completions for chat and a
 * multipart transcription endpoint for audio.
 */

const DEFAULT_BASE_URL = 'https://api.meta.ai/v1';
const DEFAULT_CHAT_MODEL = 'muse-spark-1.1';
const DEFAULT_STT_MODEL = 'muse-voice-transcribe-1.0';

// Cap accepted audio at ~8 MB so a runaway recording cannot exhaust memory.
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

function getMetaConfig(env = process.env) {
  const apiKey = env.META_MODEL_API_KEY || env.MODEL_API_KEY || '';
  const baseUrl = String(
    env.META_MODEL_BASE_URL || env.MODEL_API_BASE_URL || DEFAULT_BASE_URL
  ).replace(/\/+$/, '');
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
 * Transcribes merchant speech via the Muse Voice file endpoint
 * (POST {base}/asr/transcribe). Accepts WAV bytes (mono 16-bit PCM at
 * 16/24 kHz, exactly what the app records) and returns the transcript.
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
  const fmt = readWavFormat(bytes);
  if (!fmt) {
    throw new Error('Audio must be a WAV file');
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
  form.append('audio', new Blob([bytes], { type: 'audio/wav' }), 'voice.wav');

  const res = await fetch(`${baseUrl}/asr/transcribe?sessionId=${encodeURIComponent(sessionId)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

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
  readWavFormat,
  STT_SAMPLE_RATES,
};
