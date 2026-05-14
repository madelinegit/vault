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
		class="tile tile-hover rounded-2xl w-full text-left flex flex-col justify-between"
		style="aspect-ratio: 1 / 1; padding: 1.5rem;"
	>
		<span class="text-5xl relative z-10">{category.icon}</span>
		<div class="relative z-10">
			<span class="font-semibold text-sm leading-snug block" style="color: #D4B8E0;">{category.name}</span>
			<span class="text-xs mt-1 block" style="color: rgba(153,229,234,0.45);">Open →</span>
		</div>
	</button>

	<button
		onclick={(e) => { e.stopPropagation(); showMenu = !showMenu; }}
		class="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-sm z-20"
		style="background: rgba(13,7,32,0.7); border: 1px solid rgba(212,184,224,0.18); color: rgba(212,184,224,0.7);"
		aria-label="Category options"
	>⋯</button>

	{#if showMenu}
		<div
			class="absolute top-11 right-3 rounded-xl py-1 z-30 w-44"
			style="background: rgba(18,10,38,0.98); border: 1px solid rgba(212,184,224,0.18); box-shadow: 0 8px 32px rgba(0,0,0,0.6);"
		>
			<button
				onclick={() => { showMenu = false; onDelete(); }}
				class="w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-red-500/10"
				style="color: rgba(252,165,165,0.85);"
			>Delete category</button>
		</div>

		<button
			class="fixed inset-0 z-20"
			onclick={() => (showMenu = false)}
			aria-label="Close"
			style="background: transparent; border: none; cursor: default;"
		></button>
	{/if}
</div>
