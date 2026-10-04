import { fail, redirect } from '@sveltejs/kit';
import { issue, passwordMatches } from '#lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.authed) redirect(303, '/');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const password = String((await request.formData()).get('password') ?? '');
		if (!passwordMatches(password)) return fail(401, { error: 'Wrong password' });
		issue(cookies);
		redirect(303, '/');
	}
};
