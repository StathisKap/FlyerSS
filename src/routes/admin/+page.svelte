<script lang="ts">
	import TemplateEditor from '#lib/TemplateEditor.svelte';
	import type { FlyerMeta, Template } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally -- server load is the starting point; mutated locally after
	let templates = $state<Template[]>(data.templates);
	// svelte-ignore state_referenced_locally
	let flyers = $state<FlyerMeta[]>(data.flyers);

	let tab = $state<'templates' | 'flyers'>('templates');
	let editing = $state<Template | 'new' | null>(null);
	let query = $state('');
	let busy = $state('');
	let error = $state('');

	const labelOf = (id: string) => templates.find((t) => t.id === id)?.label ?? id;

	const matches = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return flyers;
		return flyers.filter(
			(f) =>
				f.name.toLowerCase().includes(q) || labelOf(f.templateId).toLowerCase().includes(q)
		);
	});

	function saved(t: Template) {
		const known = templates.some((x) => x.id === t.id);
		templates = known ? templates.map((x) => (x.id === t.id ? t : x)) : [...templates, t];
		templates.sort((a, b) => a.label.localeCompare(b.label));
		editing = null;
	}

	async function setArchived(t: Template, archived: boolean) {
		busy = t.id;
		error = '';
		try {
			const res = await fetch(`/api/templates/${t.id}`, {
				method: 'PATCH',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ archived })
			});
			if (!res.ok) throw new Error(await res.text());
			const next: Template = await res.json();
			templates = templates.map((x) => (x.id === t.id ? next : x));
		} catch (e) {
			error = (e as Error).message;
		} finally {
			busy = '';
		}
	}

	async function destroy(t: Template) {
		busy = t.id;
		error = '';
		try {
			const res = await fetch(`/api/templates/${t.id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error(await res.text());
			templates = templates.filter((x) => x.id !== t.id);
		} catch (e) {
			// the server refuses while flyers still point at it, and says how many
			error = (e as Error).message;
		} finally {
			busy = '';
		}
	}

	async function removeFlyer(f: FlyerMeta) {
		await fetch(`/api/flyers/${f.id}`, { method: 'DELETE' });
		flyers = flyers.filter((x) => x.id !== f.id);
	}

	const usedBy = (id: string) => flyers.filter((f) => f.templateId === id).length;

	const when = (iso: string) =>
		new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
</script>

<svelte:head><title>Admin — Flyer Self-Service</title></svelte:head>

<div class="page">
	<header>
		<h1>Admin</h1>
		<nav>
			<button class:on={tab === 'templates'} onclick={() => (tab = 'templates')}>
				Templates <small>{templates.length}</small>
			</button>
			<button class:on={tab === 'flyers'} onclick={() => (tab = 'flyers')}>
				Flyers <small>{flyers.length}</small>
			</button>
		</nav>
		<a class="exit" href="/">Editor →</a>
	</header>

	{#if error}
		<button class="error" onclick={() => (error = '')}>{error}</button>
	{/if}

	{#if tab === 'templates'}
		{#if editing}
			<TemplateEditor
				existing={editing === 'new' ? undefined : editing}
				onsaved={saved}
				oncancel={() => (editing = null)}
			/>
		{:else}
			<div class="bar">
				<button class="primary" onclick={() => (editing = 'new')}>Add template</button>
			</div>

			{#if !templates.length}
				<p class="muted">No templates yet. Add one to get the editor working.</p>
			{/if}

			<ul class="grid">
				{#each templates as t (t.id)}
					<li class:archived={t.archived}>
						<img src={t.url} alt="" loading="lazy" />
						<div class="meta">
							<strong>{t.label}</strong>
							<small>{t.width}×{t.height} · {usedBy(t.id)} flyer{usedBy(t.id) === 1 ? '' : 's'}</small>
							{#if t.archived}<small class="flag">Archived</small>{/if}
						</div>
						<div class="actions">
							<button onclick={() => (editing = t)} disabled={busy === t.id}>Edit</button>
							<button onclick={() => setArchived(t, !t.archived)} disabled={busy === t.id}>
								{t.archived ? 'Restore' : 'Archive'}
							</button>
							<button onclick={() => destroy(t)} disabled={busy === t.id}>Delete</button>
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	{:else}
		<div class="bar">
			<input type="text" bind:value={query} placeholder="Search by ambassador or template" />
			<span class="muted">{matches.length} of {flyers.length}</span>
		</div>

		{#if !matches.length}
			<p class="muted">{flyers.length ? 'Nothing matches that.' : 'No flyers made yet.'}</p>
		{/if}

		<ul class="grid">
			{#each matches as f (f.id)}
				<li>
					<a href="/obj/{f.outputKey}" target="_blank" rel="noopener">
						<img src="/obj/{f.outputKey}" alt={f.name} loading="lazy" />
					</a>
					<div class="meta">
						<strong>{f.name || 'Untitled'}</strong>
						<small>{labelOf(f.templateId)}</small>
						<small>{when(f.createdAt)}</small>
					</div>
					<div class="actions">
						<a class="btn" href="/obj/{f.outputKey}" download="{f.name || 'flyer'}.png">Download</a>
						<button onclick={() => removeFlyer(f)}>Delete</button>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.page {
		max-width: 76rem;
		margin: 0 auto;
		padding: 1rem;
		padding-top: calc(1rem + env(safe-area-inset-top));
		display: grid;
		gap: 1rem;
		align-content: start;
	}

	header {
		display: flex;
		align-items: center;
		gap: 1rem;
		flex-wrap: wrap;
	}
	h1 {
		font-family: Didot, 'Playfair Display', Georgia, serif;
		font-weight: 400;
		font-size: 1.6rem;
		letter-spacing: 0.06em;
		margin: 0;
	}
	nav {
		display: flex;
		gap: 0.4rem;
	}
	nav button {
		padding: 0.45rem 0.8rem;
		font-size: 0.9rem;
		color: var(--muted);
	}
	nav button.on {
		color: var(--text);
		border-color: var(--gold);
	}
	nav small {
		opacity: 0.6;
		margin-left: 0.3rem;
	}
	.exit {
		margin-left: auto;
		color: var(--muted);
		font-size: 0.9rem;
	}

	.bar {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}
	.bar input {
		flex: 1;
		max-width: 28rem;
	}

	.grid {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
		gap: 0.9rem;
	}
	.grid li {
		display: grid;
		gap: 0.5rem;
		padding: 0.6rem;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: #121213;
		align-content: start;
	}
	.grid li.archived {
		opacity: 0.55;
	}
	.grid img {
		width: 100%;
		aspect-ratio: 4 / 5;
		object-fit: contain;
		background: #000;
		border-radius: 6px;
		display: block;
	}
	.meta {
		display: grid;
		gap: 0.1rem;
		min-width: 0;
	}
	.meta strong,
	.meta small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.meta small {
		color: var(--muted);
		font-size: 0.75rem;
	}
	.flag {
		color: var(--gold) !important;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.actions button,
	.actions .btn {
		flex: 1;
		padding: 0.35rem 0.5rem;
		font-size: 0.78rem;
		text-align: center;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--panel);
		color: var(--text);
		cursor: pointer;
		white-space: nowrap;
	}

	.muted {
		color: var(--muted);
	}

	.error {
		width: 100%;
		border: 1px solid #7a2e2e;
		border-radius: 10px;
		background: #4a1d1d;
		color: #ffc9c9;
		padding: 0.6rem 0.75rem;
		text-align: left;
		cursor: pointer;
	}
</style>
