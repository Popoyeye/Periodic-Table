import * as THREE from '../build/three.module.js';
import { CSS3DRenderer, CSS3DObject } from '../examples/jsm/renderers/CSS3DRenderer.js';
import { TrackballControls } from '../examples/jsm/controls/TrackballControls.js';
import TWEEN from '../examples/jsm/libs/tween.module.js';

const sheetId = '1VFukUSKhk_FGf0piORkMgMIOagvJvUCs6MWY5lzg-Jw';
const sheetName = 'Data Template';
const apiKey = 'AIzaSyBcOR1y0PZEFxmeWntA0PFlElawcc8Yj2E';

async function fetchData() {
    try {
        const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${sheetName}?key=${apiKey}`);
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        const data = await response.json();
        return data.values.slice(1); // Exclude header row
    } catch (error) {
        console.error('Failed to fetch data:', error);
        return []; // Return an empty array on failure
    }
}


const tableData = await fetchData();

let camera, scene, renderer;
let controls;
const objects = [];
const targets = { table: [], sphere: [], helix: [], grid: [] };

init();
animate();

function init() {
    camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 1, 10000);
    camera.position.z = 3000;

    scene = new THREE.Scene();

    // Create elements dynamically based on Google Sheets data
    tableData.forEach((item, index) => {

        if (item.length < 6) {
            console.error(`Incomplete data for row ${index}:`, item);
            return;
        }
        
        const photoUrl = item[1];
        const country = item[2];
        const age = item[3];
        const details= item[4];
        const rawNetWorth = item[5];

        if (!rawNetWorth || typeof rawNetWorth !== 'string') {
            console.error(`Invalid or missing Net Worth for ${item[0]} (row ${index})`);
            return;
        }
        const netWorth = parseFloat(rawNetWorth.replace(/[^0-9.-]+/g, ""));

        if (isNaN(netWorth)) {
            console.error(`Invalid Net Worth for ${item[0]} (row ${index}):`, rawNetWorth);
            return;
        }

        console.log(`Parsed Net Worth for ${item[0]}:`, netWorth);

        // Check if net worth is a valid number
        if (isNaN(netWorth)) {
            console.error(`Invalid Net Worth for ${item[0]}`);
        }
    
        const element = document.createElement('div');
        element.className = 'element';

        // Get the background and border colors
        const { backgroundColor, borderColor } = getBackgroundColor(netWorth);

        // Set the background color and border color
        element.style.backgroundColor = backgroundColor;
        element.style.border = `2px solid ${borderColor}`;
    
        // Add Country
        const countryDiv = document.createElement('div');
        countryDiv.className = 'country';
        countryDiv.textContent = `${country}`;
        element.appendChild(countryDiv);

        // Add Age
        const ageDiv = document.createElement('div');
        ageDiv.className = 'age';
        ageDiv.textContent = `${age}`;
        element.appendChild(ageDiv);

        // Create a new container for the photo
        const photoContainer = document.createElement('div');
        photoContainer.className = 'photo-container';

        // Add Photo
        const photo = document.createElement('img');
        photo.className = 'photo';
        photo.src = photoUrl; // Set the image source
        photo.alt = `${item[0]} Photo`;
        photoContainer.appendChild(photo);
        element.appendChild(photoContainer);
    
        // Add Name
        const name = document.createElement('div');
        name.className = 'name';
        name.textContent = item[0];
        element.appendChild(name);

        // Add Details
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'details';
        detailsDiv.textContent = details;
        element.appendChild(detailsDiv);
    
        // Add Net Worth (hidden)
        const netWorthDiv = document.createElement('div');
        netWorthDiv.className = 'net-worth';
        netWorthDiv.textContent = `Net Worth: $${netWorth}`;
        netWorthDiv.style.display = 'none';
        element.appendChild(netWorthDiv);
    
        // Create CSS3D object
        const objectCSS = new CSS3DObject(element);
        objectCSS.position.x = Math.random() * 4000 - 2000;
        objectCSS.position.y = Math.random() * 4000 - 2000;
        objectCSS.position.z = Math.random() * 4000 - 2000;
        scene.add(objectCSS);
    
        objects.push(objectCSS);
    
        // Add positions for Table layout (20x10 grid)
        const object = new THREE.Object3D();
        object.position.x = (index % 20) * 140 - 1330; // Horizontal position (x)
        object.position.y = -Math.floor(index / 20) * 180 + 990; // Vertical position (y)
    
        targets.table.push(object);
    });
    
    // Sphere layout
    const vector = new THREE.Vector3();
    objects.forEach((_, i) => {
        const phi = Math.acos(-1 + (2 * i) / objects.length);
        const theta = Math.sqrt(objects.length * Math.PI) * phi;

        const object = new THREE.Object3D();
        object.position.setFromSphericalCoords(800, phi, theta);
        vector.copy(object.position).multiplyScalar(2);
        object.lookAt(vector);

        targets.sphere.push(object);
    });

    // Double Helix layout
    objects.forEach((_, i) => {
        const theta = i * 0.175 + Math.PI;
        const y = -(i * 8);
        const offset = Math.PI; // Create offset for the second helix

        const object = new THREE.Object3D();
        
        // Set position for the first helix
        const radius = 900;
        const x = radius * Math.cos(theta);
        const z = radius * Math.sin(theta);
        object.position.set(x, y, z);

        // Apply the second helix by adding an offset to the rotation
        const x2 = radius * Math.cos(theta + offset);  // Apply offset for the second helix
        const z2 = radius * Math.sin(theta + offset);  // Apply offset for the second helix
        object.position.set(x2, y, z2);

        vector.x = object.position.x * 2;
        vector.y = object.position.y;
        vector.z = object.position.z * 2;
        object.lookAt(vector);

        targets.helix.push(object);
    });


    // Grid layout (5x4x10)
    objects.forEach((_, i) => {
        const object = new THREE.Object3D();
        object.position.x = ((i % 5) * 400) - 800;  // Horizontal position (x)
        object.position.y = (-(Math.floor(i / 5) % 4) * 400) + 800;  // Vertical position (y)
        object.position.z = (Math.floor(i / 20) * 1000) - 2000;  // Depth position (z)
    
        targets.grid.push(object);
    });

    // Renderer
    renderer = new CSS3DRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    // Controls
    controls = new TrackballControls(camera, renderer.domElement);
    controls.minDistance = 500;
    controls.maxDistance = 6000;
    controls.addEventListener('change', render);

    // Buttons
    document.getElementById('table').addEventListener('click', () => transform(targets.table, 2000));
    document.getElementById('sphere').addEventListener('click', () => transform(targets.sphere, 2000));
    document.getElementById('helix').addEventListener('click', () => transform(targets.helix, 2000));
    document.getElementById('grid').addEventListener('click', () => transform(targets.grid, 2000));

    transform(targets.table, 2000);

    window.addEventListener('resize', onWindowResize);
}

function getBackgroundColor(netWorth) {
    let backgroundColor, borderColor;

    if (netWorth < 100000) {
        backgroundColor = 'rgba(255, 0, 0, 0.2)'; // Light red with reduced opacity
        borderColor = 'rgba(255, 0, 0, 0.8)';    // Bright red border
    } else if (netWorth < 200000) {
        backgroundColor = 'rgba(255, 165, 0, 0.2)'; // Light orange with reduced opacity
        borderColor = 'rgba(255, 165, 0, 0.8)';     // Bright orange border
    } else {
        backgroundColor = 'rgba(0, 255, 0, 0.2)';   // Light green with reduced opacity
        borderColor = 'rgba(0, 255, 0, 0.8)';       // Bright green border
    }

    return { backgroundColor, borderColor };
}

function transform(targets, duration) {
    TWEEN.removeAll();

    objects.forEach((object, i) => {
        const target = targets[i];

        new TWEEN.Tween(object.position)
            .to({ x: target.position.x, y: target.position.y, z: target.position.z }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();

        new TWEEN.Tween(object.rotation)
            .to({ x: target.rotation.x, y: target.rotation.y, z: target.rotation.z }, Math.random() * duration + duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .start();
    });

    new TWEEN.Tween(this)
        .to({}, duration * 2)
        .onUpdate(render)
        .start();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    render();
}

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
}

function render() {
    renderer.render(scene, camera);
}
