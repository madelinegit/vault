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

	let editing = $state(false);
	let draftName = $state('');
	let draftFields = $state<VaultField[]>([]);
	let copied = $state<string | null>(null);
	let showPasswords = $state<Set<string>>(new Set());

	$effect.root(() => {
		editing = initialEdit;
		draftName = item.name;
		draftFields = isNew
			? [{ id: crypto.randomUUID(), label: '', value: '', type: 'text' }]
			: item.fields.map((f) => ({ ...f }));
	});

	const FIELD_TYPES: VaultField['type'][] = ['text', 'password', 'url', 'email', 'phone', 'note', 'number', 'image'];

	function addField() {
		draftFields = [...draftFields, { id: crypto.randomUUID(), label: '', value: '', type: 'text' }];
	}

	function removeField(id: string) {
		draftFields = draftFields.filter((f) => f.id !== id);
	}

	function togglePassword(id: string) {
		const next = new Set(showPasswords);
		if (next.has(id)) next.delete(id);
		else next.add(id);
		showPasswords = next;
	}

	async function handleFileUpload(e: Event, fieldId: string) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		if (file.size > 20 * 1024 * 1024) {
			alert('File must be under 20MB');
			return;
		}
		const reader = new FileReader();
		reader.onload = () => {
			// Store as "filename||dataURL" so we can show the name for non-images
			const dataUrl = reader.result as string;
			draftFields = draftFields.map((f) =>
				f.id === fieldId ? { ...f, value: `${file.name}||${dataUrl}` } : f
			);
		};
		reader.readAsDataURL(file);
	}

	function getFileName(value: string) {
		return value.includes('||') ? value.split('||')[0] : 'file';
	}

	function getFileData(value: string) {
		return value.includes('||') ? value.split('||')[1] : value;
	}

	function isImage(value: string) {
		const data = getFileData(value);
		return data.startsWith('data:image/');
	}

	function downloadFile(value: string) {
		const name = getFileName(value);
		const data = getFileData(value);
		const a = document.createElement('a');
		a.href = data;
		a.download = name;
		a.click();
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
		<input
			type="text"
			bind:value={draftName}
			placeholder="Item name (e.g. Chase Sapphire)"
			class="input-glass w-full px-3 py-2 rounded-xl text-sm font-semibold"
		/>

		<div class="flex flex-col gap-2">
			{#each draftFields as field (field.id)}
				<div class="flex flex-col gap-1.5">
					<div class="flex gap-2 items-center">
						<input
							type="text"
							bind:value={field.label}
							placeholder="Label"
							class="input-glass flex-1 px-3 py-2 rounded-lg text-xs"
						/>
						<select bind:value={field.type} class="input-glass px-2 py-2 rounded-lg text-xs">
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
					{#if field.type === 'note'}
						<textarea
							bind:value={field.value}
							placeholder="Value"
							rows="2"
							class="input-glass w-full px-3 py-2 rounded-lg text-xs resize-none"
						></textarea>
					{:else if field.type === 'image'}
						<div class="flex flex-col gap-1.5">
							<input
								type="file"
								onchange={(e) => handleFileUpload(e, field.id)}
								class="text-xs text-muted file:btn-ghost file:rounded-lg file:px-3 file:py-1 file:text-xs file:mr-2 file:border-0"
							/>
							{#if field.value}
								{#if isImage(field.value)}
									<img src={getFileData(field.value)} alt={field.label || 'attachment'} class="rounded-lg max-h-32 object-contain" />
								{:else}
									<div class="flex items-center gap-2 text-xs" style="color: rgba(212,184,224,0.6);">
										<span>📎</span>
										<span class="truncate">{getFileName(field.value)}</span>
									</div>
								{/if}
							{/if}
						</div>
					{:else}
						<input
							type={field.type === 'password' ? 'text' : field.type === 'url' ? 'url' : 'text'}
							bind:value={field.value}
							placeholder="Value"
							class="input-glass w-full px-3 py-2 rounded-lg text-xs"
						/>
					{/if}
				</div>
			{/each}
		</div>

		<button onclick={addField} class="btn-ghost text-xs py-1.5 rounded-lg w-full">+ Add Field</button>

		<div class="flex gap-2 pt-1">
			<button onclick={save} class="btn-primary flex-1 py-2 rounded-xl text-sm">
				{isNew ? 'Create' : 'Save'}
			</button>
			<button onclick={cancel} class="btn-ghost flex-1 py-2 rounded-xl text-sm">Cancel</button>
		</div>
	{:else}
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
			<div class="flex flex-col gap-1">
				<span class="text-xs text-muted capitalize">{field.label || field.type}</span>
				{#if field.type === 'image' && field.value}
					{#if isImage(field.value)}
						<img src={getFileData(field.value)} alt={field.label || 'attachment'} class="rounded-lg max-h-48 object-contain cursor-pointer" onclick={() => window.open(getFileData(field.value), '_blank')} />
					{:else}
						<button
							onclick={() => downloadFile(field.value)}
							class="flex items-center gap-2 text-xs px-3 py-2 rounded-lg w-fit"
							style="background: rgba(212,184,224,0.08); color: rgba(212,184,224,0.7);"
						>
							<span>📎</span>
							<span class="max-w-[180px] truncate">{getFileName(field.value)}</span>
							<span style="color: rgba(153,229,234,0.6);">↓</span>
						</button>
					{/if}
				{:else if field.type === 'note'}
					<p class="text-xs font-mono whitespace-pre-wrap break-words" style="color: rgba(212,184,224,0.9);">{field.value || '—'}</p>
				{:else}
					<div class="flex items-center justify-between gap-2">
						<span
							class="flex-1 text-xs font-mono truncate"
							class:text-muted={field.type === 'password' && !showPasswords.has(field.id)}
							style={field.type === 'password' && !showPasswords.has(field.id) ? 'letter-spacing: 0.2em;' : ''}
						>
							{field.type === 'password' && !showPasswords.has(field.id) ? '••••••••' : field.value || '—'}
						</span>
						<div class="flex gap-1 shrink-0">
							{#if field.type === 'password'}
								<button
									onclick={() => togglePassword(field.id)}
									class="text-xs px-2 py-0.5 rounded transition-all"
									style="background: rgba(212,184,224,0.08); color: rgba(212,184,224,0.5);"
								>{showPasswords.has(field.id) ? 'hide' : 'show'}</button>
							{/if}
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
					</div>
				{/if}
			</div>
		{/each}

		{#if item.fields.length === 0}
			<p class="text-xs text-muted italic">No fields</p>
		{/if}
	{/if}
</div>
