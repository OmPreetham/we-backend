import express from 'express'
import dotenv from 'dotenv'
import { connectDB } from './config/db.js'
import cookieParser from 'cookie-parser'
import authRouter from './routes/authRoutes.js'
import boardRouter from './routes/boardRoutes.js'
import postsRouter from './routes/postRoutes.js'
import { authenticateToken } from './middleware/authMiddleware.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5500

app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
  res.send('Hello, We!')
})

app.use('/api/auth', authRouter)
app.use('/boards', boardRouter)
app.use('/posts', postsRouter)

app.listen(PORT, () => {
  connectDB()
  console.log(`Server running on PORT: ${PORT}`)
})
