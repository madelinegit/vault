<script lang="ts">
	import { type DecryptedItem, type VaultField } from '$lib/stores/vault';

	let {
		item,
		editMode: initialEdit,
		isNew,
		onSave,
		onUpdate,
		onDelete,
		onCancel
	}: {
		item: DecryptedItem;
		editMode: boolean;
		isNew: boolean;
		onSave: (name: string, fields: VaultField[]) => void;
		onUpdate: (name: string, fields: VaultField[]) => void;
		onDelete: () => void;
		onCancel: () => void;
	} = $props();

	// Capture initial prop values into local draft state (intentional one-time snapshot)
	// eslint-disable-next-line svelte/no-reactive-state-capture
	let editing = $state(false);
	let draftName = $state('');
	let draftFields = $state<VaultField[]>([]);
	let copied = $state<string | null>(null);

	$effect.root(() => {
		editing = initialEdit;
		draftName = item.name;
		draftFields = isNew
			? [{ id: crypto.randomUUID(), label: '', value: '', type: 'text' }]
			: item.fields.map((f) => ({ ...f }));
	});

	const FIELD_TYPES: VaultField['type'][] = ['text', 'password', 'url', 'email', 'phone', 'note', 'number'];

	function addField() {
		draftFields = [...draftFields, { id: crypto.randomUUID(), label: '', value: '', type: 'text' }];
	}

	function removeField(id: string) {
		draftFields = draftFields.filter((f) => f.id !== id);
	}

	function save() {
		if (!draftName.trim()) return;
		if (isNew) {
			onSave(draftName, draftFields);
		} else {
			onUpdate(draftName, draftFields);
			editing = false;
		}
	}

	function cancel() {
		if (isNew) {
			onCancel();
		} else {
			draftName = item.name;
			draftFields = item.fields.map((f) => ({ ...f }));
			editing = false;
		}
	}

	async function copyField(value: string, id: string) {
		await navigator.clipboard.writeText(value);
		copied = id;
		setTimeout(() => (copied = null), 1500);
	}
</script>

<div class="glass rounded-2xl p-5 flex flex-col gap-3" class:glass-strong={editing}>
	{#if editing}
		<!-- Edit / Create mode -->
		<input
			type="text"
			bind:value={draftName}
			placeholder="Item name (e.g. Chase Sapphire)"
			class="input-glass w-full px-3 py-2 rounded-xl text-sm font-semibold"
		/>

		<div class="flex flex-col gap-2">
			{#each draftFields as field (field.id)}
				<div class="flex gap-2 items-start">
					<input
						type="text"
						bind:value={field.label}
						placeholder="Label"
						class="input-glass flex-1 px-3 py-2 rounded-lg text-xs"
					/>
					{#if field.type === 'note'}
						<textarea
							bind:value={field.value}
							placeholder="Value"
							rows="2"
							class="input-glass flex-[2] px-3 py-2 rounded-lg text-xs resize-none"
						></textarea>
					{:else}
						<input
							type={field.type === 'password' ? 'text' : field.type === 'url' ? 'url' : 'text'}
							bind:value={field.value}
							placeholder="Value"
							class="input-glass flex-[2] px-3 py-2 rounded-lg text-xs"
						/>
					{/if}
					<select
						bind:value={field.type}
						class="input-glass px-2 py-2 rounded-lg text-xs"
					>
						{#each FIELD_TYPES as t}
							<option value={t}>{t}</option>
						{/each}
					</select>
					<button
						onclick={() => removeField(field.id)}
						class="text-muted hover:text-red-400 transition-colors text-xs px-1"
						aria-label="Remove field"
					>✕</button>
				</div>
			{/each}
		</div>

		<button onclick={addField} class="btn-ghost text-xs py-1.5 rounded-lg w-full">
			+ Add Field
		</button>

		<div class="flex gap-2 pt-1">
			<button onclick={save} class="btn-primary flex-1 py-2 rounded-xl text-sm">
				{isNew ? 'Create' : 'Save'}
			</button>
			<button onclick={cancel} class="btn-ghost flex-1 py-2 rounded-xl text-sm">
				Cancel
			</button>
		</div>
	{:else}
		<!-- View mode -->
		<div class="flex items-start justify-between gap-2">
			<h3 class="font-semibold text-sm text-lilac leading-snug">{item.name}</h3>
			<div class="flex gap-1 shrink-0">
				<button
					onclick={() => (editing = true)}
					class="text-xs text-muted hover:text-celeste transition-colors px-2 py-1 rounded-lg"
					style="background: rgba(153,229,234,0.08);"
				>Edit</button>
				<button
					onclick={onDelete}
					class="text-xs text-muted hover:text-red-400 transition-colors px-2 py-1 rounded-lg"
					style="background: rgba(239,68,68,0.08);"
				>Del</button>
			</div>
		</div>

		{#each item.fields as field}
			<div class="flex items-center justify-between gap-2">
				<span class="text-xs text-muted shrink-0 w-24 truncate capitalize">{field.label || field.type}</span>
				<span
					class="flex-1 text-xs font-mono truncate"
					class:text-muted={field.type === 'password'}
					style={field.type === 'password' ? 'letter-spacing: 0.2em;' : ''}
				>
					{field.type === 'password' ? '••••••••' : field.value || '—'}
				</span>
				{#if field.value}
					<button
						onclick={() => copyField(field.value, field.id)}
						class="text-xs shrink-0 px-2 py-0.5 rounded transition-all"
						style={copied === field.id
							? 'background: rgba(153,229,234,0.2); color: #99E5EA;'
							: 'background: rgba(212,184,224,0.1); color: rgba(212,184,224,0.6);'}
					>
						{copied === field.id ? '✓' : 'copy'}
					</button>
				{/if}
			</div>
		{/each}

		{#if item.fields.length === 0}
			<p class="text-xs text-muted italic">No fields</p>
		{/if}
	{/if}
</div>
