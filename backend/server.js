const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // In production, restrict this to your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
  pingTimeout: 60000,
});

// Test endpoint to confirm server is running
app.get("/", (req, res) => {
  res.send("Socket.io server is running");
});

// Store active rooms and players
const rooms = {};

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Handle room creation
  socket.on("create_room", () => {
    console.log(`Creating room for socket ${socket.id}`);
    const roomCode = generateRoomCode();

    // Store room information
    rooms[roomCode] = {
      players: {},
      hostId: socket.id,
    };

    // Join the room
    socket.join(roomCode);

    // Add the player to the room
    rooms[roomCode].players[socket.id] = {
      id: socket.id,
      position: { x: 600, y: 300 },
      username: "Guest",
      emote: null,
    };

    // Send room code to the client
    socket.emit("room_created", { roomCode });
    console.log(`Room created: ${roomCode} for socket ${socket.id}`);
    console.log(`Active rooms: ${Object.keys(rooms).length}`);
  });

  // Handle room joining
  socket.on("join_room", ({ roomCode }) => {
    // Check if room exists
    if (rooms[roomCode]) {
      // Join the room
      socket.join(roomCode);

      // Add the player to the room
      rooms[roomCode].players[socket.id] = {
        id: socket.id,
        position: { x: 600, y: 300 },
        username: "Guest",
        emote: null,
      };

      // Get existing players in room
      const existingPlayers = rooms[roomCode].players;

      // Send room info to the new player
      socket.emit("room_joined", {
        roomCode,
        players: existingPlayers,
      });

      // Notify other players about the new player
      socket.to(roomCode).emit("player_joined", {
        player: rooms[roomCode].players[socket.id],
      });

      console.log(`Player ${socket.id} joined room: ${roomCode}`);
    } else {
      // Room does not exist
      socket.emit("room_error", { message: "Room not found" });
    }
  });

  // Handle player movement
  socket.on("player_move", ({ roomCode, position }) => {
    // Check if player is in a room
    if (rooms[roomCode]?.players[socket.id]) {
      // Update player position
      rooms[roomCode].players[socket.id].position = position;

      // Broadcast new position to other players in the room
      socket.to(roomCode).emit("player_moved", {
        playerId: socket.id,
        position,
      });
    }
  });

  // Handle player emotes
  socket.on("player_emote", ({ roomCode, emote }) => {
    if (rooms[roomCode]?.players[socket.id]) {
      rooms[roomCode].players[socket.id].emote = emote;

      socket.to(roomCode).emit("player_emoted", {
        playerId: socket.id,
        emote,
      });
    }
  });

  // Handle player name change
  socket.on("player_name", ({ roomCode, username }) => {
    if (rooms[roomCode]?.players[socket.id]) {
      rooms[roomCode].players[socket.id].username = username;

      socket.to(roomCode).emit("player_renamed", {
        playerId: socket.id,
        username,
      });
    }
  });

  // Handle leaving room
  socket.on("leave_room", ({ roomCode }) => {
    leaveRoom(socket, roomCode);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);

    // Find which room the player was in
    for (const roomCode in rooms) {
      if (rooms[roomCode].players[socket.id]) {
        leaveRoom(socket, roomCode);
        break;
      }
    }
  });
});

// Helper function to handle leaving a room
function leaveRoom(socket, roomCode) {
  // Check if room exists
  if (rooms[roomCode]) {
    // Remove player from room
    delete rooms[roomCode].players[socket.id];

    // Notify other players
    socket.to(roomCode).emit("player_left", {
      playerId: socket.id,
    });

    // Leave the socket room
    socket.leave(roomCode);

    console.log(`Player ${socket.id} left room: ${roomCode}`);

    // If room is empty, clean it up
    if (Object.keys(rooms[roomCode].players).length === 0) {
      delete rooms[roomCode];
      console.log(`Room deleted: ${roomCode}`);
    }
  }
}

// Generate a random 5-character room code
function generateRoomCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";

  // Keep generating until we find a unique code
  do {
    result = "";
    for (let i = 0; i < 5; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms[result]); // Ensure code doesn't already exist

  return result;
}

// Start the server
const PORT = process.env.PORT || 3002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
