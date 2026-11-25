// Normal on-screen tile loading only; the browser handles provider cache headers.

// The mask keeps surrounding countries hidden while preserving Sri Lanka's roads.

export function setupMapBackground(map, geography, statusSelector = '#street-map-status') {

  const bounds = L.geoJSON(geography).getBounds();

  const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {

    maxZoom:19, bounds, noWrap:true, keepBuffer:1,

    attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',

  });

  map.createPane('countryMask');

  map.getPane('countryMask').style.zIndex = '250';

  map.getPane('countryMask').style.pointerEvents = 'none';

  const holes = geography.features.flatMap(feature => {

    const polygons = feature.geometry.type === 'MultiPolygon' ? feature.geometry.coordinates : [feature.geometry.coordinates];

    return polygons.map(polygon => polygon[0].map(([lng,lat]) => [lat,lng]));

  });

  const mask = L.polygon([[[85,-180],[85,180],[-85,180],[-85,-180]], ...holes], {

    pane:'countryMask', interactive:false, stroke:false, fillColor:'#e4eef5',fillOpacity:1,fillRule:'evenodd',

  });

  let enabled = false;

  let unavailable = false;

  tiles.on('tileerror', () => {

    unavailable = true;

    document.querySelector(statusSelector).textContent = 'Street tiles unavailable. Published branch pins still work.';

  });

  tiles.on('tileload', () => {

    if (!unavailable) document.querySelector(statusSelector).textContent = 'Street map · OpenStreetMap · Internet required';

  });

  return {

    setVisible(show) {

      if (show === enabled) return;

      enabled = show;

      if (show) { tiles.addTo(map); mask.addTo(map); }

      else { map.removeLayer(tiles); map.removeLayer(mask); }

    },

  };

}
