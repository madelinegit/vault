import { json, error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { vaultItems, vaultCategories, vaultProjects } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const rows = await db
		.select({
			id: vaultItems.id,
			name: vaultItems.name,
			categoryId: vaultItems.categoryId,
			projectId: vaultItems.projectId,
			encryptedData: vaultItems.encryptedData,
			iv: vaultItems.iv,
			categoryName: vaultCategories.name,
			projectName: vaultProjects.name
		})
		.from(vaultItems)
		.innerJoin(vaultCategories, eq(vaultItems.categoryId, vaultCategories.id))
		.leftJoin(vaultProjects, eq(vaultItems.projectId, vaultProjects.id))
		.where(eq(vaultItems.userId, locals.user.id));
	return json(rows.map((r) => ({
		id: r.id,
		name: r.name,
		category: r.projectName ? `${r.categoryName} › ${r.projectName}` : r.categoryName,
		categoryId: r.categoryId,
		projectId: r.projectId ?? null,
		encryptedData: r.encryptedData,
		iv: r.iv
	})));
};
