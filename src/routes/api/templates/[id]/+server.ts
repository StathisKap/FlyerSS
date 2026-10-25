import { error, json } from '@sveltejs/kit';
import {
	getTemplate,
	putTemplateConfig,
	removeTemplate,
	templateUsage,
	templateUrl
} from '#lib/server/s3.js';
import type { RequestHandler } from './$types';

/** Archive / restore. Archived templates vanish from the picker but still render old flyers. */
export const PATCH: RequestHandler = async ({ params, request }) => {
	const existing = await getTemplate(params.id);
	if (!existing) error(404, 'No such template');

	const body = await request.json();
	const { id: _id, url: _url, ...config } = existing;
	const next = { ...config, archived: !!body.archived };
	await putTemplateConfig(params.id, next);
	return json({ ...next, id: params.id, url: templateUrl(params.id) });
};

/** Only ever deletes a template nothing points at — otherwise those flyers render wrong. */
export const DELETE: RequestHandler = async ({ params }) => {
	const used = await templateUsage(params.id);
	if (used > 0) {
		error(
			409,
			`${used} flyer${used === 1 ? '' : 's'} still ${used === 1 ? 'uses' : 'use'} this template — archive it instead`
		);
	}
	await removeTemplate(params.id);
	return json({ ok: true });
};
