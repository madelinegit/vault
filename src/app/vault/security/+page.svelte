<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div>
	<div class="flex items-center gap-3 mb-8">
		<button onclick={() => goto('/vault')} class="btn-ghost px-3 py-2 rounded-xl text-sm">← Back</button>
		<div>
			<h1 class="text-2xl font-bold text-lilac">Security</h1>
			<p class="text-muted text-sm mt-0.5">How your data is protected</p>
		</div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-4xl">
		<div class="glass-strong rounded-2xl p-6">
			<div class="text-2xl mb-3">🔑</div>
			<h2 class="font-semibold text-lilac mb-2">Zero-Knowledge Encryption</h2>
			<p class="text-sm text-muted leading-relaxed">
				Your master password never leaves your device. All encryption and decryption happens entirely in your browser using the Web Crypto API. The server only ever sees encrypted ciphertext — never your actual data.
			</p>
		</div>

		<div class="glass-strong rounded-2xl p-6">
			<div class="text-2xl mb-3">🛡️</div>
			<h2 class="font-semibold text-lilac mb-2">AES-256-GCM</h2>
			<p class="text-sm text-muted leading-relaxed">
				Every item is encrypted with AES-256-GCM, the same standard used by governments and financial institutions. Each item gets a unique random IV (initialization vector), so no two ciphertexts are alike even with the same data.
			</p>
		</div>

		<div class="glass-strong rounded-2xl p-6">
			<div class="text-2xl mb-3">⛏️</div>
			<h2 class="font-semibold text-lilac mb-2">PBKDF2 Key Derivation</h2>
			<p class="text-sm text-muted leading-relaxed">
				Your vault key is derived from your master password using PBKDF2 with 600,000 iterations of SHA-256. This makes brute-force attacks computationally expensive — even with powerful hardware.
			</p>
		</div>

		<div class="glass-strong rounded-2xl p-6">
			<div class="text-2xl mb-3">🧂</div>
			<h2 class="font-semibold text-lilac mb-2">Unique Salt Per Account</h2>
			<p class="text-sm text-muted leading-relaxed">
				Your account has a unique cryptographic salt generated at setup. This means even if two people used the same password, their vault keys would be completely different — defeating rainbow table attacks.
			</p>
		</div>

		<div class="glass-strong rounded-2xl p-6">
			<div class="text-2xl mb-3">⏱️</div>
			<h2 class="font-semibold text-lilac mb-2">Auto-Lock After 15 Minutes</h2>
			<p class="text-sm text-muted leading-relaxed">
				Your vault key is held only in memory and wiped after 15 minutes of inactivity. Closing the tab or locking manually clears it immediately. There is no persistent key storage anywhere.
			</p>
		</div>

		<div class="glass-strong rounded-2xl p-6">
			<div class="text-2xl mb-3">🔒</div>
			<h2 class="font-semibold text-lilac mb-2">Argon2id Password Hashing</h2>
			<p class="text-sm text-muted leading-relaxed">
				Your login password is hashed server-side using Argon2id — the winner of the Password Hashing Competition. Even if the database were fully compromised, your password could not be recovered.
			</p>
		</div>

		<div class="glass-strong rounded-2xl p-6">
			<div class="text-2xl mb-3">🚫</div>
			<h2 class="font-semibold text-lilac mb-2">No Password Reset</h2>
			<p class="text-sm text-muted leading-relaxed">
				Because the server never knows your master password, there is no "forgot password" flow. This is intentional — it means there is no back door. Your master password is the only key that exists.
			</p>
		</div>

		<div class="glass-strong rounded-2xl p-6">
			<div class="text-2xl mb-3">🤖</div>
			<h2 class="font-semibold text-lilac mb-2">AI Search — Privacy First</h2>
			<p class="text-sm text-muted leading-relaxed">
				When you use AI search, only item names and categories are sent to Claude — never your field values. Matches are returned by ID, then decrypted locally in your browser. Sensitive values never touch the AI.
			</p>
		</div>
	</div>
</div>
