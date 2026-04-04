require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/submissions', require('./routes/submissions'));
app.use('/api/defense', require('./routes/defense'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/tutor', require('./routes/tutor'));

require('./socket/defenseHandler')(io);

httpServer.listen(process.env.PORT, () =>
  console.log(`Backend running on port ${process.env.PORT}`)
);