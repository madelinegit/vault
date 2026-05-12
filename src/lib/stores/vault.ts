import { writable } from 'svelte/store';

export interface VaultField {
	id: string;
	label: string;
	value: string;
	type: 'text' | 'password' | 'url' | 'email' | 'phone' | 'note' | 'number';
}

export interface DecryptedItem {
	id: string;
	categoryId: string;
	name: string;
	fields: VaultField[];
	sortOrder: number;
}

interface VaultState {
	locked: boolean;
	key: CryptoKey | null;
	lastActivity: number;
}

function createVaultStore() {
	const { subscribe, set, update } = writable<VaultState>({
		locked: true,
		key: null,
		lastActivity: 0
	});

	return {
		subscribe,
		unlock(key: CryptoKey) {
			update(() => ({ locked: false, key, lastActivity: Date.now() }));
		},
		lock() {
			set({ locked: true, key: null, lastActivity: 0 });
		},
		touch() {
			update((s) => ({ ...s, lastActivity: Date.now() }));
		}
	};
}

export const vaultStore = createVaultStore();
