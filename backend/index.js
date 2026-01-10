const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path'); // Added for static files
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const uploadRoutes = require('./routes/uploadRoutes'); // Import Upload Routes

dotenv.config();
connectDB();

const app = express();

app.use(cors()); // Allow all origins for debugging
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve the uploads folder so users can watch their videos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Use the routes
app.use('/api/users', userRoutes);
app.use('/api/upload', uploadRoutes); // Register Upload Routes

// Port 5001 matches the frontend fetch logic
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});