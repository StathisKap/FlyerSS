<script lang="ts">
	import RectEditor from '#lib/RectEditor.svelte';
	import { alphaOf, centerRect, detectWindow, type Rect } from '#lib/geometry.js';
	import { fitFontSize } from '#lib/templates.js';
	import type { NameStyle, Template, TemplateConfig } from '#lib/types.js';

	type Props = {
		/** Present when editing an existing template; absent when adding a new one. */
		existing?: Template;
		onsaved: (t: Template) => void;
		oncancel: () => void;
	};

	let { existing, onsaved, oncancel }: Props = $props();

	const DEFAULT_STYLE: NameStyle = {
		family: "Didot, 'Playfair Display', 'Times New Roman', serif",
		weight: '400',
		size: 52,
		color: '#ffffff',
		letterSpacing: 3,
		uppercase: true
	};

	// Read once on mount: the component is remounted whenever a different template is edited.
	// svelte-ignore state_referenced_locally
	const seed = existing;

	let label = $state(seed?.label ?? '');
	let width = $state(seed?.width ?? 0);
	let height = $state(seed?.height ?? 0);
	let exportScale = $state(seed?.exportScale ?? 1);
	let win = $state<Rect>(seed?.window ?? { x: 0, y: 0, w: 10, h: 10 });
	let nameBox = $state<Rect>(seed?.nameBox ?? { x: 0, y: 0, w: 10, h: 10 });
	let nameStyle = $state<NameStyle>({ ...(seed?.nameStyle ?? DEFAULT_STYLE) });

	let imageFile = $state<File | null>(null);
	let imageUrl = $state(seed?.url ?? '');
	let detected = $state('');
	let busy = $state(false);
	let error = $state('');
	let sample = $state('Jane Doe');

	let frame = $state<HTMLDivElement | null>(null);
	let frameW = $state(0);
	const scale = $derived(width && frameW ? frameW / width : 1);
	const bnds = $derived({ width, height });

	const shownSample = $derived(nameStyle.uppercase ? sample.toUpperCase() : sample);
	const measure =
		typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d')! : null;
	const previewFont = $derived.by(() => {
		if (!measure || !shownSample || !width) return nameStyle.size;
		return fitFontSize({ nameBox, nameStyle } as Template, shownSample, measure);
	});

	/** Read the PNG's size and find the transparent hole, so nothing has to be typed by hand. */
	async function onFile(e: Event) {
		const file = (e.target as HTMLInputElement).files?.[0];
		if (!file) return;
		error = '';
		imageFile = file;
		imageUrl = URL.createObjectURL(file);

		const img = new Image();
		img.src = imageUrl;
		await img.decode();

		width = img.naturalWidth;
		height = img.naturalHeight;
		exportScale = 1;

		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
		ctx.drawImage(img, 0, 0);
		const found = detectWindow(alphaOf(ctx.getImageData(0, 0, width, height).data), width, height);

		if (found) {
			win = found;
			detected = `Found a ${found.w}×${found.h} window at ${found.x}, ${found.y}`;
		} else {
			win = { x: Math.round(width * 0.25), y: Math.round(height * 0.25), w: Math.round(width * 0.5), h: Math.round(height * 0.5) };
			detected = 'No transparent area found — the portrait will not show through. Place the window by hand.';
		}

		// A sensible first guess above the window; it gets dragged into place anyway.
		nameBox = {
			x: Math.round(width * 0.07),
			y: Math.max(0, win.y - Math.round(height * 0.12)),
			w: Math.round(width * 0.86),
			h: Math.round(height * 0.085)
		};
		nameStyle.size = Math.round(nameBox.h * 0.86);
	}

	async function save() {
		if (!label.trim()) return (error = 'Give the template a name');
		if (!width || !height) return (error = 'Upload a template image first');

		busy = true;
		error = '';
		try {
			const config: TemplateConfig & { id?: string } = {
				id: existing?.id,
				label,
				width,
				height,
				exportScale,
				window: win,
				nameBox,
				nameStyle,
				archived: existing?.archived ?? false,
				createdAt: existing?.createdAt
			};

			const form = new FormData();
			if (imageFile) form.set('image', imageFile);
			form.set('config', JSON.stringify(config));

			const res = await fetch('/api/templates', { method: 'POST', body: form });
			if (!res.ok) throw new Error(await res.text());
			onsaved(await res.json());
		} catch (e) {
			error = (e as Error).message || 'Could not save the template';
		} finally {
			busy = false;
		}
	}
</script>

