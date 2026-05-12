import { fail, redirect } from '@sveltejs/kit';
import { hash } from '@node-rs/argon2';
import { randomBytes } from 'crypto';
import { db } from '$lib/server/db';
import { users, vaultCategories } from '$lib/server/db/schema';
import { lucia } from '$lib/server/auth';
import { env } from '$env/dynamic/private';
const { SETUP_SECRET } = env;
import type { PageServerLoad, Actions } from './$types';

const DEFAULT_CATEGORIES = [
	{ name: 'Business Info', icon: '💼' },
	{ name: 'Personal Logins', icon: '🔐' },
	{ name: 'Sites In Progress', icon: '🌐' },
	{ name: 'Credit Cards', icon: '💳' },
	{ name: 'IDs & Documents', icon: '🪪' },
	{ name: 'Crypto', icon: '🪙' },
	{ name: 'Medical', icon: '🏥' }
];

export const load: PageServerLoad = async () => {
	const existing = await db.select({ id: users.id }).from(users).limit(1);
	if (existing.length > 0) redirect(302, '/login');
	return {};
};

export const actions: Actions = {
	setup: async ({ request, cookies }) => {
		const existing = await db.select({ id: users.id }).from(users).limit(1);
		if (existing.length > 0) return fail(403, { error: 'Setup already completed.' });

		const form = await request.formData();
		const secret = form.get('secret');
		const email = form.get('email');
		const password = form.get('password');
		const confirm = form.get('confirm');

		if (secret !== SETUP_SECRET) return fail(403, { error: 'Invalid setup secret.' });
		if (typeof email !== 'string' || typeof password !== 'string' || !email || !password)
			return fail(400, { error: 'Email and password are required.' });
		if (password !== confirm) return fail(400, { error: 'Passwords do not match.' });
		if (password.length < 12) return fail(400, { error: 'Password must be at least 12 characters.' });

		const hashedPassword = await hash(password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		const vaultSalt = randomBytes(32).toString('hex');
		const userId = crypto.randomUUID();

		await db.insert(users).values({ id: userId, email: email.toLowerCase(), hashedPassword, vaultSalt });
		await db.insert(vaultCategories).values(
			DEFAULT_CATEGORIES.map((cat, i) => ({
				id: crypto.randomUUID(),
				userId,
				name: cat.name,
				icon: cat.icon,
				sortOrder: i
			}))
		);

		const session = await lucia.createSession(userId, {});
		const cookie = lucia.createSessionCookie(session.id);
		cookies.set(cookie.name, cookie.value, { path: '.', ...cookie.attributes });

		return { success: true, vaultSalt };
	}
};
