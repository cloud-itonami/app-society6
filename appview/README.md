# app-society6 — appview

## Components

- `society6-ui-s6c9m2q1`
  - host: `society6.etzhayyim.com` / `s6c9m2q1.etzhayyim.com`
  - content:
    - COFOG components access portal
    - Society6 policy proposals and design principles

## Build

**This tree does not currently install standalone.** `svelte/package.json`
declares `"@etzhayyim/design-system": "workspace:*"`, and this repo has no
`pnpm-workspace.yaml` and no such package, so pnpm stops with
`ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`. Its `pnpm-lock.yaml` is also out of date
with its own `package.json`, so `--frozen-lockfile` fails first.

The runnable part of this repo is `kotoba/` — see
[`../docs/operator-quickstart.md`](../docs/operator-quickstart.md).

Earlier revisions of this file documented `etzhayyim build`, `mage build` and
`kubectl apply -f k8s/http-routes.yaml`. None of those exist here: there is no
`k8s/` directory in this repo and neither binary is part of its toolchain.
Deployment is described by `society6-ui-s6c9m2q1/wrangler.jsonc`.
