import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { APP_PASSWORD, S3_ACCESS_KEY, S3_SECRET_KEY, SESSION_SECRET } from '$app/env/private';
import { ADMIN_COOKIE, COOKIE, adminConfigured, adminValid, valid } from '#lib/server/auth.js';

const needsSession = (p: string) =>
	p === '/' ||
	p.startsWith('/admin') ||
	p.startsWith('/templates') ||
	p.startsWith('/flyers') ||
	p.startsWith('/api/') ||
	p.startsWith('/obj/');

// /admin and template writes need the second password on top of the session.
const needsAdmin = (p: string) =>
	(p.startsWith('/admin') && p !== '/admin/login') || p.startsWith('/api/templates');

const isApi = (p: string) => p.startsWith('/api/') || p.startsWith('/obj/');

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

	const path = event.url.pathname;
	event.locals.authed = valid(event.cookies.get(COOKIE));
	event.locals.admin = adminValid(event.cookies.get(ADMIN_COOKIE));

	if (!event.locals.authed && needsSession(path)) {
		if (isApi(path)) return new Response('unauthorized', { status: 401 });
		redirect(303, '/login');
	}

	if (needsAdmin(path)) {
		if (!adminConfigured()) {
			return new Response('Not configured: ADMIN_PASSWORD not set', { status: 500 });
		}
		if (!event.locals.admin) {
			if (isApi(path)) return new Response('forbidden', { status: 403 });
			redirect(303, '/admin/login');
		}
	}

	return resolve(event);
};
