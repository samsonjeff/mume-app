const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');
const {
  getMetaConfig,
  isMuseConfigured,
  contentToText,
  getMuseChatReply,
  transcribeMuseAudio,
  readWavFormat,
  MAX_AUDIO_BYTES,
} = require('../src/services/muse');

const realFetch = global.fetch;

function mockFetchOnce(handler) {
  global.fetch = async (...args) => handler(...args);
}

function jsonResponse(payload, ok = true, status = 200) {
  return {
    ok,
    status,
    json: async () => payload,
  };
}

test('muse: config defaults and env overrides', () => {
  const d = getMetaConfig({});
  assert.equal(d.apiKey, '');
  assert.equal(d.baseUrl, 'https://api.meta.ai/v1');
  assert.ok(d.chatModel.length > 0);
  assert.ok(d.sttModel.length > 0);
  assert.equal(isMuseConfigured({}), false);

  const c = getMetaConfig({
    META_MODEL_API_KEY: 'k',
    META_MODEL_BASE_URL: 'https://example.test/v1/',
    MUSE_CHAT_MODEL: 'chat-x',
    MUSE_STT_MODEL: 'stt-x',
  });
  assert.equal(c.apiKey, 'k');
  assert.equal(c.baseUrl, 'https://example.test/v1');
  assert.equal(c.chatModel, 'chat-x');
  assert.equal(c.sttModel, 'stt-x');
  assert.equal(isMuseConfigured({ META_MODEL_API_KEY: 'k' }), true);

  assert.equal(
    getMetaConfig({ META_MODEL_BASE_URL: 'https://api.dev.meta.ai/' }).baseUrl,
    'https://api.meta.ai/v1'
  );
});

test('muse: contentToText flattens shapes without throwing', () => {
  assert.equal(contentToText('hi'), 'hi');
  assert.equal(contentToText([{ text: 'a' }, { text: 'b' }]), 'ab');
  assert.equal(contentToText([{ foo: 1 }]), '');
  assert.equal(contentToText(undefined), '');
});

test('muse: chat reply posts to chat completions and returns text', async () => {
  let seen = null;
  mockFetchOnce(async (url, opts) => {
    seen = { url, opts: { ...opts, headers: { ...opts.headers, Authorization: 'REDACTED' } } };
    return jsonResponse({ choices: [{ message: { content: '  hello merchant ' } }] });
  });
  try {
    const text = await getMuseChatReply({
      system: 'sys',
      messages: [{ role: 'user', content: 'hi' }],
      env: { META_MODEL_API_KEY: 'k' },
    });
    assert.equal(text, 'hello merchant');
    assert.ok(seen.url.endsWith('/chat/completions'));
    const body = JSON.parse(seen.opts.body);
    assert.equal(body.messages[0].role, 'system');
    assert.equal(body.messages.at(-1).content, 'hi');
  } finally {
    global.fetch = realFetch;
  }
});

test('muse: chat reply throws on missing key, upstream error, and empty content', async () => {
  await assert.rejects(() => getMuseChatReply({ messages: [], env: {} }), /not configured/);

  mockFetchOnce(async () => jsonResponse({ error: { message: 'bad model' } }, false, 400));
  try {
    await assert.rejects(
      () => getMuseChatReply({ messages: [], env: { META_MODEL_API_KEY: 'k' } }),
      /bad model/
    );
  } finally {
    global.fetch = realFetch;
  }

  mockFetchOnce(async () => jsonResponse({ choices: [] }));
  try {
    await assert.rejects(
      () => getMuseChatReply({ messages: [], env: { META_MODEL_API_KEY: 'k' } }),
      /no content/
    );
  } finally {
    global.fetch = realFetch;
  }
});

/**
 * Minimal mono 16-bit PCM WAV builder for fixtures (header + a few samples).
 */
function makeWav({ rate = 24000, channels = 1, bits = 16, format = 1, samples = 8 } = {}) {
  const dataLen = samples * channels * (bits / 8);
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(format, 20);
  buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * channels * (bits / 8), 28);
  buf.writeUInt16LE(channels * (bits / 8), 32);
  buf.writeUInt16LE(bits, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataLen, 40);
  return buf;
}

test('muse: wav fixtures parse', () => {
  assert.deepEqual(
    (({ audioFormat, channels, sampleRate, bitsPerSample }) => ({
      audioFormat,
      channels,
      sampleRate,
      bitsPerSample,
    }))(readWavFormat(makeWav({}))),
    { audioFormat: 1, channels: 1, sampleRate: 24000, bitsPerSample: 16 }
  );
  assert.equal(readWavFormat(Buffer.from([1, 2, 3])), null);
  assert.equal(readWavFormat(Buffer.from('not a wav file at all....................')), null);
});

