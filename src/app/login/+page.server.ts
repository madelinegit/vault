import { fail } from '@sveltejs/kit';
import { verify } from '@node-rs/argon2';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { lucia } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		return { isUnlock: true, email: locals.user.email, vaultSalt: locals.user.vaultSalt };
	}
	return { isUnlock: false, email: null, vaultSalt: null };
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const form = await request.formData();
		const email = form.get('email');
		const password = form.get('password');

		if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
			return fail(400, { error: 'Email and password are required.' });
		}

		const [user] = await db.select().from(users).where(eq(users.email, email.toLowerCase()));

		if (!user) {
			await new Promise((r) => setTimeout(r, 400));
			return fail(401, { error: 'Invalid email or password.' });
		}

		const valid = await verify(user.hashedPassword, password, {
			memoryCost: 19456,
			timeCost: 2,
			outputLen: 32,
			parallelism: 1
		});

		if (!valid) return fail(401, { error: 'Invalid email or password.' });

		const session = await lucia.createSession(user.id, {});
		const cookie = lucia.createSessionCookie(session.id);
		cookies.set(cookie.name, cookie.value, { path: '.', ...cookie.attributes });

		return { success: true, vaultSalt: user.vaultSalt };
	}
};
