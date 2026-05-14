import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { lucia } from '$lib/server/auth';
import { client } from '$lib/server/db';

async function runMigrations() {
	await client`
		CREATE TABLE IF NOT EXISTS vault_projects (
			id text PRIMARY KEY NOT NULL,
			user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			category_id text NOT NULL REFERENCES vault_categories(id) ON DELETE CASCADE,
			name text NOT NULL,
			sort_order bigint NOT NULL DEFAULT 0,
			created_at timestamp DEFAULT now() NOT NULL
		)
	`;
	await client`
		ALTER TABLE vault_items ADD COLUMN IF NOT EXISTS project_id text REFERENCES vault_projects(id) ON DELETE CASCADE
	`;
	await client`ALTER TABLE vault_items ALTER COLUMN sort_order TYPE bigint`;
	console.log('[migration] vault_projects ready');
}

runMigrations().catch((e) => console.error('[migration] failed:', e));

const authHandle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get(lucia.sessionCookieName);

	if (!sessionId) {
		event.locals.user = null;
		event.locals.session = null;
		return resolve(event);
	}

	const { session, user } = await lucia.validateSession(sessionId);

	if (session?.fresh) {
		const cookie = lucia.createSessionCookie(session.id);
		event.cookies.set(cookie.name, cookie.value, { path: '.', ...cookie.attributes });
	}

	if (!session) {
		const cookie = lucia.createBlankSessionCookie();
		event.cookies.set(cookie.name, cookie.value, { path: '.', ...cookie.attributes });
	}

	event.locals.user = user;
	event.locals.session = session;
	return resolve(event);
};

const securityHandle: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	response.headers.set('X-Frame-Options', 'DENY');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
	return response;
};

export const handle = sequence(authHandle, securityHandle);
