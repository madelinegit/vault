import { json, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db';
import { auditLog, chatConversations, chatMessages } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const MODEL_ID = 'ModelsLab/Llama-3.1-8b-Uncensored-Dare';
const MODELSLAB_URL = 'https://modelslab.com/api/uncensored-chat/v1/chat/completions';
const IMAGE_URL = 'https://modelslab.com/api/v6/images/text2img';
const IMAGE_FETCH_URL = 'https://modelslab.com/api/v6/images/fetch';

const IMAGE_RE = /\b(generate|draw|paint|render|illustrate|create|make)\b.{0,40}\b(image|photo|picture|art|illustration|drawing|portrait|scene|wallpaper|logo|icon|sketch)\b|\b(image|photo|picture|art)\s+(of|showing|depicting|featuring)\b/i;

async function generateImage(prompt: string, apiKey: string): Promise<string> {
	const res = await fetch(IMAGE_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			key: apiKey,
			model_id: 'flux',
			prompt,
			negative_prompt: 'ugly, blurry, low quality, watermark, text',
			width: 512,
			height: 512,
			samples: 1,
			num_inference_steps: 20,
			safety_checker: 'no',
			enhance_prompt: 'yes'
		})
	});
	const data = await res.json();
	if (data.status === 'success' && data.output?.[0]) return data.output[0];
	if (data.status === 'processing' && data.id) {
		for (let i = 0; i < 12; i++) {
			await new Promise((r) => setTimeout(r, 3000));
			const poll = await fetch(`${IMAGE_FETCH_URL}/${data.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ key: apiKey })
			});
			const pd = await poll.json();
			if (pd.status === 'success' && pd.output?.[0]) return pd.output[0];
			if (pd.status === 'error') throw new Error(pd.message || 'Image generation failed');
		}
		throw new Error('Image generation timed out');
	}
	throw new Error(data.message || 'Image generation failed');
}

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

	const { message, persona = 'default', conversationId, fileName, fileContent } =
		(await request.json()) as {
			message: string;
			persona?: string;
			conversationId?: string;
			fileName?: string;
			fileContent?: string;
		};

	if (!message?.trim()) error(400, 'Empty message');
	if (message.length > 8000) error(400, 'Message too long');

	// Build user message content — append file if provided
	let fullUserContent = message.trim();
	if (fileName && fileContent) {
		const ext = fileName.split('.').pop() ?? '';
		fullUserContent += `\n\n---\nAttached file: **${fileName}**\n\`\`\`${ext}\n${fileContent}\n\`\`\``;
	}

	// Load or create conversation
	let convId = conversationId;
	if (convId) {
		const conv = await db
			.select()
			.from(chatConversations)
			.where(eq(chatConversations.id, convId))
			.limit(1);
		if (!conv[0] || conv[0].userId !== locals.user.id) error(404, 'Conversation not found');
	} else {
		const title = message.trim().slice(0, 60) + (message.trim().length > 60 ? '…' : '');
		const [newConv] = await db
			.insert(chatConversations)
			.values({ id: crypto.randomUUID(), userId: locals.user.id, title, persona })
			.returning();
		convId = newConv.id;
	}

	// Image generation path — explicit mode OR regex match
	const wantsImage = persona === 'image' || IMAGE_RE.test(message.trim());
	if (wantsImage) {
		try {
			const imageUrl = await generateImage(message.trim(), env.MODELSLAB_API_KEY);
			const reply = `[image]${imageUrl}`;
			await db.insert(chatMessages).values([
				{ id: crypto.randomUUID(), conversationId: convId, role: 'user', content: fullUserContent, createdAt: new Date() },
				{ id: crypto.randomUUID(), conversationId: convId, role: 'assistant', content: reply, createdAt: new Date(Date.now() + 1) }
			]);
			await db.update(chatConversations).set({ updatedAt: new Date() }).where(eq(chatConversations.id, convId));
			await db.insert(auditLog).values({ id: crypto.randomUUID(), userId: locals.user.id, action: 'image_generate', resourceType: 'ai' });
			return json({ reply, citations: [], conversationId: convId });
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : 'Image generation failed';
			console.error('Image generation error:', msg);
			error(502, msg);
		}
	}

	// Load message history from DB
	const history = await db
		.select()
		.from(chatMessages)
		.where(eq(chatMessages.conversationId, convId))
		.orderBy(asc(chatMessages.createdAt));

	// Tavily search
	let searchContext = '';
	let citations: Array<{ title: string; url: string }> = [];

	try {
		const tavilyRes = await fetch('https://api.tavily.com/search', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				api_key: env.TAVILY_API_KEY,
				query: message.trim(),
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
					`\n\nCurrent web search results:\n` +
					results.map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`).join('\n\n');
			}
		}
	} catch {
		// continue without search
	}

	const selectedPersona = PERSONAS[persona] ?? PERSONAS.default;
	const systemPrompt = searchContext
		? `${selectedPersona.system}\n\nWhen referencing search results cite them as [1], [2], etc.\n${searchContext}`
		: selectedPersona.system;

	const chatMessages_ = [
		{ role: 'system', content: systemPrompt },
		...history.map((m) => ({ role: m.role, content: m.content })),
		{ role: 'user', content: fullUserContent }
	];

	const res = await fetch(MODELSLAB_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${env.MODELSLAB_API_KEY}`
		},
		body: JSON.stringify({
			model: MODEL_ID,
			messages: chatMessages_,
			max_tokens: 2048,
			temperature: selectedPersona.temperature,
			top_p: 0.9
		})
	});

	if (!res.ok) {
		const body = await res.text().catch(() => '');
		console.error('ModelsLab error', res.status, body);
		error(502, 'AI service unavailable');
	}

	const data = await res.json();

	let reply = '';
	if (data.choices?.[0]?.message?.content) reply = data.choices[0].message.content;
	else if (typeof data.output === 'string') reply = data.output;
	else if (Array.isArray(data.output) && data.output.length > 0) reply = String(data.output[0]);

	if (!reply) error(502, 'Empty response from AI');

	// Save messages to DB
	await db.insert(chatMessages).values([
		{
			id: crypto.randomUUID(),
			conversationId: convId,
			role: 'user',
			content: fullUserContent,
			createdAt: new Date()
		},
		{
			id: crypto.randomUUID(),
			conversationId: convId,
			role: 'assistant',
			content: reply,
			citations: citations.length > 0 ? JSON.stringify(citations) : null,
			createdAt: new Date(Date.now() + 1)
		}
	]);

	// Update conversation timestamp
	await db
		.update(chatConversations)
		.set({ updatedAt: new Date() })
		.where(eq(chatConversations.id, convId));

	await db.insert(auditLog).values({
		id: crypto.randomUUID(),
		userId: locals.user.id,
		action: 'chat_message',
		resourceType: 'ai'
	});

	return json({ reply, citations, conversationId: convId });
};
