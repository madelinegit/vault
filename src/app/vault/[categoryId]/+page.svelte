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
	<!-- Breadcrumb -->
	<nav class="flex items-center gap-2 mb-6 text-xs" style="color: rgba(237,225,245,0.4);">
		<button onclick={() => goto('/vault')} class="hover:text-lilac transition-colors">Your Vault</button>
		<span>›</span>
		<span style="color: rgba(212,184,224,0.85);">{data.category.icon} {data.category.name}</span>
	</nav>

	<div class="flex items-center justify-between mb-8">
		<div>
			<h1 class="text-2xl font-bold text-lilac">{data.category.name}</h1>
			<p class="text-muted text-sm mt-0.5">{projects.length} {projects.length === 1 ? 'project' : 'projects'}</p>
		</div>
		<button onclick={() => (showNew = !showNew)} class="btn-primary px-5 py-2.5 rounded-xl text-sm">
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

	<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
		{#each projects as project (project.id)}
			<div class="relative group">
				{#if editingId === project.id}
					<div class="tile rounded-2xl flex flex-col gap-3 justify-center" style="aspect-ratio: 1 / 1; padding: 1.25rem;">
						<input
							type="text"
							bind:value={editName}
							class="input-glass w-full px-3 py-2 rounded-xl text-sm font-semibold"
							onkeydown={(e) => {
								if (e.key === 'Enter') renameProject(project.id);
								if (e.key === 'Escape') editingId = null;
							}}
						/>
						<div class="flex gap-2">
							<button onclick={() => renameProject(project.id)} class="btn-primary flex-1 py-1.5 rounded-lg text-xs">Save</button>
							<button onclick={() => (editingId = null)} class="btn-ghost flex-1 py-1.5 rounded-lg text-xs">Cancel</button>
						</div>
					</div>
				{:else}
					<button
						onclick={() => goto(`/vault/${data.category.id}/${project.id}`)}
						class="tile tile-hover w-full text-left rounded-2xl flex flex-col justify-between"
						style="aspect-ratio: 1 / 1; padding: 1.25rem;"
					>
						<div></div>
						<div>
							<h3 class="font-semibold text-sm leading-snug" style="color: #D4B8E0;">{project.name}</h3>
							<p class="text-xs mt-1" style="color: rgba(153,229,234,0.5);">Open →</p>
						</div>
					</button>

					<div class="absolute top-2.5 right-2.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
						<button
							onclick={(e) => { e.stopPropagation(); editName = project.name; editingId = project.id; }}
							class="text-xs px-2 py-1 rounded-lg transition-colors"
							style="background: rgba(13,7,32,0.7); border: 1px solid rgba(212,184,224,0.2); color: rgba(212,184,224,0.7);"
						>Edit</button>
						<button
							onclick={(e) => { e.stopPropagation(); deleteProject(project.id); }}
							class="text-xs px-2 py-1 rounded-lg transition-colors"
							style="background: rgba(13,7,32,0.7); border: 1px solid rgba(239,68,68,0.2); color: rgba(252,165,165,0.7);"
						>Del</button>
					</div>
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
