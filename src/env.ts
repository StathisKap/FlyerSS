import { defineEnvVars } from '@sveltejs/kit/env';

const required = (name: string) => (value: string | undefined) => {
	if (!value) throw new Error(`${name} is not set`);
	return value;
};

export const variables = defineEnvVars({
	APP_PASSWORD: { schema: required('APP_PASSWORD'), description: 'The single shared password' },
	SESSION_SECRET: { schema: required('SESSION_SECRET'), description: 'openssl rand -hex 32' },
	S3_ENDPOINT: { schema: (v) => v ?? 'http://localhost:9000' },
	S3_ACCESS_KEY: { schema: required('S3_ACCESS_KEY') },
	S3_SECRET_KEY: { schema: required('S3_SECRET_KEY') },
	S3_BUCKET: { schema: (v) => v ?? 'flyerss' }
});
