import { redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { vaultCategories } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) redirect(302, '/login');

	const categories = await db
		.select()
		.from(vaultCategories)
		.where(eq(vaultCategories.userId, locals.user.id))
		.orderBy(vaultCategories.sortOrder);

	return { categories };
};
