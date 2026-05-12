<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	import Nav from '$lib/components/Nav.svelte';
	import AIAssistant from '$lib/components/AIAssistant.svelte';
	import { vaultStore } from '$lib/stores/vault';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const LOCK_MS = 15 * 60 * 1000;
	let lockTimer: ReturnType<typeof setTimeout>;
	let aiOpen = $state(false);

	function resetTimer() {
		clearTimeout(lockTimer);
		vaultStore.touch();
		lockTimer = setTimeout(lockVault, LOCK_MS);
	}

	function lockVault() {
		vaultStore.lock();
		goto('/login');
	}

	$effect(() => {
		if (data.user && $vaultStore.locked) {
			goto('/login');
		}
	});

	onMount(() => {
		if (data.user) {
			resetTimer();
			window.addEventListener('mousemove', resetTimer, { passive: true });
			window.addEventListener('keydown', resetTimer, { passive: true });
			window.addEventListener('click', resetTimer, { passive: true });
		}
	});

	onDestroy(() => {
		clearTimeout(lockTimer);
		window.removeEventListener('mousemove', resetTimer);
		window.removeEventListener('keydown', resetTimer);
		window.removeEventListener('click', resetTimer);
	});

	function handleKeydown(e: KeyboardEvent) {
		if (data.user && (e.metaKey || e.ctrlKey) && e.key === 'k') {
			e.preventDefault();
			aiOpen = !aiOpen;
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<title>AllMyShit!¡</title>
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="min-h-screen flex flex-col">
	{#if data.user}
		<Nav email={data.user.email} onAiClick={() => (aiOpen = !aiOpen)} onLock={lockVault} />
	{/if}

	<main class="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
		{@render children()}
	</main>
</div>

{#if aiOpen}
	<AIAssistant onClose={() => (aiOpen = false)} />
{/if}
