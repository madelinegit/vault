<script lang="ts">
	import { tick } from 'svelte';

	interface Message {
		role: 'user' | 'assistant';
		content: string;
		citations?: Array<{ title: string; url: string }>;
	}

	const PERSONAS = [
		{ id: 'default', label: 'Assistant', icon: '🤖', desc: 'Helpful & balanced' },
		{ id: 'conspiracy', label: 'Conspiracy', icon: '🕳️', desc: 'Connect the dots' },
		{ id: 'skeptic', label: 'Skeptic', icon: '🔬', desc: 'Question everything' },
		{ id: 'devils_advocate', label: "Devil's Advocate", icon: '😈', desc: 'Flip the narrative' },
		{ id: 'analyst', label: 'Analyst', icon: '📊', desc: 'Cold hard facts' }
	];

	let messages = $state<Message[]>([]);
	let input = $state('');
	let loading = $state(false);
	let error = $state('');
	let persona = $state('default');
	let messagesEl = $state<HTMLDivElement | null>(null);

	function switchPersona(id: string) {
		if (id === persona) return;
		persona = id;
		if (messages.length > 0) {
			messages = [];
			error = '';
		}
	}

	async function send() {
		const text = input.trim();
		if (!text || loading) return;

		input = '';
		error = '';
		messages = [...messages, { role: 'user', content: text }];
		loading = true;

		await tick();
		scrollToBottom();

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: messages.map((m) => ({ role: m.role, content: m.content })),
					persona
				})
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || `Error ${res.status}`);
			}

			const { reply, citations } = await res.json();
			messages = [...messages, { role: 'assistant', content: reply, citations: citations ?? [] }];
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Something went wrong';
			messages = messages.slice(0, -1);
			input = text;
		} finally {
			loading = false;
			await tick();
			scrollToBottom();
		}
	}

	function scrollToBottom() {
		if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			send();
		}
	}

	function clearChat() {
		messages = [];
		error = '';
	}

	function renderContent(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/`([^`]+)`/g, '<code style="background:rgba(212,184,224,0.1);padding:1px 5px;border-radius:4px;font-size:0.85em;">$1</code>')
			.replace(/\n/g, '<br>');
	}

	$derived: {
		const current = PERSONAS.find((p) => p.id === persona);
	}

	let currentPersona = $derived(PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0]);
</script>

<div class="flex flex-col" style="height: calc(100vh - 65px); margin: -2rem -1.5rem;">

	<!-- Persona bar -->
	<div class="shrink-0 px-4 pt-3 pb-2" style="border-bottom: 1px solid rgba(212,184,224,0.1);">
		<div class="flex gap-2 overflow-x-auto pb-1" style="scrollbar-width: none;">
			{#each PERSONAS as p}
				<button
					onclick={() => switchPersona(p.id)}
					class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0"
					style={persona === p.id
						? 'background: rgba(123,47,190,0.35); border: 1px solid rgba(212,184,224,0.35); color: #D4B8E0;'
						: 'background: rgba(255,255,255,0.03); border: 1px solid rgba(212,184,224,0.1); color: rgba(237,225,245,0.4);'}
				>
					<span>{p.icon}</span>
					<span>{p.label}</span>
				</button>
			{/each}
		</div>
	</div>

	<!-- Messages -->
	<div
		bind:this={messagesEl}
		class="flex-1 overflow-y-auto px-4 py-5"
		style="max-width: 820px; width: 100%; margin: 0 auto;"
	>
		{#if messages.length === 0}
			<div class="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
				<div class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
					style="background: rgba(123,47,190,0.2); border: 1px solid rgba(212,184,224,0.15);">
					{currentPersona.icon}
				</div>
				<div>
					<p class="text-lilac font-semibold text-lg">{currentPersona.label} mode</p>
					<p class="text-muted text-sm mt-1">{currentPersona.desc} · searches the web for every message</p>
				</div>
				{#if persona === 'conspiracy'}
					<div class="flex flex-wrap gap-2 justify-center mt-1">
						{#each ['Who really runs the world?', 'What are chemtrails actually?', 'Is the moon landing real?', 'What is the deep state?'] as s}
							<button onclick={() => { input = s; }} class="text-xs px-3 py-2 rounded-xl btn-ghost" style="color: rgba(212,184,224,0.5);">{s}</button>
						{/each}
					</div>
				{:else if persona === 'skeptic'}
					<div class="flex flex-wrap gap-2 justify-center mt-1">
						{#each ['Debunk flat earth properly', 'What evidence exists for aliens?', 'Is mainstream media trustworthy?', 'Are supplements effective?'] as s}
							<button onclick={() => { input = s; }} class="text-xs px-3 py-2 rounded-xl btn-ghost" style="color: rgba(212,184,224,0.5);">{s}</button>
						{/each}
					</div>
				{:else}
					<div class="flex flex-wrap gap-2 justify-center mt-1">
						{#each ['Explain something to me', 'Help me think through a decision', 'Research a topic', 'Write something for me'] as s}
							<button onclick={() => { input = s; }} class="text-xs px-3 py-2 rounded-xl btn-ghost" style="color: rgba(212,184,224,0.5);">{s}</button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}

		{#each messages as msg}
			<div class="mb-5 flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
				{#if msg.role === 'assistant'}
					<div class="flex gap-3 max-w-[88%]">
						<div class="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-sm mt-0.5"
							style="background: rgba(123,47,190,0.3); border: 1px solid rgba(212,184,224,0.2);">
							{currentPersona.icon}
						</div>
						<div class="flex flex-col gap-2">
							<div class="glass rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed" style="color: #EDE1F5;">
								<!-- eslint-disable-next-line svelte/no-at-html-tags -->
								{@html renderContent(msg.content)}
							</div>
							{#if msg.citations && msg.citations.length > 0}
								<div class="flex flex-col gap-1 pl-1">
									<p class="text-xs" style="color: rgba(237,225,245,0.25);">Sources</p>
									{#each msg.citations as cite, i}
										<a
											href={cite.url}
											target="_blank"
											rel="noopener noreferrer"
											class="flex items-center gap-1.5 text-xs no-underline transition-colors hover:opacity-80"
											style="color: rgba(153,229,234,0.6);"
										>
											<span style="color: rgba(237,225,245,0.3);">[{i + 1}]</span>
											<span class="truncate max-w-xs">{cite.title}</span>
											<span style="color: rgba(237,225,245,0.2);">↗</span>
										</a>
									{/each}
								</div>
							{/if}
						</div>
					</div>
				{:else}
					<div
						class="max-w-[88%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
						style="background: linear-gradient(135deg, #5B21B6, #7B2FBE); color: white; box-shadow: 0 2px 16px rgba(123,47,190,0.35);"
					>
						{msg.content}
					</div>
				{/if}
			</div>
		{/each}

		{#if loading}
			<div class="mb-5 flex justify-start">
				<div class="flex gap-3">
					<div class="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-sm mt-0.5"
						style="background: rgba(123,47,190,0.3); border: 1px solid rgba(212,184,224,0.2);">
						{currentPersona.icon}
					</div>
					<div class="glass rounded-2xl rounded-tl-sm px-4 py-3">
						<div class="flex gap-1 items-center h-5">
							<span class="typing-dot"></span>
							<span class="typing-dot" style="animation-delay: 0.15s;"></span>
							<span class="typing-dot" style="animation-delay: 0.3s;"></span>
						</div>
					</div>
				</div>
			</div>
		{/if}

		{#if error}
			<div class="mb-4 mx-auto max-w-md text-center text-xs px-4 py-2 rounded-xl"
				style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #FCA5A5;">
				{error}
			</div>
		{/if}
	</div>

	<!-- Input -->
	<div class="shrink-0 px-4 pb-4 pt-2" style="border-top: 1px solid rgba(212,184,224,0.08);">
		<div style="max-width: 820px; width: 100%; margin: 0 auto;">
			<div class="flex gap-3 items-end glass rounded-2xl px-4 py-3">
				<textarea
					bind:value={input}
					onkeydown={handleKeydown}
					placeholder="Ask anything… web search included (Enter to send)"
					rows="1"
					disabled={loading}
					class="flex-1 bg-transparent border-none outline-none text-sm resize-none leading-relaxed"
					style="color: #EDE1F5; min-height: 24px; max-height: 160px; font-family: inherit;"
					oninput={(e) => {
						const t = e.currentTarget;
						t.style.height = 'auto';
						t.style.height = Math.min(t.scrollHeight, 160) + 'px';
					}}
				></textarea>
				<button
					onclick={send}
					disabled={loading || !input.trim()}
					class="btn-primary w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm"
					style="padding: 0;"
				>
					{#if loading}
						<span class="loading-spinner"></span>
					{:else}
						↑
					{/if}
				</button>
			</div>
			<div class="flex items-center justify-between mt-2 px-1">
				<p class="text-xs" style="color: rgba(237,225,245,0.2);">
					Searches the web · conversation clears on page leave
				</p>
				{#if messages.length > 0}
					<button onclick={clearChat} class="text-xs" style="color: rgba(237,225,245,0.25);">Clear</button>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.typing-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: rgba(212, 184, 224, 0.5);
		animation: bounce 0.8s ease-in-out infinite;
	}
	@keyframes bounce {
		0%, 100% { transform: translateY(0); opacity: 0.4; }
		50% { transform: translateY(-4px); opacity: 1; }
	}
	.loading-spinner {
		width: 14px;
		height: 14px;
		border: 2px solid rgba(255,255,255,0.3);
		border-top-color: white;
		border-radius: 50%;
		animation: spin 0.6s linear infinite;
		display: inline-block;
	}
	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
