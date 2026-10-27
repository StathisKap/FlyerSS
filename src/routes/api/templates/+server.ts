import { error, json } from '@sveltejs/kit';
import {
	freeTemplateId,
	listTemplates,
	putTemplateConfig,
	putTemplateImage,
	templateUrl
} from '#lib/server/s3.js';
import { slugId } from '#lib/templates.js';
import type { TemplateConfig } from '#lib/types.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => json(await listTemplates());

export const POST: RequestHandler = async ({ request }) => {
	const form = await request.formData();
	const image = form.get('image') as File | null;
	const config = JSON.parse(String(form.get('config'))) as TemplateConfig & { id?: string };

	if (!config?.label?.trim()) error(400, 'A label is required');
	if (!(config.width > 0 && config.height > 0)) error(400, 'Template has no dimensions');

	// An id means "replace this template in place" — keeps every saved flyer pointing at it.
	const id = config.id?.trim() || (await freeTemplateId(slugId(config.label)));

	const stored: TemplateConfig = {
		label: config.label.trim(),
		width: config.width,
		height: config.height,
		exportScale: config.exportScale || 1,
		window: config.window,
		cutout: config.cutout ?? false,
		nameBox: config.nameBox,
		nameStyle: config.nameStyle,
		archived: config.archived ?? false,
		createdAt: config.createdAt ?? new Date().toISOString()
	};

	if (image) await putTemplateImage(id, Buffer.from(await image.arrayBuffer()));
	else if (!config.id) error(400, 'A new template needs an image');

	await putTemplateConfig(id, stored);
	return json({ ...stored, id, url: templateUrl(id) });
};
