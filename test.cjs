const express = require('express');
const app = express();
const port = 3006;

app.delete('/api/users/:id', (req, res) => {
  console.log('DELETE ROUTE MATCHED:', req.method, req.path, req.params.id);
  res.json({ status: 'success', message: 'Matched!' });
});

app.use('/api', (req, res) => {
  console.log('API 404 handler hit:', req.method, req.path);
  res.status(404).json({ status: 'error', message: 'API route not found.' });
});

app.listen(port, () => {
  console.log('Test server running on port', port);
});