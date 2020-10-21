const express = require('express');
const favicon = require('express-favicon');
const path = require('path');

const app = express();
const port = 3000;
const server = app.listen(port, () => {
  console.log(`Server is listening on port ${server.address().port}.`);
});

app.use(favicon(path.join(__dirname, '../public/favicon.ico')));
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, '../build')));

app.get('/ping', (req, res) => {
  return res.send('pong');
});
app.get('/*', (req, res) => {
  return res.sendFile(path.join(__dirname, '../build', 'index.html'));
});
