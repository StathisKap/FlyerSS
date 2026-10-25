import { listFlyers, listTemplates } from '#lib/server/s3.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const [flyers, templates] = await Promise.all([listFlyers(), listTemplates()]);
	return { flyers, templates };
};
