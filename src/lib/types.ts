import type { Rect } from '#lib/geometry.js';

export type FlyerMeta = {
	id: string;
	name: string;
	templateId: string;
	transform: { x: number; y: number; scale: number };
	portraitKey: string;
	outputKey: string;
	createdAt: string;
};

export type NameStyle = {
	family: string;
	weight: string;
	size: number;
	color: string;
	letterSpacing: number;
	uppercase: boolean;
};

/** What a template.json holds. Coordinates are in template pixels (width x height). */
export type TemplateConfig = {
	label: string;
	width: number;
	height: number;
	exportScale: number;
	/** The transparent hole the portrait shows through. */
	window: Rect;
	nameBox: Rect;
	nameStyle: NameStyle;
	/** Hidden from the picker but still loadable, so old flyers keep rendering. */
	archived?: boolean;
	createdAt?: string;
};

export type Template = TemplateConfig & {
	id: string;
	/** Same-origin URL, so the export canvas stays untainted. */
	url: string;
};
