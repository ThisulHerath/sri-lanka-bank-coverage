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

## Reported district network (2025)

The dashboard includes all 25 district rows provided by the user, independently checked against the original [CBSL Economic and Social Statistics 2026, Table 7.8 workbook](https://www.cbsl.gov.lk/sites/default/files/cbslweb_documents/statistics/sheets/ess_2026_table7.8_e.xlsx). The 2025 provisional section is rows 90–114, with national totals on row 115; Commercial Bank is column G, BOC column D, and People's Bank column E.

National totals: Commercial Bank **274**, BOC **672**, People's Bank **748**, combined **1,694**. The source footnote is “All Banking outlets except Student Savings Units”. It does not provide exact branch coordinates or a machine inventory. The local dataset is `assets/data/district-branch-counts.json`, including the original source citation and cell references. Moneragala is normalized internally to the map's Monaragala key; the source spelling is displayed in the comparison.

- Search all districts and sort by district or any bank/combined count. The national footer stays visible while scrolling.
- Select a national card, district name, ranked district or individual bank count to focus the individual branch-pin map.
- Select **Locations** in a district row to browse imported branch records under its towns.
- **Branch pins** is the default map, showing one marker for each source-published position. **District totals** is an explicit secondary view for 2025 aggregates. The two-button switch also appears in full-screen presentation.
- Both map modes support **Present map**.

The 2025 reference statistics and the November 2026 directory snapshot differ in date and scope. A record-count difference is not a measured coverage gap. Missing directory entries/coordinates are not converted into artificial pins, and zero imported records does not mean zero bank presence. The code validates all row sums, bank totals and geometry keys.

## Responsive navigation

- Use the navigation button in the top bar to minimize the desktop sidebar to an icon rail; the preference is saved locally in that browser.
- At tablet/phone widths, navigation opens in an accessible drawer with a backdrop, keyboard focus containment and Escape/close controls. Selecting a section closes the drawer.
- At widths up to 1100px, **Filters & locations** reveals the map controls and town directory in a scrollable panel. **Show map** closes the panel without changing the selection.
- Touch layouts use larger controls and 16px search/select fields, district comparison cards on phones, a scrollable comparison table on larger screens, safe-area spacing and a full-width map. Full-screen presentation reflows on portrait and landscape screens and uses a viewport layout when the browser does not support native fullscreen.

On phones up to 640px, district cards retain search, sorting, per-bank counts and location navigation without sideways scrolling. The map legend is collapsed by default and can be expanded on demand. A persistent Map shortcut returns to the explorer. Automatic map views refit after screen rotation or sidebar resizing; manually positioned views retain their zoom and centre.

## Interface

- Sri Lanka only: 25 local district polygons; optional OpenStreetMap streets/roads are masked outside Sri Lanka. Street tiles require an internet connection and use the browser’s normal tile caching. There is no tile prefetch or offline download feature.
- Commercial Bank, BOC and People’s Bank individual views and multi-bank comparison.
- Location type: branches, self-service sites, or both.
- Published ATM, CRM, CDM, EDM and ACDM facility filters and badges.
- District → town → location hierarchy, including multiple branches in smaller towns.
- Search by branch, town, address and branch code; click a district to focus the map.
- Nearby pins are separate by default. **Group nearby pins** optionally clusters them; self-service sites use square pins. Select a pin for source coordinates, address, facilities and Google Maps directions. **Show on this map** zooms to street level.
- Source links, published coordinates, address search links, data-quality notes and location details.
- **Present map:** choose your banks, district, location type, facilities and search, then open the map full screen. The selection and current zoom are retained. A compact toolbar shows the selection and counts; **Fit view** reframes the current selection. **Exit full screen** or **Esc** restores the dashboard. Embedded browsers that deny native fullscreen use a viewport-filling presentation instead.
- Location view never places a district-centre marker for missing coordinates. The notice and directory distinguish unavailable positions from published pins.

## Source snapshot — 13 November 2026

The demo generator has been replaced by **1,246 imported source records**.

- **Commercial Bank:** 276 branch records and 46 additional self-service locations, 322 unique locations in total. All 322 sites are plotted. Three conflicting bank direction links (Kundasale, Giriulla and Karapitiya) were corrected against Google Maps place listings matching the official street addresses and branch phone numbers on 14 November 2026. The machine directory contains 322 site listings including branches; it does not mean 322 standalone ATMs or 322 individual machines. Source: https://www.combank.lk/branches
- **People’s Bank:** all 331 entries returned by the supplied Branches.lk category now have source-linked positions. The directory supplies the branch identities and addresses; Initially, 328 records were enriched from the official locator and three from Google Maps place listings. A duplicate-coordinate audit on 14 November identified four incorrect official positions (Boralesgamuwa, Walasmulla, Teldeniya and Kilinochchi). These were replaced with referenced Google Maps place positions, using matching contacts where available and the branch/road identity where contacts differed. Each correction states its match evidence. Currently 324 positions use the official locator and seven use Google Maps references. Two invalid official coordinates (`0,0` and an out-of-country longitude) are replaced by those independently referenced Google Maps positions. Sources: https://branches.lk/listing-cat/peoples-bank/ and https://www.peoplesbank.lk/branch-service-center/
- **BOC:** all 593 entries returned by the supplied Branches.lk category. The first 20 pages of the official BOC locator supplied 100 additional reference records and enriched 83 directory records with usable coordinates. Further official pages were blocked with HTTP 403. One confirmed closed/amalgamated directory entry is marked accordingly. Sources: https://branches.lk/listing-cat/bank-of-ceylon/ and https://www.boc.lk/branches

These are source-snapshot counts, not a certified current national network total. The People’s Bank and BOC directories have incomplete geographic/facility data. Their machine availability remains **unknown**, rather than being assumed absent or fabricated.

All 331 requested People’s Bank records are mapped, with 736 map pins across the three imported banks in total. All 322 Commercial Bank sites and 331 People’s Bank directory records have map pins; 510 BOC records still have no usable pin. The app does not infer coverage gaps or expansion potential from this incomplete cross-bank dataset. The 331 People’s Bank records are the supplied directory subset, rather than the bank’s complete national network; the official locator also contains other branches and service centres.

## Coordinate and district quality

Map coordinates are retained from bank direction links, the official People’s Bank map locator, or individually checked Google Maps place listings. They are source-published positions, not independently surveyed or guaranteed exact. Coordinates outside the Sri Lanka bounding area, district conflicts, and confirmed closed-branch pins are withheld. For example, a BOC source direction pointing to India is not plotted. Google Maps flags possible closure for Kegalle Main; its geographic position is retained and its operating status is visibly marked for review, rather than treated as a confirmed closure.

For unlocated records, **Search address in Google Maps** explicitly opens a text search. Such a link does not establish a verified position. No town-centre coordinates are substituted for bank locations.

District assignments use published coordinates within district geometry, explicit source district fields, town reference matches, and selected source-address or bank-region inferences. Town reference coordinates are checked against district geometry rather than relying solely on reference IDs. People’s Bank district assignments are now resolved from the published positions. The Commercial Bank coordinate conflicts have been resolved with separately referenced place listings; their original coordinates remain in the dataset for audit. The assignment method appears in each location’s details. All 25 administrative districts remain available in the selector and hierarchy. A district with zero imported records must not be read as a bank having no presence there.

`assets/data/source-report.json` contains counts, source URLs, collection date, limitations, and unresolved district records. `assets/data/locations.json` contains the records and the same report metadata.

`assets/data/pb-published-locations.json` preserves the official locator references and the three individually checked Google Maps place references used to validate People’s Bank coordinates. No user account details, API keys or browser session data are included.

`assets/data/coordinate-corrections.json` records seven verified position corrections, their Google Maps place URLs, identity-matching evidence and the check date. `node scripts/apply-coordinate-corrections.mjs` reapplies these corrections idempotently, checks corrected positions against district polygons and refreshes source counts. Validation checks the final position against the independent evidence and rejects identical branch positions within Commercial Bank and People’s Bank, preventing the known duplicate-coordinate errors from returning.

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
- Published pins require a coordinate source, `coordinateStatus: "published"`, source evidence matching the coordinate method, and an active/listed status.
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

Complete BOC coordinate enrichment and verify source position quality before treating the map as a complete geographic comparison. Coverage radii, defensible gap analysis and proposed branch locations can follow once the underlying data supports them.

## Confidential local expansion planning

Open `/planner.html` on the local development server for the separate planning presentation. It supports cumulative year layers, branch/agency/pawn format filters, district and town navigation, a year comparison, a district ledger, site evidence and full-screen presentation. Competitor directory data is unchanged.

Confidential data belongs in `private/expansion-plan.json`, which is ignored by Git and excluded from the static deployment build. `.vercelignore` also excludes the private directory and Word inputs from CLI uploads. The planning page reads that file only on localhost, or accepts a local JSON file into session memory. It blocks loading confidential plans on a remote host. Its Content Security Policy blocks external scripts, fonts, tiles and network connections; it uses local boundaries and no external map service. There are no uploads, analytics or browser-storage persistence for the plan. Do not move private files into `assets/` or `src/`.

`npm run check` validates the private plan when present, including source coordinates, phase totals, adjusted district quotas and upgrade relationships. The build refuses a pre-existing `dist/private` directory. The public build contains only the generic planning interface and public directory assets. No sensitive Word document, extracted content, plan quantities or candidate allocations belong in Git or a deployment artifact.

Proposed positions are settlement/catchment candidates with public coordinate references, not approved premises or merchant agreements. Statutory counts and public-directory pins remain separately labelled where the source documents do not provide an exact branch roster. Source discrepancies and model assumptions are visible in the review dialog.
