import { writable } from 'svelte/store';

export interface Toast {
	id: string;
	message: string;
	type: 'success' | 'error';
}

function createToastStore() {
	const { subscribe, update } = writable<Toast[]>([]);

	function show(message: string, type: Toast['type'] = 'success') {
		const id = crypto.randomUUID();
		update((t) => [...t, { id, message, type }]);
		setTimeout(() => dismiss(id), 3000);
	}

	function dismiss(id: string) {
		update((t) => t.filter((x) => x.id !== id));
	}

	return { subscribe, show, dismiss };
}

export const toastStore = createToastStore();
