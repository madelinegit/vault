import { json, error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { vaultCategories } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const { name, icon = '📁' } = await request.json();
	if (!name?.trim()) error(400, 'Name is required');
	const existing = await db.select({ id: vaultCategories.id }).from(vaultCategories).where(eq(vaultCategories.userId, locals.user.id));
	const [cat] = await db.insert(vaultCategories).values({ id: crypto.randomUUID(), userId: locals.user.id, name: name.trim(), icon, sortOrder: existing.length }).returning();
	return json(cat);
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const id = url.searchParams.get('id');
	if (!id) error(400, 'Missing id');
	await db.delete(vaultCategories).where(and(eq(vaultCategories.id, id), eq(vaultCategories.userId, locals.user.id)));
	return json({ ok: true });
};
