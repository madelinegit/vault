import { json, error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { vaultProjects } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const { categoryId, name } = await request.json();
	if (!categoryId || !name) error(400, 'Missing fields');
	const id = crypto.randomUUID();
	const sortOrder = Date.now();
	await db.insert(vaultProjects).values({ id, userId: locals.user.id, categoryId, name, sortOrder });
	return json({ id, categoryId, name, sortOrder });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const { id, name } = await request.json();
	if (!id || !name) error(400, 'Missing fields');
	await db
		.update(vaultProjects)
		.set({ name })
		.where(and(eq(vaultProjects.id, id), eq(vaultProjects.userId, locals.user.id)));
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const id = url.searchParams.get('id');
	if (!id) error(400, 'Missing id');
	await db.delete(vaultProjects).where(and(eq(vaultProjects.id, id), eq(vaultProjects.userId, locals.user.id)));
	return json({ ok: true });
};
