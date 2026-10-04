import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},

			// CSRF off: the app is reached over http through port-forwards and proxies that do
			// not always set x-forwarded-proto, and adapter-node assumes https, so the origin
			// check rejects the login form. Internal tool behind a shared password.
			csrf: { trustedOrigins: ['*'] },

			adapter: adapter()
		})
	]
});
