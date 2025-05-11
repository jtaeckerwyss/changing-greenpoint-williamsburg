mapboxgl.accessToken = 'pk.eyJ1IjoiZGJlcmdlcjMyNCIsImEiOiJjbTkxejI1ODYwMGQ1MmxvbWZreDZhMGgxIn0.nfxxsMs9W6jzp0-Wo-OEZg';

let currentMode = 'use';

const map = new mapboxgl.Map({
  container: 'map-container',
  style: 'mapbox://styles/mapbox/dark-v11',
  pitchWithRotate: false,
  dragRotate: false,
  dragPan: false,
  touchZoomRotate: false,
  scrollZoom: false,
  doubleClickZoom: false,
  boxZoom: false,
  keyboard: false
});

function updateLegend(mode) {
  const legend = document.getElementById('legend');
  if (mode === 'use') {
    legend.innerHTML = `
      <strong>Zoning Use (Post-Rezoning)</strong><br><br>
      <div><span style="background:#ce93d8; width:12px; height:12px; display:inline-block; margin-right:6px;"></span><b>Manufacturing:</b> preserved for exclusive industrial use</div>
      <div><span style="background:#fff176; width:12px; height:12px; display:inline-block; margin-right:6px;"></span><b>Residential:</b> opened for new residential uses</div>
      <div><span style="background:#ffb74d; width:12px; height:12px; display:inline-block; margin-right:6px;"></span><b>Mixed:</b> residential + light manufacturing</div>
      <div><span style="background:#a5d6a7; width:12px; height:12px; display:inline-block; margin-right:6px;"></span><b>Parks:</b> open space</div>
      <br><a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">NYC Department of City Planning</a>
    `;
  } else if (mode === 'bulk') {
    legend.innerHTML = `
      <strong>New Residential Floor Area Ratio (FAR)</strong><br>
      <div style="background:linear-gradient(to right, transparent, #5ed7ff); height: 15px; margin: 6px 0;"></div>
      <span style="font-size:12px;">0</span><span style="float:right; font-size:12px;">6</span><br><br>
      FAR measures building bulk relative to lot size.<br><br>
      <a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">Learn more</a>
    `;
  } else if (mode === 'building') {
    legend.innerHTML = `
      <strong>Built FAR (2004–2025)</strong><br>
      <div style="background:linear-gradient(to right, transparent, #5ed7ff); height: 15px; margin: 6px 0;"></div>
      <span style="font-size:12px;">0</span><span style="float:right; font-size:12px;">6</span><br><br>
      All FAR calculated at the block level.
    `;
  } else if (mode === 'value') {
    legend.innerHTML = `
      <strong>Change in Property Value (2004–2025)</strong><br>
      <div style="background:linear-gradient(to right, #a9746e, transparent, limegreen); height: 15px; margin: 6px 0;"></div>
      <span style="font-size:12px;">Loss</span><span style="float:right; font-size:12px;">Gain</span><br><br>
      Based on NYC assessed values per block.
    `;
  }
}

function setMapMode(mode) {
  currentMode = mode;
  document.getElementById('page-label').innerText =
    mode === 'use' ? 'Zoning Use' :
    mode === 'bulk' ? 'Zoning Bulk' :
    mode === 'building' ? 'Built FAR' :
    'Property Value';

  ['use-fill', 'bulk-fill', 'bulk-outline', 'building-fill', 'value-fill'].forEach(layer => {
    if (map.getLayer(layer)) {
      const visible = layer.includes(mode) || (mode === 'bulk' && layer === 'bulk-outline');
      map.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none');
    }
  });

  updateLegend(mode);
}

map.on('load', () => {
  fetch('./gwzd_v5_with_bulk.geojson')
    .then(res => res.json())
    .then(data => {
      data.features.forEach(f => {
        const z = f.properties.ZONEDIST || '';
        f.properties.USE_CATEGORY = z.includes('PARK') ? 'Parks'
          : (/^M1|M3/.test(z) && !z.includes('/')) ? 'Manufacturing'
          : z.includes('/') ? 'Mixed'
          : 'Residential';
      });

      map.addSource('zoning', { type: 'geojson', data });

      map.addLayer({
        id: 'use-fill',
        type: 'fill',
        source: 'zoning',
        paint: {
          'fill-color': [
            'match', ['get', 'USE_CATEGORY'],
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
            'interpolate', ['linear'], ['get', 'far_change'],
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
    });

  fetch('./blocks_final.geojson')
    .then(res => res.json())
    .then(data => {
      data.features = data.features.map(f => {
        f.properties.value_change = +f.properties.value_change || 0;
        f.properties.far_change = +f.properties.far_change || 0;
        return f;
      });

      map.addSource('blocks', { type: 'geojson', data });

      map.addLayer({
        id: 'building-fill',
        type: 'fill',
        source: 'blocks',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': [
            'interpolate', ['linear'], ['get', 'far_change'],
            0, 'transparent',
            6, '#5ed7ff'
          ],
          'fill-opacity': 1
        }
      });

      map.addLayer({
        id: 'value-fill',
        type: 'fill',
        source: 'blocks',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': [
            'interpolate', ['linear'], ['get', 'value_change'],
            -500000000, '#a9746e',
            0, 'transparent',
            500000000, 'limegreen'
          ],
          'fill-opacity': 1
        }
      });
    });

  map.once('idle', () => {
    const bounds = turf.bbox(map.getSource('zoning')._data);
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

  function formatHover(p) {
    return `
      <strong>${p.NEIGHBORHOOD || 'Block ' + (p.BLOCK || 'N/A')}</strong><br>
      2004: $${(+p.VALUE_2004 || 0).toLocaleString()} (${p.FAR_2004 || 'N/A'} FAR)<br>
      2025: $${(+p.VALUE_2025 || 0).toLocaleString()} (${p.FAR_2025 || 'N/A'} FAR)
    `;
  }

  function formatZoningHover(p) {
    return `
      <strong>${p.NEIGHBORHOOD || 'Unknown'}</strong><br>
      Prior: ${p.PRIOR_ZONING || 'N/A'} (${p.FAR_BEFORE || 'N/A'} FAR)<br>
      New: ${p.ZONEDIST || 'N/A'} (${p.FAR_AFTER || 'N/A'} FAR)
    `;
  }

  map.on('mousemove', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: currentMode === 'use' ? ['use-fill']
           : currentMode === 'bulk' ? ['bulk-fill']
           : currentMode === 'building' ? ['building-fill']
           : ['value-fill']
    });

    if (features.length) {
      const p = features[0].properties;
      const content = currentMode === 'use' || currentMode === 'bulk'
        ? formatZoningHover(p)
        : formatHover(p);
      popup.setLngLat(e.lngLat).setHTML(content).addTo(map);
    } else {
      popup.remove();
    }
  });

  updateLegend(currentMode);
});
