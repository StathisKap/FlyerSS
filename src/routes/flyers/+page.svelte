<script lang="ts">
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let query = $state('');

	const labelOf = (id: string) => data.templates.find((t) => t.id === id)?.label ?? id;

	const matches = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return data.flyers;
		return data.flyers.filter(
			(f) => f.name.toLowerCase().includes(q) || labelOf(f.templateId).toLowerCase().includes(q)
		);
	});

	const when = (iso: string) =>
		new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
</script>

<svelte:head><title>All flyers — Flyer Self-Service</title></svelte:head>

<div class="page">
	<header>
		<a class="back" href="/" aria-label="Back to the editor">←</a>
		<h1>All flyers</h1>
	</header>

	<div class="bar">
		<input type="text" bind:value={query} placeholder="Search by name or flyer" />
		<span class="muted">{matches.length} of {data.flyers.length}</span>
	</div>

	{#if !matches.length}
		<p class="muted">{data.flyers.length ? 'Nothing matches that.' : 'No flyers made yet.'}</p>
	{/if}

	<ul>
		{#each matches as f (f.id)}
			<li>
				<a class="card" href="/?flyer={f.id}">
					<img src="/obj/{f.outputKey}" alt={f.name} loading="lazy" />
					<span>
						<strong>{f.name || 'Untitled'}</strong>
						<small>{labelOf(f.templateId)}</small>
						<small>{when(f.createdAt)}</small>
					</span>
				</a>
				<a class="dl" href="/obj/{f.outputKey}" download="{f.name || 'flyer'}.png">Download</a>
			</li>
		{/each}
	</ul>
</div>

<style>
	.page {
		max-width: 72rem;
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
		gap: 0.75rem;
	}
	.back {
		width: 2.5rem;
		height: 2.5rem;
		display: grid;
		place-items: center;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--panel);
		color: var(--text);
		text-decoration: none;
		flex: none;
	}
	h1 {
		font-family: Didot, 'Playfair Display', Georgia, serif;
		font-weight: 400;
		font-size: 1.5rem;
		letter-spacing: 0.04em;
		margin: 0;
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
	.muted {
		color: var(--muted);
		margin: 0;
		font-size: 0.9rem;
	}

	ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(10rem, 1fr));
		gap: 0.9rem;
	}
	li {
		display: grid;
		gap: 0.4rem;
		padding: 0.6rem;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: #121213;
		align-content: start;
	}
	.card {
		display: grid;
		gap: 0.5rem;
		color: inherit;
		text-decoration: none;
		min-width: 0;
	}
	img {
		width: 100%;
		aspect-ratio: 4 / 5;
		object-fit: contain;
		background: #000;
		border-radius: 6px;
		display: block;
	}
	.card span {
		display: grid;
		gap: 0.1rem;
		min-width: 0;
	}
	strong,
	small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	small {
		color: var(--muted);
		font-size: 0.72rem;
	}
	.dl {
		text-align: center;
		padding: 0.35rem 0.5rem;
		font-size: 0.78rem;
		border: 1px solid var(--line);
		border-radius: 8px;
		background: var(--panel);
		color: var(--text);
		text-decoration: none;
	}
</style>
