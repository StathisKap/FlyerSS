import { json } from '@sveltejs/kit';
import { copy, getJson, listFlyers, newFlyerId, put } from '#lib/server/s3.js';
import type { FlyerMeta } from '#lib/types.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => json(await listFlyers());

export const POST: RequestHandler = async ({ request }) => {
	const form = await request.formData();
	const portrait = form.get('portrait') as File | null;
	const output = form.get('output') as File | null;
	const body = JSON.parse(String(form.get('meta')));

	// An existing id means "keep editing this flyer" — overwrite it rather than pile up a
	// record per download. Validated because the id becomes part of the object key.
	const existingId = /^\d{17}-[a-z0-9]{6}$/.test(body.id ?? '') ? (body.id as string) : '';
	const id = existingId || newFlyerId();
	const previous = existingId ? await getJson<FlyerMeta>(`flyers/${id}/meta.json`) : null;

	const ext = portrait?.type === 'image/png' ? 'png' : 'jpg';
	const meta: FlyerMeta = {
		id,
		name: body.name,
		templateId: body.templateId,
		transform: body.transform,
		portraitKey: `flyers/${id}/portrait.${ext}`,
		outputKey: `flyers/${id}/output.png`,
		createdAt: previous?.createdAt ?? new Date().toISOString()
	};

	await Promise.all([
		// A flyer re-saved from the drawer sends no file — copy the portrait it was opened
		// with, so every flyer owns its own objects and stays editable if the original goes.
		portrait
			? put(meta.portraitKey, Buffer.from(await portrait.arrayBuffer()), portrait.type)
			: body.portraitKey &&
				body.portraitKey !== meta.portraitKey &&
				copy(body.portraitKey, meta.portraitKey),
		output && put(meta.outputKey, Buffer.from(await output.arrayBuffer()), 'image/png')
	]);
	await put(`flyers/${id}/meta.json`, Buffer.from(JSON.stringify(meta)), 'application/json');

	return json(meta);
};
