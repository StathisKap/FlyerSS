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

## Finding a flyer design

The burger drawer is a nav hub, not a list:

- **Choose a flyer** → `/templates`, a grid of the available designs. Picking one stores it
  in `localStorage`, so it stays selected across reloads and sessions until changed —
  which is what you want when one event runs for weeks.
- **All flyers** → `/flyers`, every flyer anyone has made, searchable by ambassador name or
  design. Tapping one opens it back up in the editor.
- **Previous flyers** stays below as the quick recent list it always was.

Two link shapes make this shareable, which beats expecting people to go hunting in a menu:

| link | does |
|---|---|
| `/?template=<id>` | opens the editor on that design **and** makes it the remembered pick |
| `/?flyer=<id>` | reopens that saved flyer for editing |

So a new event is a message to the group chat with a `?template=` link, not an announcement
that a menu item changed.

Opening a saved flyer switches the editor to *that* flyer's design without touching the
remembered default — editing last month's flyer shouldn't change what you get next time you
start a fresh one. A remembered design that has since been deleted or archived falls back to
the first available one rather than erroring.

## Admin panel

`/admin` is gated by a **second** password, `ADMIN_PASSWORD`, with its own cookie — the
team's shared `APP_PASSWORD` gets them the editor and nothing else, so nobody replaces a
template by accident. Both are needed: no session at all redirects to `/login` first.

Two tabs:

- **Templates** — upload, retune, archive or delete.
- **Flyers** — every saved flyer with a thumbnail, searchable by ambassador name or
  template, with download and delete.

## Templates

Templates live in MinIO at `templates/<id>/{template.png,template.json}` and are read at
request time, so adding one needs no deploy. The id is slugged from the name
(`Spring Ball` → `spring-ball`) and never changes afterwards, which is what keeps old
flyers pointing at the right artwork.

Uploading a PNG fills most of the config in by itself:

- `width`/`height` come from the file, and `exportScale` is set to 1 — export at the size
  you want the flyer to be and there is nothing to work out.
- **`window`** — the transparent hole the portrait shows through — is found by scanning the
  alpha channel for its bounding box. On the Crown Gala artwork this lands on
  `509×568 at (300, 264)`, pixel-identical to what ImageMagick reports.
- `nameBox` gets a first guess above the window; drag it into place on the preview, with
  sample text rendered live in the real font. Both boxes are draggable (body moves, corner
  resizes) and every number is editable in the form beside it.

Export the artwork with the photo area **fully transparent** and **no name baked in** — the
app draws the name itself.

`nameStyle.family` leads with Didot, which exists on macOS/iOS but not Android. Add a
webfont if the team uses Android phones.

### Archive vs delete

Deleting a template that flyers still reference would silently re-render them with whatever
template sorted first, so the API refuses it with a 409 naming the count. **Archive**
instead: it drops out of the editor's picker but still loads for the flyers that use it.
Delete is only allowed at zero usage.

### Migrating from the bundled folder

Templates used to be globbed from `src/lib/templates/` at build time. One `mc` copy moves
each one across, keeping the id so saved flyers still resolve:

```bash
mc cp src/lib/templates/vic/template.png  <alias>/<bucket>/templates/vic/template.png
mc cp src/lib/templates/vic/template.json <alias>/<bucket>/templates/vic/template.json
```

`vic` was migrated as-is, still declaring `556×694` with `exportScale: 2` even though its
PNG is now `1118×1402`. That is deliberate: saved flyers store the portrait transform in
template coordinates, so changing those numbers would reposition every existing flyer.
New uploads use native dimensions.

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
- **`.github/workflows/deploy.yaml`** has two halves with different triggers:
  - **`push` to `develop`** — patch-bumps the version, builds and pushes
    `harbor.stathis-kapnidis.com/flyers/flyerss:<version>`, writes that tag into
    `envs/dev/flyerss.yaml` in the ArgoCD repo, and opens the `develop -> main` promotion
    PR. Merging that PR is left to a human; it is the thing that moves prod.
  - **`pull_request_target` closed on `main`** — reads the tag `envs/dev/flyerss.yaml` is running and writes it to
    `envs/prod/flyerss.yaml`. **No rebuild**, so prod ships the exact image dev proved.

  The prod half must be `pull_request_target`, not `pull_request`: the dev build pushes a
  `chore(flyerss): bump to x.y.z [skip ci]` commit to `develop`, that commit becomes the head
  of the promotion PR, and GitHub honours `[skip ci]` on the head commit of `push` and
  `pull_request` events — so prod silently never deployed. `[skip ci]` does not apply to
  `pull_request_target`. It is still needed on the commit itself, to stop the push to
  `develop` retriggering the dev build forever. `workflow_dispatch` is there as a manual
  escape hatch for either environment.
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

One flyer record per project, not per download. The first download creates the record;
every download after that overwrites it, so a name typo fixed and re-downloaded four times
leaves one flyer, not five. A new record comes only from **New** in the drawer, or from a
fresh page load — the editor holds the current flyer id in memory and nothing persists it.
Opening a flyer from the drawer adopts it, so edits land back on that record.

On top of that, a download whose template, name, portrait and transform are all unchanged
skips the upload entirely. `createdAt` survives updates, so the drawer ordering is stable.

Re-saving a flyer whose portrait came from storage uploads no file, so the server copies
the stored object; every flyer owns its own `portrait.jpg`, `output.png` and `meta.json`
and stays editable even if the one it came from is deleted.

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
