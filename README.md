# FlyerSS — Flyer Self-Service

A two-field flyer maker. Upload a portrait, position it behind the template, type a name,
download the PNG.

## Run

```bash
cp .env.example .env   # fill in APP_PASSWORD, SESSION_SECRET, S3_*
npm install
npm run dev
```

`npm run check` typechecks, `npm test` runs the geometry self-checks, `npm run build`
produces a Node server in `build/` (`node build`).

## How it works

- **Auth** — one shared password from `APP_PASSWORD`. The cookie is
  `sha256(APP_PASSWORD:SESSION_SECRET)`, so there is no session store to keep and the
  session never expires. Changing either env var logs everyone out.
- **Storage** — MinIO only, no database. Each flyer is
  `flyers/<timestamp>-<rand>/{portrait.jpg,output.png,meta.json}`. The id starts with a
  sortable timestamp, so listing the prefixes gives newest-first ordering for free.
- **Editor** — plain DOM: the portrait is an `<img>` with a CSS transform, the template PNG
  sits on top of it, the name is positioned text. Export is a separate canvas pass at
  native resolution, so the zoom level never affects the output.
- **Images** are served through `/obj/<key>` rather than presigned URLs, which keeps them
  same-origin and the export canvas untainted.

## Controls

| | |
|---|---|
| Drag / one finger | move the portrait |
| Wheel / pinch | scale the portrait |
| `+` `−` bottom right | scale the portrait (one-handed, about the window centre) |
| Double-tap or double-click | reset the portrait to fill the window |
| `−` `100%` `+` | zoom the editor (⌘/ctrl + wheel too) |
| `Full` button | cycles Full → Wireframe → Hidden |

While the portrait is being moved, the template and name drop to 20% so you can see what
you are positioning.

## Templates

A template is a folder in `src/lib/templates/<id>/` with a `template.png` (transparent
where the portrait shows through) and a `template.json`. Drop in a second folder and it
appears automatically — no code changes.

```jsonc
{
  "width": 556, "height": 694,     // must match template.png exactly
  "exportScale": 2,                // output is width×height×this
  "window": { ... },               // the transparent hole: initial portrait fit + wireframe
  "nameBox": { ... },              // where the name is drawn, shrink-to-fit
  "nameStyle": { ... }             // family / weight / size / colour / tracking
}
```

Three things to know about `vic`:

- `template.png` is `~/Downloads/flyers-vic.png` with the baked-in "MOLLY MAE" painted
  out, since the app draws the name itself. **Re-export it from the PSD without the name
  layer** when convenient — the patch is a stretched row of background and will not
  survive close inspection.
- It is only 556×694, so `exportScale: 2` upscales the artwork. Export the PSD at
  1112×1388 (or larger, and bump `width`/`height`/`window`/`nameBox` to match) for a crisp
  result.
- `nameStyle.family` leads with Didot, which exists on macOS/iOS but not Android. Add a
  webfont if the team uses Android phones.

## Deployment

```
feature/*  --PR-->  develop  --PR-->  main
             CI        |                |
                   dev image        prod uses
                   built, dev       the tag dev
                   ArgoCD bumped    is running
```

- **`.github/workflows/ci.yaml`** gates every PR into `develop` or `main`:
  typecheck, tests, build, `helm lint`.
- **`.github/workflows/deploy.yaml`** runs on PR *merge*:
  - into `develop` — patch-bumps the version, builds and pushes
    `harbor.stathis-kapnidis.com/flyers/flyerss:<version>`, writes that tag into
    `envs/dev/flyerss.yaml` in the ArgoCD repo, and opens the `develop -> main` promotion
    PR. Merging that PR is left to a human; it is the thing that moves prod.
  - into `main` — reads the tag `envs/dev/flyerss.yaml` is running and writes it to
    `envs/prod/flyerss.yaml`. **No rebuild**, so prod ships the exact image dev proved.
- **`helmchart/flyerss/`** is the chart ArgoCD renders. `applicationsets/flyerss-appset.yaml`
  in the ArgoCD repo points `flyerss-dev` at the `develop` branch and `flyerss-prod` at
  `main`, with values from `envs/<env>/flyerss.yaml`.

### Login and CSRF

CSRF origin checking is **off** (`csrf.trustedOrigins: ['*']` in `vite.config.ts`).

SvelteKit rejects form POSTs whose `Origin` does not match the origin it believes it is
serving, and `adapter-node` assumes **https** unless a proxy sets `x-forwarded-proto`. Over
plain http — a `kubectl port-forward` on `localhost:8080`, say — `/login` returned
`403 Cross-site POST form submissions are forbidden`. The allowlist is baked in at build
time, so keeping it on would mean a rebuild every time a new URL needs to reach the app.

The trade: any website can make a logged-in browser POST to this app. It is an internal
tool behind a shared password, so that is an accepted risk rather than an overlooked one.
Re-enable by narrowing that array to the real origins.

### Saving

`adapter-node` caps request bodies at **512K** by default, and a saved flyer is a ~1.2 MB
multipart POST (rendered PNG + original portrait), so the save silently 413'd in the cluster
while working fine in dev, where Vite applies no limit. Both envs now set
`BODY_SIZE_LIMIT: "Infinity"`. The pod has a 512Mi memory cap, so an absurd upload is a
memory risk rather than a rejected request — fine for an internal tool, worth a real number
if it is ever exposed more widely.

The Download button also reports a failed save in the UI instead of swallowing it, which is
what made the 413 invisible in the first place.

Download saves only when something actually changed — template, name, portrait or its
transform. Re-downloading a flyer you just made, or one opened from the drawer and left
alone, produces the file again without adding another record. Re-saving a flyer opened from
the drawer uploads no portrait, so the server copies the stored one into the new flyer's
folder; every flyer owns its own `portrait.jpg`, `output.png` and `meta.json` and stays
editable even if the one it came from is deleted.

### Before the first deploy

1. Create the `flyers` project in Harbor and give `robot$ci` push access.
2. Add two keys to Infisical — `stathis-k3s-1-FLYERSS_APP_PASSWORD` and
   `stathis-k3s-1-FLYERSS_SESSION_SECRET`, in both the dev and prod environments. S3 reuses
   the existing `stathis-k3s-1-MINIO_ACCESS_KEY` / `..._SECRET_KEY` that listapp points at,
   so there is nothing new to create for storage. The build never needs any of them — a pod
   missing one answers every request with `500 Not configured: <names> not set`, so a
   misconfiguration is obvious rather than silently accepting an empty password.
3. Create the `flyerss-dev` and `flyerss-prod` buckets in the cluster MinIO.
4. Give the repo the same secrets and vars ListApp has: secrets `GH_TOKEN`,
   `HARBOR_PASSWORD`, `CF_ACCESS_CLIENT_ID`, `CF_ACCESS_CLIENT_SECRET`; vars `HARBOR_URL`,
   `HARBOR_USERNAME`. They are per-repo, so a new repo starts with none.

The app needs a Node runtime and network access to MinIO. In the cluster that is
`S3_ENDPOINT=http://minio.minio.svc.cluster.local` — MinIO has no ingress, so local dev
either uses the `local` mc alias (what `.env` points at now) or
`kubectl port-forward svc/minio -n minio 9000:80`.
