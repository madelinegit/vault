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
	let nameError = $state(false);
	let fileErrors = $state<Record<string, string>>({});
	let previewField = $state<VaultField | null>(null);

	$effect.root(() => {
		editing = initialEdit;
		draftName = item.name;
		draftFields = isNew ? [] : item.fields.map((f) => ({ ...f }));
	});

	const FIELD_TYPES: VaultField['type'][] = ['text', 'password', 'url', 'email', 'phone', 'note', 'comment', 'number', 'file'];

	function addField() {
		draftFields = [...draftFields, { id: crypto.randomUUID(), label: '', value: '', type: 'text' }];
	}

	function addComment() {
		draftFields = [...draftFields, { id: crypto.randomUUID(), label: 'comment', value: '', type: 'comment' }];
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
			fileErrors = { ...fileErrors, [fieldId]: `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — max allowed is 20 MB.` };
			(e.target as HTMLInputElement).value = '';
			return;
		}
		fileErrors = { ...fileErrors, [fieldId]: '' };
		const reader = new FileReader();
		reader.onload = () => {
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
		if (!draftName.trim()) {
			nameError = true;
			return;
		}
		nameError = false;
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

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	}
</script>

<div class="glass rounded-2xl p-5 flex flex-col gap-3" class:glass-strong={editing}>
	{#if editing}
		<input
			type="text"
			bind:value={draftName}
			oninput={() => (nameError = false)}
			placeholder="Item name — required"
			class="input-glass w-full px-3 py-2 rounded-xl text-sm font-semibold"
			style={nameError ? 'border-color: rgba(239,68,68,0.6); box-shadow: 0 0 0 3px rgba(239,68,68,0.1);' : ''}
		/>

		<div class="flex flex-col gap-2">
			{#each draftFields as field (field.id)}
				<div class="flex flex-col gap-1.5">
					{#if field.type === 'comment'}
						<div class="flex gap-2 items-center">
							<span class="text-xs px-2 py-1 rounded-lg flex-1" style="background: rgba(212,184,224,0.06); color: rgba(212,184,224,0.5); border: 1px solid rgba(212,184,224,0.1);">comment</span>
							<button
								onclick={() => removeField(field.id)}
								class="text-muted hover:text-red-400 transition-colors text-xs px-1"
								aria-label="Remove field"
							>✕</button>
						</div>
						<textarea
							bind:value={field.value}
							placeholder="Write a comment…"
							rows="3"
							class="input-glass w-full px-3 py-2 rounded-lg text-xs resize-none"
						></textarea>
					{:else}
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
						{:else if field.type === 'file'}
							<div class="flex flex-col gap-1.5">
								<input
									type="file"
									onchange={(e) => handleFileUpload(e, field.id)}
									class="text-xs text-muted file:btn-ghost file:rounded-lg file:px-3 file:py-1 file:text-xs file:mr-2 file:border-0"
								/>
								<p class="text-xs" style="color: rgba(237,225,245,0.25);">Any file type · max 20 MB · images preview inline, everything else downloads</p>
								{#if fileErrors[field.id]}
									<p class="text-xs" style="color: #FCA5A5;">{fileErrors[field.id]}</p>
								{/if}
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
					{/if}
				</div>
			{/each}
		</div>

		<div class="flex gap-2">
			<button onclick={addField} class="btn-ghost text-xs py-1.5 rounded-lg flex-1">+ Add Field</button>
			<button onclick={addComment} class="btn-ghost text-xs py-1.5 rounded-lg flex-1" style="border-color: rgba(212,184,224,0.12); color: rgba(212,184,224,0.5);">+ Comment</button>
		</div>

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
			{#if field.type === 'comment'}
				<div class="comment-block px-3 py-2 rounded-lg text-xs" style="background: rgba(212,184,224,0.04); border-left: 2px solid rgba(212,184,224,0.2);">
					<p class="whitespace-pre-wrap break-words italic" style="color: rgba(237,225,245,0.6);">{field.value || '—'}</p>
				</div>
			{:else}
				<div class="flex flex-col gap-1">
					<span class="text-xs text-muted capitalize">{field.label || field.type}</span>
					{#if field.type === 'file' && field.value}
						<div class="flex flex-col gap-1.5">
							<div class="flex items-center gap-1.5 text-xs" style="color: rgba(212,184,224,0.5);">
								<span>{isImage(field.value) ? '🖼' : '📎'}</span>
								<span class="truncate">{getFileName(field.value)}</span>
							</div>
							<div class="flex gap-2">
								<button
									onclick={() => (previewField = field)}
									class="flex-1 py-2.5 rounded-xl text-xs font-medium"
									style="background: rgba(153,229,234,0.12); border: 1px solid rgba(153,229,234,0.2); color: #99E5EA;"
								>👁 Preview</button>
								<button
									onclick={() => downloadFile(field.value)}
									class="flex-1 py-2.5 rounded-xl text-xs font-medium"
									style="background: rgba(212,184,224,0.08); border: 1px solid rgba(212,184,224,0.15); color: rgba(212,184,224,0.7);"
								>↓ Save</button>
							</div>
						</div>
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
			{/if}
		{/each}

		{#if item.fields.length === 0}
			<p class="text-xs text-muted italic">No fields</p>
		{/if}

		{#if item.createdAt}
			<div class="text-xs pt-2 mt-auto" style="border-top: 1px solid rgba(212,184,224,0.07); color: rgba(237,225,245,0.25);">
				{#if item.updatedAt && item.updatedAt !== item.createdAt}
					Updated {formatDate(item.updatedAt)}
				{:else}
					Added {formatDate(item.createdAt)}
				{/if}
			</div>
		{/if}
	{/if}
</div>

{#if previewField}
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		role="dialog"
		class="fixed inset-0 z-50 flex flex-col"
		style="background: rgba(5,2,15,0.92); backdrop-filter: blur(12px);"
		onkeydown={(e) => e.key === 'Escape' && (previewField = null)}
	>
		<!-- Toolbar -->
		<div class="flex items-center justify-between px-5 py-4 shrink-0" style="border-bottom: 1px solid rgba(212,184,224,0.12);">
			<span class="text-sm font-medium truncate max-w-xs" style="color: #D4B8E0;">{getFileName(previewField.value)}</span>
			<div class="flex gap-2 shrink-0">
				<button
					onclick={() => downloadFile(previewField!.value)}
					class="px-4 py-2 rounded-xl text-xs font-medium"
					style="background: rgba(212,184,224,0.08); border: 1px solid rgba(212,184,224,0.18); color: rgba(212,184,224,0.8);"
				>↓ Save</button>
				<button
					onclick={() => { const w = window.open(); w?.document.write(`<iframe src="${getFileData(previewField!.value)}" style="width:100%;height:100%;border:none;"></iframe>`); }}
					class="px-4 py-2 rounded-xl text-xs font-medium"
					style="background: rgba(153,229,234,0.08); border: 1px solid rgba(153,229,234,0.18); color: rgba(153,229,234,0.7);"
				>↗ New window</button>
				<button
					onclick={() => (previewField = null)}
					class="w-9 h-9 rounded-xl flex items-center justify-center text-sm"
					style="background: rgba(212,184,224,0.08); border: 1px solid rgba(212,184,224,0.15); color: rgba(212,184,224,0.6);"
				>✕</button>
			</div>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-auto flex items-center justify-center p-4">
			{#if isImage(previewField.value)}
				<img
					src={getFileData(previewField.value)}
					alt={getFileName(previewField.value)}
					class="max-w-full max-h-full object-contain rounded-lg"
				/>
			{:else}
				<iframe
					src={getFileData(previewField.value)}
					title={getFileName(previewField.value)}
					class="w-full rounded-lg"
					style="height: calc(100vh - 120px); border: none;"
				></iframe>
			{/if}
		</div>
	</div>
{/if}
