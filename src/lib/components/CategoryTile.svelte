<script lang="ts">
	import { goto } from '$app/navigation';

	let {
		category,
		onDelete
	}: {
		category: { id: string; name: string; icon: string };
		onDelete: () => void;
	} = $props();

	let showMenu = $state(false);
</script>

<div class="relative group">
	<button
		onclick={() => goto(`/vault/${category.id}`)}
		class="glass glass-hover rounded-2xl w-full text-left flex flex-col justify-between cursor-pointer"
		style="aspect-ratio: 1 / 1; padding: 1.25rem;"
	>
		<span class="text-4xl">{category.icon}</span>
		<div>
			<span class="font-semibold text-sm leading-snug block" style="color: #D4B8E0;">{category.name}</span>
		</div>
	</button>

	<button
		onclick={(e) => { e.stopPropagation(); showMenu = !showMenu; }}
		class="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs"
		style="background: rgba(13,7,32,0.5); border: 1px solid rgba(212,184,224,0.15); color: rgba(212,184,224,0.6);"
		aria-label="Category options"
	>⋯</button>

	{#if showMenu}
		<div
			class="absolute top-10 right-2.5 rounded-xl py-1 z-20 w-40"
			style="background: rgba(22,13,46,0.97); border: 1px solid rgba(212,184,224,0.18); box-shadow: 0 8px 32px rgba(0,0,0,0.5);"
		>
			<button
				onclick={() => { showMenu = false; onDelete(); }}
				class="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-red-500/10"
				style="color: rgba(252,165,165,0.8);"
			>Delete category</button>
		</div>

		<button
			class="fixed inset-0 z-10"
			onclick={() => (showMenu = false)}
			aria-label="Close"
			style="background: transparent; border: none; cursor: default;"
		></button>
	{/if}
</div>
