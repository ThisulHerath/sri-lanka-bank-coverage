export const banks = {
  com: { name: 'Commercial Bank', short: 'COM', color: '#1769dc', tint: '#edf4ff', initials: 'CB' },
  boc: { name: 'Bank of Ceylon', short: 'BOC', color: '#bc8a18', tint: '#fff7e6', initials: 'BOC' },
  pb: { name: 'People’s Bank', short: 'PB', color: '#b74b6a', tint: '#fceef2', initials: 'PB' },
};
export const services = {
  ATM: 'Cash withdrawals', CRM: 'Cash deposits & withdrawals', CDM: 'Cash deposits only',
  EDM: 'Envelope-based cheque deposits', ACDM: 'Automated cheque deposits',
};
async function readJSON(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load the local dataset (${response.status}).`);
  return response.json();
}
export async function loadData() {
  const [dataset, geography, districtCounts] = await Promise.all([
    readJSON('/assets/data/locations.json'), readJSON('/assets/sri-lanka-districts.geojson'), readJSON('/assets/data/district-branch-counts.json'),
  ]);
  return {
    branches: dataset.locations, metadata: dataset.metadata, geography, districtCounts,
    districts: geography.features.map(feature => feature.properties.name).sort(),
  };
}
