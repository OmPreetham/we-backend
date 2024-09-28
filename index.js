import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import { connectDB } from './config/db.js'
import cookieParser from 'cookie-parser'
import authRouter from './routes/authRoutes.js'
import userRoutes from './routes/userRoutes.js'
import boardRouter from './routes/boardRoutes.js'
import postsRouter from './routes/postRoutes.js'

dotenv.config()

const app = express()
app.use(cors({ origin: 'http://localhost:5500' }))

const PORT = process.env.PORT || 5500

app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
  res.send('Hello, We!')
})

app.use('/api/auth', authRouter)
app.use('/api/user', userRoutes);
app.use('/api/boards', boardRouter)
app.use('/api/posts', postsRouter)

app.listen(PORT, () => {
  connectDB()
  console.log(`Server running on PORT: ${PORT}`)
})
