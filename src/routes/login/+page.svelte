<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { form }: PageProps = $props();
</script>

<svelte:head><title>Flyer Self-Service</title></svelte:head>

<main>
	<h1>Flyer<span>SS</span></h1>
	<form method="POST" use:enhance>
		<!-- svelte-ignore a11y_autofocus -->
		<input
			name="password"
			type="password"
			placeholder="Password"
			autocomplete="current-password"
			autofocus
		/>
		<button type="submit">Enter</button>
	</form>
	{#if form?.error}<p class="error">{form.error}</p>{/if}
</main>

<style>
	main {
		min-height: 100dvh;
		display: grid;
		place-content: center;
		justify-items: center;
		gap: 1.5rem;
		padding: 2rem;
	}
	h1 {
		font-family: Didot, 'Playfair Display', Georgia, serif;
		font-weight: 400;
		font-size: 2.5rem;
		letter-spacing: 0.06em;
		margin: 0;
	}
	h1 span {
		color: var(--gold);
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
</style>
