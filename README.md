<div align="center">

![Sri Lanka Bank Coverage](assets/readme-banner.svg)

**An interactive workspace for understanding bank networks across Sri Lanka.**

[Explore the app](https://sri-lanka-bank-coverage.vercel.app/) · [Get started](#get-started) · [Features](#features) · [Privacy](#privacy)

![JavaScript](https://img.shields.io/badge/JavaScript-ES_modules-f7df1e?style=flat-square&logo=javascript&logoColor=171717)
![Leaflet](https://img.shields.io/badge/Maps-Leaflet-199900?style=flat-square&logo=leaflet&logoColor=white)
![Frontend](https://img.shields.io/badge/Architecture-Frontend_only-1769dc?style=flat-square)
![Vercel](https://img.shields.io/badge/Hosting-Vercel-102642?style=flat-square&logo=vercel)

</div>

---

## A clearer view of the network

Move from national comparisons to individual districts, explore available branch locations, and present geographic views in a focused map interface. Built for straightforward browsing on desktops, tablets and phones.

> **Public project overview.** This README contains no internal planning figures, proposed sites, private document contents or access credentials. Restricted views require authorized access.

## Features

### 🗺️ Compare bank coverage

- Switch between Commercial Bank, Bank of Ceylon and People’s Bank, or compare all three.
- Explore Sri Lanka through an interactive district map.
- Choose district totals or available directory branch pins, with their different sources and coverage clearly labelled.
- Focus a district, inspect location details and toggle street-map tiles.

### 📍 Explore planning scenarios

- Navigate phase-based map layers and network formats.
- Browse a searchable reference datasheet with details that expand in place.
- Review source notes and candidate-location status alongside the relevant information.
- Keep the selected map position when changing planning years.

### 🖥️ Present comfortably

- Fullscreen maps with clear controls and a fit-to-selection action.
- Shared navigation between comparison and planning views.
- Responsive layouts for phones and tablets.
- Search, filtering, readable legends and password visibility controls.

## Get started

Install **Node.js 20 or newer**, then clone the project:

```bash
git clone https://github.com/ThisulHerath/sri-lanka-bank-coverage.git
cd sri-lanka-bank-coverage
npm run dev
```

Open **http://127.0.0.1:5173/** and keep the terminal running while using the app.

The frontend uses browser-native JavaScript modules and locally vendored mapping libraries. No application backend or paid map API key is required. Private content is not included as plaintext in the public project; authorized access material is shared separately.

### Useful commands

```bash
npm run dev      # Start the local development server
npm run check    # Validate JavaScript and available datasets
npm run build    # Create the static site in dist/
npm run preview  # Preview the built site locally
```

Stop a local server with **Ctrl+C**. Development and preview use the same default port, so stop one before starting the other.

## Project structure

```text
.
├── index.html          # Bank comparison
├── planner.html        # Expansion planning interface
├── directory.html      # Earlier public directory reference
├── src/                # UI, styles, map controls and browser modules
├── assets/             # Public geography, reference data and encrypted packages
├── vendor/             # Vendored mapping libraries and their licenses
├── scripts/            # Local server, build and validation utilities
└── dist/               # Generated deployment output; ignored by Git
```

## Privacy

- Keep unencrypted internal documents, planning data and credentials out of public source files, screenshots and documentation.
- The private working directory and Word inputs are excluded by the repository and deployment ignore rules.
- Restricted datasets are encrypted for hosting and unlocked in browser memory using separately shared credentials.
- Refreshing or closing a restricted view requires unlocking it again. Password holders can view and copy the content; do not treat the password as permission to redistribute it.
- Street maps are optional. Enabling them requests visible map tiles from OpenStreetMap, revealing the viewed map area to the provider. Confidential planning records are not included in tile requests.

**Do not commit passwords, decrypted datasets or private document extracts.** Run validation and review deployment output before publishing changes.

## Reading the maps correctly

District totals, directory locations and planning candidates serve different purposes. Their dates, definitions and completeness can differ; source notes remain part of the interface.

- District aggregates do not identify precise branch positions.
- Directory pins use available published coordinates and may not cover the full network.
- Proposed locations are candidates, not approved premises or confirmed openings.
- Straight-line proximity is not a measure of population coverage or road access.

## Deploying

The app can be hosted as a static Vercel project:

```text
Build command:     npm run build
Output directory:  dist
```

Keep deployment ignore rules in place. Restricted content should be packaged through the authorized workflow rather than copied into public assets as plaintext. A successful build validates packaging, not the underlying business assumptions.

## Libraries and attribution

- [Leaflet](https://leafletjs.com/) — interactive mapping; BSD 2-Clause.
- [Leaflet.markercluster](https://github.com/Leaflet/Leaflet.markercluster) — marker grouping; MIT.
- [OpenStreetMap](https://www.openstreetmap.org/copyright) — optional street tiles and contributor attribution. Follow the provider’s tile usage policy; no bulk downloading or offline tile prefetching.
- [geoBoundaries](https://www.geoboundaries.org/) — administrative boundaries; retain the source-specific attribution shipped with the project.
- Public bank directory references retain their source links in the application.

Library and data licenses apply to their respective components. Bank names are used for identification; interface initials are not a claim of official branding or endorsement.

---

<div align="center">

**One island. A clearer view of its banking networks.**

[Back to top ↑](#)

</div>
