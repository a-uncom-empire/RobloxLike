const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

const players = new Map();
const games = new Map();

const gameWorld = {
  id: 'main-world',
  name: 'Главный мир',
  spawnPoint: { x: 0, y: 2, z: 0 },
  objects: [
    { id: 'ground', type: 'cube', position: { x: 0, y: 0, z: 0 }, size: { x: 10, y: 1, z: 10 }, color: 0x00ff00 },
    { id: 'cube1', type: 'cube', position: { x: 2, y: 1.5, z: 0 }, size: { x: 1, y: 1, z: 1 }, color: 0xff0000 }
  ]
};

io.on('connection', (socket) => {
  console.log('Новый игрок подключился:', socket.id);

  const player = {
    id: socket.id,
    username: `Player_${socket.id.substring(0, 5)}`,
    position: { ...gameWorld.spawnPoint },
    rotation: { x: 0, y: 0, z: 0 },
    health: 100,
    color: Math.floor(Math.random() * 0xffffff)
  };

  players.set(socket.id, player);

  socket.emit('init', {
    playerId: socket.id,
    world: gameWorld,
    players: Array.from(players.values())
  });

  socket.broadcast.emit('playerJoined', player);

  socket.on('move', (data) => {
    const player = players.get(socket.id);
    if (player) {
      player.position = data.position;
      player.rotation = data.rotation;
      
      socket.broadcast.emit('playerMoved', {
        id: socket.id,
        position: player.position,
        rotation: player.rotation
      });
    }
  });

  socket.on('createObject', (data) => {
    const object = {
      id: uuidv4(),
      type: data.type || 'cube',
      position: data.position,
      size: data.size || { x: 1, y: 1, z: 1 },
      color: data.color || 0xffffff,
      owner: socket.id
    };

    gameWorld.objects.push(object);
    
    io.emit('objectCreated', object);
  });

  socket.on('removeObject', (objectId) => {
    gameWorld.objects = gameWorld.objects.filter(obj => obj.id !== objectId);
    io.emit('objectRemoved', objectId);
  });

  socket.on('chatMessage', (message) => {
    const player = players.get(socket.id);
    const chatData = {
      playerId: socket.id,
      username: player?.username,
      message: message,
      timestamp: Date.now()
    };
    
    io.emit('chatMessage', chatData);
  });

  socket.on('disconnect', () => {
    console.log('Игрок отключился:', socket.id);
    players.delete(socket.id);
    io.emit('playerLeft', socket.id);
  });
});

app.use(express.static('public'));

server.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Откройте http://localhost:${PORT} в браузере`);
});
