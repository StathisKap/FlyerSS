import { listFlyers } from '#lib/server/s3.js';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ flyers: await listFlyers() });
