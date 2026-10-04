import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit/hooks';
import { COOKIE, valid } from '#lib/server/auth.js';

const protectedPath = (p: string) => p === '/' || p.startsWith('/api/') || p.startsWith('/obj/');

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.authed = valid(event.cookies.get(COOKIE));

	if (!event.locals.authed && protectedPath(event.url.pathname)) {
		if (event.url.pathname.startsWith('/api/') || event.url.pathname.startsWith('/obj/')) {
			return new Response('unauthorized', { status: 401 });
		}
		redirect(303, '/login');
	}

	return resolve(event);
};
