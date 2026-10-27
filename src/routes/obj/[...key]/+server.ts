import { error } from '@sveltejs/kit';
import { bucket, s3 } from '#lib/server/s3.js';
import type { RequestHandler } from './$types';

/** Same-origin proxy for MinIO objects — keeps the export canvas untainted. */
export const GET: RequestHandler = async ({ params, request }) => {
	try {
		const stat = await s3.statObject(bucket, params.key);
		// These keys are reused: replacing a template image, or re-saving a flyer, overwrites
		// the same object. Revalidate against the ETag rather than caching as immutable —
		// otherwise every browser that has seen a key keeps the old bytes for a year.
		const etag = `"${stat.etag}"`;
		if (request.headers.get('if-none-match') === etag) {
			return new Response(null, { status: 304, headers: { ETag: etag } });
		}

		const stream = await s3.getObject(bucket, params.key);
		return new Response(stream as unknown as ReadableStream, {
			headers: {
				'Content-Type': stat.metaData?.['content-type'] ?? 'application/octet-stream',
				'Content-Length': String(stat.size),
				ETag: etag,
				'Cache-Control': 'private, no-cache'
			}
		});
	} catch {
		error(404, 'not found');
	}
};
