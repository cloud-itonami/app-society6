# society6-ui-s6c9m2q1

`70-tools/etzhayyim-static-site` ベースの Society6 static portal component です。

- Host: `https://society6.etzhayyim.com`
- Focus:
  - COFOG wasm components access portal
  - Society6 policy proposal and implementation principles
  - AppShell v2 layout with standard header/footer

## UI Source

- Svelte source: `svelte/`
- Runtime static assets: `static/` (synced from `svelte/build` during `mage build`/`mage deploy`)

## COFOG Directory Aggregation

- Generated summary:
  - `svelte/static/data/cofog-directory-summary.json`
- Generate command:
  - `./70-tools/70-tools/70-tools/scripts/generate_cofog_directory_summary.sh`
