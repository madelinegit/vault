<script lang="ts">
	import { goto } from '$app/navigation';
	import { toastStore } from '$lib/stores/toast';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let projects = $state(data.projects);
	let showNew = $state(false);
	let newName = $state('');
	let editingId = $state<string | null>(null);
	let editName = $state('');
	let saving = $state(false);

	async function createProject() {
		if (!newName.trim()) return;
		saving = true;
		const res = await fetch('/api/projects', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ categoryId: data.category.id, name: newName.trim() })
		});
		if (res.ok) {
			const p = await res.json();
			projects = [...projects, p];
			newName = '';
			showNew = false;
			toastStore.show('Project created');
		} else {
			toastStore.show('Failed to create project', 'error');
		}
		saving = false;
	}

	async function renameProject(id: string) {
		if (!editName.trim()) return;
		const res = await fetch('/api/projects', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, name: editName.trim() })
		});
		if (res.ok) {
			projects = projects.map((p) => (p.id === id ? { ...p, name: editName.trim() } : p));
			editingId = null;
			toastStore.show('Project renamed');
		} else {
			toastStore.show('Failed to rename', 'error');
		}
	}

	async function deleteProject(id: string) {
		if (!confirm('Delete this project and all its items? This cannot be undone.')) return;
		const res = await fetch(`/api/projects?id=${id}`, { method: 'DELETE' });
		if (res.ok) {
			projects = projects.filter((p) => p.id !== id);
			toastStore.show('Project deleted');
		} else {
			toastStore.show('Failed to delete', 'error');
		}
	}
</script>

<div>
	<div class="flex items-center gap-3 mb-8">
		<button onclick={() => goto('/vault')} class="btn-ghost px-3 py-2 rounded-xl text-sm">← Back</button>
		<div>
			<h1 class="text-2xl font-bold text-lilac flex items-center gap-2">
				<span>{data.category.icon}</span>{data.category.name}
			</h1>
			<p class="text-muted text-sm mt-0.5">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</p>
		</div>
		<button onclick={() => (showNew = !showNew)} class="btn-primary ml-auto px-5 py-2.5 rounded-xl text-sm">
			+ New Project
		</button>
	</div>

	{#if showNew}
		<div class="glass rounded-2xl p-5 mb-6 flex gap-3 items-end">
			<div class="flex-1">
				<label class="block text-xs text-muted mb-1.5" for="new-project-name">Project Name</label>
				<input
					id="new-project-name"
					type="text"
					bind:value={newName}
					placeholder="e.g. My Business, Personal, Client X"
					class="input-glass w-full px-4 py-2.5 rounded-xl text-sm"
					onkeydown={(e) => e.key === 'Enter' && createProject()}
				/>
			</div>
			<button onclick={createProject} disabled={saving} class="btn-primary px-5 py-2.5 rounded-xl text-sm">
				{saving ? '…' : 'Create'}
			</button>
			<button onclick={() => (showNew = false)} class="btn-ghost px-4 py-2.5 rounded-xl text-sm">Cancel</button>
		</div>
	{/if}

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each projects as project (project.id)}
			<div
				class="glass rounded-2xl p-5 flex flex-col gap-3 group"
				class:cursor-pointer={editingId !== project.id}
				onclick={() => editingId !== project.id && goto(`/vault/${data.category.id}/${project.id}`)}
				role="button"
				tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && editingId !== project.id && goto(`/vault/${data.category.id}/${project.id}`)}
			>
				{#if editingId === project.id}
					<input
						type="text"
						bind:value={editName}
						class="input-glass w-full px-3 py-2 rounded-xl text-sm font-semibold"
						onclick={(e) => e.stopPropagation()}
						onkeydown={(e) => {
							if (e.key === 'Enter') renameProject(project.id);
							if (e.key === 'Escape') editingId = null;
						}}
					/>
					<div class="flex gap-2" onclick={(e) => e.stopPropagation()} role="none">
						<button onclick={() => renameProject(project.id)} class="btn-primary flex-1 py-1.5 rounded-lg text-xs">Save</button>
						<button onclick={() => (editingId = null)} class="btn-ghost flex-1 py-1.5 rounded-lg text-xs">Cancel</button>
					</div>
				{:else}
					<div class="flex items-center justify-between gap-2">
						<h3 class="font-semibold text-sm text-lilac">{project.name}</h3>
						<div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
							<button
								onclick={(e) => { e.stopPropagation(); editName = project.name; editingId = project.id; }}
								class="text-xs text-muted hover:text-celeste px-2 py-1 rounded-lg transition-colors"
								style="background: rgba(153,229,234,0.08);"
							>Edit</button>
							<button
								onclick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
								class="text-xs text-muted hover:text-red-400 px-2 py-1 rounded-lg transition-colors"
								style="background: rgba(239,68,68,0.08);"
							>Del</button>
						</div>
					</div>
					<p class="text-xs text-muted">Tap to open →</p>
				{/if}
			</div>
		{/each}
	</div>

	{#if projects.length === 0 && !showNew}
		<div class="text-center py-20 text-muted">
			<p class="text-4xl mb-4">{data.category.icon}</p>
			<p class="text-sm">No projects yet. Click <strong class="text-lilac">+ New Project</strong> to get started.</p>
		</div>
	{/if}
</div>
