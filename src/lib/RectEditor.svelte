<script lang="ts">
	import type { Rect } from '#lib/geometry.js';

	type Props = {
		rect: Rect;
		/** Preview pixels per template pixel. */
		scale: number;
		bounds: { width: number; height: number };
		label?: string;
		color?: string;
		children?: import('svelte').Snippet;
	};

	let {
		rect = $bindable(),
		scale,
		bounds,
		label = '',
		color = 'var(--gold)',
		children
	}: Props = $props();

	const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

	// Drag the body to move, the corner to resize. Two gestures cover every adjustment —
	// anything the eight-handle version would give you, you can reach by doing both.
	let drag: { mode: 'move' | 'resize'; x: number; y: number; start: Rect } | null = null;

	function begin(mode: 'move' | 'resize', e: PointerEvent) {
		e.preventDefault();
		e.stopPropagation();
		drag = { mode, x: e.clientX, y: e.clientY, start: { ...rect } };
		(e.currentTarget as Element).setPointerCapture(e.pointerId);
	}

	function move(e: PointerEvent) {
		if (!drag) return;
		const dx = (e.clientX - drag.x) / scale;
		const dy = (e.clientY - drag.y) / scale;
		const s = drag.start;

		if (drag.mode === 'move') {
			rect = {
				...rect,
				x: Math.round(clamp(s.x + dx, 0, bounds.width - s.w)),
				y: Math.round(clamp(s.y + dy, 0, bounds.height - s.h))
			};
		} else {
			rect = {
				...rect,
				w: Math.round(clamp(s.w + dx, 8, bounds.width - s.x)),
				h: Math.round(clamp(s.h + dy, 8, bounds.height - s.y))
			};
		}
	}

	const end = () => (drag = null);
</script>

<div
	class="rect"
	style:--c={color}
	style:left="{rect.x * scale}px"
	style:top="{rect.y * scale}px"
	style:width="{rect.w * scale}px"
	style:height="{rect.h * scale}px"
	onpointerdown={(e) => begin('move', e)}
	onpointermove={move}
	onpointerup={end}
	onpointercancel={end}
	role="application"
	aria-label="{label} — drag to move, drag the corner to resize"
>
	{#if label}<span class="tag">{label}</span>{/if}
	{@render children?.()}
	<button
		class="handle"
		aria-label="Resize {label}"
		onpointerdown={(e) => begin('resize', e)}
		onpointermove={move}
		onpointerup={end}
		onpointercancel={end}
	></button>
</div>

<style>
	.rect {
		position: absolute;
		border: 1px dashed var(--c);
		background: color-mix(in srgb, var(--c) 10%, transparent);
		cursor: move;
		touch-action: none;
		box-sizing: border-box;
	}

	.tag {
		position: absolute;
		top: -1.15rem;
		left: 0;
		font-size: 0.65rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--c);
		pointer-events: none;
		white-space: nowrap;
	}

	.handle {
		position: absolute;
		right: -7px;
		bottom: -7px;
		width: 14px;
		height: 14px;
		padding: 0;
		border: 1px solid #0008;
		border-radius: 3px;
		background: var(--c);
		cursor: nwse-resize;
		touch-action: none;
	}
</style>
