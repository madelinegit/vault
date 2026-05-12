<script lang="ts">
	import { toastStore } from '$lib/stores/toast';
</script>

{#if $toastStore.length > 0}
	<div class="fixed bottom-6 right-6 flex flex-col gap-2 z-50 pointer-events-none">
		{#each $toastStore as toast (toast.id)}
			<div
				class="glass px-4 py-3 rounded-xl text-sm flex items-center gap-3 pointer-events-auto"
				style={toast.type === 'success'
					? 'border: 1px solid rgba(153,229,234,0.35); color: #99E5EA; background: rgba(13,7,32,0.92);'
					: 'border: 1px solid rgba(239,68,68,0.35); color: #FCA5A5; background: rgba(13,7,32,0.92);'}
			>
				<span>{toast.type === 'success' ? '✓' : '✕'}</span>
				<span>{toast.message}</span>
				<button
					onclick={() => toastStore.dismiss(toast.id)}
					class="ml-2 opacity-50 hover:opacity-100 transition-opacity"
					aria-label="Dismiss"
				>✕</button>
			</div>
		{/each}
	</div>
{/if}
