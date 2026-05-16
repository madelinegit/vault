import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { chatConversations } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const convs = await db
		.select()
		.from(chatConversations)
		.where(eq(chatConversations.userId, locals.user.id))
		.orderBy(desc(chatConversations.updatedAt));

	return json(convs);
};
