# Sri Lanka Bank Coverage

A frontend-only branch network dashboard from a Commercial Bank planning perspective. No application server, database, authentication, or API key is required.

## Run locally

Requires Node.js 20 or later. No dependency installation is needed.

```powershell
npm run dev
```

Open http://127.0.0.1:5173. The development server serves static files only.

```powershell
npm run check
npm run build
npm run preview
```

The production build is a static `dist/` folder that can be served by any static host. Stop the development server before running preview on the same port. Set `PORT` to use another port.

## Implementation stages

1. **Foundation (implemented):** formal responsive dashboard, local Sri Lanka outline, interactive Leaflet map, sample markers, bank selectors, basic comparison, district/search filters, derived summary cards, branch popups, and methodology notes.
2. **Coverage controls:** configurable coverage radius, visible coverage circles, and clear assumptions.
3. **Gap analysis:** define and calculate geographic gaps and comparisons using a documented method. Do not infer business potential from distance alone.
4. **Proposed locations:** separate proposed branch layer, proposal details, and presentation controls.
5. **Verified data:** replace demo records, validate data quality, and complete end-to-end presentation checks.

## Demo data

**Every branch record is synthetic.** Locations are approximate town centres with small offsets to make the interface demonstrable. Counts are calculated from those records and are not actual bank network totals. No coverage percentages, gap claims, or expansion recommendations are currently made.

`src/data.js` holds the bank metadata and demo branches. The application works entirely in the browser. No branch data is transmitted to an application backend. Map tiles and optional web fonts involve third-party requests.

Future records can use this shape:

```js
{
  id: 'unique-branch-id',
  bank: 'com', // com | boc | pb
  name: 'Verified branch name',
  town: 'Town',
  district: 'District',
  lat: 0, // replace with verified latitude
  lng: 0, // replace with verified longitude
  status: 'existing', // existing | proposed (proposal layer is a later stage)
  isDemo: false
}
```

Replace the synthetic generator with validated records when the dataset is supplied. Latitude and longitude must be numeric coordinates within Sri Lanka. The district list should be preserved or supplied alongside the real dataset.

## Map and assets

- [Leaflet 1.9.4](https://leafletjs.com/examples-v1/quick-start/) is vendored locally, including its BSD 2-Clause license at `vendor/leaflet/LICENSE`.
- The local country outline is extracted from [world-atlas 2.0.2](https://github.com/topojson/world-atlas), using [Natural Earth 1:50m countries](https://www.naturalearthdata.com/), [public domain](https://www.naturalearthdata.com/about/terms-of-use/).
- Street tiles use [OpenStreetMap](https://www.openstreetmap.org/copyright) with visible attribution. Internet access is required for street tiles. The local outline, markers, and filters continue to work without tiles.
- DM Sans and Manrope load from Google Fonts when available, with local system font fallbacks.
- The bank initials and abstract workspace symbol are interface placeholders, not official bank logos.

Map runtime assets are included in the repository. No asset download is needed to run or build the app.

## Project structure

```text
index.html            Dashboard structure
src/styles.css        Responsive visual system
src/app.js            Map, UI state, filtering, and interactions
src/data.js           Illustrative records; replace with verified data later
assets/               Local country outline and favicon
vendor/leaflet/       Local map library and license
scripts/              Static development server and build
```
