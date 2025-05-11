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
    } else if (mode === 'bulk' || mode === 'building') {
        legend.innerHTML = `
          <strong>New Residential Floor Area Ratio (FAR)</strong><br>
          <div style="background:linear-gradient(to right, transparent, #5ed7ff); height: 15px; margin: 6px 0;"></div>
          <span style="font-size:12px;">0</span><span style="float:right; font-size:12px;">6</span><br><br>
          FAR measures building bulk by comparing total floor area to lot size. Higher FAR values allow taller or denser buildings, enabling more residential development on a site.<br><br>
          All FAR is calculated at the block level.<br><br>
          Learn more about the zoning codes at the 
          <a href="https://www.nyc.gov/content/planning/pages/zoning" target="_blank" style="color:#8ecae6;">NYC Department of City Planning</a>
        `;
    } else if (mode === 'value') {
        legend.innerHTML = `
          <strong>Change in Assessed Property Value (2004–2025)</strong><br>
          <div style="background:linear-gradient(to right, transparent, limegreen); height: 15px; margin: 6px 0;"></div>
          <span style="font-size:12px;">0</span><span style="float:right; font-size:12px;">Max</span><br><br>
          Assessed value reflects the city’s taxable estimate of a property’s worth, used to calculate property taxes. It does not necessarily represent market value.<br><br>
          All property values are calculated at the block level.<br><br>
          Learn more about the zoning codes at the 
          <a href="https://www.nyc.gov/site/finance/property/property-determining-your-assessed-value.page" target="_blank" style="color:#8ecae6;">NYC Department of Finance</a>
        `;
    }
}

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
            map.setLayoutProperty(`bulk-outline`, 'visibility', mode === 'bulk' ? 'visible' : 'none');
        }
    });

    updateLegend(mode);
}

map.on('load', () => {
    fetch('./gwzd_v5_with_bulk.geojson')
      .then(res => res.json())
      .then(data => {
        // Process and add zoning layer(s) here
      });
  
    fetch('./blocks_final.geojson')
      .then(res => res.json())
      .then(data => {
        // Process and add block layers here
      });
  
    // ✅ Now it's safe to attach hover handlers
    const popup = new mapboxgl.Popup({ ... });
  
    map.on('mousemove', 'use-fill', e => { /* logic */ });
    map.on('mousemove', 'bulk-fill', e => { /* logic */ });
    map.on('mousemove', 'building-fill', e => { /* logic */ });
    map.on('mousemove', 'value-fill', e => { /* logic */ });
  
    map.on('mouseleave', 'use-fill', () => popup.remove());
    map.on('mouseleave', 'bulk-fill', () => popup.remove());
    map.on('mouseleave', 'building-fill', () => popup.remove());
    map.on('mouseleave', 'value-fill', () => popup.remove());
  
    updateLegend(currentMode);
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
                ['get', 'far_change'],
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
                ['get', 'value_change'],
                0, 'transparent',
                500000000, 'limegreen',
                -500000000, '#a9746e',
            ],
            'fill-opacity': 1
        }
    });

    map.once('idle', () => {
        const bounds = turf.bbox(zoning);
        bounds[0] += 0.002;
        bounds[2] += 0.002;
        map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
    });

    updateLegend(currentMode);

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
                <strong>Zoning Info</strong><br>
                Prior Zoning: ${p.PRIOR_ZONING || 'N/A'}<br>
                New Zoning: ${p.ZONEDIST || 'N/A'}<br>
                FAR Before: ${p.FAR_BEFORE || 'N/A'}<br>
                FAR After: ${p.FAR_AFTER || 'N/A'}
            `;
        } else {
            html = `
                <strong>Block ${p.block || 'N/A'}</strong><br>
                2004 Value: $${(+p.value_2004 || 0).toLocaleString()}<br>
                2025 Value: $${(+p.value_2025 || 0).toLocaleString()}<br>
                FAR 2004: ${p.far_2004 || 'N/A'}<br>
                FAR 2025: ${p.far_2025 || 'N/A'}
            `;
        }
        popup.setLngLat(e.lngLat).setHTML(html).addTo(map);
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
