const express = require('express');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const app = express();

app.use(express.json());
app.use('/api/auth', authRoutes);

mongoose.connect('mongodb://localhost:27017/quicksender', { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => app.listen(3000, () => console.log('Server running')))
  .catch(err => console.error(err));
