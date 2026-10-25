<script lang="ts">
	import { goto } from '$app/navigation';
	import { readTemplatePref, writeTemplatePref } from '#lib/prefs.js';
	import type { Template } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let chosen = $state('');
	$effect(() => {
		chosen = readTemplatePref();
	});

	function choose(t: Template) {
		writeTemplatePref(t.id);
		chosen = t.id;
		goto('/');
	}
</script>

<svelte:head><title>Choose a flyer — Flyer Self-Service</title></svelte:head>

<div class="page">
	<header>
		<a class="back" href="/" aria-label="Back to the editor">←</a>
		<h1>Choose a flyer</h1>
	</header>

	{#if !data.templates.length}
		<p class="muted">No flyers available yet.</p>
	{:else}
		<p class="muted">Your pick is remembered on this device until you change it.</p>

		<ul>
			{#each data.templates as t (t.id)}
				<li>
					<button class:on={t.id === chosen} onclick={() => choose(t)}>
						<img src={t.url} alt="" loading="lazy" />
						<span>
							<strong>{t.label}</strong>
							{#if t.id === chosen}<small>Currently selected</small>{/if}
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</div>

<style>
	.page {
		max-width: 60rem;
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
	li button {
		width: 100%;
		display: grid;
		gap: 0.5rem;
		padding: 0.6rem;
		text-align: left;
		background: #121213;
	}
	li button.on {
		border-color: var(--gold);
	}
	img {
		width: 100%;
		aspect-ratio: 4 / 5;
		object-fit: contain;
		background: #000;
		border-radius: 6px;
		display: block;
	}
	span {
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
		color: var(--gold);
		font-size: 0.72rem;
	}
</style>
