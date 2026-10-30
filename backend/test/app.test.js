const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../src/app');

let server;
let base;

before(async () => {
  server = createApp({ FB_VERIFY_TOKEN: 'secret-token' }).listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
});

test('GET / returns ok', async () => {
  const res = await fetch(`${base}/`);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { name: 'mume-backend', status: 'ok' });
});

test('GET /webhook echoes challenge when verify token matches', async () => {
  const res = await fetch(
    `${base}/webhook?hub.mode=subscribe&hub.verify_token=secret-token&hub.challenge=12345`
  );
  assert.equal(res.status, 200);
  assert.equal(await res.text(), '12345');
});

test('GET /webhook rejects wrong verify token', async () => {
  const res = await fetch(
    `${base}/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345`
  );
  assert.equal(res.status, 403);
});

test('GET /webhook rejects when FB_VERIFY_TOKEN is unset', async () => {
  const s = createApp({}).listen(0);
  await new Promise((r) => s.once('listening', r));
  const res = await fetch(
    `http://127.0.0.1:${s.address().port}/webhook?hub.mode=subscribe&hub.verify_token=&hub.challenge=1`
  );
  s.closeAllConnections();
  await new Promise((r) => s.close(r));
  assert.equal(res.status, 403);
});

test('POST /webhook acknowledges with 200', async () => {
  const res = await fetch(`${base}/webhook`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ object: 'page', entry: [] }),
  });
  assert.equal(res.status, 200);
});

test('GET /auth/facebook/callback requires code', async () => {
  const res = await fetch(`${base}/auth/facebook/callback`);
  assert.equal(res.status, 400);
});

test('GET /auth/facebook/callback accepts code', async () => {
  const res = await fetch(`${base}/auth/facebook/callback?code=abc`);
  assert.equal(res.status, 200);
});

