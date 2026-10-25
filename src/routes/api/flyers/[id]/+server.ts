import { error, json } from '@sveltejs/kit';
import { getJson, removeFlyer } from '#lib/server/s3.js';
import type { FlyerMeta } from '#lib/types.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
	const meta = await getJson<FlyerMeta>(`flyers/${params.id}/meta.json`);
	if (!meta) error(404, 'No such flyer');
	return json(meta);
};

export const DELETE: RequestHandler = async ({ params }) => {
	await removeFlyer(params.id);
	return json({ ok: true });
};
