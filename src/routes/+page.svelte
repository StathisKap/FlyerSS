<script lang="ts">
	import { templates, templateById, fitFontSize, type Template } from '#lib/templates.js';
	import { loadImage, renderFlyer, slug } from '#lib/render.js';
	import { coverWindow, scaleAbout, type Transform } from '#lib/geometry.js';
	import type { FlyerMeta } from '#lib/types.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let template = $state<Template>(templates[0]);
	// svelte-ignore state_referenced_locally -- server load is the initial list; we mutate it locally after
	let flyers = $state<FlyerMeta[]>(data.flyers);

	let portrait = $state<HTMLImageElement | null>(null);
	let portraitFile = $state<File | null>(null);
	let tr = $state<Transform>({ x: 0, y: 0, scale: 1 });
	let name = $state('');

	let zoom = $state(1);
	let mode = $state<'full' | 'wireframe' | 'hidden'>('full');
	let moving = $state(false);
	let drawerOpen = $state(false);
	let saving = $state(false);

	let stageW = $state(0);
	let stageH = $state(0);
	let flyerEl = $state<HTMLDivElement | null>(null);

	// Flyer is laid out at native px then scaled; fit = "100%" zoom.
	const fit = $derived(
		stageW && stageH
			? Math.min((stageW - 32) / template.width, (stageH - 32) / template.height)
			: 1
	);
	const displayScale = $derived(fit * zoom);

	const shownName = $derived(template.nameStyle.uppercase ? name.toUpperCase() : name);
	const measure = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d')! : null;
	const fontSize = $derived(
		measure && shownName ? fitFontSize(template, shownName, measure) : template.nameStyle.size
	);

	function reset() {
		if (portrait) tr = coverWindow(template.window, portrait.naturalWidth, portrait.naturalHeight);
	}

	async function setPortrait(src: string, file: File | null, transform?: Transform) {
		const img = await loadImage(src);
		portrait = img;
		portraitFile = file;
		tr = transform ?? coverWindow(template.window, img.naturalWidth, img.naturalHeight);
	}

	function onFile(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (file) setPortrait(URL.createObjectURL(file), file);
	}

	// ---- pointer interaction: one finger moves the portrait, two scale it ----
	const pointers = new Map<number, { x: number; y: number }>();
	let last: { mid: { x: number; y: number }; dist: number } | null = null;
	let lastTap = 0;

	const mid = (p: { x: number; y: number }[]) => ({
		x: (p[0].x + (p[1]?.x ?? p[0].x)) / 2,
		y: (p[0].y + (p[1]?.y ?? p[0].y)) / 2
	});
	const dist = (p: { x: number; y: number }[]) =>
		p.length < 2 ? 0 : Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);

	function toFlyer(pt: { x: number; y: number }) {
		const r = flyerEl!.getBoundingClientRect();
		return { x: (pt.x - r.left) / displayScale, y: (pt.y - r.top) / displayScale };
	}

	function pinch(pt: { x: number; y: number }, ratio: number) {
		tr = scaleAbout(tr, toFlyer(pt), ratio);
	}

	function down(e: PointerEvent) {
		if (!portrait) return;
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		try {
			(e.target as Element).setPointerCapture(e.pointerId);
		} catch {
			// a pointer that vanished mid-gesture must not take the drag down with it
		}
		const pts = [...pointers.values()];
		last = { mid: mid(pts), dist: dist(pts) };
		moving = true;

		const now = Date.now();
		if (pointers.size === 1 && now - lastTap < 300) reset();
		lastTap = now;
	}

	function move(e: PointerEvent) {
		if (!pointers.has(e.pointerId) || !last) return;
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		const pts = [...pointers.values()];
		const m = mid(pts);
		const d = dist(pts);

		if (pts.length >= 2 && last.dist > 0) pinch(m, d / last.dist);
		tr = {
			...tr,
			x: tr.x + (m.x - last.mid.x) / displayScale,
			y: tr.y + (m.y - last.mid.y) / displayScale
		};
		last = { mid: m, dist: d };
	}

	function up(e: PointerEvent) {
		pointers.delete(e.pointerId);
		const pts = [...pointers.values()];
		last = pts.length ? { mid: mid(pts), dist: dist(pts) } : null;
		if (!pts.length) moving = false;
	}

	/** Grow/shrink the portrait about the middle of the template's window. */
	function sizeBy(ratio: number) {
		if (!portrait) return;
		const w = template.window;
		tr = scaleAbout(tr, { x: w.x + w.w / 2, y: w.y + w.h / 2 }, ratio);
		moving = true;
		clearTimeout(sizeTimer);
		sizeTimer = setTimeout(() => (moving = false), 400);
	}
	let sizeTimer: ReturnType<typeof setTimeout>;

	function wheel(e: WheelEvent) {
		e.preventDefault();
		if (e.ctrlKey || e.metaKey) {
			zoom = Math.min(4, Math.max(0.25, zoom * (1 - e.deltaY / 400)));
			return;
		}
		if (!portrait) return;
		moving = true;
		pinch({ x: e.clientX, y: e.clientY }, 1 - e.deltaY / 500);
		clearTimeout(wheelTimer);
		wheelTimer = setTimeout(() => (moving = false), 300);
	}
	let wheelTimer: ReturnType<typeof setTimeout>;

	// ---- save + download ----
	async function download() {
		saving = true;
		try {
			const blob = await renderFlyer(template, portrait, tr, name);

			const form = new FormData();
			if (portraitFile) form.set('portrait', portraitFile);
			form.set('output', blob, 'output.png');
			form.set('meta', JSON.stringify({ name, templateId: template.id, transform: tr }));
			const saved = await fetch('/api/flyers', { method: 'POST', body: form });
			if (saved.ok) flyers = [await saved.json(), ...flyers];

			const a = document.createElement('a');
			a.href = URL.createObjectURL(blob);
			a.download = `${slug(name)}.png`;
			a.click();
			URL.revokeObjectURL(a.href);
		} finally {
			saving = false;
		}
	}

	async function open(f: FlyerMeta) {
		template = templateById(f.templateId);
		name = f.name;
		await setPortrait(`/obj/${f.portraitKey}`, null, f.transform);
		drawerOpen = false;
	}

	async function remove(f: FlyerMeta) {
		await fetch(`/api/flyers/${f.id}`, { method: 'DELETE' });
		flyers = flyers.filter((x) => x.id !== f.id);
	}

	function newFlyer() {
		portrait = null;
		portraitFile = null;
		name = '';
		zoom = 1;
		drawerOpen = false;
	}

	const cycle = () =>
		(mode = mode === 'full' ? 'wireframe' : mode === 'wireframe' ? 'hidden' : 'full');

	const when = (iso: string) =>
		new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
