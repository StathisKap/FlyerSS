import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { coverWindow, scaleAbout } from './geometry.ts';

const win = { x: 150, y: 130, w: 252, h: 280 };

test('coverWindow fills the window and centres the overflow', () => {
	// portrait is taller than the window -> scale on width, bleed top/bottom
	const tall = coverWindow(win, 1200, 1600);
	assert.equal(tall.scale, 252 / 1200);
	assert.equal(tall.x, 150);
	assert.ok(tall.y < 130, 'tall image should bleed above the window');
	assert.ok(1600 * tall.scale >= 280, 'window must be fully covered');

	// landscape -> scale on height, bleed left/right
	const wide = coverWindow(win, 1600, 1200);
	assert.equal(wide.scale, 280 / 1200);
	assert.equal(wide.y, 130);
	assert.ok(wide.x < 150, 'wide image should bleed left of the window');
	assert.ok(1600 * wide.scale >= 252, 'window must be fully covered');
});

test('scaleAbout keeps the pinch anchor under the fingers', () => {
	const tr = { x: 10, y: 20, scale: 0.5 };
	const at = { x: 200, y: 300 };
	const next = scaleAbout(tr, at, 2);

	// the image-space point under `at` must be the same before and after
	const before = { x: (at.x - tr.x) / tr.scale, y: (at.y - tr.y) / tr.scale };
	const after = { x: (at.x - next.x) / next.scale, y: (at.y - next.y) / next.scale };
	assert.ok(Math.abs(before.x - after.x) < 1e-9);
	assert.ok(Math.abs(before.y - after.y) < 1e-9);
	assert.equal(next.scale, 1);
});
