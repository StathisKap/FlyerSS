import { defineEnvVars } from '@sveltejs/kit/env';

// Nothing here may be `required`: these schemas are evaluated at build time too,
// and the build must not need production secrets. Missing values are caught on
// the first request instead — see src/hooks.server.ts.
const optional = (fallback = '') => (value: string | undefined) => value ?? fallback;

export const variables = defineEnvVars({
	APP_PASSWORD: { schema: optional(), description: 'The single shared password' },
	SESSION_SECRET: { schema: optional(), description: 'openssl rand -hex 32' },
	S3_ENDPOINT: { schema: optional('http://localhost:9000') },
	S3_ACCESS_KEY: { schema: optional() },
	S3_SECRET_KEY: { schema: optional() },
	S3_BUCKET: { schema: optional('flyerss') }
});
