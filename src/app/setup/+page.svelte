<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { vaultStore } from '$lib/stores/vault';
	import { deriveVaultKey } from '$lib/crypto';

	let password = $state('');
	let loading = $state(false);
	let error = $state('');
	let showPassword = $state(false);
	let showConfirm = $state(false);

	const handleSetup = () => {
		const capturedPassword = password;
		loading = true;
		error = '';
		return async ({ result }: { result: { type: string; data?: { vaultSalt?: string; error?: string } } }) => {
			loading = false;
			if (result.type === 'success' && result.data?.vaultSalt) {
				const key = await deriveVaultKey(capturedPassword, result.data.vaultSalt);
				vaultStore.unlock(key);
				goto('/vault');
			} else if (result.data?.error) {
				error = result.data.error;
			}
		};
	};
</script>

<main class="min-h-screen flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<div class="text-center mb-8">
			<h1 class="text-4xl font-bold gradient-text mb-2">AllMyShit!¡</h1>
			<p class="text-muted text-sm">first-time setup</p>
		</div>
		<div class="glass-strong rounded-2xl p-8">
			<h2 class="text-lg font-semibold text-lilac mb-2">Create Your Account</h2>
			<p class="text-xs text-muted mb-6">This can only be done once. Your master password encrypts everything and cannot be recovered if lost.</p>

			{#if error}
				<div class="mb-4 px-4 py-3 rounded-lg text-sm" style="background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.25); color: #FCA5A5;">{error}</div>
			{/if}

			<form method="POST" action="?/setup" use:enhance={handleSetup}>
				<div class="mb-4">
					<label class="block text-xs font-medium text-muted mb-1.5" for="secret">Setup Secret</label>
					<input id="secret" name="secret" type="password" placeholder="From your .env file" class="input-glass w-full px-4 py-3 rounded-xl text-sm" required />
				</div>
				<div class="mb-4">
					<label class="block text-xs font-medium text-muted mb-1.5" for="email">Email</label>
					<input id="email" name="email" type="email" placeholder="you@example.com" autocomplete="email" class="input-glass w-full px-4 py-3 rounded-xl text-sm" required />
				</div>
				<div class="mb-4">
					<label class="block text-xs font-medium text-muted mb-1.5" for="password">Master Password</label>
					<div class="relative">
						<input id="password" name="password" type={showPassword ? 'text' : 'password'} bind:value={password} placeholder="Min. 12 characters" autocomplete="new-password" class="input-glass w-full px-4 py-3 pr-11 rounded-xl text-sm" required />
						<button type="button" onclick={() => (showPassword = !showPassword)} class="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors">
							{showPassword ? '🙈' : '👁️'}
						</button>
					</div>
				</div>
				<div class="mb-6">
					<label class="block text-xs font-medium text-muted mb-1.5" for="confirm">Confirm Password</label>
					<div class="relative">
						<input id="confirm" name="confirm" type={showConfirm ? 'text' : 'password'} placeholder="Repeat password" autocomplete="new-password" class="input-glass w-full px-4 py-3 pr-11 rounded-xl text-sm" required />
						<button type="button" onclick={() => (showConfirm = !showConfirm)} class="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors">
							{showConfirm ? '🙈' : '👁️'}
						</button>
					</div>
				</div>
				<button type="submit" disabled={loading} class="btn-primary w-full py-3 rounded-xl text-sm">
					{loading ? 'Creating vault…' : 'Create Vault'}
				</button>
			</form>
		</div>
	</div>
</main>