test('muse: transcribe posts WAV to asr/transcribe and returns transcript', async () => {
  let seen = null;
  mockFetchOnce(async (url, opts) => {
    seen = { url, method: opts.method, hasAuth: Boolean(opts.headers?.Authorization) };
    assert.ok(opts.body instanceof FormData);
    const requestPart = JSON.parse(await opts.body.get('request').text());
    assert.equal(requestPart.model, 'muse-voice-transcribe-1.0');
    assert.equal(requestPart.audioEncoding, 'WAV');
    const audioPart = opts.body.get('audio');
    assert.ok(audioPart instanceof Blob);
    assert.equal(audioPart.type, 'audio/wav');
    return jsonResponse({ transcript: '  magkano ang mansanas ' });
  });
  try {
    const text = await transcribeMuseAudio({
      audio: makeWav({}),
      env: { META_MODEL_API_KEY: 'k' },
    });
    assert.equal(text, 'magkano ang mansanas');
    assert.match(seen.url, /\/asr\/transcribe\?sessionId=/);
    assert.equal(seen.method, 'POST');
    assert.equal(seen.hasAuth, true);
  } finally {
    global.fetch = realFetch;
  }
});

test('muse: transcribe rejects empty audio, oversize audio, missing key', async () => {
  await assert.rejects(
    () => transcribeMuseAudio({ audio: Buffer.alloc(0), env: { META_MODEL_API_KEY: 'k' } }),
    /No audio/
  );
  await assert.rejects(
    () => transcribeMuseAudio({ audio: Buffer.alloc(0), env: {} }),
    /not configured/
  );
  await assert.rejects(
    () => transcribeMuseAudio({ audio: Buffer.alloc(MAX_AUDIO_BYTES + 1), env: { META_MODEL_API_KEY: 'k' } }),
    /too large/
  );
});

test('muse: transcribe rejects non-WAV and wrong WAV formats', async () => {
  const key = { META_MODEL_API_KEY: 'k' };
  await assert.rejects(() => transcribeMuseAudio({ audio: Buffer.from([1, 2, 3]), env: key }), /WAV file/);
  await assert.rejects(
    () => transcribeMuseAudio({ audio: makeWav({ channels: 2 }), env: key }),
    /mono 16-bit PCM/
  );
  await assert.rejects(
    () => transcribeMuseAudio({ audio: makeWav({ bits: 8 }), env: key }),
    /mono 16-bit PCM/
  );
  await assert.rejects(
    () => transcribeMuseAudio({ audio: makeWav({ rate: 44100 }), env: key }),
    /16 kHz or 24 kHz/
  );
  // 16 kHz mono is accepted by validation (mock upstream, then empty text).
  mockFetchOnce(async () => jsonResponse({ transcript: '' }));
  try {
    await assert.rejects(
      () => transcribeMuseAudio({ audio: makeWav({ rate: 16000 }), env: key }),
      /no text/
    );
  } finally {
    global.fetch = realFetch;
  }
});

// Route-level: validation + missing-key behavior without touching Meta.
let server;
let base;
before(async () => {
  server = createApp({ FB_VERIFY_TOKEN: 'secret-token' }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test('POST /api/voice/transcribe validates missing audio', async () => {
  const res = await fetch(`${base}/api/voice/transcribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 400);
});

test('POST /api/voice/transcribe fails closed without API key', async () => {
  const res = await fetch(`${base}/api/voice/transcribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ audio: Buffer.from([1, 2, 3]).toString('base64') }),
  });
  assert.equal(res.status, 500);
  const json = await res.json();
  assert.match(json.error, /not configured/i);
});

test('POST /api/voice/transcribe strips a data-URL prefix before decoding', async () => {
  const res = await fetch(`${base}/api/voice/transcribe`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ audio: 'data:audio/wav;base64,' }),
  });
  // An empty data URL carries zero audio bytes, not a 14-byte WAV; the
  // route must report invalid audio (400), never a 502 WAV-size error.
  assert.equal(res.status, 400);
  const json = await res.json();
  assert.match(json.error, /Invalid base64 audio/);
});

test('muse: transcribe retries once on network failure and reports cause', async () => {
  const key = { META_MODEL_API_KEY: 'k' };
  let calls = 0;
  const netErr = new TypeError('fetch failed');
  netErr.cause = new Error('getaddrinfo ENOTFOUND api.meta.ai');
  global.fetch = async () => {
    calls++;
    if (calls === 1) throw netErr;
    return jsonResponse({ transcript: 'hi' });
  };
  try {
    const text = await transcribeMuseAudio({ audio: makeWav({}), env: key });
    assert.equal(text, 'hi');
    assert.equal(calls, 2);
  } finally {
    global.fetch = realFetch;
  }

  global.fetch = async () => { throw netErr; };
  try {
    await assert.rejects(
      () => transcribeMuseAudio({ audio: makeWav({}), env: key }),
      /Muse transcription unreachable \(fetch failed: getaddrinfo ENOTFOUND/);
  } finally {
    global.fetch = realFetch;
  }
});
