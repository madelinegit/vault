<script lang="ts">
	import { vaultStore } from '$lib/stores/vault';
	import { decryptData } from '$lib/crypto';
	import type { DecryptedItem, VaultField } from '$lib/stores/vault';

	let { onClose }: { onClose: () => void } = $props();

	let query = $state('');
	let loading = $state(false);
	let results = $state<DecryptedItem[]>([]);
	let searched = $state(false);
	let errorMsg = $state('');

	async function search() {
		if (!query.trim() || !$vaultStore.key) return;
		loading = true;
		searched = false;
		errorMsg = '';

		try {
			// Gather all encrypted items from the current page — we need to build
			// an index of names/categories without sending sensitive values to the server.
			// This uses the SvelteKit page data loaded by the (vault) pages.
			const pageData = (window as unknown as { __SVELTE_KIT_PAGE_DATA__?: unknown }).__SVELTE_KIT_PAGE_DATA__;

			// Fallback: fetch category list and items from a lightweight index endpoint
			const indexRes = await fetch('/api/ai/index');
			if (!indexRes.ok) throw new Error('Could not load vault index');
			const index: Array<{ id: string; name: string; category: string; encryptedData: string; iv: string }> = await indexRes.json();

			// Send ONLY names + categories to the AI — never encrypted data or values
			const aiRes = await fetch('/api/ai', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: query.trim(),
					items: index.map((i) => ({ id: i.id, name: i.name, category: i.category }))
				})
			});

			const { matchedIds } = await aiRes.json();

			// Decrypt only the matched items client-side
			const matched = index.filter((i) => matchedIds.includes(i.id));
			const decrypted = await Promise.all(
				matched.map(async (item) => {
					const fields = (await decryptData(item.encryptedData, item.iv, $vaultStore.key!)) as VaultField[];
					return { id: item.id, categoryId: '', name: item.name, fields, sortOrder: 0 };
				})
			);

			results = decrypted;
			searched = true;
		} catch (e) {
			errorMsg = 'Search failed. Make sure ANTHROPIC_API_KEY is set.';
		} finally {
			loading = false;
		}
	}

	let copied = $state<string | null>(null);
	async function copyValue(val: string, key: string) {
		await navigator.clipboard.writeText(val);
		copied = key;
		setTimeout(() => (copied = null), 1500);
	}
</script>

<!-- Backdrop -->
<button
	class="fixed inset-0 z-40"
	onclick={onClose}
	aria-label="Close AI assistant"
	style="background: rgba(13,7,32,0.6); backdrop-filter: blur(4px); border: none; cursor: default;"
></button>

<!-- Panel -->
<div
	class="fixed right-0 top-0 h-full w-full max-w-md glass-strong z-50 flex flex-col"
	style="border-left: 1px solid rgba(212,184,224,0.18); box-shadow: -8px 0 40px rgba(0,0,0,0.4);"
>
	<!-- Header -->
	<div class="flex items-center justify-between px-6 py-4" style="border-bottom: 1px solid rgba(212,184,224,0.1);">
		<div>
			<h2 class="font-bold text-lilac flex items-center gap-2">
				<span style="color: #99E5EA;">✦</span> AI Assistant
			</h2>
			<p class="text-xs text-muted mt-0.5">Sensitive values are never sent to AI</p>
		</div>
		<button onclick={onClose} class="btn-ghost w-8 h-8 rounded-lg flex items-center justify-center text-sm">✕</button>
	</div>

	<!-- Search -->
	<div class="px-6 py-4" style="border-bottom: 1px solid rgba(212,184,224,0.1);">
		<div class="flex gap-2">
			<input
				type="text"
				bind:value={query}
				placeholder="Ask anything… 'Netflix login', 'Chase card'"
				class="input-glass flex-1 px-4 py-2.5 rounded-xl text-sm"
				onkeydown={(e) => e.key === 'Enter' && search()}
				autofocus
			/>
			<button onclick={search} disabled={loading} class="btn-primary px-4 py-2.5 rounded-xl text-sm">
				{loading ? '…' : '→'}
			</button>
		</div>
	</div>

	<!-- Results -->
	<div class="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
		{#if errorMsg}
			<p class="text-sm" style="color: #FCA5A5;">{errorMsg}</p>
		{:else if loading}
			<div class="text-center py-12 text-muted text-sm">Searching…</div>
		{:else if searched && results.length === 0}
			<div class="text-center py-12 text-muted text-sm">No matching items found.</div>
		{:else if results.length > 0}
			{#each results as item (item.id)}
				<div class="glass rounded-xl p-4 flex flex-col gap-2">
					<p class="font-semibold text-sm text-lilac">{item.name}</p>
					{#each item.fields as field}
						<div class="flex items-center gap-2">
							<span class="text-xs text-muted w-20 shrink-0 truncate">{field.label || field.type}</span>
							<span class="flex-1 text-xs font-mono truncate"
								class:text-muted={field.type === 'password'}>
								{field.type === 'password' ? '••••••••' : field.value || '—'}
							</span>
							{#if field.value}
								<button
									onclick={() => copyValue(field.value, item.id + field.id)}
									class="text-xs px-2 py-0.5 rounded transition-all"
									style={copied === item.id + field.id
										? 'background: rgba(153,229,234,0.2); color: #99E5EA;'
										: 'background: rgba(212,184,224,0.1); color: rgba(212,184,224,0.6);'}
								>
									{copied === item.id + field.id ? '✓' : 'copy'}
								</button>
							{/if}
						</div>
					{/each}
				</div>
			{/each}
		{:else}
			<div class="text-center py-12 text-muted text-sm">
				<p class="text-2xl mb-3">✦</p>
				<p>Type a query and press Enter or →</p>
				<p class="mt-2 text-xs opacity-60">e.g. "Netflix password", "Chase card number", "doctor info"</p>
			</div>
		{/if}
	</div>
</div>
