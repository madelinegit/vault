<script lang="ts">
	import { goto } from '$app/navigation';
	import { vaultStore, type DecryptedItem, type VaultField } from '$lib/stores/vault';
	import { decryptData, encryptData } from '$lib/crypto';
	import { toastStore } from '$lib/stores/toast';
	import SubTile from '$lib/components/SubTile.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let decryptedItems = $state<DecryptedItem[]>([]);
	let decryptError = $state('');
	let decrypting = $state(false);
	let showNew = $state(false);

	$effect(() => {
		if (!$vaultStore.locked && $vaultStore.key) {
			decryptAll($vaultStore.key);
		}
	});

	async function decryptAll(key: CryptoKey) {
		decryptError = '';
		decrypting = true;
		try {
			const results = await Promise.all(
				data.items.map(async (item) => {
					const fields = (await decryptData(item.encryptedData, item.iv, key)) as VaultField[];
					return {
						id: item.id,
						categoryId: item.categoryId,
						projectId: item.projectId ?? null,
						name: item.name,
						fields,
						sortOrder: item.sortOrder,
						createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : String(item.createdAt),
						updatedAt: item.updatedAt instanceof Date ? item.updatedAt.toISOString() : String(item.updatedAt)
					};
				})
			);
			decryptedItems = results;
		} catch {
			decryptError = 'Wrong master password — could not decrypt items.';
		} finally {
			decrypting = false;
		}
	}

	async function saveItem(name: string, fields: VaultField[]) {
		if (!$vaultStore.key) {
			toastStore.show('Vault is locked — please log in again', 'error');
			goto('/login');
			return;
		}
		try {
			const { ciphertext, iv } = await encryptData(fields, $vaultStore.key);
			const body = JSON.stringify({
				categoryId: data.category.id,
				projectId: data.project.id,
				name,
				encryptedData: ciphertext,
				iv
			});
			const res = await fetch('/api/items', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body
			});
			if (res.ok) {
				const saved = await res.json();
				decryptedItems = [
					...decryptedItems,
					{ id: saved.id, categoryId: data.category.id, projectId: data.project.id, name, fields, sortOrder: saved.sortOrder, createdAt: saved.createdAt, updatedAt: saved.updatedAt }
				];
				showNew = false;
				toastStore.show('Item saved');
			} else if (res.status === 413) {
				toastStore.show('File too large — reduce file size and try again', 'error');
			} else {
				toastStore.show('Failed to save item', 'error');
			}
		} catch (e) {
			toastStore.show('Save failed — file may be too large', 'error');
		}
	}

	async function updateItem(id: string, name: string, fields: VaultField[]) {
		if (!$vaultStore.key) {
			toastStore.show('Vault is locked — please log in again', 'error');
			goto('/login');
			return;
		}
		try {
			const { ciphertext, iv } = await encryptData(fields, $vaultStore.key);
			const res = await fetch('/api/items', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ id, name, encryptedData: ciphertext, iv })
			});
			if (res.ok) {
				decryptedItems = decryptedItems.map((item) => (item.id === id ? { ...item, name, fields } : item));
				toastStore.show('Item updated');
			} else if (res.status === 413) {
				toastStore.show('File too large — reduce file size and try again', 'error');
			} else {
				toastStore.show('Failed to update item', 'error');
			}
		} catch (e) {
			toastStore.show('Save failed — file may be too large', 'error');
		}
	}

	async function deleteItem(id: string) {
		const res = await fetch(`/api/items?id=${id}`, { method: 'DELETE' });
		if (res.ok) {
			decryptedItems = decryptedItems.filter((item) => item.id !== id);
			toastStore.show('Item deleted');
		} else {
			toastStore.show('Failed to delete item', 'error');
		}
	}
</script>

<div>
	<!-- Breadcrumb -->
	<nav class="flex items-center gap-2 mb-6 text-xs" style="color: rgba(237,225,245,0.4);">
		<button onclick={() => goto('/vault')} class="hover:text-lilac transition-colors">Your Vault</button>
		<span>›</span>
		<button onclick={() => goto(`/vault/${data.category.id}`)} class="hover:text-lilac transition-colors">{data.category.icon} {data.category.name}</button>
		<span>›</span>
		<span style="color: rgba(212,184,224,0.85);">{data.project.name}</span>
	</nav>

	<div class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-2xl font-bold text-lilac">{data.project.name}</h1>
			<p class="text-muted text-sm mt-0.5">{decryptedItems.length} {decryptedItems.length === 1 ? 'item' : 'items'}</p>
		</div>
		<button onclick={() => (showNew = !showNew)} class="btn-primary px-5 py-2.5 rounded-xl text-sm">
			+ Add Item
		</button>
	</div>

	{#if decryptError}
		<div class="mb-6 px-4 py-3 rounded-lg text-sm" style="background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #FCA5A5;">{decryptError}</div>
	{/if}

	{#if showNew}
		<div class="mb-8 max-w-lg">
			<SubTile
				item={{ id: '', categoryId: data.category.id, projectId: data.project.id, name: '', fields: [], sortOrder: 0 }}
				editMode={true}
				isNew={true}
				onSave={saveItem}
				onCancel={() => (showNew = false)}
				onDelete={() => {}}
				onUpdate={() => {}}
			/>
		</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each decryptedItems as item (item.id)}
			<SubTile
				{item}
				editMode={false}
				isNew={false}
				onSave={saveItem}
				onDelete={() => deleteItem(item.id)}
				onUpdate={(name, fields) => updateItem(item.id, name, fields)}
				onCancel={() => {}}
			/>
		{/each}
	</div>

	{#if decrypting}
		<div class="text-center py-20 text-muted">
			<p class="text-sm">Decrypting…</p>
		</div>
	{:else if decryptedItems.length === 0 && !showNew && !decryptError}
		<div class="text-center py-20 text-muted">
			<p class="text-4xl mb-4">{data.category.icon}</p>
			<p class="text-sm">No items yet. Click <strong class="text-lilac">+ Add Item</strong> to start.</p>
		</div>
	{/if}
</div>
