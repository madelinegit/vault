import { eq, and } from 'drizzle-orm';
import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { vaultCategories, vaultItems } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	if (!locals.user) redirect(302, '/login');

	const [category] = await db
		.select()
		.from(vaultCategories)
		.where(
			and(
				eq(vaultCategories.id, params.categoryId),
				eq(vaultCategories.userId, locals.user.id)
			)
		);

	if (!category) error(404, 'Category not found');

	const items = await db
		.select()
		.from(vaultItems)
		.where(
			and(
				eq(vaultItems.categoryId, params.categoryId),
				eq(vaultItems.userId, locals.user.id)
			)
		)
		.orderBy(vaultItems.sortOrder);

	return { category, items };
};
