<script lang="ts">
	import { tick } from 'svelte';

	interface Conversation {
		id: string;
		title: string;
		persona: string;
		updatedAt: string;
	}

	interface Message {
		id?: string;
		role: 'user' | 'assistant';
		content: string;
		citations?: Array<{ title: string; url: string }>;
		imagePreview?: string;
	}

	interface Attachment {
		type: 'file' | 'image';
		name: string;
		content: string;
		preview?: string;
	}

	const PERSONAS = [
		{ id: 'default', label: 'Assistant', icon: '🤖', desc: 'Helpful & balanced' },
		{ id: 'conspiracy', label: 'Conspiracy', icon: '🕳️', desc: 'Connect the dots' },
		{ id: 'skeptic', label: 'Skeptic', icon: '🔬', desc: 'Question everything' },
		{ id: 'devils_advocate', label: "Devil's Advocate", icon: '😈', desc: 'Flip the narrative' },
		{ id: 'analyst', label: 'Analyst', icon: '📊', desc: 'Cold hard facts' }
	];

	const TEXT_EXTENSIONS = new Set([
		'txt','md','js','ts','jsx','tsx','svelte','py','rb','go','rs','java','c','cpp','h',
		'css','html','json','yaml','yml','toml','sql','sh','bash','zsh','csv','xml','env','vue'
	]);

	let conversations = $state<Conversation[]>([]);
	let activeConvId = $state<string | null>(null);
	let messages = $state<Message[]>([]);
	let input = $state('');
	let loading = $state(false);
	let errorMsg = $state('');
	let persona = $state('default');
	let sidebarOpen = $state(false);
	let attachment = $state<Attachment | null>(null);
	let messagesEl = $state<HTMLDivElement | null>(null);
	let fileInput = $state<HTMLInputElement | null>(null);
	let convLoading = $state(false);

	let currentPersona = $derived(PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0]);

	async function loadConversations() {
		const res = await fetch('/api/chat/conversations');
		if (res.ok) conversations = await res.json();
	}

	async function openConversation(id: string) {
		convLoading = true;
		activeConvId = id;
		sidebarOpen = false;
		const res = await fetch(`/api/chat/conversations/${id}`);
		if (res.ok) {
			const { conversation, messages: msgs } = await res.json();
			persona = conversation.persona;
			messages = msgs.map((m: { role: 'user' | 'assistant'; content: string; citations: string | null }) => ({
				role: m.role,
				content: m.content,
				citations: m.citations ? JSON.parse(m.citations) : []
			}));
		}
		convLoading = false;
		await tick();
		scrollToBottom();
	}

	async function deleteConversation(id: string, e: MouseEvent) {
		e.stopPropagation();
		await fetch(`/api/chat/conversations/${id}`, { method: 'DELETE' });
		conversations = conversations.filter((c) => c.id !== id);
		if (activeConvId === id) {
			activeConvId = null;
			messages = [];
		}
	}

	function newChat() {
		activeConvId = null;
		messages = [];
		errorMsg = '';
		attachment = null;
		sidebarOpen = false;
	}

	function switchPersona(id: string) {
		if (id === persona) return;
		persona = id;
		if (!activeConvId) messages = [];
		errorMsg = '';
	}

	async function send() {
		const text = input.trim();
		if ((!text && !attachment) || loading) return;

		const displayContent = text || (attachment ? `[Attached: ${attachment.name}]` : '');
		const userMsg: Message = {
			role: 'user',
			content: displayContent,
			imagePreview: attachment?.type === 'image' ? attachment.preview : undefined
		};

		input = '';
		errorMsg = '';
		const att = attachment;
		attachment = null;
		messages = [...messages, userMsg];
		loading = true;

		await tick();
		scrollToBottom();

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					message: text || `[User attached an image: ${att?.name ?? 'image'}]`,
					persona,
					conversationId: activeConvId,
					fileName: att?.type === 'file' ? att.name : undefined,
					fileContent: att?.type === 'file' ? att.content : undefined
				})
			});

			if (!res.ok) {
				const err = await res.json().catch(() => ({}));
				throw new Error(err.message || `Error ${res.status}`);
			}

			const { reply, citations, conversationId } = await res.json();

			if (!activeConvId) {
				activeConvId = conversationId;
				await loadConversations();
			} else {
				await loadConversations();
			}

			messages = [...messages, { role: 'assistant', content: reply, citations: citations ?? [] }];
		} catch (e: unknown) {
			errorMsg = e instanceof Error ? e.message : 'Something went wrong';
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

	async function handleFileSelect(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		(e.target as HTMLInputElement).value = '';
		await processFile(file);
	}

	async function processFile(file: File) {
		const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
		if (file.type.startsWith('image/')) {
			const reader = new FileReader();
			reader.onload = () => {
				attachment = { type: 'image', name: file.name, content: '', preview: reader.result as string };
			};
			reader.readAsDataURL(file);
		} else if (TEXT_EXTENSIONS.has(ext)) {
			if (file.size > 100 * 1024) {
				errorMsg = 'Text file too large — max 100 KB';
				return;
			}
			const text = await file.text();
			attachment = { type: 'file', name: file.name, content: text };
		} else {
			errorMsg = `Unsupported file type .${ext} — try a text/code file or image`;
		}
	}

	async function handlePaste(e: ClipboardEvent) {
		const items = Array.from(e.clipboardData?.items ?? []);
		const imageItem = items.find((i) => i.type.startsWith('image/'));
		if (!imageItem) return;
		e.preventDefault();
		const file = imageItem.getAsFile();
		if (file) await processFile(file);
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		const file = e.dataTransfer?.files[0];
		if (file) processFile(file);
	}

	function formatDate(iso: string) {
		const d = new Date(iso);
		const now = new Date();
		const diff = now.getTime() - d.getTime();
		if (diff < 60000) return 'just now';
		if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
		if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	function renderContent(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
			.replace(/\*(.+?)\*/g, '<em>$1</em>')
			.replace(/`([^`\n]+)`/g, '<code class="inline-code">$1</code>')
			.replace(/\n/g, '<br>');
	}

	interface CodeBlock { lang: string; code: string; filename: string | null; }

	function extractCodeBlocks(text: string): CodeBlock[] {
		const blocks: CodeBlock[] = [];
		const re = /```(\w*)\n([\s\S]*?)```/g;
		let m;
		while ((m = re.exec(text)) !== null) {
			const lang = m[1] || 'txt';
			const code = m[2];
			const firstLine = code.split('\n')[0].trim();
			const filenameMatch = firstLine.match(/^(?:\/\/|#|<!--)\s*([\w.\-/]+\.\w+)/);
			blocks.push({ lang, code, filename: filenameMatch ? filenameMatch[1] : null });
		}
		return blocks;
	}

	function downloadCode(block: CodeBlock, index: number) {
		const name = block.filename ?? `code-${index + 1}.${block.lang || 'txt'}`;
		const blob = new Blob([block.code], { type: 'text/plain' });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = name;
		a.click();
		URL.revokeObjectURL(a.href);
	}

	function renderWithCodeBlocks(text: string): Array<{ type: 'text' | 'code'; content: string; block?: CodeBlock; index?: number }> {
		const parts: Array<{ type: 'text' | 'code'; content: string; block?: CodeBlock; index?: number }> = [];
		const re = /```(\w*)\n([\s\S]*?)```/g;
		let last = 0;
		let codeIndex = 0;
		let m;
		while ((m = re.exec(text)) !== null) {
			if (m.index > last) parts.push({ type: 'text', content: text.slice(last, m.index) });
			const lang = m[1] || 'txt';
			const code = m[2];
			const firstLine = code.split('\n')[0].trim();
			const filenameMatch = firstLine.match(/^(?:\/\/|#|<!--)\s*([\w.\-/]+\.\w+)/);
			parts.push({ type: 'code', content: code, block: { lang, code, filename: filenameMatch?.[1] ?? null }, index: codeIndex++ });
			last = m.index + m[0].length;
		}
		if (last < text.length) parts.push({ type: 'text', content: text.slice(last) });
		return parts;
	}

	// Load conversations on mount
	$effect(() => {
		loadConversations();
	});
</script>

<div
	class="flex"
	style="height: calc(100vh - 65px); margin: -2rem -1.5rem;"
	ondragover={(e) => e.preventDefault()}
	ondrop={handleDrop}
	role="presentation"
>
	<!-- Sidebar -->
	<div
		class="sidebar flex flex-col shrink-0"
		class:sidebar-open={sidebarOpen}
		style="width: 260px; border-right: 1px solid rgba(212,184,224,0.1); background: rgba(13,7,32,0.6);"
	>
		<div class="p-3 shrink-0" style="border-bottom: 1px solid rgba(212,184,224,0.08);">
			<button onclick={newChat} class="btn-primary w-full py-2.5 rounded-xl text-sm">
				+ New Chat
			</button>
		</div>

		<div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
			{#each conversations as conv}
				<button
					onclick={() => openConversation(conv.id)}
					class="w-full text-left px-3 py-2.5 rounded-xl transition-all group"
					style={activeConvId === conv.id
						? 'background: rgba(123,47,190,0.3); border: 1px solid rgba(212,184,224,0.2);'
						: 'background: transparent; border: 1px solid transparent;'}
				>
					<div class="flex items-start justify-between gap-1">
						<div class="flex-1 min-w-0">
							<p class="text-xs font-medium truncate" style="color: {activeConvId === conv.id ? '#D4B8E0' : 'rgba(237,225,245,0.7)'};">
								{conv.title}
							</p>
							<p class="text-xs mt-0.5" style="color: rgba(237,225,245,0.25);">
								{PERSONAS.find(p => p.id === conv.persona)?.icon ?? '🤖'} {formatDate(conv.updatedAt)}
							</p>
						</div>
						<button
							onclick={(e) => deleteConversation(conv.id, e)}
							class="opacity-0 group-hover:opacity-100 text-xs px-1 shrink-0 transition-opacity"
							style="color: rgba(252,165,165,0.6);"
							aria-label="Delete"
						>✕</button>
					</div>
				</button>
			{/each}

			{#if conversations.length === 0}
				<p class="text-xs text-center mt-6" style="color: rgba(237,225,245,0.2);">No chats yet</p>
			{/if}
		</div>
	</div>

	<!-- Mobile sidebar overlay -->
	{#if sidebarOpen}
		<button
			class="fixed inset-0 z-30 md:hidden"
			style="background: rgba(0,0,0,0.5); border: none; cursor: default;"
			onclick={() => (sidebarOpen = false)}
			aria-label="Close sidebar"
		></button>
	{/if}

	<!-- Main area -->
	<div class="flex flex-col flex-1 min-w-0">

		<!-- Top bar -->
		<div class="flex items-center gap-3 px-4 py-2 shrink-0" style="border-bottom: 1px solid rgba(212,184,224,0.1);">
			<button
				onclick={() => (sidebarOpen = !sidebarOpen)}
				class="md:hidden text-sm px-2 py-1 rounded-lg btn-ghost"
				aria-label="Toggle sidebar"
			>☰</button>
			<div class="flex gap-2 overflow-x-auto flex-1" style="scrollbar-width: none;">
				{#each PERSONAS as p}
					<button
						onclick={() => switchPersona(p.id)}
						class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0"
						style={persona === p.id
							? 'background: rgba(123,47,190,0.35); border: 1px solid rgba(212,184,224,0.35); color: #D4B8E0;'
							: 'background: rgba(255,255,255,0.03); border: 1px solid rgba(212,184,224,0.1); color: rgba(237,225,245,0.4);'}
					>
						<span>{p.icon}</span>
						<span class="hidden sm:inline">{p.label}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Messages -->
		<div bind:this={messagesEl} class="flex-1 overflow-y-auto px-4 py-5 messages-area">
			{#if convLoading}
				<div class="flex items-center justify-center h-full">
					<div class="loading-spinner" style="width: 24px; height: 24px; border-width: 3px;"></div>
				</div>
			{:else if messages.length === 0}
				<div class="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
					<div class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl"
						style="background: rgba(123,47,190,0.2); border: 1px solid rgba(212,184,224,0.15);">
						{currentPersona.icon}
					</div>
					<div>
						<p class="text-lilac font-semibold text-lg">{currentPersona.label}</p>
						<p class="text-muted text-sm mt-1">{currentPersona.desc} · searches the web · paste or attach files</p>
					</div>
				</div>
			{/if}

			{#each messages as msg}
				<div class="mb-5 flex {msg.role === 'user' ? 'justify-end' : 'justify-start'}">
					{#if msg.role === 'assistant'}
						<div class="flex gap-3" style="max-width: min(88%, 680px);">
							<div class="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-sm mt-0.5"
								style="background: rgba(123,47,190,0.3); border: 1px solid rgba(212,184,224,0.2);">
								{currentPersona.icon}
							</div>
							<div class="flex flex-col gap-2 min-w-0">
								{#if msg.content.startsWith('[image]')}
								<div class="flex flex-col gap-2">
									<img
										src={msg.content.slice(7)}
										alt="Generated"
										class="rounded-2xl max-w-full object-contain"
										style="max-height: 480px; border: 1px solid rgba(212,184,224,0.15);"
									/>
									<a
										href={msg.content.slice(7)}
										download="generated.png"
										target="_blank"
										rel="noopener noreferrer"
										class="text-xs px-3 py-1.5 rounded-xl self-start no-underline"
										style="background: rgba(212,184,224,0.08); border: 1px solid rgba(212,184,224,0.15); color: rgba(212,184,224,0.6);"
									>⬇ Save image</a>
								</div>
							{:else}
								<div class="glass rounded-2xl rounded-tl-sm px-4 py-3 text-sm leading-relaxed min-w-0">
									{#each renderWithCodeBlocks(msg.content) as part, i}
										{#if part.type === 'text'}
											<!-- eslint-disable-next-line svelte/no-at-html-tags -->
											<span>{@html renderContent(part.content)}</span>
										{:else if part.block}
											<div class="my-2 rounded-xl overflow-hidden" style="border: 1px solid rgba(212,184,224,0.15);">
												<div class="flex items-center justify-between px-3 py-1.5" style="background: rgba(0,0,0,0.3);">
													<span class="text-xs font-mono" style="color: rgba(153,229,234,0.7);">{part.block.filename ?? part.block.lang}</span>
													<button
														onclick={() => downloadCode(part.block!, part.index!)}
														class="text-xs px-2 py-0.5 rounded-lg transition-all"
														style="background: rgba(153,229,234,0.12); color: #99E5EA; border: 1px solid rgba(153,229,234,0.2);"
													>⬇ Download</button>
												</div>
												<pre class="text-xs px-3 py-3 overflow-x-auto" style="color: rgba(237,225,245,0.85); background: rgba(0,0,0,0.2); margin: 0;"><code>{part.block.code}</code></pre>
											</div>
										{/if}
									{/each}
								</div>
							{/if}
								{#if msg.citations && msg.citations.length > 0}
									<div class="flex flex-col gap-1 pl-1">
										<p class="text-xs" style="color: rgba(237,225,245,0.25);">Sources</p>
										{#each msg.citations as cite, i}
											<a href={cite.url} target="_blank" rel="noopener noreferrer"
												class="flex items-center gap-1.5 text-xs no-underline hover:opacity-80 transition-opacity"
												style="color: rgba(153,229,234,0.6);">
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
						<div class="flex flex-col gap-2 items-end" style="max-width: min(88%, 680px);">
							{#if msg.imagePreview}
								<img src={msg.imagePreview} alt="attachment" class="rounded-xl max-h-48 max-w-full object-contain" style="border: 1px solid rgba(212,184,224,0.2);" />
							{/if}
							{#if msg.content && msg.content !== `[Attached: ${msg.imagePreview ? '' : ''}]`}
								<div class="rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed"
									style="background: linear-gradient(135deg, #5B21B6, #7B2FBE); color: white; box-shadow: 0 2px 16px rgba(123,47,190,0.35);">
									{msg.content}
								</div>
							{/if}
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

			{#if errorMsg}
				<div class="mb-4 mx-auto max-w-md text-center text-xs px-4 py-2 rounded-xl"
					style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #FCA5A5;">
					{errorMsg}
				</div>
			{/if}
		</div>

		<!-- Attachment preview -->
		{#if attachment}
			<div class="px-4 pt-2 shrink-0">
				<div class="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs"
					style="background: rgba(123,47,190,0.2); border: 1px solid rgba(212,184,224,0.2); color: #D4B8E0; max-width: 100%;">
					{#if attachment.type === 'image' && attachment.preview}
						<img src={attachment.preview} alt="preview" class="w-8 h-8 rounded-lg object-cover" />
					{:else}
						<span>📎</span>
					{/if}
					<span class="truncate max-w-48">{attachment.name}</span>
					<button onclick={() => (attachment = null)} class="shrink-0 opacity-60 hover:opacity-100">✕</button>
				</div>
			</div>
		{/if}

		<!-- Input -->
		<div class="shrink-0 px-4 pb-4 pt-2" style="border-top: 1px solid rgba(212,184,224,0.08);">
			<div class="flex gap-2 items-end glass rounded-2xl px-3 py-3">
				<!-- File attach button -->
				<button
					onclick={() => fileInput?.click()}
					class="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all self-end mb-0.5"
					style="background: rgba(212,184,224,0.08); border: 1px solid rgba(212,184,224,0.12); color: rgba(212,184,224,0.5);"
					title="Attach file or image"
					disabled={loading}
				>📎</button>

				<input
					bind:this={fileInput}
					type="file"
					class="hidden"
					onchange={handleFileSelect}
					accept=".txt,.md,.js,.ts,.jsx,.tsx,.svelte,.py,.rb,.go,.rs,.java,.c,.cpp,.h,.css,.html,.json,.yaml,.yml,.toml,.sql,.sh,.csv,.xml,.vue,image/*"
				/>

				<textarea
					bind:value={input}
					onkeydown={handleKeydown}
					onpaste={handlePaste}
					placeholder="Message… paste an image, attach a file, or just type (Enter to send)"
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
					disabled={loading || (!input.trim() && !attachment)}
					class="btn-primary w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm self-end"
					style="padding: 0;"
				>
					{#if loading}
						<span class="loading-spinner"></span>
					{:else}
						↑
					{/if}
				</button>
			</div>
			<p class="text-center text-xs mt-2" style="color: rgba(237,225,245,0.15);">
				Searches the web · paste images · attach code files · chats saved automatically
			</p>
		</div>
	</div>
</div>

<style>
	.sidebar {
		transition: transform 0.2s ease;
	}
	@media (max-width: 767px) {
		.sidebar {
			position: fixed;
			top: 65px;
			left: 0;
			bottom: 0;
			z-index: 40;
			transform: translateX(-100%);
		}
		.sidebar.sidebar-open {
			transform: translateX(0);
		}
	}
	.messages-area {
		max-width: 820px;
		width: 100%;
		margin: 0 auto;
	}
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
	:global(.inline-code) {
		background: rgba(212,184,224,0.1);
		padding: 1px 5px;
		border-radius: 4px;
		font-size: 0.85em;
		font-family: monospace;
	}
</style>
