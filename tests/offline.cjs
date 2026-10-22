const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('the standalone page embeds its fonts and has no remote resources', () => {
  assert.doesNotMatch(html, /<(?:link|script|img|audio|video|source)\b[^>]*(?:src|href)=["']https?:/i);
  for (const url of html.matchAll(/url\(([^)]+)\)/g)) assert.match(url[1], /^data:/);
  for (const family of ['Pixelify Sans', 'VT323']) {
    assert.ok(html.includes('font-family: \'' + family + '\''));
  }
});

test('daily seeds and elapsed time need no network, including with old server timestamps', async () => {
  const code = html.slice(html.indexOf('  function serverNow()'), html.indexOf('\n  // Inputs.'));
  const now = Date.UTC(2026, 9, 22, 12);
  class Clock extends Date { static now() { return now; } }
  const ctx = { Date: Clock, Promise, s: { lastSeen: now - 90000, lastSeenSrv: now + 999999 } };
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  await ctx.syncTime();
  assert.equal(ctx.today(), '2026-10-22');
  assert.equal(ctx.awaySeconds(), 90);
  ctx.s.lastSeen = now + 1000;
  assert.equal(ctx.awaySeconds(), 0);
});
