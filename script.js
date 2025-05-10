mapboxgl.accessToken = 'pk.eyJ1IjoiZGJlcmdlcjMyNCIsImEiOiJjbTkxejI1ODYwMGQ1MmxvbWZreDZhMGgxIn0.nfxxsMs9W6jzp0-Wo-OEZg';

let currentMode = 'use';

const map = new mapboxgl.Map({
  container: 'map-container',
  style: 'mapbox://styles/mapbox/dark-v11',
  dragRotate: false,
  pitchWithRotate: false
});

function setMapMode(mode) {
  currentMode = mode;
  document.getElementById('page-label').innerText = {
    use: 'Zoning Use',
    bulk: 'Zoning Bulk',
    building: 'Building',
    value: 'Value'
  }[mode];

  ['use', 'bulk', 'building', 'value'].forEach(m => {
    map.setLayoutProperty(`${m}-fill`, 'visibility', m === mode ? 'visible' : 'none');
    if (m === 'bulk') {
      map.setLayoutProperty(`bulk-outline`, 'visibility', m === mode ? 'visible' : 'none');
    }
  });
}

// Load GeoJSON files
Promise.all([
  fetch('gwzd_v5_with_bulk.geojson').then(res => res.json()),
  fetch('blocks_final.geojson').then(res => res.json())
]).then(([zoningData, blockData]) => {

  map.on('load', () => {
    map.addSource('zoning', { type: 'geojson', data: zoningData });
    map.addSource('blocks', { type: 'geojson', data: blockData });

    map.addLayer({
      id: 'use-fill',
      type: 'fill',
      source: 'zoning',
      paint: {
        'fill-color': [
          'match',
          ['get', 'USE_CATEGORY'],
          'Manufacturing', '#ce93d8',
          'Residential', '#fff176',
          'Mixed', '#ffb74d',
          'Parks', '#a5d6a7',
          '#9e9e9e'
        ],
        'fill-opacity': 0.6
      }
    });

    map.addLayer({
      id: 'bulk-fill',
      type: 'fill',
      source: 'zoning',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'FAR_CHANGE'],
          0, 'transparent',
          6, '#5ed7ff'
        ],
        'fill-opacity': 1
      }
    });

    map.addLayer({
      id: 'bulk-outline',
      type: 'line',
      source: 'zoning',
      layout: { visibility: 'none' },
      paint: {
        'line-color': '#999',
        'line-width': 0.5
      }
    });

    map.addLayer({
      id: 'building-fill',
      type: 'fill',
      source: 'blocks',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'FAR_DIFF'],
          0, 'transparent',
          6, '#5ed7ff'
        ],
        'fill-opacity': 0.8
      }
    });

    map.addLayer({
      id: 'value-fill',
      type: 'fill',
      source: 'blocks',
      layout: { visibility: 'none' },
      paint: {
        'fill-color': [
          'interpolate',
          ['linear'],
          ['get', 'VALUE_DIFF'],
          0, 'transparent',
          50000000, '#b9fbc0'
        ],
        'fill-opacity': 0.8
      }
    });

    setMapMode(currentMode);

    map.once('idle', () => {
      const bounds = turf.bbox(zoningData);
      bounds[0] += 0.002;
      bounds[2] += 0.002;
      map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
    });

    const popup = new mapboxgl.Popup({
      closeButton: false,
      closeOnClick: false,
      anchor: 'bottom',
      offset: [0, -10]
    });

    map.on('mousemove', (e) => {
      const layerMap = {
        use: 'use-fill',
        bulk: 'bulk-fill',
        building: 'building-fill',
        value: 'value-fill'
      };
      const layer = layerMap[currentMode];
      if (!layer) return;

      const features = map.queryRenderedFeatures(e.point, { layers: [layer] });
      if (!features.length) {
        popup.remove();
        return;
      }

      const p = features[0].properties;

      let html = '';
      if (currentMode === 'value' || currentMode === 'building') {
        html = `<strong>${p.NEIGHBORHOOD}</strong><br>
        2004: $${(+p.VALUE_04).toLocaleString()} (${(+p.FAR_04).toFixed(2)} FAR)<br>
        2025: $${(+p.VALUE_25).toLocaleString()} (${(+p.FAR_25).toFixed(2)} FAR)`;
      } else {
        html = `<strong>${p.NEIGHBORHOOD}</strong><br>
        Prior: ${p.PRIOR_ZONING} (${p.FAR_BEFORE} FAR)<br>
        New: ${p.ZONEDIST} (${p.FAR_AFTER} FAR)`;
      }

      popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
    });

    map.on('mouseleave', 'use-fill', () => popup.remove());
    map.on('mouseleave', 'bulk-fill', () => popup.remove());
    map.on('mouseleave', 'building-fill', () => popup.remove());
    map.on('mouseleave', 'value-fill', () => popup.remove());
  });
});
