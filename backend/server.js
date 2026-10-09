require('dotenv').config();
const app = require('./app');

const port = Number(process.env.PORT || 5000);
app.listen(port, () => console.log(`In4Tech site listening at http://localhost:${port}`));
