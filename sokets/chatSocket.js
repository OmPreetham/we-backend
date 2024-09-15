export const chatSocket = (io) => {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id)

    socket.on('joinChat', (chatId) => {
      socket.join(chatId)
    })

    socket.on('sendMessage', (chatId, message) => {
      io.to(chatId).emit('receiveMessage', message)
    })

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id)
    })
  })
}
