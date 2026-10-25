import { Client } from 'minio';
import { S3_ACCESS_KEY, S3_BUCKET, S3_ENDPOINT, S3_SECRET_KEY } from '$app/env/private';
import type { FlyerMeta, Template, TemplateConfig } from '#lib/types.js';

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

// ---------------------------------------------------------------------------
// Templates — same layout as flyers: templates/<id>/{template.png,template.json}
// ---------------------------------------------------------------------------

/** Public URL for a template image. Same-origin, so the export canvas stays clean. */
export const templateUrl = (id: string) => `/obj/templates/${id}/template.png`;

function listPrefixes(prefix: string): Promise<string[]> {
	return new Promise((resolve, reject) => {
		const ids: string[] = [];
		const stream = s3.listObjectsV2(bucket, prefix, false);
		stream.on('data', (o: { prefix?: string }) => {
			if (o.prefix) ids.push(o.prefix.slice(prefix.length).replace(/\/$/, ''));
		});
		stream.on('error', reject);
		stream.on('end', () => resolve(ids));
	});
}

export async function listTemplates(): Promise<Template[]> {
	const ids = await listPrefixes('templates/');
	const configs = await Promise.all(
		ids.map((id) => getJson<TemplateConfig>(`templates/${id}/template.json`))
	);
	return ids
		.map((id, i) => (configs[i] ? { ...configs[i]!, id, url: templateUrl(id) } : null))
		.filter((t): t is Template => !!t)
		.sort((a, b) => a.label.localeCompare(b.label));
}

export async function getTemplate(id: string): Promise<Template | null> {
	const config = await getJson<TemplateConfig>(`templates/${id}/template.json`);
	return config ? { ...config, id, url: templateUrl(id) } : null;
}

export async function putTemplateConfig(id: string, config: TemplateConfig) {
	await put(`templates/${id}/template.json`, Buffer.from(JSON.stringify(config)), 'application/json');
}

export async function putTemplateImage(id: string, png: Buffer) {
	await put(`templates/${id}/template.png`, png, 'image/png');
}

export async function removeTemplate(id: string) {
	const keys: string[] = [];
	const stream = s3.listObjectsV2(bucket, `templates/${id}/`, true);
	for await (const o of stream) if (o.name) keys.push(o.name);
	if (keys.length) await s3.removeObjects(bucket, keys);
}

/** How many saved flyers still point at this template. Archive rather than delete these. */
export async function templateUsage(id: string): Promise<number> {
	const flyers = await listFlyers(Infinity);
	return flyers.filter((f) => f.templateId === id).length;
}

/** A readable id derived from the label, with a suffix only when it collides. */
export async function freeTemplateId(base: string): Promise<string> {
	const taken = new Set(await listPrefixes('templates/'));
	if (!taken.has(base)) return base;
	for (let n = 2; ; n += 1) {
		const candidate = `${base}-${n}`;
		if (!taken.has(candidate)) return candidate;
	}
}
