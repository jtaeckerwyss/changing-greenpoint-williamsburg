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
        legend.innerHTML = `...`; // keep your existing legend here
    } else if (mode === 'bulk' || mode === 'building') {
        legend.innerHTML = `...`; // same here
    } else if (mode === 'value') {
        legend.innerHTML = `...`; // and here
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

map.on('load', async () => {
    const zoning = await fetch('./gwzd_v5_with_bulk.geojson').then(res => res.json());
    const blocks = await fetch('./blocks_final.geojson').then(res => res.json());

    map.addSource('zoning', { type: 'geojson', data: zoning });
    map.addSource('blocks', { type: 'geojson', data: blocks });

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
                30000000, 'limegreen'
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
