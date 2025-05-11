mapboxgl.accessToken = 'pk.eyJ1IjoiZGJlcmdlcjMyNCIsImEiOiJjbTkxejI1ODYwMGQ1MmxvbWZreDZhMGgxIn0.nfxxsMs9W6jzp0-Wo-OEZg';

// Initial mode (active map layer)
let currentMode = 'use';

// Create Mapbox map
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

// Update the legend content depending on selected mode
function updateLegend(mode) {
  const legend = document.getElementById('legend');
  if (mode === 'use') {
    legend.innerHTML = `
      <strong>Zoning Use (Post-Rezoning)</strong><br><br>
      <div><span style="background:#ce93d8;" class="legend-color-box"></span><b>Manufacturing:</b> preserved for exclusive industrial use</div>
      <div><span style="background:#fff176;" class="legend-color-box"></span><b>Residential:</b> opened for new residential uses</div>
      <div><span style="background:#ffb74d;" class="legend-color-box"></span><b>Mixed:</b> allows both residential and light manufacturing</div>
      <div><span style="background:#a5d6a7;" class="legend-color-box"></span><b>Parks:</b> open space</div>
      <br>
      Learn more about the zoning codes at the 
      <a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">NYC Department of City Planning</a>
    `;
  } else if (mode === 'bulk' || mode === 'building') {
    legend.innerHTML = `
      <strong>New Residential Floor Area Ratio (FAR)</strong><br>
      <div style="background:linear-gradient(to right, transparent, #5ed7ff); height: 15px; margin: 6px 0;"></div>
      <span style="font-size:12px;">0</span><span style="float:right; font-size:12px;">6</span><br><br>
      FAR measures building bulk by comparing total floor area to lot size.<br>
      All FAR is calculated at the block level.<br><br>
      Learn more about the zoning codes at the 
      <a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">NYC Department of City Planning</a>
    `;
  } else if (mode === 'value') {
    legend.innerHTML = `
      <strong>Change in Assessed Property Value (2004–2025)</strong><br>
      <div style="background:linear-gradient(to right, transparent, limegreen); height: 15px; margin: 6px 0;"></div>
      <span style="font-size:12px;">$0</span><span style="float:right; font-size:12px;">$150 million</span><br><br>
      Assessed value reflects the city's taxable estimate of property worth.<br>
      All property values are calculated at the block level.<br><br>
      Learn more at the 
      <a href="https://www.nyc.gov/site/finance/property/property-determining-your-assessed-value.page" target="_blank" style="color:#8ecae6;">NYC Department of Finance</a>
    `;
  }
}

// Change the visible map layer based on user selection
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
    if (layer === 'bulk') {
      map.setLayoutProperty('bulk-outline', 'visibility', mode === 'bulk' ? 'visible' : 'none');
    }
  });

  updateLegend(mode);
}

// Load data and add all sources + layers
map.on('load', async () => {
  const zoningData = await fetch('./gwzd_v5_with_bulk.geojson').then(res => res.json());
  const blockData = await fetch('./blocks_final.geojson').then(res => res.json());

  // Add zoning and block sources
  map.addSource('zoning', { type: 'geojson', data: zoningData });
  map.addSource('blocks', { type: 'geojson', data: blockData });

  // Derive zoning use categories
zoningData.features.forEach(f => {
  const z = f.properties.ZONEDIST || '';
  f.properties.USE_CATEGORY = z.includes('PARK') ? 'Parks'
    : (/^M1|M3/.test(z) && !z.includes('/')) ? 'Manufacturing'
    : z.includes('/') ? 'Mixed'
    : 'Residential';
});

  // Zoning use fill
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

  // Zoning FAR change
  map.addLayer({
    id: 'bulk-fill',
    type: 'fill',
    source: 'zoning',
    layout: { visibility: 'none' },
    paint: {
      'fill-color': [
        'interpolate', ['linear'], ['get', 'FAR_CHANGE'],
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

  // Built FAR block layer
  map.addLayer({
    id: 'building-fill',
    type: 'fill',
    source: 'blocks',
    layout: { visibility: 'none' },
    paint: {
      'fill-color': [
        'interpolate', ['linear'], ['get', 'far_change'],
        -6, '#a9746e',
        0, 'transparent',
        6, '#5ed7ff'
      ],
      'fill-opacity': 1
    }
  });

  // Property value change block layer
  map.addLayer({
    id: 'value-fill',
    type: 'fill',
    source: 'blocks',
    layout: { visibility: 'none' },
    paint: {
      'fill-color': [
        'interpolate', ['linear'], ['get', 'value_change'],
        0, 'transparent',
        150000000, 'limegreen'
      ],
      'fill-opacity': 1
    }
  });

  // Fit map view to zoning bounds
  map.once('idle', () => {
    const bounds = turf.bbox(zoningData);
    bounds[0] += 0.002;
    bounds[2] += 0.002;
    map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
  });

  // Popup on hover
  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    anchor: 'bottom',
    offset: [0, -10]
  });

  const showPopup = (e) => {
    const p = e.features[0].properties;
    let html;
    if (currentMode === 'use' || currentMode === 'bulk') {
      html = `
        <strong>${p.NEIGHBORHOOD || 'Zoning Info'}</strong><br>
        Prior Zoning: ${p.PRIOR_ZONING || 'N/A'}<br>
        New Zoning: ${p.ZONEDIST || 'N/A'}<br>
        FAR Before: ${p.FAR_BEFORE || 'N/A'}<br>
        FAR After: ${p.FAR_AFTER || 'N/A'}
      `;
    } else {
      html = `
        <strong>Block ${p.block || p.BLOCK || 'N/A'}</strong><br>
        2004 Value: $${(+p.value_2004 || 0).toLocaleString()}<br>
        2025 Value: $${(+p.value_2025 || 0).toLocaleString()}<br>
        FAR 2004: ${p.far_2004 || 'N/A'}<br>
        FAR 2025: ${p.far_2025 || 'N/A'}
      `;
    }
    popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
  };

  // Attach hover events
  map.on('mousemove', 'use-fill', e => currentMode === 'use' && showPopup(e));
  map.on('mousemove', 'bulk-fill', e => currentMode === 'bulk' && showPopup(e));
  map.on('mousemove', 'building-fill', e => currentMode === 'building' && showPopup(e));
  map.on('mousemove', 'value-fill', e => currentMode === 'value' && showPopup(e));

  map.on('mouseleave', 'use-fill', () => popup.remove());
  map.on('mouseleave', 'bulk-fill', () => popup.remove());
  map.on('mouseleave', 'building-fill', () => popup.remove());
  map.on('mouseleave', 'value-fill', () => popup.remove());

  // Set default legend
  updateLegend(currentMode);
});
