import { json } from '@sveltejs/kit';
import { removeFlyer } from '#lib/server/s3.js';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
	await removeFlyer(params.id);
	return json({ ok: true });
};
