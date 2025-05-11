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

// Update legend based on mode
function updateLegend(mode) {
  const legend = document.getElementById('legend');

  if (mode === 'use') {
    legend.innerHTML = `
      <strong>Zoning Use (Post-Rezoning)</strong><br><br>
      <div><span class="legend-color-box" style="background:#ce93d8;"></span><b>Manufacturing:</b> preserved for exclusive industrial use</div>
      <div><span class="legend-color-box" style="background:#fff176;"></span><b>Residential:</b> opened for new residential uses</div>
      <div><span class="legend-color-box" style="background:#ffb74d;"></span><b>Mixed:</b> allows both residential and light manufacturing</div>
      <div><span class="legend-color-box" style="background:#a5d6a7;"></span><b>Parks:</b> open space</div>
      <br>
      Learn more at <a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">NYC Department of City Planning</a>
    `;
  } else if (mode === 'bulk' || mode === 'building') {
    legend.innerHTML = `
      <strong>Change in Actual Floor Area Ratio (FAR), 2004–2025</strong><br>
      <div style="background:linear-gradient(to right, #a9746e, transparent, #5ed7ff); height: 15px; margin: 6px 0;"></div>
      <div style="display:flex; justify-content:space-between; font-size:12px;">
        <span>-4</span><span>0</span><span>4</span>
      </div><br>
      FAR compares floor area to lot size. Includes both residential and manufacturing densities.<br><br>
      Learn more at <a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">NYC Department of City Planning</a>
    `;
  } else if (mode === 'value') {
    legend.innerHTML = `
      <strong>Change in Assessed Property Value, 2004–2025</strong><br>
      <div style="background:linear-gradient(to right, transparent, limegreen); height: 15px; margin: 6px 0;"></div>
      <div style="display:flex; justify-content:space-between; font-size:12px;">
        <span>$0</span><span>$100 million</span>
      </div><br>
      Total property values calculated at block level.<br><br>
      Learn more at <a href="https://www.nyc.gov/site/finance/property/property-determining-your-assessed-value.page" target="_blank" style="color:#8ecae6;">NYC Department of Finance</a>
    `;
  }
}

// Handle view toggle
function setMapMode(mode) {
  currentMode = mode;

  document.getElementById('page-label').innerText = {
    use: 'Zoning Use',
    bulk: 'Zoning Bulk',
    building: 'Building',
    value: 'Value'
  }[mode];

  ['use', 'bulk', 'building', 'value'].forEach(layer => {
    map.setLayoutProperty(`${layer}-fill`, 'visibility', mode === layer ? 'visible' : 'none');

    // Handle outlines
    if (layer === 'bulk') {
      map.setLayoutProperty(`bulk-outline`, 'visibility', mode === 'bulk' ? 'visible' : 'none');
    } else if (layer === 'building') {
      map.setLayoutProperty(`building-outline`, 'visibility', mode === 'building' ? 'visible' : 'none');
    } else if (layer === 'value') {
      map.setLayoutProperty(`value-outline`, 'visibility', mode === 'value' ? 'visible' : 'none');
    }
  });

  updateLegend(mode);
}

// Load GeoJSON sources
map.on('load', async () => {
  const zoningData = await fetch('./gwzd_v5_with_bulk.geojson').then(res => res.json());
  const blockData = await fetch('./blocks_final.geojson').then(res => res.json());

  zoningData.features.forEach(f => {
    const z = f.properties.ZONEDIST || '';
    f.properties.USE_CATEGORY = z.includes('PARK') ? 'Parks'
      : (/^M1|M2|M3/.test(z) && !z.includes('/')) ? 'Manufacturing'
      : z.includes('/') ? 'Mixed'
      : 'Residential';
  });

  map.addSource('zoning', { type: 'geojson', data: zoningData });
  map.addSource('blocks', { type: 'geojson', data: blockData });

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
        'interpolate', ['linear'], ['get', 'FAR_AFTER'],
        0, 'transparent',
        4, '#5ed7ff'
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
        'interpolate', ['linear'], ['get', 'far_change'],
        -4, '#a9746e',
        0, 'transparent',
        4, '#5ed7ff'
      ],
      'fill-opacity': 1
    }
  });

  map.addLayer({
    id: 'building-outline',
    type: 'line',
    source: 'blocks',
    layout: { visibility: 'none' },
    paint: {
      'line-color': 'white',
      'line-width': 0.3
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
        0, 'transparent',
        100000000, 'limegreen'
      ],
      'fill-opacity': 1
    }
  });

  map.addLayer({
    id: 'value-outline',
    type: 'line',
    source: 'blocks',
    layout: { visibility: 'none' },
    paint: {
      'line-color': 'white',
      'line-width': 0.3
    }
  });

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

  // Format numbers
  const round = val => val !== undefined && !isNaN(val) ? Math.round(val * 10) / 10 : 'N/A';
  const roundVal = v => v !== undefined && !isNaN(v) ? `$${Math.round(v / 100000) * 100000}` : 'N/A';

  map.on('mousemove', (e) => {
    const features = map.queryRenderedFeatures(e.point, {
      layers: currentMode === 'use' ? ['use-fill']
           : currentMode === 'bulk' ? ['bulk-fill']
           : currentMode === 'building' ? ['building-fill']
           : ['value-fill']
    });

    if (features.length) {
      const p = features[0].properties;
      const html = (currentMode === 'use' || currentMode === 'bulk') ? `
        <strong>${p.NEIGHBORHOOD || 'Zoning Info'}</strong><br>
        Prior Zoning: ${p.PRIOR_ZONING || 'N/A'}<br>
        New Zoning: ${p.ZONEDIST || 'N/A'}<br>
        FAR Before: ${round(p.FAR_BEFORE)}<br>
        FAR After: ${round(p.FAR_AFTER)}
      ` : `
        <strong>Block ${p.block || p.BLOCK || 'N/A'}</strong><br>
        2004 Value: ${roundVal(+p.value_2004)}<br>
        2025 Value: ${roundVal(+p.value_2025)}<br>
        FAR 2004: ${round(+p.far_2004)}<br>
        FAR 2025: ${round(+p.far_2025)}
      `;
      popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
    } else {
      popup.remove();
    }
  });

  updateLegend(currentMode);

  // Intro popup click-to-dismiss
document.getElementById('intro-popup').addEventListener('click', () => {
  document.getElementById('intro-popup').style.display = 'none';
});
});
