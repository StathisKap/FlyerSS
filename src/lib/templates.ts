import type { Rect } from '#lib/geometry.js';

export type { Rect };

export type Template = {
	id: string;
	label: string;
	width: number;
	height: number;
	exportScale: number;
	window: Rect;
	nameBox: Rect;
	nameStyle: {
		family: string;
		weight: string;
		size: number;
		color: string;
		letterSpacing: number;
		uppercase: boolean;
	};
	url: string;
};

// Drop a folder in src/lib/templates/<id>/ with template.png + template.json and it shows up.
const configs = import.meta.glob('./templates/*/template.json', { eager: true, import: 'default' });
const images = import.meta.glob('./templates/*/template.png', {
	eager: true,
	query: '?url',
	import: 'default'
});

const idOf = (path: string) => path.split('/')[2];

export const templates: Template[] = Object.entries(configs).map(([path, config]) => ({
	id: idOf(path),
	...(config as Omit<Template, 'id' | 'url'>),
	url: images[path.replace('template.json', 'template.png')] as string
}));

export const templateById = (id: string) => templates.find((t) => t.id === id) ?? templates[0];

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
