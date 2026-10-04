import { fitFontSize, type Template } from '#lib/templates.js';
import type { Transform } from '#lib/geometry.js';

export type { Transform };

export function loadImage(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		img.onload = () => resolve(img);
		img.onerror = reject;
		img.src = src;
	});
}

/** Draws the final flyer at native resolution x exportScale. */
export async function renderFlyer(
	t: Template,
	portrait: HTMLImageElement | null,
	tr: Transform,
	name: string
): Promise<Blob> {
	const s = t.exportScale;
	const canvas = document.createElement('canvas');
	canvas.width = t.width * s;
	canvas.height = t.height * s;
	const ctx = canvas.getContext('2d')!;
	ctx.scale(s, s);

	if (portrait) {
		ctx.drawImage(
			portrait,
			tr.x,
			tr.y,
			portrait.naturalWidth * tr.scale,
			portrait.naturalHeight * tr.scale
		);
	}

	ctx.drawImage(await loadImage(t.url), 0, 0, t.width, t.height);

	const text = t.nameStyle.uppercase ? name.toUpperCase() : name;
	if (text.trim()) {
		const px = fitFontSize(t, text, ctx);
		const { family, weight, color, letterSpacing, size } = t.nameStyle;
		ctx.font = `${weight} ${px}px ${family}`;
		ctx.letterSpacing = `${(letterSpacing * px) / size}px`;
		ctx.fillStyle = color;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillText(text, t.nameBox.x + t.nameBox.w / 2, t.nameBox.y + t.nameBox.h / 2);
	}

	return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'));
}

export const slug = (name: string) =>
	name.trim().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || 'flyer';
