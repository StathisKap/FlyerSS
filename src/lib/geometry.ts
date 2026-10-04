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
