<script lang="ts">
	import CategoryTile from '$lib/components/CategoryTile.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let showAddCategory = $state(false);
	let newName = $state('');
	let newIcon = $state('📁');
	let addLoading = $state(false);

	async function addCategory() {
		if (!newName.trim()) return;
		addLoading = true;
		const res = await fetch('/api/categories', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: newName.trim(), icon: newIcon })
		});
		if (res.ok) {
			const cat = await res.json();
			data.categories = [...data.categories, cat];
			newName = '';
			newIcon = '📁';
			showAddCategory = false;
		}
		addLoading = false;
	}

	async function deleteCategory(id: string) {
		if (!confirm('Delete this category and all its items?')) return;
		const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
		if (res.ok) data.categories = data.categories.filter((c) => c.id !== id);
	}
</script>

<div>
	<div class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-3xl font-bold gradient-text">Your Vault</h1>
			<p class="text-muted text-sm mt-1">
				{data.categories.length} {data.categories.length === 1 ? 'category' : 'categories'} &mdash; press
				<kbd class="px-1.5 py-0.5 rounded text-xs" style="background: rgba(212,184,224,0.12); border: 1px solid rgba(212,184,224,0.2);">⌘K</kbd>
				for AI search
			</p>
		</div>
		<button onclick={() => (showAddCategory = !showAddCategory)} class="btn-primary px-5 py-2.5 rounded-xl text-sm">
			+ Add Category
		</button>
	</div>

	{#if showAddCategory}
		<div class="glass rounded-2xl p-5 mb-6 flex gap-3 items-end">
			<div>
				<label class="block text-xs text-muted mb-1.5" for="new-icon">Icon</label>
				<input id="new-icon" type="text" bind:value={newIcon} maxlength="2" class="input-glass w-16 px-3 py-2 rounded-lg text-xl text-center" />
			</div>
			<div class="flex-1">
				<label class="block text-xs text-muted mb-1.5" for="new-name">Category Name</label>
				<input id="new-name" type="text" bind:value={newName} placeholder="e.g. Bank Accounts" class="input-glass w-full px-4 py-2.5 rounded-xl text-sm" onkeydown={(e) => e.key === 'Enter' && addCategory()} />
			</div>
			<button onclick={addCategory} disabled={addLoading} class="btn-primary px-5 py-2.5 rounded-xl text-sm">{addLoading ? '…' : 'Add'}</button>
			<button onclick={() => (showAddCategory = false)} class="btn-ghost px-4 py-2.5 rounded-xl text-sm">Cancel</button>
		</div>
	{/if}

	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
		{#each data.categories as category (category.id)}
			<CategoryTile {category} onDelete={() => deleteCategory(category.id)} />
		{/each}
	</div>

	{#if data.categories.length === 0}
		<div class="text-center py-20 text-muted">
			<p class="text-4xl mb-4">🔐</p>
			<p class="text-sm">No categories yet. Add one above.</p>
		</div>
	{/if}
</div>
