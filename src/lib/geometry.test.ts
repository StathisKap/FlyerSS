import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { centerRect, coverWindow, detectWindow, scaleAbout } from './geometry.ts';

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

test('detectWindow finds the transparent hole, ignoring opaque art', () => {
	// 10x10 opaque template with a 4x3 transparent hole at (3,2)
	const w = 10;
	const h = 10;
	const alpha = new Array(w * h).fill(255);
	for (let y = 2; y < 5; y += 1) {
		for (let x = 3; x < 7; x += 1) alpha[y * w + x] = 0;
	}

	assert.deepEqual(detectWindow(alpha, w, h), { x: 3, y: 2, w: 4, h: 3 });

	// a fully opaque template has no window
	assert.equal(detectWindow(new Array(w * h).fill(255), w, h), null);

	// faint antialiasing still counts as a hole, solid-ish edges do not
	const soft = new Array(w * h).fill(255);
	soft[5 * w + 5] = 10;
	assert.deepEqual(detectWindow(soft, w, h), { x: 5, y: 5, w: 1, h: 1 });
	soft[5 * w + 5] = 40;
	assert.equal(detectWindow(soft, w, h), null);
});

test('centerRect centres on the asked axis and leaves the other alone', () => {
	const bounds = { width: 1000, height: 600 };
	const rect = { x: 10, y: 20, w: 400, h: 100 };

	assert.deepEqual(centerRect(rect, bounds, 'x'), { x: 300, y: 20, w: 400, h: 100 });
	assert.deepEqual(centerRect(rect, bounds, 'y'), { x: 10, y: 250, w: 400, h: 100 });
	assert.deepEqual(centerRect(rect, bounds, 'both'), { x: 300, y: 250, w: 400, h: 100 });

	// a rect wider than the template centres to a negative offset rather than clamping,
	// which keeps it symmetrical instead of flush left
	assert.equal(centerRect({ ...rect, w: 1200 }, bounds, 'x').x, -100);
});
