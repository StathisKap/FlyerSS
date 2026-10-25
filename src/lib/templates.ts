import type { Template } from '#lib/types.js';

export type { Template };

export const templateById = (templates: Template[], id: string) =>
	templates.find((t) => t.id === id) ?? templates[0];

/** Largest font size that fits `text` inside the name box. */
export function fitFontSize(t: Template, text: string, measure: CanvasRenderingContext2D): number {
	const { family, weight, size, letterSpacing } = t.nameStyle;
	let px = size;
	// ponytail: linear shrink loop — 50 iterations max, nobody notices
	for (; px > 8; px -= 1) {
		measure.font = `${weight} ${px}px ${family}`;
		measure.letterSpacing = `${(letterSpacing * px) / size}px`;
		if (measure.measureText(text).width <= t.nameBox.w) break;
	}
	return px;
}

export const slugId = (label: string) =>
	label
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
		.slice(0, 40) || 'template';