<section class="editor">
	<div class="pane">
		<label class="file">
			<input type="file" accept="image/png" onchange={onFile} hidden />
			<span>{imageUrl ? 'Replace image' : 'Choose template PNG'}</span>
		</label>

		{#if imageUrl}
			<div class="frame" bind:this={frame} bind:clientWidth={frameW} style:aspect-ratio="{width} / {height}">
				<img src={imageUrl} alt="" draggable="false" />

				<RectEditor bind:rect={win} {scale} bounds={bnds} label="Photo window" color="#6ea8ff" />

				<RectEditor bind:rect={nameBox} {scale} bounds={bnds} label="Name">
					<span
						class="sample"
						style:font-family={nameStyle.family}
						style:font-weight={nameStyle.weight}
						style:font-size="{previewFont * scale}px"
						style:color={nameStyle.color}
						style:letter-spacing="{(nameStyle.letterSpacing * previewFont * scale) / nameStyle.size}px"
					>
						{shownSample}
					</span>
				</RectEditor>
			</div>
			{#if detected}<p class="muted small">{detected}</p>{/if}
		{:else}
			<p class="muted small">
				Export the flyer as a PNG with the photo area fully transparent and no name on it — the
				window and the size are read straight off the file.
			</p>
		{/if}
	</div>

	<div class="pane fields">
		<label>Name <input type="text" bind:value={label} placeholder="Crown Gala" /></label>

		<label
			>Sample text <input type="text" bind:value={sample} placeholder="Jane Doe" /></label
		>

		<fieldset>
			<legend>Name style</legend>
			<label class="wide">Font <input type="text" bind:value={nameStyle.family} /></label>
			<div class="row">
				<label>Size <input type="number" bind:value={nameStyle.size} min="8" /></label>
				<label>Weight <input type="text" bind:value={nameStyle.weight} /></label>
			</div>
			<div class="row">
				<label>Tracking <input type="number" bind:value={nameStyle.letterSpacing} step="0.5" /></label>
				<label>Colour <input type="color" bind:value={nameStyle.color} /></label>
			</div>
			<label class="check">
				<input type="checkbox" bind:checked={nameStyle.uppercase} /> Uppercase
			</label>
		</fieldset>

		<fieldset>
			<legend>Photo window</legend>
			<div class="row">
				<label>x <input type="number" bind:value={win.x} /></label>
				<label>y <input type="number" bind:value={win.y} /></label>
			</div>
			<div class="row">
				<label>w <input type="number" bind:value={win.w} /></label>
				<label>h <input type="number" bind:value={win.h} /></label>
			</div>
			<div class="center">
				<span>Centre</span>
				<button onclick={() => (win = centerRect(win, bnds, 'x'))} title="Centre horizontally">↔</button>
				<button onclick={() => (win = centerRect(win, bnds, 'y'))} title="Centre vertically">↕</button>
				<button onclick={() => (win = centerRect(win, bnds, 'both'))} title="Centre both ways">✛</button>
			</div>
		</fieldset>

		<fieldset>
			<legend>Name box</legend>
			<div class="row">
				<label>x <input type="number" bind:value={nameBox.x} /></label>
				<label>y <input type="number" bind:value={nameBox.y} /></label>
			</div>
			<div class="row">
				<label>w <input type="number" bind:value={nameBox.w} /></label>
				<label>h <input type="number" bind:value={nameBox.h} /></label>
			</div>
			<div class="center">
				<span>Centre</span>
				<button onclick={() => (nameBox = centerRect(nameBox, bnds, 'x'))} title="Centre horizontally">↔</button>
				<button onclick={() => (nameBox = centerRect(nameBox, bnds, 'y'))} title="Centre vertically">↕</button>
				<button onclick={() => (nameBox = centerRect(nameBox, bnds, 'both'))} title="Centre both ways">✛</button>
			</div>
		</fieldset>

		<fieldset>
			<legend>Output</legend>
			<label
				>Export scale <input type="number" bind:value={exportScale} min="1" step="0.5" /></label
			>
			<p class="muted small">Output is {Math.round(width * exportScale)}×{Math.round(height * exportScale)}</p>
		</fieldset>

		{#if error}<p class="error">{error}</p>{/if}

		<div class="actions">
			<button onclick={oncancel}>Cancel</button>
			<button class="primary" onclick={save} disabled={busy || !width}>
				{busy ? 'Saving…' : existing ? 'Save changes' : 'Add template'}
			</button>
		</div>
	</div>
</section>

<style>
	.editor {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: 1.25rem;
		border: 1px solid var(--line);
		border-radius: 12px;
		padding: 1rem;
		background: #121213;
	}
	@media (min-width: 60rem) {
		.editor {
			grid-template-columns: minmax(0, 1fr) 20rem;
		}
	}

	.pane {
		display: grid;
		gap: 0.75rem;
		align-content: start;
		min-width: 0;
	}

	.file {
		justify-self: start;
		border: 1px dashed var(--gold);
		border-radius: 999px;
		padding: 0.5rem 1rem;
		color: var(--gold);
		cursor: pointer;
	}

	.frame {
		position: relative;
		width: 100%;
		background: #000;
		border-radius: 6px;
		overflow: hidden;
		touch-action: none;
	}
	.frame img {
		display: block;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.sample {
		position: absolute;
		inset: 0;
		display: grid;
		place-items: center;
		text-align: center;
		white-space: nowrap;
		pointer-events: none;
		line-height: 1;
	}

	.fields {
		gap: 0.6rem;
	}
	.fields label {
		display: grid;
		gap: 0.25rem;
		font-size: 0.8rem;
		color: var(--muted);
		min-width: 0;
	}
	.fields :global(input[type='text']),
	.fields :global(input[type='number']) {
		width: 100%;
		padding: 0.45rem 0.55rem;
		font-size: 0.9rem;
		color: var(--text);
		background: var(--panel);
		border: 1px solid var(--line);
		border-radius: 8px;
	}
	.center {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.center span {
		font-size: 0.8rem;
		color: var(--muted);
		margin-right: auto;
	}
	.center button {
		width: 2rem;
		height: 2rem;
		padding: 0;
		font-size: 0.95rem;
		line-height: 1;
	}

	.row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}
	fieldset {
		display: grid;
		gap: 0.5rem;
		border: 1px solid var(--line);
		border-radius: 10px;
		padding: 0.75rem;
		margin: 0;
	}
	legend {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--muted);
		padding: 0 0.35rem;
	}
	.check {
		grid-auto-flow: column;
		justify-content: start;
		align-items: center;
		gap: 0.4rem;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
		justify-content: flex-end;
	}
	.muted {
		color: var(--muted);
		margin: 0;
	}
	.small {
		font-size: 0.78rem;
	}
	.error {
		color: #ff8a8a;
		margin: 0;
		font-size: 0.85rem;
	}
</style>
