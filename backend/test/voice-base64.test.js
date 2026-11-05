const { test } = require('node:test');
const assert = require('node:assert/strict');
const { stripDataUrlPrefix } = require('../src/services/muse');

test('voice: data-URL prefix is stripped before base64 decoding', () => {
  assert.equal(stripDataUrlPrefix('data:audio/wav;base64,'), '');
  assert.equal(stripDataUrlPrefix('data:audio/m4a;base64,'), '');
  const payload = Buffer.from('hello').toString('base64');
  assert.equal(stripDataUrlPrefix(`data:audio/wav;base64,${payload}`), payload);
  assert.equal(stripDataUrlPrefix(payload), payload);
  assert.equal(stripDataUrlPrefix(''), '');
});

test('voice: empty data URL decodes to zero bytes, not 14', () => {
  const bytes = Buffer.from(stripDataUrlPrefix('data:audio/wav;base64,'), 'base64');
  assert.equal(bytes.length, 0);
});
