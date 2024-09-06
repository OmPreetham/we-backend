import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()

const URI = process.env.MONGO_URI

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(URI, {})
    console.log('Connected to MongoDB', conn.connection.host)
  } catch (error) {
    console.log('Error connecting to MongoDB', error.message)
    process.exit(1)
  }
}
