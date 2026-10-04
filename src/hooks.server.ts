import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { APP_PASSWORD, S3_ACCESS_KEY, S3_SECRET_KEY, SESSION_SECRET } from '$app/env/private';
import { COOKIE, valid } from '#lib/server/auth.js';

const protectedPath = (p: string) => p === '/' || p.startsWith('/api/') || p.startsWith('/obj/');

// Checked per request rather than at import time, so `npm run build` needs no secrets.
const missingEnv = () =>
	Object.entries({ APP_PASSWORD, SESSION_SECRET, S3_ACCESS_KEY, S3_SECRET_KEY })
		.filter(([, value]) => !value)
		.map(([name]) => name);

export const handle: Handle = async ({ event, resolve }) => {
	const missing = missingEnv();
	if (missing.length) {
		return new Response(`Not configured: ${missing.join(', ')} not set`, { status: 500 });
	}

	event.locals.authed = valid(event.cookies.get(COOKIE));

	if (!event.locals.authed && protectedPath(event.url.pathname)) {
		if (event.url.pathname.startsWith('/api/') || event.url.pathname.startsWith('/obj/')) {
			return new Response('unauthorized', { status: 401 });
		}
		redirect(303, '/login');
	}

	return resolve(event);
};
