<script lang="ts">
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

{@render children()}

<style>
	:global(:root) {
		--bg: #0c0c0d;
		--panel: #171718;
		--line: #2a2a2c;
		--text: #ededed;
		--muted: #8b8b90;
		--gold: #d6a84a;
		color-scheme: dark;
	}

	:global(*) {
		box-sizing: border-box;
	}

	:global(html, body) {
		margin: 0;
		height: 100%;
		overscroll-behavior: none;
	}

	:global(body) {
		background: var(--bg);
		color: var(--text);
		font: 15px/1.4 -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	:global(input, button) {
		font: inherit;
		color: inherit;
	}

	:global(input[type='text'], input[type='password']) {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 0.7rem 0.9rem;
		min-width: 0;
	}

	:global(input:focus-visible, button:focus-visible) {
		outline: 2px solid var(--gold);
		outline-offset: 2px;
	}

	:global(button) {
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 0.7rem 1rem;
		cursor: pointer;
	}

	:global(button.primary) {
		background: var(--gold);
		border-color: var(--gold);
		color: #1a1206;
		font-weight: 600;
	}

	:global(button:disabled) {
		opacity: 0.45;
		cursor: default;
	}
</style>
