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
			const indexRes = await fetch('/api/ai/index');
			if (!indexRes.ok) throw new Error('Could not load vault index');
			const index: Array<{ id: string; name: string; category: string; encryptedData: string; iv: string }> = await indexRes.json();

			const aiRes = await fetch('/api/ai', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: query.trim(),
					items: index.map((i) => ({ id: i.id, name: i.name, category: i.category }))
				})
			});

			const { matchedIds } = await aiRes.json();
			const matched = index.filter((i) => matchedIds.includes(i.id));
			const decrypted = await Promise.all(
				matched.map(async (item) => {
					const fields = (await decryptData(item.encryptedData, item.iv, $vaultStore.key!)) as VaultField[];
					return { id: item.id, categoryId: '', projectId: null, name: item.name, fields, sortOrder: 0 };
				})
			);

			results = decrypted;
			searched = true;
		} catch {
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
	style="background: rgba(8,4,20,0.7); backdrop-filter: blur(6px); border: none; cursor: default;"
></button>

<!-- Panel -->
<div
	class="fixed right-0 top-0 h-full w-full max-w-sm z-50 flex flex-col"
	style="background: linear-gradient(180deg, rgba(28,14,60,0.97) 0%, rgba(18,9,40,0.97) 100%); border-left: 1px solid rgba(212,184,224,0.15); box-shadow: -12px 0 60px rgba(0,0,0,0.6);"
>
	<!-- Header -->
	<div class="px-6 pt-6 pb-5" style="border-bottom: 1px solid rgba(212,184,224,0.1);">
		<div class="flex items-start justify-between">
			<div>
				<h2 class="font-bold text-base flex items-center gap-2.5" style="color: #EDE1F5;">
					<span class="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
						style="background: linear-gradient(135deg, rgba(153,229,234,0.2), rgba(123,47,190,0.3)); border: 1px solid rgba(153,229,234,0.25);">✦</span>
					AI Assistant
				</h2>
				<p class="text-xs mt-2" style="color: rgba(153,229,234,0.7);">Sensitive values are never sent to AI</p>
			</div>
			<button onclick={onClose}
				class="w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all"
				style="background: rgba(212,184,224,0.08); border: 1px solid rgba(212,184,224,0.15); color: rgba(212,184,224,0.6);"
				onmouseenter={(e) => (e.currentTarget.style.background = 'rgba(212,184,224,0.15)')}
				onmouseleave={(e) => (e.currentTarget.style.background = 'rgba(212,184,224,0.08)')}
			>✕</button>
		</div>

		<!-- Search -->
		<div class="flex gap-2 mt-5">
			<input
				type="text"
				bind:value={query}
				placeholder="Ask anything… 'Netflix login'"
				class="input-glass flex-1 px-4 py-3 rounded-xl text-sm"
				onkeydown={(e) => e.key === 'Enter' && search()}
				autofocus
			/>
			<button onclick={search} disabled={loading}
				class="btn-primary px-4 rounded-xl text-sm font-bold"
				style="min-width: 44px;"
			>
				{loading ? '⋯' : '→'}
			</button>
		</div>
	</div>

	<!-- Results -->
	<div class="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-3">
		{#if errorMsg}
			<div class="rounded-xl px-4 py-3 text-sm" style="background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.2); color: #FCA5A5;">{errorMsg}</div>
		{:else if loading}
			<div class="flex flex-col items-center justify-center py-16 gap-4">
				<div class="text-3xl animate-spin" style="animation: spin 1.5s linear infinite;">✦</div>
				<p class="text-sm text-muted">Searching your vault…</p>
			</div>
		{:else if searched && results.length === 0}
			<div class="text-center py-16">
				<p class="text-3xl mb-3 opacity-30">✦</p>
				<p class="text-sm text-muted">No matching items found.</p>
			</div>
		{:else if results.length > 0}
			<p class="text-xs text-muted px-1 mb-1">{results.length} result{results.length !== 1 ? 's' : ''}</p>
			{#each results as item (item.id)}
				<div class="rounded-xl p-4 flex flex-col gap-2.5"
					style="background: rgba(212,184,224,0.05); border: 1px solid rgba(212,184,224,0.12);">
					<p class="font-semibold text-sm" style="color: #D4B8E0;">{item.name}</p>
					{#each item.fields as field}
						{#if field.type !== 'image'}
							<div class="flex items-center gap-2">
								<span class="text-xs w-20 shrink-0 truncate capitalize" style="color: rgba(237,225,245,0.45);">{field.label || field.type}</span>
								<span class="flex-1 text-xs font-mono truncate" style="color: {field.type === 'password' ? 'rgba(237,225,245,0.35)' : 'rgba(237,225,245,0.85)'};">
									{field.type === 'password' ? '••••••••' : field.value || '—'}
								</span>
								{#if field.value}
									<button
										onclick={() => copyValue(field.value, item.id + field.id)}
										class="text-xs px-2 py-0.5 rounded-md transition-all shrink-0"
										style={copied === item.id + field.id
											? 'background: rgba(153,229,234,0.18); color: #99E5EA;'
											: 'background: rgba(212,184,224,0.08); color: rgba(212,184,224,0.5);'}
									>{copied === item.id + field.id ? '✓ copied' : 'copy'}</button>
								{/if}
							</div>
						{/if}
					{/each}
				</div>
			{/each}
		{:else}
			<div class="flex flex-col items-center justify-center h-full py-16 gap-3">
				<div class="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-2"
					style="background: linear-gradient(135deg, rgba(153,229,234,0.1), rgba(123,47,190,0.15)); border: 1px solid rgba(153,229,234,0.15);">✦</div>
				<p class="text-sm font-medium" style="color: rgba(237,225,245,0.7);">Ask about anything in your vault</p>
				<div class="flex flex-col gap-1.5 mt-2 w-full max-w-xs">
					{#each ['"Netflix password"', '"Chase card number"', '"doctor info"'] as example}
						<button
							onclick={() => { query = example.replace(/"/g, ''); search(); }}
							class="text-xs px-4 py-2 rounded-lg text-left transition-all"
							style="background: rgba(212,184,224,0.05); border: 1px solid rgba(212,184,224,0.1); color: rgba(212,184,224,0.55);"
							onmouseenter={(e) => (e.currentTarget.style.borderColor = 'rgba(212,184,224,0.22)')}
							onmouseleave={(e) => (e.currentTarget.style.borderColor = 'rgba(212,184,224,0.1)')}
						>{example}</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>
</div>

<style>
	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
