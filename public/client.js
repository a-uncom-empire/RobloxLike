let scene, camera, renderer;
let socket;
let playerId;
let players = {};
let objects = {};
let playerObjects = {};
let controls;
let clock = new THREE.Clock();

const menu = document.getElementById('menu');
const hud = document.getElementById('hud');
const usernameSpan = document.getElementById('username');
const healthSpan = document.getElementById('health');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const playersOnlineSpan = document.getElementById('players-online');

function initThreeJS() {

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 10);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    document.getElementById('game-container').appendChild(renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    scene.add(directionalLight);
    

    controls = {
        moveForward: false,
        moveBackward: false,
        moveLeft: false,
        moveRight: false,
        velocity: new THREE.Vector3(),
        direction: new THREE.Vector3(),
        speed: 5
    };
    

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && chatInput.value.trim()) {
            socket.emit('chatMessage', chatInput.value);
            addChatMessage('Вы', chatInput.value);
            chatInput.value = '';
        }
    });
    

    window.addEventListener('resize', onWindowResize);
    

    animate();
}


function connectToServer() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Подключено к серверу');
    });
    
    socket.on('init', (data) => {
        playerId = data.playerId;
        

        createWorld(data.world);
        

        data.players.forEach(player => {
            if (player.id !== playerId) {
                createPlayerObject(player);
            }
        });
        

        usernameSpan.textContent = `Игрок: ${data.playerId.substring(0, 5)}`;
        updateOnlinePlayers(Object.keys(players).length + 1);
    });
    
    socket.on('playerJoined', (player) => {
        createPlayerObject(player);
        addChatMessage('Система', `${player.username} присоединился`);
        updateOnlinePlayers(Object.keys(players).length + 1);
    });
    
    socket.on('playerMoved', (data) => {
        const playerObj = playerObjects[data.id];
        if (playerObj) {
            playerObj.position.set(data.position.x, data.position.y, data.position.z);
            playerObj.rotation.set(data.rotation.x, data.rotation.y, data.rotation.z);
        }
    });
    
    socket.on('objectCreated', (object) => {
        createGameObject(object);
    });
    
    socket.on('objectRemoved', (objectId) => {
        removeGameObject(objectId);
    });
    
    socket.on('chatMessage', (data) => {
        addChatMessage(data.username, data.message);
    });
    
    socket.on('playerLeft', (playerId) => {
        removePlayerObject(playerId);
        addChatMessage('Система', `Игрок отключился`);
        updateOnlinePlayers(Object.keys(players).length);
    });
    
    socket.on('disconnect', () => {
        alert('Отключено от сервера');
        location.reload();
    });
}


function createWorld(worldData) {
    // Земля уже создана в init
    worldData.objects.forEach(obj => {
        createGameObject(obj);
    });
    

    const groundGeometry = new THREE.BoxGeometry(10, 1, 10);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x00ff00 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.set(0, 0, 0);
    ground.receiveShadow = true;
    scene.add(ground);
    objects['ground'] = ground;
}


function createGameObject(objData) {
    let geometry, material;
    
    switch (objData.type) {
        case 'cube':
            geometry = new THREE.BoxGeometry(objData.size.x, objData.size.y, objData.size.z);
            break;
        case 'sphere':
            geometry = new THREE.SphereGeometry(objData.size.x, 32, 32);
            break;
        default:
            geometry = new THREE.BoxGeometry(1, 1, 1);
    }
    
    material = new THREE.MeshLambertMaterial({ color: objData.color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(objData.position.x, objData.position.y, objData.position.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    scene.add(mesh);
    objects[objData.id] = mesh;
    return mesh;
}


function createPlayerObject(playerData) {
    const geometry = new THREE.BoxGeometry(0.8, 1.8, 0.8);
    const material = new THREE.MeshLambertMaterial({ color: playerData.color });
    const playerMesh = new THREE.Mesh(geometry, material);
    playerMesh.position.set(playerData.position.x, playerData.position.y, playerData.position.z);
    playerMesh.castShadow = true;
    scene.add(playerMesh);
    
    playerObjects[playerData.id] = playerMesh;
    players[playerData.id] = playerData;
}


function removePlayerObject(playerId) {
    const playerObj = playerObjects[playerId];
    if (playerObj) {
        scene.remove(playerObj);
        delete playerObjects[playerId];
        delete players[playerId];
    }
}


function removeGameObject(objectId) {
    const obj = objects[objectId];
    if (obj) {
        scene.remove(obj);
        delete objects[objectId];
    }
}


function onKeyDown(event) {
    switch (event.keyCode) {
        case 87: // W
            controls.moveForward = true;
            break;
        case 83: // S
            controls.moveBackward = true;
            break;
        case 65: // A
            controls.moveLeft = true;
            break;
        case 68: // D
            controls.moveRight = true;
            break;
    }
}

function onKeyUp(event) {
    switch (event.keyCode) {
        case 87: // W
            controls.moveForward = false;
            break;
        case 83: // S
            controls.moveBackward = false;
            break;
        case 65: // A
            controls.moveLeft = false;
            break;
        case 68: // D
            controls.moveRight = true;
            break;
    }
}


function createCube() {
    if (!playerId) return;
    
    const position = {
        x: camera.position.x,
        y: camera.position.y - 2,
        z: camera.position.z - 5
    };
    
    const color = Math.floor(Math.random() * 0xffffff);
    
    socket.emit('createObject', {
        type: 'cube',
        position: position,
        size: { x: 1, y: 1, z: 1 },
        color: color
    });
}


function removeLastObject() {
    const objectIds = Object.keys(objects);
    if (objectIds.length > 0) {
        const lastObjectId = objectIds[objectIds.length - 1];
        if (lastObjectId !== 'ground') {
            socket.emit('removeObject', lastObjectId);
        }
    }
}


function addChatMessage(username, message) {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.innerHTML = `<strong>${username}:</strong> ${message}`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Обновление счетчика онлайн
function updateOnlinePlayers(count) {
    playersOnlineSpan.textContent = `Игроков онлайн: ${count}`;
}


function joinGame() {
    const usernameInput = document.getElementById('username-input');
    const username = usernameInput.value.trim() || `Player_${Math.floor(Math.random() * 1000)}`;
    
    menu.style.display = 'none';
    hud.style.display = 'block';
    
    initThreeJS();
    connectToServer();
    
    usernameSpan.textContent = `Игрок: ${username}`;
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


function animate() {
    requestAnimationFrame(animate);
    
    const delta = clock.getDelta();
    

    controls.velocity.z -= controls.velocity.z * 10.0 * delta;
    controls.velocity.x -= controls.velocity.x * 10.0 * delta;
    
    controls.direction.z = Number(controls.moveForward) - Number(controls.moveBackward);
    controls.direction.x = Number(controls.moveRight) - Number(controls.moveLeft);
    controls.direction.normalize();
    
    if (controls.moveForward || controls.moveBackward) {
        controls.velocity.z -= controls.direction.z * controls.speed * delta;
    }
    if (controls.moveLeft || controls.moveRight) {
        controls.velocity.x -= controls.direction.x * controls.speed * delta;
    }
    
    camera.translateX(-controls.velocity.x * delta);
    camera.translateZ(-controls.velocity.z * delta);
    

    if (socket && socket.connected) {
        socket.emit('move', {
            position: {
                x: camera.position.x,
                y: camera.position.y,
                z: camera.position.z
            },
            rotation: {
                x: camera.rotation.x,
                y: camera.rotation.y,
                z: camera.rotation.z
            }
        });
    }
    
    renderer.render(scene, camera);
}


document.addEventListener('DOMContentLoaded', () => {

});
