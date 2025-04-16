// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Globe with texture
const geometry = new THREE.SphereGeometry(5, 32, 32);
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('\world.topo.200410.3x5400x2700.jpg');

const material = new THREE.MeshBasicMaterial({ map: texture });
const globe = new THREE.Mesh(geometry, material);
scene.add(globe);

// Camera position
camera.position.z = 15;

// Store points and country cache
const points = [];
const maxAge = 10;
const countryCache = {}; // Cache to store lat/lon -> country mappings

// Mouse controls variables
let isDragging = false;
let previousMousePosition = {
    x: 0,
    y: 0
};
let globeRotation = {
    x: 0,
    y: 0
};
let zoomLevel = 15;
const minZoom = 5;
const maxZoom = 30;

// Set up mouse controls
function setupMouseControls() {
    // Mouse down event
    renderer.domElement.addEventListener('mousedown', (event) => {
        isDragging = true;
        previousMousePosition = {
            x: event.clientX,
            y: event.clientY
        };
    });

    // Mouse move event
    renderer.domElement.addEventListener('mousemove', (event) => {
        if (isDragging) {
            const deltaMove = {
                x: event.clientX - previousMousePosition.x,
                y: event.clientY - previousMousePosition.y
            };

            // Rotate globe based on mouse movement
            globeRotation.x += deltaMove.y * 0.01;
            globeRotation.y += deltaMove.x * 0.01;
            
            // Limit vertical rotation to prevent flipping
            globeRotation.x = Math.max(-Math.PI/2, Math.min(Math.PI/2, globeRotation.x));
            
            previousMousePosition = {
                x: event.clientX,
                y: event.clientY
            };
        }

        // Hover detection for points
        const mouse = new THREE.Vector2(
            (event.clientX / window.innerWidth) * 2 - 1,
            -(event.clientY / window.innerHeight) * 2 + 1
        );
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(points);
        document.getElementById('info').innerHTML = intersects.length > 0 ? `IP: ${intersects[0].object.ip}` : '';
    });

    // Mouse up event
    renderer.domElement.addEventListener('mouseup', () => {
        isDragging = false;
    });

    // Mouse leave event
    renderer.domElement.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    // Mouse wheel for zoom
    renderer.domElement.addEventListener('wheel', (event) => {
        event.preventDefault();
        zoomLevel -= event.deltaY * 0.05;
        zoomLevel = Math.max(minZoom, Math.min(maxZoom, zoomLevel));
    });
}

// Fetch data from Flask
function fetchData() {
    fetch('http://localhost:5000/data')
        .then(response => response.json())
        .then(data => {
            console.log("Fetched data:", data);
            data.forEach(packet => {
                if (!points.some(p => p.ip === packet.ip_address)) {
                    addPoint(packet);
                }
            });
            updateLocationsList();
        })
        .catch(error => console.error("Fetch error:", error));
}

// Add point to globe
function addPoint(packet) {
    const lat = packet.latitude * Math.PI / 180;
    const lon = packet.longitude * Math.PI / 180;
    const radius = 5;

    const x = radius * Math.cos(lat) * Math.cos(lon);
    const y = radius * Math.sin(lat);
    const z = radius * Math.cos(lat) * Math.sin(lon);

    const pointGeometry = new THREE.SphereGeometry(0.1, 16, 16);
    const color = packet.suspicious ? 0xff0000 : 0x00ff00;
    const pointMaterial = new THREE.MeshBasicMaterial({ color, transparent: true });
    const point = new THREE.Mesh(pointGeometry, pointMaterial);
    point.position.set(x, y, z);
    point.ip = packet.ip_address;
    point.latitude = packet.latitude; // Store for country lookup
    point.longitude = packet.longitude;
    point.timestamp = Date.now() / 1000;

    globe.add(point);
    points.push(point);

    // Fetch country if not cached
    const coordKey = `${packet.latitude},${packet.longitude}`;
    if (!countryCache[coordKey]) {
        fetchCountry(packet.latitude, packet.longitude, coordKey);
    }
}

// Fetch country from Nominatim API
function fetchCountry(lat, lon, coordKey) {
    fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`)
        .then(response => response.json())
        .then(data => {
            const country = data.address?.country || "Unknown";
            countryCache[coordKey] = country;
            updateLocationsList(); // Update list after country is fetched
        })
        .catch(error => {
            console.error("Error fetching country:", error);
            countryCache[coordKey] = "Unknown";
        });
}

// Update list of most common locations with countries
function updateLocationsList() {
    const ipCounts = {};
    points.forEach(p => {
        const key = `${p.latitude},${p.longitude}`;
        ipCounts[p.ip] = {
            count: (ipCounts[p.ip]?.count || 0) + 1,
            country: countryCache[key] || "Fetching..."
        };
    });

    const topLocations = Object.entries(ipCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)
        .map(([ip, info]) => `${ip}: ${info.count} (${info.country})`);
    document.getElementById('locations').innerHTML = "Top Locations:<br>" + topLocations.join('<br>');
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Smooth globe rotation to target
    globe.rotation.x += (globeRotation.x - globe.rotation.x) * 0.1;
    globe.rotation.y += (globeRotation.y - globe.rotation.y) * 0.1;
    
    // Smooth camera zoom
    camera.position.z += (zoomLevel - camera.position.z) * 0.1;

    const now = Date.now() / 1000;
    points.forEach((point, index) => {
        const age = now - point.timestamp;
        if (age > maxAge) {
            globe.remove(point);
            points.splice(index, 1);
        } else {
            point.material.opacity = 1 - (age / maxAge);
        }
    });

    renderer.render(scene, camera);
}

// Initialize mouse controls
setupMouseControls();

// Start
animate();
setInterval(fetchData, 250);