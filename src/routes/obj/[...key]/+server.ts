import { error } from '@sveltejs/kit';
import { bucket, s3 } from '#lib/server/s3.js';
import type { RequestHandler } from './$types';

/** Same-origin proxy for MinIO objects — keeps the export canvas untainted. */
export const GET: RequestHandler = async ({ params }) => {
	try {
		const stat = await s3.statObject(bucket, params.key);
		const stream = await s3.getObject(bucket, params.key);
		return new Response(stream as unknown as ReadableStream, {
			headers: {
				'Content-Type': stat.metaData?.['content-type'] ?? 'application/octet-stream',
				'Content-Length': String(stat.size),
				'Cache-Control': 'private, max-age=31536000, immutable'
			}
		});
	} catch {
		error(404, 'not found');
	}
};
