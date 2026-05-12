import { json, error } from '@sveltejs/kit';
import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { vaultItems, auditLog } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const { categoryId, name, encryptedData, iv } = await request.json();
	if (!categoryId || !name || !encryptedData || !iv) error(400, 'Missing required fields');
	const id = crypto.randomUUID();
	await db.insert(vaultItems).values({ id, userId: locals.user.id, categoryId, name, encryptedData, iv, sortOrder: Date.now() });
	await db.insert(auditLog).values({ id: crypto.randomUUID(), userId: locals.user.id, action: 'create_item', resourceType: 'vault_item', resourceId: id });
	return json({ id, sortOrder: Date.now() });
};

export const PUT: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const { id, name, encryptedData, iv } = await request.json();
	if (!id || !name || !encryptedData || !iv) error(400, 'Missing required fields');
	await db.update(vaultItems).set({ name, encryptedData, iv, updatedAt: new Date() }).where(and(eq(vaultItems.id, id), eq(vaultItems.userId, locals.user.id)));
	await db.insert(auditLog).values({ id: crypto.randomUUID(), userId: locals.user.id, action: 'update_item', resourceType: 'vault_item', resourceId: id });
	return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');
	const id = url.searchParams.get('id');
	if (!id) error(400, 'Missing id');
	await db.delete(vaultItems).where(and(eq(vaultItems.id, id), eq(vaultItems.userId, locals.user.id)));
	await db.insert(auditLog).values({ id: crypto.randomUUID(), userId: locals.user.id, action: 'delete_item', resourceType: 'vault_item', resourceId: id });
	return json({ ok: true });
};
