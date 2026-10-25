import { createHash, timingSafeEqual } from 'node:crypto';
import { ADMIN_PASSWORD, APP_PASSWORD, SESSION_SECRET } from '$app/env/private';

export const COOKIE = 'fss';
export const ADMIN_COOKIE = 'fss_admin';

/** Stateless session: the cookie IS the proof. No session store to keep. */
const token = () =>
	createHash('sha256')
		.update(`${APP_PASSWORD}:${SESSION_SECRET}`)
		.digest('hex');

export function issue(cookies: import('@sveltejs/kit').Cookies) {
	cookies.set(COOKIE, token(), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 365 * 10 // effectively infinite
	});
}

export function valid(value: string | undefined): boolean {
	if (!value) return false;
	const a = Buffer.from(value);
	const b = Buffer.from(token());
	return a.length === b.length && timingSafeEqual(a, b);
}

export function passwordMatches(input: string): boolean {
	const a = Buffer.from(input);
	const b = Buffer.from(APP_PASSWORD);
	return a.length === b.length && timingSafeEqual(a, b);
}

// --- admin: a separate password and cookie, so the team can make flyers without
// --- being able to replace the templates everyone depends on.

const adminToken = () =>
	createHash('sha256').update(`${ADMIN_PASSWORD}:${SESSION_SECRET}:admin`).digest('hex');

export function issueAdmin(cookies: import('@sveltejs/kit').Cookies) {
	cookies.set(ADMIN_COOKIE, adminToken(), {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: process.env.NODE_ENV === 'production',
		maxAge: 60 * 60 * 24 * 30
	});
}

export const adminConfigured = () => !!ADMIN_PASSWORD;

export function adminValid(value: string | undefined): boolean {
	if (!value || !ADMIN_PASSWORD) return false;
	const a = Buffer.from(value);
	const b = Buffer.from(adminToken());
	return a.length === b.length && timingSafeEqual(a, b);
}

export function adminPasswordMatches(input: string): boolean {
	if (!ADMIN_PASSWORD) return false;
	const a = Buffer.from(input);
	const b = Buffer.from(ADMIN_PASSWORD);
	return a.length === b.length && timingSafeEqual(a, b);
}
