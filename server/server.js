
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const folderRoutes = require('./routes/folderRoutes');
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const fileRoutes = require('./routes/fileRoutes');
const app = express();
const PORT = process.env.PORT || 5000;
const shareRoutes = require('./routes/shareRoutes');
// Security middleware
app.use(helmet());

app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
  })
);

app.use(express.json({ limit: '1mb' }));

// Basic route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to CloudNest API',
    status: 'running',
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'CloudNest server is healthy',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/shares', shareRoutes);
// Handle unknown routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'API route not found.',
  });
});

// Handle unexpected errors
app.use((err, req, res, next) => {
  console.error('Server error:', err.message);

  res.status(err.status || 500).json({
    success: false,
    message:
      err.status && err.status < 500
        ? err.message
        : 'Something went wrong on the server.',
  });
});

// Connect to MongoDB before starting the server
const startServer = async () => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`CloudNest API running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Server startup failed. Check your MongoDB configuration.');
    process.exit(1);
  }
};

startServer();
