import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server);

const port = 4000;

interface Room {
  users: string[];
  currentQuestion: number;
  questionStartTime: number;
  scores: Record<string, number>;
}

const rooms: Record<string, Room> = {};
const questions: string[] = ['Question 1', 'Question 2']; 

app.get('/create-room', (req, res) => {
  const roomId = uuidv4();
  rooms[roomId] = {
    users: [],
    currentQuestion: -1,
    questionStartTime: 0,
    scores: {}
  };
  res.json({ roomId });
});

io.on('connection', (socket: Socket) => {
  socket.on('join-room', (roomId: string, userId: string) => {
    if (rooms[roomId] && rooms[roomId].users.length < 2) {
      socket.join(roomId);
      rooms[roomId].users.push(userId);
      rooms[roomId].scores[userId] = 0;

      if (rooms[roomId].users.length === 2) {
        startGame(roomId);
      }
    }
  });

  socket.on('answer', (roomId: string, userId: string, answer: string) => {
    const room = rooms[roomId];
    if (!room || room.currentQuestion === -1) return;

    const timeTaken = (Date.now() - room.questionStartTime) / 1000;
    let points = 0;

    if (isValidAnswer(answer, room.currentQuestion)) {
      if (timeTaken <= 7) points = 3;
      else if (timeTaken <= 8) points = 2;
      else if (timeTaken <= 10) points = 1;
    } else {
      const otherPlayerId = room.users.find(id => id !== userId);
      if (otherPlayerId) room.scores[otherPlayerId] += 2;
    }

    room.scores[userId] += points;
    nextQuestion(roomId);
  });

  // Handle disconnects
  socket.on('disconnect', () => {
    // Find the room the user was in and handle the user's disconnection
  });
});

function startGame(roomId: string) {
  nextQuestion(roomId);
}

function nextQuestion(roomId: string) {
  const room = rooms[roomId];
  room.currentQuestion++;
  if (room.currentQuestion < questions.length) {
    room.questionStartTime = Date.now();
    io.to(roomId).emit('question', questions[room.currentQuestion]);
  } else {
    endGame(roomId);
  }
}

function endGame(roomId: string) {
  io.to(roomId).emit('end-game', rooms[roomId].scores);
  delete rooms[roomId];
}

function isValidAnswer(answer: string, questionIndex: number): boolean {
  // Implement your answer validation logic here
  return true;
}

server.listen(port, () => console.log(`Server running on port ${port}`));
