import { listTemplates } from '#lib/server/s3.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const templates = await listTemplates();
	return { templates: templates.filter((t) => !t.archived) };
};