</script>

<svelte:head><title>Flyer Self-Service</title></svelte:head>

<div class="app">
	<header>
		<button class="icon" onclick={() => (drawerOpen = true)} aria-label="Previous flyers">☰</button>
		<div class="spacer"></div>
		<button class="icon" onclick={() => (zoom = Math.max(0.25, zoom - 0.25))} aria-label="Zoom out">−</button>
		<button class="zoom" onclick={() => (zoom = 1)}>{Math.round(zoom * 100)}%</button>
		<button class="icon" onclick={() => (zoom = Math.min(4, zoom + 0.25))} aria-label="Zoom in">+</button>
		<button class="icon wide" onclick={cycle} title="Template visibility">{mode}</button>
	</header>

	<div class="stage" bind:clientWidth={stageW} bind:clientHeight={stageH} onwheel={wheel}>
		<div
			class="flyer"
			role="application"
			aria-label="Flyer editor — drag to move the portrait, pinch to scale"
			bind:this={flyerEl}
			style:width="{template.width}px"
			style:height="{template.height}px"
			style:transform="translate(-50%, -50%) scale({displayScale})"
			onpointerdown={down}
			onpointermove={move}
			onpointerup={up}
			onpointercancel={up}
		>
			{#if portrait}
				<img
					class="portrait"
					src={portrait.src}
					alt=""
					draggable="false"
					style:transform="translate({tr.x}px, {tr.y}px) scale({tr.scale})"
				/>
			{/if}

			{#if mode === 'full'}
				<img class="template" src={template.url} alt="" class:faded={moving} draggable="false" />
			{:else if mode === 'wireframe'}
				<svg class="template wire" viewBox="0 0 {template.width} {template.height}">
					<rect x="1" y="1" width={template.width - 2} height={template.height - 2} />
					<rect
						x={template.window.x}
						y={template.window.y}
						width={template.window.w}
						height={template.window.h}
					/>
				</svg>
			{/if}

			{#if mode !== 'hidden' && shownName}
				<div
					class="name"
					class:faded={moving}
					style:left="{template.nameBox.x}px"
					style:top="{template.nameBox.y}px"
					style:width="{template.nameBox.w}px"
					style:height="{template.nameBox.h}px"
					style:font-family={template.nameStyle.family}
					style:font-weight={template.nameStyle.weight}
					style:font-size="{fontSize}px"
					style:color={template.nameStyle.color}
					style:letter-spacing="{(template.nameStyle.letterSpacing * fontSize) /
						template.nameStyle.size}px"
				>
					{shownName}
				</div>
			{/if}

			{#if !portrait}
				<label class="drop">
					<input type="file" accept="image/*" onchange={onFile} hidden />
					<span>Add portrait</span>
				</label>
			{/if}
		</div>

		{#if portrait}
			<div class="size" title="Portrait size">
				<button onclick={() => sizeBy(1.12)} aria-label="Portrait bigger">+</button>
				<button onclick={() => sizeBy(1 / 1.12)} aria-label="Portrait smaller">−</button>
			</div>
		{/if}
	</div>

	<footer style:padding-bottom="calc(0.75rem + env(safe-area-inset-bottom))">
		<input type="text" bind:value={name} placeholder="Name" autocomplete="off" />
		{#if portrait}
			<label class="icon swap" title="Replace portrait">
				<input type="file" accept="image/*" onchange={onFile} hidden />⟳
			</label>
		{/if}
		<button class="primary" onclick={download} disabled={!portrait || !name.trim() || saving}>
			{saving ? 'Saving…' : 'Download'}
		</button>
	</footer>
</div>

{#if drawerOpen}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="scrim" onclick={() => (drawerOpen = false)}></div>
	<aside>
		<div class="drawer-head">
			<strong>Previous flyers</strong>
			<button onclick={newFlyer}>New</button>
		</div>
		{#if !flyers.length}
			<p class="muted">Nothing saved yet.</p>
		{/if}
		<ul>
			{#each flyers as f (f.id)}
				<li>
					<button class="card" onclick={() => open(f)}>
						<img src="/obj/{f.outputKey}" alt="" loading="lazy" />
						<span>
							<strong>{f.name || 'Untitled'}</strong>
							<small>{when(f.createdAt)}</small>
						</span>
					</button>
					<button class="icon" onclick={() => remove(f)} aria-label="Delete">✕</button>
				</li>
			{/each}
		</ul>
	</aside>
{/if}

<style>
	.app {
		height: 100dvh;
		display: grid;
		grid-template-rows: auto 1fr auto;
	}

	header {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.6rem 0.75rem calc(0.6rem - 2px);
		padding-top: calc(0.6rem + env(safe-area-inset-top));
	}
	.spacer {
		flex: 1;
	}

	:global(button).icon {
		width: 2.5rem;
		height: 2.5rem;
		padding: 0;
		display: grid;
		place-items: center;
		line-height: 1;
	}
	:global(button).icon.wide,
	.zoom {
		width: auto;
		min-width: 3.5rem;
		padding: 0 0.6rem;
		height: 2.5rem;
		font-size: 0.8rem;
		text-transform: capitalize;
		color: var(--muted);
	}

	.stage {
		position: relative;
		overflow: hidden;
		display: grid;
		place-items: center;
		touch-action: none;
	}

	.flyer {
		/* absolute so the native-size box never widens the page — only its scaled image shows */
		position: absolute;
		top: 50%;
		left: 50%;
		overflow: hidden;
		background: #000;
		box-shadow: 0 10px 40px #0009;
		touch-action: none;
		user-select: none;
	}

	.portrait {
		position: absolute;
		top: 0;
		left: 0;
		transform-origin: 0 0;
		-webkit-user-drag: none;
	}

	.template {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		transition: opacity 0.15s;
	}
	.template.faded {
		opacity: 0.2;
	}
	.wire rect {
		fill: none;
		stroke: var(--gold);
		stroke-width: 2;
	}

	.name {
		position: absolute;
		display: grid;
		place-items: center;
		text-align: center;
		white-space: nowrap;
		pointer-events: none;
		transition: opacity 0.15s;
	}
	.name.faded {
		opacity: 0.2;
	}

	.drop {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		cursor: pointer;
	}
	.drop span {
		background: #000c;
		border: 1px dashed var(--gold);
		border-radius: 999px;
		padding: 0.6rem 1.2rem;
		color: var(--gold);
	}

	footer {
		display: flex;
		gap: 0.5rem;
		padding: 0.75rem;
		border-top: 1px solid var(--line);
		background: #0c0c0dcc;
		backdrop-filter: blur(12px);
	}
	footer input {
		flex: 1;
		min-width: 4rem;
	}
	.swap {
		flex: none;
		width: 2.75rem;
		height: 2.75rem;
		display: grid;
		place-items: center;
		font-size: 1.1rem;
		line-height: 1;
		border: 1px solid var(--line);
		border-radius: 10px;
		background: var(--panel);
		cursor: pointer;
	}

	.size {
		position: absolute;
		right: 0.75rem;
		bottom: 0.75rem;
		display: grid;
		gap: 0.35rem;
	}
	.size button {
		width: 2.75rem;
		height: 2.75rem;
		padding: 0;
		font-size: 1.25rem;
		line-height: 1;
		background: #171718e6;
		backdrop-filter: blur(8px);
	}

	.scrim {
		position: fixed;
		inset: 0;
		background: #000a;
	}

	aside {
		position: fixed;
		inset: 0 auto 0 0;
		width: min(20rem, 85vw);
		background: var(--panel);
		border-right: 1px solid var(--line);
		padding: 1rem;
		padding-top: calc(1rem + env(safe-area-inset-top));
		overflow-y: auto;
	}
	.drawer-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}
	.muted {
		color: var(--muted);
	}
	aside ul {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.5rem;
	}
	aside li {
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}
	.card {
		flex: 1;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		text-align: left;
		padding: 0.5rem;
		overflow: hidden;
	}
	.card img {
		width: 2.6rem;
		aspect-ratio: 4 / 5;
		object-fit: cover;
		border-radius: 4px;
		background: #000;
	}
	.card span {
		display: grid;
		min-width: 0;
	}
	.card strong,
	.card small {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.card small {
		color: var(--muted);
	}
</style>
