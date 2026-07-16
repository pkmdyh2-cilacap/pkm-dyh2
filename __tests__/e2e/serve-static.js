const express = require('express');
const path = require('path');

const app = express();
const port = parseInt(process.env.PORT, 10) || 3000;
const rootPath = path.join(__dirname, '..', '..', 'public');

app.use(express.static(rootPath));

app.listen(port, () => {
  console.log(`Static server running on http://localhost:${port}`);
});
