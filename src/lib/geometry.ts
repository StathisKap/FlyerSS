export type Rect = { x: number; y: number; w: number; h: number };
export type Transform = { x: number; y: number; scale: number };

/** Transform that makes an image of iw x ih cover `win`, centred. */
export function coverWindow(win: Rect, iw: number, ih: number): Transform {
	const scale = Math.max(win.w / iw, win.h / ih);
	return {
		x: win.x + (win.w - iw * scale) / 2,
		y: win.y + (win.h - ih * scale) / 2,
		scale
	};
}

/** Scale by `ratio` while keeping the point `at` (flyer coords) pinned. */
export function scaleAbout(tr: Transform, at: { x: number; y: number }, ratio: number): Transform {
	return {
		x: at.x - (at.x - tr.x) * ratio,
		y: at.y - (at.y - tr.y) * ratio,
		scale: tr.scale * ratio
	};
}

/**
 * Bounding box of the transparent hole in a template — the area the portrait shows
 * through. Returns null when the image has no transparent pixels at all.
 */
export function detectWindow(
	alpha: Uint8ClampedArray | number[],
	width: number,
	height: number,
	threshold = 16
): Rect | null {
	let minX = width;
	let minY = height;
	let maxX = -1;
	let maxY = -1;

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			if (alpha[y * width + x] > threshold) continue;
			if (x < minX) minX = x;
			if (x > maxX) maxX = x;
			if (y < minY) minY = y;
			if (y > maxY) maxY = y;
		}
	}

	if (maxX < 0) return null;
	return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Alpha channel of an ImageData buffer (every 4th byte). */
export const alphaOf = (rgba: Uint8ClampedArray) => {
	const out = new Uint8ClampedArray(rgba.length / 4);
	for (let i = 0; i < out.length; i += 1) out[i] = rgba[i * 4 + 3];
	return out;
};

/** Centre a rect inside the template, on one axis or both. */
export function centerRect(
	rect: Rect,
	bounds: { width: number; height: number },
	axis: 'x' | 'y' | 'both'
): Rect {
	return {
		...rect,
		x: axis === 'y' ? rect.x : Math.round((bounds.width - rect.w) / 2),
		y: axis === 'x' ? rect.y : Math.round((bounds.height - rect.h) / 2)
	};
}
