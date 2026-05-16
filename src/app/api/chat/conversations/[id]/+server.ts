import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { chatConversations, chatMessages } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const conv = await db
		.select()
		.from(chatConversations)
		.where(eq(chatConversations.id, params.id))
		.limit(1);

	if (!conv[0] || conv[0].userId !== locals.user.id) error(404, 'Not found');

	const messages = await db
		.select()
		.from(chatMessages)
		.where(eq(chatMessages.conversationId, params.id))
		.orderBy(asc(chatMessages.createdAt));

	return json({ conversation: conv[0], messages });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const conv = await db
		.select()
		.from(chatConversations)
		.where(eq(chatConversations.id, params.id))
		.limit(1);

	if (!conv[0] || conv[0].userId !== locals.user.id) error(404, 'Not found');

	await db.delete(chatConversations).where(eq(chatConversations.id, params.id));

	return json({ ok: true });
};
