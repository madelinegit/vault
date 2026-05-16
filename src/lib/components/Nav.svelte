<script lang="ts">
	import { goto } from '$app/navigation';

	let {
		email,
		onAiClick,
		onLock
	}: {
		email: string;
		onAiClick: () => void;
		onLock: () => void;
	} = $props();

	let menuOpen = $state(false);

	async function logout() {
		await fetch('/api/logout', { method: 'POST' });
		goto('/login');
	}
</script>

<nav class="nav-bar">
	<div class="nav-inner">
		<a href="/vault" class="flex items-center gap-2 no-underline">
			<span class="text-xl font-bold gradient-text">AllMyShit!¡</span>
		</a>

		<div class="flex-1"></div>

		<a
			href="/chat"
			class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all no-underline"
			style="background: rgba(212,184,224,0.08); border: 1px solid rgba(212,184,224,0.18); color: rgba(212,184,224,0.75);"
			title="AI Chat"
		>
			<span>💬</span>
			<span class="hidden sm:inline">Chat</span>
		</a>

		<button
			onclick={onAiClick}
			class="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
			style="background: rgba(153,229,234,0.12); border: 1px solid rgba(153,229,234,0.25); color: #99E5EA;"
			title="AI Search (⌘K)"
		>
			<span>✦</span>
			<span>AI Search</span>
			<kbd class="hidden sm:inline text-xs opacity-60 ml-1">⌘K</kbd>
		</button>

		<div class="relative">
			<button
				onclick={() => (menuOpen = !menuOpen)}
				class="flex items-center gap-2 px-3 py-2 rounded-xl btn-ghost text-sm"
			>
				<span class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
					style="background: rgba(123,47,190,0.4); color: #D4B8E0;">
					{email[0].toUpperCase()}
				</span>
				<span class="hidden sm:inline text-muted text-xs">{email}</span>
			</button>

			{#if menuOpen}
				<div
					class="absolute right-0 top-full mt-2 w-48 glass-strong rounded-xl py-1 z-50"
					style="box-shadow: 0 8px 32px rgba(0,0,0,0.4);"
				>
					<a
						href="/vault/security"
						onclick={() => (menuOpen = false)}
						class="block w-full text-left px-4 py-2.5 text-sm text-muted hover:text-celeste transition-colors no-underline"
					>
						🛡️ Security
					</a>
					<hr style="border-color: rgba(212,184,224,0.12); margin: 4px 0;" />
					<button
						onclick={() => { menuOpen = false; onLock(); }}
						class="w-full text-left px-4 py-2.5 text-sm text-muted hover:text-lilac transition-colors"
					>
						🔒 Lock Vault
					</button>
					<hr style="border-color: rgba(212,184,224,0.12); margin: 4px 0;" />
					<button
						onclick={logout}
						class="w-full text-left px-4 py-2.5 text-sm transition-colors"
						style="color: rgba(252,165,165,0.8);"
					>
						Sign Out
					</button>
				</div>

				<button
					class="fixed inset-0 z-40"
					onclick={() => (menuOpen = false)}
					aria-label="Close menu"
					style="background: transparent; border: none; cursor: default;"
				></button>
			{/if}
		</div>
	</div>
</nav>

<style>
	.nav-bar {
		background: linear-gradient(135deg, #3D0F7A, #7B2FBE 60%, #6B4099);
		box-shadow: 0 1px 0 rgba(212, 184, 224, 0.1), 0 4px 24px rgba(0, 0, 0, 0.3);
		position: sticky;
		top: 0;
		z-index: 30;
	}
	.nav-inner {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		padding: 0.875rem 1.5rem;
	}
	@media (max-width: 640px) {
		.nav-inner {
			padding: 0.875rem 1rem;
		}
	}
</style>
