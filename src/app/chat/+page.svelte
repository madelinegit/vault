<script lang="ts">
	import { tick } from 'svelte';

	interface Message {
		role: 'user' | 'assistant';
		content: string;
	}

	let messages = $state<Message[]>([]);
	let input = $state('');
	let loading = $state(false);
	let error = $state('');
	let messagesEl = $state<HTMLDivElement | null>(null);

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
				body: JSON.stringify({ messages: messages.map((m) => ({ role: m.role, content: m.content })) })
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || `Error ${res.status}`);
			}

			const { reply } = await res.json();
			messages = [...messages, { role: 'assistant', content: reply }];
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
		if (messagesEl) {
			messagesEl.scrollTop = messagesEl.scrollHeight;
		}
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
			.replace(/`([^`]+)`/g, '<code>$1</code>')
			.replace(/\n/g, '<br>');
	}
</script>

<div class="flex flex-col" style="height: calc(100vh - 65px); margin: -2rem -1.5rem;">
	<!-- Header -->
	<div class="flex items-center justify-between px-6 py-4 shrink-0" style="border-bottom: 1px solid rgba(212,184,224,0.1);">
		<div>
			<h1 class="text-xl font-bold gradient-text">AI Chat</h1>
			<p class="text-xs text-muted mt-0.5">Powered by Llama 3 70B via ModelsLab</p>
		</div>
		{#if messages.length > 0}
			<button
				onclick={clearChat}
				class="text-xs px-3 py-1.5 rounded-lg btn-ghost"
				style="color: rgba(237,225,245,0.4);"
			>Clear</button>
		{/if}
	</div>

	<!-- Messages -->
	<div
		bind:this={messagesEl}
		class="flex-1 overflow-y-auto px-4 py-6"
		style="max-width: 820px; width: 100%; margin: 0 auto;"
	>
		{#if messages.length === 0}
			<div class="flex flex-col items-center justify-center h-full gap-4 text-center">
				<div class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
					style="background: rgba(123,47,190,0.2); border: 1px solid rgba(212,184,224,0.15);">
					✦
				</div>
				<div>
					<p class="text-lilac font-semibold text-lg">How can I help?</p>
					<p class="text-muted text-sm mt-1">Ask me anything — I'm here to think with you.</p>
				</div>
				<div class="flex flex-wrap gap-2 justify-center mt-2">
					{#each ['Explain something to me', 'Help me draft a message', 'Summarize this text', 'Write some code'] as suggestion}
						<button
							onclick={() => { input = suggestion; }}
							class="text-xs px-3 py-2 rounded-xl btn-ghost"
							style="color: rgba(212,184,224,0.6);"
						>{suggestion}</button>
					{/each}
				</div>
			</div>
		{/if}

		{#each messages as msg (msg)}
			<div class="mb-4 flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
				{#if msg.role === 'assistant'}
					<div class="flex gap-3 max-w-[85%]">
						<div class="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs mt-0.5"
							style="background: rgba(123,47,190,0.3); border: 1px solid rgba(212,184,224,0.2); color: #D4B8E0;">
							✦
						</div>
						<div class="glass rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed"
							style="color: #EDE1F5;">
							<!-- eslint-disable-next-line svelte/no-at-html-tags -->
							{@html renderContent(msg.content)}
						</div>
					</div>
				{:else}
					<div
						class="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
						style="background: linear-gradient(135deg, #5B21B6, #7B2FBE); color: white; box-shadow: 0 2px 16px rgba(123,47,190,0.35);"
					>
						{msg.content}
					</div>
				{/if}
			</div>
		{/each}

		{#if loading}
			<div class="mb-4 flex justify-start">
				<div class="flex gap-3 max-w-[85%]">
					<div class="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-xs mt-0.5"
						style="background: rgba(123,47,190,0.3); border: 1px solid rgba(212,184,224,0.2); color: #D4B8E0;">
						✦
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
	<div class="shrink-0 px-4 pb-4 pt-2" style="border-top: 1px solid rgba(212,184,224,0.1); max-width: 820px; width: 100%; margin: 0 auto;">
		<div class="flex gap-3 items-end glass rounded-2xl px-4 py-3">
			<textarea
				bind:value={input}
				onkeydown={handleKeydown}
				placeholder="Message… (Enter to send, Shift+Enter for new line)"
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
		<p class="text-center text-xs mt-2" style="color: rgba(237,225,245,0.2);">
			Conversation is not stored — it clears when you leave this page
		</p>
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
