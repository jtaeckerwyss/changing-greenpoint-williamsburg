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
      <div><span style="background:#e57373;width:12px;height:12px;display:inline-block;margin-right:6px;"></span>Commercial</div>
      <div><span style="background:#fff176;width:12px;height:12px;display:inline-block;margin-right:6px;"></span>Residential</div>
      <div><span style="background:#ffb74d;width:12px;height:12px;display:inline-block;margin-right:6px;"></span>Mixed Use (MX)</div>
      <div><span style="background:#ce93d8;width:12px;height:12px;display:inline-block;margin-right:6px;"></span>Manufacturing</div>
      <div><span style="background:#a5d6a7;width:12px;height:12px;display:inline-block;margin-right:6px;"></span>Parks</div>
    `;
  } else {
    legend.innerHTML = `
      <strong>Zoning Bulk Change (FAR)</strong><br>
      <div style="background:linear-gradient(to right, #a6cee3, white, #fdd49e); height: 15px; margin: 6px 0;"></div>
      <span style="font-size:12px;">↓ Less Bulk</span>
      <span style="float:right; font-size:12px;">More Bulk ↑</span>
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
            'C4-3A', '#e57373',
            'C6-2', '#e57373',
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

      map.addLayer({
        id: 'use-outline',
        type: 'line',
        source: 'zoning',
        filter: ['!=', ['get', 'ZONEDIST'], ['get', 'PRIOR_ZONING']],
        paint: {
          'line-color': '#FFD700',
          'line-width': 1
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
            -3, '#a6cee3',
            0, '#ffffff',
            3, '#fdd49e'
          ],
          'fill-opacity': 0.6
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
        const props = e.features[0].properties;
        map.getCanvas().style.cursor = 'pointer';
        popup.setLngLat(e.lngLat).setHTML(`
          <div><strong>${props.NEIGHBORHOOD}</strong><br>
          Prior: ${props.PRIOR_ZONING}<br>
          New: ${props.ZONEDIST}</div>
        `).addTo(map);
      });

      map.on('mousemove', 'bulk-fill', (e) => {
        if (currentMode !== 'bulk') return;
        const props = e.features[0].properties;
        map.getCanvas().style.cursor = 'pointer';
        popup.setLngLat(e.lngLat).setHTML(`
          <div><strong>${props.NEIGHBORHOOD}</strong><br>
          FAR Before: ${props.FAR_BEFORE}<br>
          FAR After: ${props.FAR_AFTER}</div>
        `).addTo(map);
      });

      map.on('mouseleave', 'use-fill', () => { popup.remove(); map.getCanvas().style.cursor = ''; });
      map.on('mouseleave', 'bulk-fill', () => { popup.remove(); map.getCanvas().style.cursor = ''; });
    });
});