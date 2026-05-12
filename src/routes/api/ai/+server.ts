import { json, error } from '@sveltejs/kit';
import Anthropic from '@anthropic-ai/sdk';
import { ANTHROPIC_API_KEY } from '$env/static/private';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const body = await request.json();
	const { query, items } = body as {
		query: string;
		items: Array<{ id: string; name: string; category: string }>;
	};

	if (!query?.trim() || !Array.isArray(items)) error(400, 'Invalid request');

	// Only item names and categories are sent to the AI — never sensitive values.
	const itemsList = items
		.map((i) => `ID: ${i.id} | Name: ${i.name} | Category: ${i.category}`)
		.join('\n');

	const message = await client.messages.create({
		model: 'claude-haiku-4-5-20251001',
		max_tokens: 256,
		system:
			'You are a vault search assistant. Given a list of vault items, return a JSON array of IDs that best match the user query. Return ONLY the JSON array, nothing else. If nothing matches, return [].',
		messages: [
			{
				role: 'user',
				content: `Items:\n${itemsList}\n\nQuery: "${query}"\n\nReturn matching IDs as JSON array:`
			}
		]
	});

	await db.insert(auditLog).values({
		id: crypto.randomUUID(),
		userId: locals.user.id,
		action: 'ai_query',
		resourceType: 'ai'
	});

	const content = message.content[0];
	if (content.type !== 'text') return json({ matchedIds: [] });

	try {
		const matchedIds = JSON.parse(content.text.trim());
		return json({ matchedIds: Array.isArray(matchedIds) ? matchedIds : [] });
	} catch {
		return json({ matchedIds: [] });
	}
};
