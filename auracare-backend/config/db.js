const mongoose = require("mongoose")

const connectDB = async () => {
  try {
    // For Mongoose v6+, the options object is no longer needed as the defaults are preferred.
    const conn = await mongoose.connect(process.env.MONGODB_URI)

    console.log(`[v0] MongoDB Connected: ${conn.connection.host}`)

    mongoose.connection.on('error', err => {
      console.error('[v0] MongoDB connection error after initial connection:', err);
    });

  } catch (error) {
    console.error("[v0] Initial database connection error:", error.message)
    // In dev, log the full error for more detailed diagnostics
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    process.exit(1)
  }
}

module.exports = connectDB
