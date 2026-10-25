import { listFlyers, listTemplates } from '#lib/server/s3.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// ponytail: every flyer, filtered in the browser. One meta.json GET each — fine into the
	// hundreds; past that, keep an index object instead of fanning out.
	const [flyers, templates] = await Promise.all([listFlyers(Infinity), listTemplates()]);
	return { flyers, templates };
};
