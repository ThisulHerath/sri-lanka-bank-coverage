# Sri Lanka Bank Coverage

A frontend-only bank directory and interactive Sri Lanka district map for Commercial Bank network planning. The application uses a static local source snapshot; there is no application backend, database, or paid map API.

## Run

Requires Node.js 20+. No dependency installation is needed.

```powershell
npm run dev
```

Open http://127.0.0.1:5173/. The development server only serves static files.

```powershell
npm run check
npm run build
npm run preview
```

The production build is the static `dist/` folder. Stop the development server before starting preview on the same port, or set `PORT` to another port. Any static host can serve the production folder.

## Interface

- Sri Lanka only: 25 locally stored district polygons, with no surrounding-country basemap.
- Commercial Bank, BOC and People’s Bank individual views and multi-bank comparison.
- Location type: branches, self-service sites, or both.
- Published ATM, CRM, CDM, EDM and ACDM facility filters and badges.
- District → town → location hierarchy, including multiple branches in smaller towns.
- Search by branch, town, address and branch code; click a district to focus the map.
- Map clusters expand to individual published locations; self-service sites use square pins.
- Source links, published coordinates, address search links, data-quality notes and location details.
- Dotted district count badges represent records without usable pins. They are district summaries, not branch coordinates.

## Source snapshot — 13 November 2026

The demo generator has been replaced by **1,246 imported source records**.

- **Commercial Bank:** 276 branch records and 46 additional self-service locations, 322 unique locations in total. All 322 have coordinates in the official direction links. The machine directory contains 322 site listings including branches; it does not mean 322 standalone ATMs or 322 individual machines. Source: https://www.combank.lk/branches
- **People’s Bank:** all 331 entries returned by the supplied Branches.lk category at collection time. The imported entries publish addresses but no coordinates, so they have no branch pins. They remain searchable with Google Maps address search links. Source: https://branches.lk/listing-cat/peoples-bank/
- **BOC:** all 593 entries returned by the supplied Branches.lk category. The first 20 pages of the official BOC locator supplied 100 additional reference records and enriched 83 directory records with usable coordinates. Further official pages were blocked with HTTP 403. One confirmed closed/amalgamated directory entry is marked accordingly. Sources: https://branches.lk/listing-cat/bank-of-ceylon/ and https://www.boc.lk/branches

These are source-snapshot counts, not a certified current national network total. The People’s Bank and BOC directories have incomplete geographic/facility data. Their machine availability remains **unknown**, rather than being assumed absent or fabricated.

The application does not claim complete exact-location coverage for all three banks. It makes the remaining work visible: 510 BOC records and 331 People’s Bank records have no usable map pin in this snapshot. The app does not infer coverage gaps or expansion potential from this incomplete dataset.

## Coordinate and district quality

Map coordinates are copied unchanged from published bank Google Maps direction links. They are source-published positions, not independently surveyed or guaranteed exact. Coordinates outside the Sri Lanka bounding area, district conflicts, and closed-branch pins are withheld. For example, a BOC source direction pointing to India is not plotted.

For unlocated records, **Search address in Google Maps** explicitly opens a text search. Such a link does not establish a verified position. No town-centre coordinates are substituted for bank locations.

District assignments use, in order, published coordinates within district geometry, explicit source district fields, town reference matches, and selected source-address or bank-region inferences. The assignment method appears in each location’s details. Source district fields and inferred assignments may themselves require review. Thirteen People’s Bank district assignments remain unresolved in this snapshot and appear in a separate **Needs review** group. All 25 administrative districts remain available in the selector and hierarchy. A district with zero classified records must not be read as a bank having no presence there.

`assets/data/source-report.json` contains counts, source URLs, collection date, limitations, and unresolved district records. `assets/data/locations.json` contains the records and the same report metadata.

## Facilities

- ATM: cash withdrawals.
- CRM: cash deposits and withdrawals.
- CDM: cash deposits only.
- EDM: envelope-based cheque deposits.
- ACDM: automated cheque deposits.

Facility badges indicate the source lists that facility at a location. They are not individual machine counts. Facility filters include only locations with an explicitly published matching type; locations with unknown availability remain visible under **All**.

## Replacing or completing the dataset

Edit `assets/data/locations.json`, preserving unique IDs and bank keys `com`, `boc`, or `pb`. Each record contains `name`, `town`, `district`, `address`, `branchCode`, `kind`, `services`, `status`, `lat`, `lng`, `coordinateStatus`, `sourceUrl`, `sourceLabel`, `retrievedAt`, `mapsUrl`, and the coordinate/district provenance fields.

- Use `services: null` when availability is unknown.
- Use `lat: null` and `lng: null` when the bank position is unresolved.
- Published pins require a coordinate source, `coordinateStatus: "published"`, a matching source direction link, and an active/listed status.
- Closed/amalgamated locations must have no active pin.
- Keep the bank-level and overall source-report counts consistent.
- Update the snapshot date in the data and interface when refreshing the sources.

Run `npm run check` after any update. It checks unique IDs, all 25 district features, record/report totals, service types, coordinate bounds, preservation of source coordinates, and published-pin versus address-search distinctions.

## Geography, libraries and licenses

- [Leaflet 1.9.4](https://leafletjs.com/) — BSD 2-Clause; local files and license in `vendor/leaflet/`.
- [Leaflet.markercluster 1.5.3](https://github.com/Leaflet/Leaflet.markercluster) — MIT; local files and license in `vendor/leaflet-markercluster/`.
- District geometry: [geoBoundaries LKA ADM2](https://www.geoboundaries.org/api/current/gbOpen/LKA/ADM2/), boundary ID `LKA-ADM2-46371173`, reference year 2017, source OpenStreetMap / Wambacher, ODbL 1.0. [Pinned simplified source](https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/LKA/ADM2/geoBoundaries-LKA-ADM2_simplified.geojson). Properties were reduced to name and ISO; geometry is retained. Keep visible attribution and source/license references with redistributions of this derived district dataset.
- Town/district reference: [yasithsfonseka/SriLankaCitiesDatabase](https://github.com/yasithsfonseka/SriLankaCitiesDatabase), MIT, license in `assets/data/town-reference-LICENSE`. The reference is used for district classification, never as bank pin coordinates.
- People’s Bank regional-name reference: https://www.peoplesbank.lk/branch-network/
- The older Natural Earth outline remains available in `assets/sri-lanka.geojson`; the current interface uses district geometry instead.
- Optional DM Sans and Manrope fonts load from Google Fonts with system-font fallbacks. The map and data need no third-party requests; outgoing source and Google Maps links require internet access.
- Bank initials and the workspace symbol are interface placeholders rather than official bank logos.

## Next implementation stages

Complete and verify the missing bank coordinates and district assignments before treating the map as a full geographic comparison. Coverage radii, defensible gap analysis, proposed branch locations, and presentation controls can follow once the underlying position data supports them.
