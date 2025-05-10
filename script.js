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
      <div><span style="background:#ffb74d; width:12px; height:12px; display:inline-block; margin-right:6px;"></span><b>Mixed:</b> New mixed zones allow both residential and light manufacturing, but tend to result in housing due to market pressure.</div>
      <div><span style="background:#a5d6a7; width:12px; height:12px; display:inline-block; margin-right:6px;"></span><b>Parks:</b> open space</div>
      <br>
      Learn more about the zoning codes at the 
      <a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">NYC Department of City Planning</a>
    `;
  } else if (mode === 'bulk') {
    legend.innerHTML = `
      <strong>New Residential Floor Area Ratio (FAR)</strong><br>
      <div style="background:linear-gradient(to right, transparent, #5ed7ff); height: 15px; margin: 6px 0;"></div>
      <span style="font-size:12px;">0</span>
      <span style="float:right; font-size:12px;">6</span>
      <br><br>
      FAR measures building bulk by comparing total floor area to lot size. Higher FAR values allow taller or denser buildings, enabling more residential development on a site.
      <br><br>
      Learn more about the zoning codes at the 
      <a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">NYC Department of City Planning</a>
    `;
  } else if (mode === 'building') {
    legend.innerHTML = `
      <strong>Built FAR (2004–2025)</strong><br>
      <div style="background:linear-gradient(to right, transparent, #5ed7ff); height: 15px; margin: 6px 0;"></div>
      <span style="font-size:12px;">0</span>
      <span style="float:right; font-size:12px;">6</span>
      <br><br>
      All FAR is calculated at the block level.
      <br><br>
      Learn more about the zoning codes at the 
      <a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">NYC Department of City Planning</a>
    `;
  } else if (mode === 'value') {
    legend.innerHTML = `
      <strong>Change in Property Value (2004–2025)</strong><br>
      <div style="background:linear-gradient(to right, transparent, #c0f900); height: 15px; margin: 6px 0;"></div>
      <span style="font-size:12px;">$0</span>
      <span style="float:right; font-size:12px;">High</span>
      <br><br>
      Assessed property value is determined by NYC based on a parcel’s use, income, and market factors. This analysis aggregates the total value by block.
      <br><br>
      All property values are calculated at the block level.
      <br><br>
      Learn more about the zoning codes at the 
      <a href="https://www.nyc.gov/site/finance/property/property-determining-your-assessed-value.page" target="_blank" style="color:#8ecae6;">NYC Department of Finance</a>
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

  const layers = ['use-fill', 'bulk-fill', 'bulk-outline', 'building-fill', 'value-fill'];
  layers.forEach(layer => {
    if (map.getLayer(layer)) {
      const visible = layer.includes(mode) || (mode === 'bulk' && layer === 'bulk-outline');
      map.setLayoutProperty(layer, 'visibility', visible ? 'visible' : 'none');
    }
  });

  updateLegend(mode);
}

map.on('load', () => {
  // Load zoning polygons
  fetch('./gwzd_v5_with_bulk.geojson')
    .then(res => res.json())
    .then(data => {
      // Set use categories and ensure proper FAR handling
      for (const f of data.features) {
        const z = f.properties.ZONEDIST || '';
        const r = f.properties.PRIOR_ZONING || '';
        if (z.includes('PARK')) f.properties.USE_CATEGORY = 'Parks';
        else if (/^M1|M3/.test(z) && !z.includes('/')) f.properties.USE_CATEGORY = 'Manufacturing';
        else if (z.includes('/')) f.properties.USE_CATEGORY = 'Mixed';
        else f.properties.USE_CATEGORY = 'Residential';
      }

      map.addSource('zoning', { type: 'geojson', data });

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
    });

  // Load block-level land analysis
  fetch('./blocks_final.geojson')
    .then(res => res.json())
    .then(data => {
      map.addSource('blocks', { type: 'geojson', data });

      map.addLayer({
        id: 'building-fill',
        type: 'fill',
        source: 'blocks',
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
        id: 'value-fill',
        type: 'fill',
        source: 'blocks',
        layout: { visibility: 'none' },
        paint: {
          'fill-color': [
            'interpolate',
            ['linear'],
            ['get', 'VALUE_CHANGE'],
            0, 'transparent',
            100000000, '#c0f900'
          ],
          'fill-opacity': 1
        }
      });
    });

  // Fit bounds once data is loaded
  map.once('idle', () => {
    const bounds = map.getSource('zoning') ? turf.bbox(map.getSource('zoning')._data) : [-74.01, 40.7, -73.93, 40.74];
    bounds[0] += 0.002;
    bounds[2] += 0.002;
    map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
  });

  // Popup for hover
  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false,
    anchor: 'bottom',
    offset: [0, -10]
  });

  function formatHover(p) {
    return `
      <strong>${p.NEIGHBORHOOD || 'Unknown'}</strong><br>
      2004: $${(+p.VALUE_2004).toLocaleString()} (${p.FAR_2004} FAR)<br>
      2025: $${(+p.VALUE_2025).toLocaleString()} (${p.FAR_2025} FAR)
    `;
  }

  function formatZoningHover(p) {
    return `
      <strong>${p.NEIGHBORHOOD}</strong><br>
      Prior: ${p.PRIOR_ZONING} (${p.FAR_BEFORE} FAR)<br>
      New: ${p.ZONEDIST} (${p.FAR_AFTER} FAR)
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
