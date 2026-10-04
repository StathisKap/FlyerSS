import { createHash, timingSafeEqual } from 'node:crypto';
import { APP_PASSWORD, SESSION_SECRET } from '$app/env/private';

export const COOKIE = 'fss';

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
