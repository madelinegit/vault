import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

const MODEL_ID = 'llama3-70b-8192';
const MAX_TOKENS = 2048;

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const { messages } = (await request.json()) as {
		messages: Array<{ role: string; content: string }>;
	};
	if (!Array.isArray(messages) || messages.length === 0) error(400, 'Invalid request');

	const lastMessage = messages[messages.length - 1];
	if (!lastMessage?.content?.trim()) error(400, 'Empty message');
	if (lastMessage.content.length > 8000) error(400, 'Message too long');

	const res = await fetch('https://modelslab.com/api/v6/llm/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			key: env.MODELSLAB_API_KEY,
			model_id: MODEL_ID,
			messages,
			max_new_tokens: MAX_TOKENS,
			temperature: 0.7,
			top_p: 0.9,
			system_prompt:
				'You are a helpful, intelligent assistant. Be clear, concise, and thoughtful. Format responses with markdown when it helps readability.'
		})
	});

	if (!res.ok) {
		const body = await res.text().catch(() => '');
		console.error('ModelsLab error', res.status, body);
		error(502, 'AI service unavailable');
	}

	const data = await res.json();

	let reply = '';
	if (typeof data.output === 'string') {
		reply = data.output;
	} else if (Array.isArray(data.output) && data.output.length > 0) {
		reply = String(data.output[0]);
	} else if (data.choices?.[0]?.message?.content) {
		reply = data.choices[0].message.content;
	} else if (data.message) {
		reply = String(data.message);
	}

	if (!reply) error(502, 'Empty response from AI');

	await db.insert(auditLog).values({
		id: crypto.randomUUID(),
		userId: locals.user.id,
		action: 'chat_message',
		resourceType: 'ai'
	});

	return json({ reply });
};
