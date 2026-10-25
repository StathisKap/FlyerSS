<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Admin — Flyer Self-Service</title></svelte:head>

<main>
	<h1>Admin</h1>
	<form method="POST" use:enhance>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			name="password"
			type="password"
			placeholder="Admin password"
			autocomplete="current-password"
			autofocus
		/>
		<button class="primary" type="submit">Enter</button>
	</form>
	{#if form?.error}<p class="error">{form.error}</p>{/if}
	<a href="/">Back to the editor</a>
</main>

<style>
	main {
		min-height: 100dvh;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 1.25rem;
		padding: 2rem;
	}
	h1 {
		font-family: Didot, 'Playfair Display', Georgia, serif;
		font-weight: 400;
		font-size: 2rem;
		letter-spacing: 0.06em;
		margin: 0;
	}
	form {
		display: grid;
		gap: 0.75rem;
		width: min(20rem, 80vw);
	}
	.error {
		color: #ff8a8a;
		margin: 0;
	}
	a {
		color: var(--muted);
		font-size: 0.9rem;
	}
</style>
