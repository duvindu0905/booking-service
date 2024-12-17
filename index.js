// Import the app from app.js
const app = require('./src/app');  // Ensure to adjust path accordingly

const dotenv = require('dotenv');  // To load environment variables from .env file
dotenv.config();  // Load environment variables

// Define the port from environment variables or default to 8082
const PORT = process.env.PORT || 8084;

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

