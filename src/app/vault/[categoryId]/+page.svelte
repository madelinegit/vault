<script lang="ts">
	import { goto } from '$app/navigation';
	import { vaultStore, type DecryptedItem, type VaultField } from '$lib/stores/vault';
	import { decryptData, encryptData } from '$lib/crypto';
	import SubTile from '$lib/components/SubTile.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let decryptedItems = $state<DecryptedItem[]>([]);
	let decryptError = $state('');
	let showNew = $state(false);

	$effect(() => {
		if (!$vaultStore.locked && $vaultStore.key) {
			decryptAll($vaultStore.key);
		}
	});

	async function decryptAll(key: CryptoKey) {
		decryptError = '';
		try {
			const results = await Promise.all(
				data.items.map(async (item) => {
					const fields = (await decryptData(item.encryptedData, item.iv, key)) as VaultField[];
					return { id: item.id, categoryId: item.categoryId, name: item.name, fields, sortOrder: item.sortOrder };
				})
			);
			decryptedItems = results;
		} catch {
			decryptError = 'Wrong master password — could not decrypt items.';
		}
	}

	async function saveItem(name: string, fields: VaultField[]) {
		if (!$vaultStore.key) return;
		const { ciphertext, iv } = await encryptData(fields, $vaultStore.key);
		const res = await fetch('/api/items', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ categoryId: data.category.id, name, encryptedData: ciphertext, iv })
		});
		if (res.ok) {
			const saved = await res.json();
			decryptedItems = [...decryptedItems, { id: saved.id, categoryId: data.category.id, name, fields, sortOrder: saved.sortOrder }];
			showNew = false;
		}
	}

	async function updateItem(id: string, name: string, fields: VaultField[]) {
		if (!$vaultStore.key) return;
		const { ciphertext, iv } = await encryptData(fields, $vaultStore.key);
		await fetch('/api/items', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, name, encryptedData: ciphertext, iv })
		});
		decryptedItems = decryptedItems.map((item) => (item.id === id ? { ...item, name, fields } : item));
	}

	async function deleteItem(id: string) {
		const res = await fetch(`/api/items?id=${id}`, { method: 'DELETE' });
		if (res.ok) decryptedItems = decryptedItems.filter((item) => item.id !== id);
	}
</script>

<div>
	<div class="flex items-center gap-3 mb-8">
		<button onclick={() => goto('/vault')} class="btn-ghost px-3 py-2 rounded-xl text-sm">← Back</button>
		<div>
			<h1 class="text-2xl font-bold text-lilac flex items-center gap-2">
				<span>{data.category.icon}</span>{data.category.name}
			</h1>
			<p class="text-muted text-sm mt-0.5">{decryptedItems.length} items</p>
		</div>
		<button onclick={() => (showNew = !showNew)} class="btn-primary ml-auto px-5 py-2.5 rounded-xl text-sm">+ Add Item</button>
	</div>

	{#if decryptError}
		<div class="mb-6 px-4 py-3 rounded-lg text-sm" style="background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #FCA5A5;">{decryptError}</div>
	{/if}

	{#if showNew}
		<div class="mb-6">
			<SubTile
				item={{ id: '', categoryId: data.category.id, name: '', fields: [], sortOrder: 0 }}
				editMode={true} isNew={true}
				onSave={saveItem} onCancel={() => (showNew = false)}
				onDelete={() => {}} onUpdate={() => {}}
			/>
		</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each decryptedItems as item (item.id)}
			<SubTile
				{item} editMode={false} isNew={false}
				onSave={saveItem} onDelete={() => deleteItem(item.id)}
				onUpdate={(name, fields) => updateItem(item.id, name, fields)} onCancel={() => {}}
			/>
		{/each}
	</div>

	{#if decryptedItems.length === 0 && !showNew && !decryptError}
		<div class="text-center py-20 text-muted">
			<p class="text-4xl mb-4">{data.category.icon}</p>
			<p class="text-sm">No items yet. Click <strong class="text-lilac">+ Add Item</strong> to start.</p>
		</div>
	{/if}
</div>
