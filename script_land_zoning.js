mapboxgl.accessToken = 'pk.eyJ1IjoiZGJlcmdlcjMyNCIsImEiOiJjbTkxejI1ODYwMGQ1MmxvbWZreDZhMGgxIn0.nfxxsMs9W6jzp0-Wo-OEZg';

// Keeps track of the active tab
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

// This function updates the legend based on the active mode
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
    } else if (mode === 'bulk' || mode === 'building') {
        legend.innerHTML = `
      <strong>New Residential Floor Area Ratio (FAR)</strong><br>
      <div style="background:linear-gradient(to right, transparent, #5ed7ff); height: 15px; margin: 6px 0;"></div>
      <span style="font-size:12px;">0</span><span style="float:right; font-size:12px;">6</span><br><br>
      FAR measures building bulk by comparing total floor area to lot size. Higher FAR values allow taller or denser buildings, enabling more residential development on a site.
      <br><br>
      All FAR is calculated at the block level.<br><br>
      Learn more about the zoning codes at the 
      <a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">NYC Department of City Planning</a>
    `;
    } else if (mode === 'value') {
        legend.innerHTML = `
      <strong>Change in Assessed Property Value (2004–2025)</strong><br>
      <div style="background:linear-gradient(to right, transparent, limegreen); height: 15px; margin: 6px 0;"></div>
      <span style="font-size:12px;">0</span><span style="float:right; font-size:12px;">Max</span><br><br>
      Assessed value reflects the city’s taxable estimate of a property’s worth, used to calculate property taxes. It does not necessarily represent market value.
      All property values are calculated at the block level.<br><br>
      Learn more about the zoning codes at the 
      <a href="https://www.nyc.gov/site/finance/property/property-determining-your-assessed-value.page" target="_blank" style="color:#8ecae6;">NYC Department of Finance</a>
    `;
    }
}

// Toggles visibility of layers based on selected mode
function setMapMode(mode) {
    currentMode = mode;
    document.getElementById('page-label').innerText = {
        use: 'Zoning Use',
        bulk: 'Zoning Bulk',
        building: 'Building',
        value: 'Value'
    }[mode];

    // Loop through layers and toggle visibility
    map.setLayoutProperty('use-fill', 'visibility', mode === 'use' ? 'visible' : 'none');
    map.setLayoutProperty('bulk-fill', 'visibility', mode === 'bulk' ? 'visible' : 'none');
    map.setLayoutProperty('bulk-outline', 'visibility', mode === 'bulk' ? 'visible' : 'none');
    map.setLayoutProperty('building-fill', 'visibility', mode === 'building' ? 'visible' : 'none');
    map.setLayoutProperty('value-fill', 'visibility', mode === 'value' ? 'visible' : 'none');

    updateLegend(mode);
}

map.on('load', async () => {
    // Load all datasets
    const zoning = await fetch('./gwzd_v5_with_bulk.geojson').then(res => res.json());
    const building = await fetch('./building_change_blocks.geojson').then(res => res.json());
    const value = await fetch('./value_change_blocks.geojson').then(res => res.json());

    // Source: zoning data
    map.addSource('zoning', { type: 'geojson', data: zoning });
    map.addSource('building', { type: 'geojson', data: building });
    map.addSource('value', { type: 'geojson', data: value });

    // Zoning Use
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

    // Zoning Bulk
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

    // Building FAR change (Land tab)
    map.addLayer({
        id: 'building-fill',
        type: 'fill',
        source: 'building',
        layout: { visibility: 'none' },
        paint: {
            'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'far_change'],
                0, 'transparent',
                6, '#5ed7ff'
            ],
            'fill-opacity': 1
        }
    });

    // Value change (Land tab)
    map.addLayer({
        id: 'value-fill',
        type: 'fill',
        source: 'value',
        layout: { visibility: 'none' },
        paint: {
            'fill-color': [
                'interpolate',
                ['linear'],
                ['get', 'value_change'],
                0, 'transparent',
                30000000, 'limegreen'
            ],
            'fill-opacity': 1
        }
    });

    // Zoom & fit
    map.once('idle', () => {
        const bounds = turf.bbox(zoning);
        bounds[0] += 0.002;
        bounds[2] += 0.002;
        map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
    });

    updateLegend(currentMode);

    // Popups
    const popup = new mapboxgl.Popup({
        closeButton: false,
        closeOnClick: false,
        anchor: 'bottom',
        offset: [0, -10]
    });

    const showPopup = (e) => {
        const p = e.features[0].properties;
        popup.setLngLat(e.lngLat).setHTML(p.hover).addTo(map);
    };

    map.on('mousemove', 'use-fill', e => currentMode === 'use' && showPopup(e));
    map.on('mousemove', 'bulk-fill', e => currentMode === 'bulk' && showPopup(e));
    map.on('mousemove', 'building-fill', e => currentMode === 'building' && showPopup(e));
    map.on('mousemove', 'value-fill', e => currentMode === 'value' && showPopup(e));

    map.on('mouseleave', 'use-fill', () => popup.remove());
    map.on('mouseleave', 'bulk-fill', () => popup.remove());
    map.on('mouseleave', 'building-fill', () => popup.remove());
    map.on('mouseleave', 'value-fill', () => popup.remove());
});
