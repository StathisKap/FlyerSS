import { Client } from 'minio';
import { S3_ACCESS_KEY, S3_BUCKET, S3_ENDPOINT, S3_SECRET_KEY } from '$app/env/private';
import type { FlyerMeta } from '#lib/types.js';

const endpoint = new URL(S3_ENDPOINT);

export const bucket = S3_BUCKET;

export const s3 = new Client({
	endPoint: endpoint.hostname,
	port: Number(endpoint.port) || (endpoint.protocol === 'https:' ? 443 : 80),
	useSSL: endpoint.protocol === 'https:',
	accessKey: S3_ACCESS_KEY,
	secretKey: S3_SECRET_KEY
});

export type { FlyerMeta };

export async function copy(fromKey: string, toKey: string) {
	await s3.copyObject(bucket, toKey, `/${bucket}/${fromKey}`);
}

export async function put(key: string, body: Buffer, contentType: string) {
	await s3.putObject(bucket, key, body, body.length, { 'Content-Type': contentType });
}

export async function getJson<T>(key: string): Promise<T | null> {
	try {
		const stream = await s3.getObject(bucket, key);
		const chunks: Buffer[] = [];
		for await (const c of stream) chunks.push(c as Buffer);
		return JSON.parse(Buffer.concat(chunks).toString());
	} catch {
		return null;
	}
}

/** Flyer ids are time-sorted, so listing prefixes gives newest-first for free. */
export function listFlyerIds(): Promise<string[]> {
	return new Promise((resolve, reject) => {
		const ids: string[] = [];
		const stream = s3.listObjectsV2(bucket, 'flyers/', false);
		stream.on('data', (o: { prefix?: string }) => {
			if (o.prefix) ids.push(o.prefix.slice('flyers/'.length).replace(/\/$/, ''));
		});
		stream.on('error', reject);
		stream.on('end', () => resolve(ids.reverse()));
	});
}

export async function listFlyers(limit = 60): Promise<FlyerMeta[]> {
	const ids = (await listFlyerIds()).slice(0, limit);
	const metas = await Promise.all(ids.map((id) => getJson<FlyerMeta>(`flyers/${id}/meta.json`)));
	return metas.filter((m): m is FlyerMeta => !!m);
}

export async function removeFlyer(id: string) {
	const keys: string[] = [];
	const stream = s3.listObjectsV2(bucket, `flyers/${id}/`, true);
	for await (const o of stream) if (o.name) keys.push(o.name);
	if (keys.length) await s3.removeObjects(bucket, keys);
}

/** Sortable, collision-proof id: 20260204T153012123-a1b2c3 */
export function newFlyerId() {
	const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 17);
	return `${ts}-${Math.random().toString(36).slice(2, 8)}`;
}
