const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const app = express();


app.use(cors());
app.use(express.json());
// Serve static files from uploads directory
app.use('/uploads', express.static('uploads'));
app.use('/api/auth', authRoutes);

mongoose.connect('mongodb://localhost:27017/quicksender', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log('Database connected');
    app.listen(3000, () => console.log('Server running'));
  })
  .catch(err => console.error(err));
