import express from 'express'
import dotenv from 'dotenv'
import http from 'http'
import cors from 'cors'
import { connectDB } from './config/db.js'
import cookieParser from 'cookie-parser'
import { Server } from 'socket.io'
import authRouter from './routes/authRoutes.js'
import boardRouter from './routes/boardRoutes.js'
import postsRouter from './routes/postRoutes.js'
import chatRoutes from './routes/chatRoutes.js'
import { chatSocket } from './sokets/chatSocket.js'

dotenv.config()

const app = express()
app.use(cors({ origin: 'http://localhost:3000' }))

const server = http.createServer(app)
const io = new Server(server)

const PORT = process.env.PORT || 5500

app.use(express.json())
app.use(cookieParser())

app.get('/', (req, res) => {
  res.send('Hello, We!')
})

app.use('/api/auth', authRouter)
app.use('/api/boards', boardRouter)
app.use('/api/posts', postsRouter)
app.use('/api/chats', chatRoutes)

chatSocket(io)

app.listen(PORT, () => {
  connectDB()
  console.log(`Server running on PORT: ${PORT}`)
})
