<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { vaultStore } from '$lib/stores/vault';
	import { deriveVaultKey } from '$lib/crypto';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let password = $state('');
	let showPassword = $state(false);
	let loading = $state(false);
	let error = $state('');

	async function handleUnlock(e: SubmitEvent) {
		e.preventDefault();
		if (!data.vaultSalt) return;
		loading = true;
		error = '';
		try {
			const key = await deriveVaultKey(password, data.vaultSalt);
			vaultStore.unlock(key);
			goto('/vault');
		} catch {
			error = 'Incorrect password.';
		} finally {
			loading = false;
		}
	}

	const handleLogin = () => {
		const capturedPassword = password;
		loading = true;
		error = '';
		return async ({ result }: { result: { type: string; data?: { vaultSalt?: string; error?: string } } }) => {
			loading = false;
			if (result.type === 'success' && result.data?.vaultSalt) {
				try {
					const key = await deriveVaultKey(capturedPassword, result.data.vaultSalt);
					vaultStore.unlock(key);
					goto('/vault');
				} catch {
					error = 'Failed to unlock vault.';
				}
			} else if (result.data?.error) {
				error = result.data.error;
			} else {
				error = 'Something went wrong.';
			}
		};
	};
</script>

<div class="flex-1 flex items-center justify-center p-5">
	<div class="w-full max-w-sm">
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold gradient-text mb-2">AllMyShit!¡</h1>
			<p class="text-muted text-sm">your private vault</p>
		</div>

		<div class="glass-strong rounded-2xl p-7">
			<h2 class="text-base font-semibold text-lilac mb-5">
				{data.isUnlock ? 'Unlock Vault' : 'Sign In'}
			</h2>

			{#if error}
				<div class="mb-4 px-4 py-3 rounded-lg text-sm" style="background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #FCA5A5;">
					{error}
				</div>
			{/if}

			{#if data.isUnlock}
				<form onsubmit={handleUnlock} class="flex flex-col gap-4">
					<p class="text-xs text-muted">Signed in as <span class="text-lilac">{data.email}</span></p>
					<div>
						<label class="block text-xs font-medium text-muted mb-1.5" for="unlock-pw">Master Password</label>
						<div class="relative">
							<input id="unlock-pw" type={showPassword ? 'text' : 'password'} bind:value={password} placeholder="Enter your master password" autocomplete="current-password" class="input-glass w-full px-4 py-3 pr-12 rounded-xl text-sm" required />
							<button type="button" onclick={() => (showPassword = !showPassword)} class="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded" style="color: rgba(212,184,224,0.5);">{showPassword ? 'hide' : 'show'}</button>
						</div>
					</div>
					<button type="submit" disabled={loading} class="btn-primary w-full py-3 rounded-xl text-sm">
						{loading ? 'Unlocking…' : 'Unlock Vault'}
					</button>
				</form>
			{:else}
				<form method="POST" action="?/login" use:enhance={handleLogin} class="flex flex-col gap-4">
					<div>
						<label class="block text-xs font-medium text-muted mb-1.5" for="email">Email</label>
						<input id="email" name="email" type="email" placeholder="you@example.com" autocomplete="email" class="input-glass w-full px-4 py-3 rounded-xl text-sm" required />
					</div>
					<div>
						<label class="block text-xs font-medium text-muted mb-1.5" for="password">Master Password</label>
						<div class="relative">
							<input id="password" name="password" type={showPassword ? 'text' : 'password'} bind:value={password} placeholder="Your master password" autocomplete="current-password" class="input-glass w-full px-4 py-3 pr-12 rounded-xl text-sm" required />
							<button type="button" onclick={() => (showPassword = !showPassword)} class="absolute right-3 top-1/2 -translate-y-1/2 text-xs px-1.5 py-0.5 rounded" style="color: rgba(212,184,224,0.5);">{showPassword ? 'hide' : 'show'}</button>
						</div>
					</div>
					<button type="submit" disabled={loading} class="btn-primary w-full py-3 rounded-xl text-sm">
						{loading ? 'Signing in…' : 'Sign In'}
					</button>
				</form>
			{/if}

			<p class="text-center text-xs text-muted mt-5">
				Zero-knowledge encrypted. Your data never leaves your device unencrypted.
			</p>
		</div>
	</div>
</div>
