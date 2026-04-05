require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
  path: '/socket.io',
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use('/api/assignments', require('./routes/assignments'));
app.use('/api/submit', require('./routes/submissions'));
app.use('/api/session', require('./routes/defense'));
app.use('/api/report', require('./routes/reports'));
app.use('/api/tts', require('./routes/tts'));
app.use('/api/tutor', require('./routes/tutor'));
app.use('/internal/pipeline', require('./routes/pipeline'));

require('./socket/defenseHandler')(io);

const port = Number(process.env.PORT || 8080);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

httpServer.listen(port, () =>
  console.log(`Backend running on port ${port}`)
);
