const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  isApprovalConfirmation,
  asksAboutInquiries,
  buildPendingStatusReply,
  buildConfirmationSentReply,
} = require('../src/services/ai');

test('ai: approval confirmation phrases are detected', () => {
  assert.equal(isApprovalConfirmation('yes send it'), true);
  assert.equal(isApprovalConfirmation('Yes, send it'), true);
  assert.equal(isApprovalConfirmation('yes'), true);
  assert.equal(isApprovalConfirmation('send it'), true);
  assert.equal(isApprovalConfirmation('go ahead'), true);
  assert.equal(isApprovalConfirmation('approve'), true);
  assert.equal(isApprovalConfirmation('sige'), true);
  assert.equal(isApprovalConfirmation('How much are red apples?'), false);
  assert.equal(isApprovalConfirmation(''), false);
  assert.equal(isApprovalConfirmation('do I have inquiries?'), false);
});

test('ai: inquiry-status questions are detected', () => {
  assert.equal(asksAboutInquiries('do I have inquiries?'), true);
  assert.equal(asksAboutInquiries('you have 2 inquiries?'), true);
  assert.equal(asksAboutInquiries('any pending replies?'), true);
  assert.equal(asksAboutInquiries('How much are red apples?'), false);
  assert.equal(asksAboutInquiries('yes send it'), false);
});

test('ai: pending status reply names inquiries and asks to send', () => {
  const reply = buildPendingStatusReply([
    { customer_name: 'Maria A.' },
    { customer_name: 'Jun L.' },
  ]);
  assert.ok(reply.includes('2'));
  assert.ok(reply.includes('Maria A.'));
  assert.ok(reply.includes('Jun L.'));
  assert.ok(/send/i.test(reply));
  assert.equal(
    buildPendingStatusReply([]),
    'You have no customer inquiries waiting right now.'
  );
});

test('ai: confirmation sent reply lists who was contacted', () => {
  const reply = buildConfirmationSentReply([{ customer_name: 'Maria A.' }]);
  assert.ok(/sent/i.test(reply));
  assert.ok(reply.includes('Maria A.'));
});
