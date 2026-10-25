import { fail, redirect } from '@sveltejs/kit';
import { adminPasswordMatches, issueAdmin } from '#lib/server/auth.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	if (locals.admin) redirect(303, '/admin');
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const password = String((await request.formData()).get('password') ?? '');
		if (!adminPasswordMatches(password)) return fail(401, { error: 'Wrong password' });
		issueAdmin(cookies);
		redirect(303, '/admin');
	}
};
