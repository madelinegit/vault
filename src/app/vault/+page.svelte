<script lang="ts">
	import CategoryTile from '$lib/components/CategoryTile.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let categories = $state(data.categories);
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
			categories = [...categories, cat];
			newName = '';
			newIcon = '📁';
			showAddCategory = false;
		}
		addLoading = false;
	}

	async function deleteCategory(id: string) {
		if (!confirm('Delete this category and all its items?')) return;
		const res = await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
		if (res.ok) categories = categories.filter((c) => c.id !== id);
	}
</script>

<div>
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-3xl font-bold gradient-text">Your Vault</h1>
			<p class="text-muted text-sm mt-1">
				{categories.length} {categories.length === 1 ? 'category' : 'categories'} &mdash; press
				<kbd class="px-1.5 py-0.5 rounded text-xs" style="background: rgba(212,184,224,0.12); border: 1px solid rgba(212,184,224,0.2);">⌘K</kbd>
				for AI search
			</p>
		</div>
		<button onclick={() => (showAddCategory = !showAddCategory)} class="btn-primary px-5 py-2.5 rounded-xl text-sm">
			+ Add Category
		</button>
	</div>

	{#if showAddCategory}
		<div class="glass rounded-2xl p-5 mb-6 max-w-lg">
			<p class="text-sm font-medium text-lilac mb-4">New Category</p>
			<div class="flex gap-3 mb-4">
				<div class="shrink-0">
					<label class="block text-xs text-muted mb-1.5">Icon</label>
					<input type="text" bind:value={newIcon} maxlength="2"
						class="input-glass w-14 h-11 px-2 rounded-lg text-xl text-center" />
				</div>
				<div class="flex-1">
					<label class="block text-xs text-muted mb-1.5">Name</label>
					<input type="text" bind:value={newName} placeholder="e.g. Bank Accounts"
						class="input-glass w-full px-4 py-2.5 rounded-xl text-sm h-11"
						onkeydown={(e) => e.key === 'Enter' && addCategory()}
						autofocus />
				</div>
			</div>
			<div class="flex gap-2">
				<button onclick={addCategory} disabled={addLoading} class="btn-primary flex-1 py-2.5 rounded-xl text-sm">
					{addLoading ? '…' : 'Add Category'}
				</button>
				<button onclick={() => (showAddCategory = false)} class="btn-ghost px-5 py-2.5 rounded-xl text-sm">Cancel</button>
			</div>
		</div>
	{/if}

	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
		{#each categories as category (category.id)}
			<CategoryTile {category} onDelete={() => deleteCategory(category.id)} />
		{/each}
	</div>

	{#if categories.length === 0}
		<div class="text-center py-20 text-muted">
			<p class="text-4xl mb-4">🔐</p>
			<p class="text-sm">No categories yet. Add one above.</p>
		</div>
	{/if}
</div>
