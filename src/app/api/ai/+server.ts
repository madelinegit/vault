import { json, error } from '@sveltejs/kit';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
	if (!locals.user) error(401, 'Unauthorized');
	const { query, items } = await request.json() as { query: string; items: Array<{ id: string; name: string; category: string }> };
	if (!query?.trim() || !Array.isArray(items)) error(400, 'Invalid request');

	const itemsList = items.map((i) => `ID: ${i.id} | Name: ${i.name} | Category: ${i.category}`).join('\n');

	const message = await client.messages.create({
		model: 'claude-haiku-4-5-20251001',
		max_tokens: 256,
		system: 'You are a vault search assistant. Given vault items (ID, name, category), return a JSON array of IDs matching the query. Return ONLY the JSON array.',
		messages: [{ role: 'user', content: `Items:\n${itemsList}\n\nQuery: "${query}"\n\nMatching IDs:` }]
	});

	await db.insert(auditLog).values({ id: crypto.randomUUID(), userId: locals.user.id, action: 'ai_query', resourceType: 'ai' });

	const content = message.content[0];
	if (content.type !== 'text') return json({ matchedIds: [] });
	try {
		const matchedIds = JSON.parse(content.text.trim());
		return json({ matchedIds: Array.isArray(matchedIds) ? matchedIds : [] });
	} catch {
		return json({ matchedIds: [] });
	}
};
