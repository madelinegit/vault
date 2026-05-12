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
		class="glass glass-hover rounded-2xl p-6 w-full text-left flex flex-col gap-3 cursor-pointer"
	>
		<span class="text-3xl">{category.icon}</span>
		<span class="font-semibold text-sm text-lilac leading-snug">{category.name}</span>
	</button>

	<button
		onclick={(e) => { e.stopPropagation(); showMenu = !showMenu; }}
		class="absolute top-3 right-3 w-6 h-6 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted hover:text-lilac text-xs"
		style="background: rgba(212,184,224,0.1);"
		aria-label="Category options"
	>
		⋯
	</button>

	{#if showMenu}
		<div
			class="absolute top-10 right-3 glass-strong rounded-xl py-1 z-20 w-36"
			style="box-shadow: 0 8px 24px rgba(0,0,0,0.4);"
		>
			<button
				onclick={() => { showMenu = false; onDelete(); }}
				class="w-full text-left px-4 py-2 text-sm transition-colors"
				style="color: rgba(252,165,165,0.8);"
			>
				Delete
			</button>
		</div>

		<button
			class="fixed inset-0 z-10"
			onclick={() => (showMenu = false)}
			aria-label="Close"
			style="background: transparent; border: none; cursor: default;"
		></button>
	{/if}
</div>
