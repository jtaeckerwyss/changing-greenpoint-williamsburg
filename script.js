mapboxgl.accessToken = 'pk.eyJ1IjoiZGJlcmdlcjMyNCIsImEiOiJjbTkxejI1ODYwMGQ1MmxvbWZreDZhMGgxIn0.nfxxsMs9W6jzp0-Wo-OEZg';

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

map.on('load', () => {
    fetch('./gwzd_v4.geojson')
        .then(response => response.json())
        .then(data => {
            map.addSource('greenpoint-williamsburg', {
                type: 'geojson',
                data: data
            });

            // Define color by zoning type (ZONEDIST)
            const zoneColors = [
                'match', ['get', 'ZONEDIST'],
                'PARK', '#a5d6a7',
                'M1-1', '#ce93d8', 'M1-2', '#ce93d8', 'M3-1', '#ce93d8',
                'M1-2/R6A', '#ffb74d', 'M1-2/R7A', '#ffb74d', 'M1-4/R6A', '#ffb74d',
                'R6', '#fff176', 'R6A', '#fff176', 'R6B', '#fff176', 'R7A', '#fff176', 'R8', '#fff176',
                'C4-3A', '#e57373', 'C6-2', '#e57373',
                '#ffffff' // fallback
            ];

            map.addLayer({
                id: 'gwzd-fill',
                type: 'fill',
                source: 'greenpoint-williamsburg',
                paint: {
                    'fill-color': zoneColors,
                    'fill-opacity': 0.7
                }
            });

            // Add yellow outline for changed parcels
            map.addLayer({
                id: 'gwzd-outline',
                type: 'line',
                source: 'greenpoint-williamsburg',
                paint: {
                    'line-color': [
                        'case',
                        ['!=', ['get', 'ZONEDIST'], ['get', 'PRIOR_ZONING']],
                        '#FFD700',
                        'transparent'
                    ],
                    'line-width': 1.5
                }
            });

            map.once('idle', () => {
                const bounds = turf.bbox(data);
                bounds[0] += 0.002;
                bounds[2] += 0.002;
                map.fitBounds(bounds, { padding: 40, maxZoom: 15 });
            });

            // Hover Popup
            const popup = new mapboxgl.Popup({
                closeButton: false,
                closeOnClick: false,
                anchor: 'bottom',
                offset: [0, -10]
            });

            map.on('mousemove', 'gwzd-fill', (e) => {
                map.getCanvas().style.cursor = 'pointer';
                const props = e.features[0].properties;

                const description = `
                    <div>
                        <strong>${props.NEIGHBORHOOD}</strong><br>
                        Prior Zoning: ${props.PRIOR_ZONING}<br>
                        New Zoning: ${props.ZONEDIST}
                    </div>
                `;

                popup.setLngLat(e.lngLat).setHTML(description).addTo(map);
            });

            map.on('mouseleave', 'gwzd-fill', () => {
                map.getCanvas().style.cursor = '';
                popup.remove();
            });
        })
        .catch(error => {
            console.error('Error loading GeoJSON:', error);
        });
});