import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { auditLog } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

const MODEL_ID = 'llama3-70b-8192';

const PERSONAS: Record<string, { system: string; temperature: number }> = {
	default: {
		system: 'You are a helpful, intelligent assistant. Be clear, concise, and thoughtful. Format responses with markdown when it helps readability.',
		temperature: 0.7
	},
	conspiracy: {
		system: `You are a deeply obsessive conspiracy researcher who has spent years connecting dots that others refuse to see. You question ALL official narratives — government, corporate, scientific establishment. You treat every search result as a potential clue in a larger pattern. You speak with urgency, like someone who has finally figured it out and needs people to wake up. Use phrases like "this is bigger than people realize", "follow the money", "they don't want you to know this", "connect the dots". Cite your sources to prove this isn't just speculation.`,
		temperature: 0.88
	},
	skeptic: {
		system: `You are a hardened, ruthless skeptic. You accept nothing at face value — not official narratives, not conspiracy theories, not mainstream media, not alternative media. Every claim needs evidence. You call out logical fallacies, motivated reasoning, and confirmation bias wherever you see them. You are intellectually aggressive but fair.`,
		temperature: 0.7
	},
	devils_advocate: {
		system: `You are a professional devil's advocate. Whatever the mainstream view is, you argue the opposite seriously and convincingly. Whatever the fringe view is, you find the holes in it. You love flipping perspectives and making people question what they assumed was obvious. You are provocative, confident, and enjoy intellectual chaos.`,
		temperature: 0.82
	},
	analyst: {
		system: `You are a cold, detached intelligence analyst. No emotions, no opinions — just patterns, facts, and probabilities. You present multiple hypotheses, rank them by likelihood, and cite everything. You speak in clear structured breakdowns. If something is uncertain, you say so explicitly with a confidence percentage.`,
		temperature: 0.5
	}
};

interface TavilyResult {
	title: string;
	url: string;
	content: string;
	score: number;
}

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) error(401, 'Unauthorized');

	const { messages, persona = 'default' } = (await request.json()) as {
		messages: Array<{ role: string; content: string }>;
		persona?: string;
	};

	if (!Array.isArray(messages) || messages.length === 0) error(400, 'Invalid request');

	const lastMessage = messages[messages.length - 1];
	if (!lastMessage?.content?.trim()) error(400, 'Empty message');
	if (lastMessage.content.length > 8000) error(400, 'Message too long');

	// Tavily search
	let searchContext = '';
	let citations: Array<{ title: string; url: string }> = [];

	try {
		const tavilyRes = await fetch('https://api.tavily.com/search', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				api_key: env.TAVILY_API_KEY,
				query: lastMessage.content,
				search_depth: 'basic',
				include_answer: false,
				max_results: 6,
				include_raw_content: false
			})
		});

		if (tavilyRes.ok) {
			const tavilyData = await tavilyRes.json();
			const results: TavilyResult[] = tavilyData.results ?? [];
			citations = results.map((r) => ({ title: r.title, url: r.url }));
			if (results.length > 0) {
				searchContext =
					`\n\nCurrent web search results — use these to ground your response:\n` +
					results
						.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`)
						.join('\n\n');
			}
		}
	} catch {
		// Search failed — continue without it
	}

	const selectedPersona = PERSONAS[persona] ?? PERSONAS.default;

	const systemPrompt = searchContext
		? `${selectedPersona.system}\n\nWhen you reference information from the search results, cite them inline as [1], [2], etc.\n${searchContext}`
		: selectedPersona.system;

	const res = await fetch('https://modelslab.com/api/v6/llm/chat', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			key: env.MODELSLAB_API_KEY,
			model_id: MODEL_ID,
			messages: messages.map((m) => ({ role: m.role, content: m.content })),
			max_new_tokens: 2048,
			temperature: selectedPersona.temperature,
			top_p: 0.9,
			system_prompt: systemPrompt
		})
	});

	if (!res.ok) {
		const body = await res.text().catch(() => '');
		console.error('ModelsLab error', res.status, body);
		error(502, 'AI service unavailable');
	}

	const data = await res.json();

	let reply = '';
	if (typeof data.output === 'string') reply = data.output;
	else if (Array.isArray(data.output) && data.output.length > 0) reply = String(data.output[0]);
	else if (data.choices?.[0]?.message?.content) reply = data.choices[0].message.content;
	else if (data.message) reply = String(data.message);

	if (!reply) error(502, 'Empty response from AI');

	await db.insert(auditLog).values({
		id: crypto.randomUUID(),
		userId: locals.user.id,
		action: 'chat_message',
		resourceType: 'ai'
	});

	return json({ reply, citations });
};
