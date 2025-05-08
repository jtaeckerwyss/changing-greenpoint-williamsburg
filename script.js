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

function getUseCategory(zoning) {
  if (!zoning) return 'Other';
  if (zoning.includes('PARK')) return 'Parks';
  if (/^M1|M3/.test(zoning) && !zoning.includes('/')) return 'Manufacturing';
  if (zoning.includes('/')) return 'Mixed';
  return 'Residential';
}

function updateLegend(mode) {
  const legend = document.getElementById('legend');
  if (mode === 'use') {
    legend.innerHTML = `
      <strong>Zoning Use (Post-Rezoning)</strong><br>
      <div><b>Manufacturing:</b> preserved for exclusive industrial use</div>
      <div><b>Residential:</b> opened for new residential uses</div>
      <div><b>Mixed:</b> New mixed zones allow both residential and light manufacturing, but tend to result in housing due to market pressure.</div>
      <div><b>Parks:</b> open space</div>
      <br>
      <a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">NYC Department of City Planning</a>
    `;
  } else {
    legend.innerHTML = `
      <strong>New Residential Floor Area Ratio (FAR)</strong><br>
      <div style="background:linear-gradient(to right, transparent, #5ed7ff); height: 15px; margin: 6px 0;"></div>
      <span style="font-size:12px;">0</span>
      <span style="float:right; font-size:12px;">6</span>
      <br><br>
      FAR measures building bulk by comparing total floor area to lot size. Higher FAR values allow taller or denser buildings, enabling more residential development on a site.
      <br><br>
      <a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">NYC Department of City Planning</a>
    `;
  }
}

function setMapMode(mode) {
  currentMode = mode;
  document.getElementById('page-label').innerText = mode === 'use' ? 'Zoning Use' : 'Zoning Bulk';
  map.setLayoutProperty('use-fill', 'visibility', mode === 'use' ? 'visible' : 'none');
  map.setLayoutProperty('bulk-fill', 'visibility', mode === 'bulk' ? 'visible' : 'none');
  map.setLayoutProperty('bulk-outline', 'visibility', mode === 'bulk' ? 'visible' : 'none');
  updateLegend(mode);
}

map.on('load', () => {
  fetch('./gwzd_v5_with_bulk.geojson')
    .then(res => res.json())
    .then(data => {
      map.addSource('zoning', { type: 'geojson', data });

      map.addLayer({
        id: 'use-fill',
        type: 'fill',
        source: 'zoning',
        paint: {
          'fill-color': [
            'match',
            ['call', ['get', 'ZONEDIST'], ['literal', getUseCategory]],
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

      map.once('idle', () => {
        const bounds = turf.bbox(data);
        bounds[0] += 0.002;
        bounds[2] += 0.002;
        map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
      });

      updateLegend('use');

      const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        anchor: 'bottom',
        offset: [0, -10]
      });

      map.on('mousemove', 'use-fill', (e) => {
        if (currentMode !== 'use') return;
        const p = e.features[0].properties;
        popup.setLngLat(e.lngLat).setHTML(`
          <strong>${p.NEIGHBORHOOD}</strong><br>
          Prior: ${p.PRIOR_ZONING} (${p.FAR_BEFORE} FAR)<br>
          New: ${p.ZONEDIST} (${p.FAR_AFTER} FAR)
        `).addTo(map);
      });

      map.on('mousemove', 'bulk-fill', (e) => {
        if (currentMode !== 'bulk') return;
        const p = e.features[0].properties;
        popup.setLngLat(e.lngLat).setHTML(`
          <strong>${p.NEIGHBORHOOD}</strong><br>
          Prior: ${p.PRIOR_ZONING} (${p.FAR_BEFORE} FAR)<br>
          New: ${p.ZONEDIST} (${p.FAR_AFTER} FAR)
        `).addTo(map);
      });

      map.on('mouseleave', 'use-fill', () => { popup.remove(); map.getCanvas().style.cursor = ''; });
      map.on('mouseleave', 'bulk-fill', () => { popup.remove(); map.getCanvas().style.cursor = ''; });
    });
});
