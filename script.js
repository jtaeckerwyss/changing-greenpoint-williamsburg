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
      <strong>Zoning Use (Post-Rezoning)</strong><br>
      <div><span style="background:#ffb74d;width:12px;height:12px;display:inline-block;margin-right:6px;"></span>M to MX</div>
      <div><span style="background:#fff176;width:12px;height:12px;display:inline-block;margin-right:6px;"></span>M to R</div>
      <div><span style="background:#ce93d8;width:12px;height:12px;display:inline-block;margin-right:6px;"></span>M to M</div>
      <div><span style="background:#a5d6a7;width:12px;height:12px;display:inline-block;margin-right:6px;"></span>Parks</div>
      <br>
      <a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">Learn more about the zoning codes at the NYC Department of City Planning</a>
    `;
  } else {
    legend.innerHTML = `
      <strong>New Residential Floor Area Ratio (FAR)</strong><br>
      <div style="background:linear-gradient(to right, #5ed7ff, transparent); height: 15px; margin: 6px 0;"></div>
      FAR measures building bulk by comparing total floor area to lot size. Higher FAR values allow taller or denser buildings, enabling more residential development on a site.
      <br><br>
      <a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">Learn more about the zoning codes at the NYC Department of City Planning</a>
    `;
  }
}

function setMapMode(mode) {
  currentMode = mode;
  document.getElementById('page-label').innerText = mode === 'use' ? 'Zoning Use' : 'Zoning Bulk';

  map.setLayoutProperty('use-fill', 'visibility', mode === 'use' ? 'visible' : 'none');
  map.setLayoutProperty('bulk-fill', 'visibility', mode === 'bulk' ? 'visible' : 'none');
  updateLegend(mode);
}

map.on('load', () => {
  fetch('./gwzd_v5_with_bulk.geojson')
    .then(res => res.json())
    .then(data => {
      map.addSource('zoning', { type: 'geojson', data });

      // Use layer
      map.addLayer({
        id: 'use-fill',
        type: 'fill',
        source: 'zoning',
        paint: {
          'fill-color': [
            'match',
            ['get', 'ZONEDIST'],
            'R6', '#fff176',
            'R6A', '#fff176',
            'R6B', '#fff176',
            'R7A', '#fff176',
            'R8', '#fff176',
            'C4-3A', '#fff176',
            'C6-2', '#fff176',
            'M1-2', '#ce93d8',
            'M3-1', '#ce93d8',
            'M1-2/R6A', '#ffb74d',
            'M1-2/R7A', '#ffb74d',
            'M1-4/R6A', '#ffb74d',
            'PARK', '#a5d6a7',
            '#9e9e9e'
          ],
          'fill-opacity': 0.6
        }
      });

      // Bulk change (FAR) layer
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

      function formatHover(e) {
        const p = e.features[0].properties;
        return `
          <strong>${p.NEIGHBORHOOD}</strong><br>
          Prior: ${p.PRIOR_ZONING} (${p.FAR_BEFORE})<br>
          New: ${p.ZONEDIST} (${p.FAR_AFTER})
        `;
      }

      map.on('mousemove', 'use-fill', (e) => {
        if (currentMode !== 'use') return;
        map.getCanvas().style.cursor = 'pointer';
        popup.setLngLat(e.lngLat).setHTML(formatHover(e)).addTo(map);
      });

      map.on('mousemove', 'bulk-fill', (e) => {
        if (currentMode !== 'bulk') return;
        map.getCanvas().style.cursor = 'pointer';
        popup.setLngLat(e.lngLat).setHTML(formatHover(e)).addTo(map);
      });

      map.on('mouseleave', 'use-fill', () => { popup.remove(); map.getCanvas().style.cursor = ''; });
      map.on('mouseleave', 'bulk-fill', () => { popup.remove(); map.getCanvas().style.cursor = ''; });
    });
});
