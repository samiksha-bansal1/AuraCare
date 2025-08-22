const mongoose = require("mongoose")

const connectDB = async () => {
  try {
    console.log(`[v0] Attempting to connect to MongoDB: ${process.env.MONGODB_URI}`);
    
    // For Mongoose v6+, the options object is no longer needed as the defaults are preferred.
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    });

    console.log(`[v0] MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', err => {
      console.error('[v0] MongoDB connection error after initial connection:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('[v0] MongoDB disconnected');
    });

  } catch (error) {
    console.error("[v0] Initial database connection error:", error.message);
    // In dev, log the full error for more detailed diagnostics
    if (process.env.NODE_ENV !== 'production') {
      console.error("Full error:", error);
    }
    
    console.log("[v0] Continuing without MongoDB connection - server will start but database features won't work");
    console.log("[v0] To fix: Install and start MongoDB, or use MongoDB Atlas connection string");
  }
}

module.exports = connectDB
