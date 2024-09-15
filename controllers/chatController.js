import Chat from '../models/Chat.js'
import Message from '../models/Message.js'

export const createChat = async (req, res) => {
  const { recipientId } = req.body
  const { userId } = req.user

  try {
    const chat = new Chat({ users: [userId, recipientId] })
    await chat.save()
    res.status(201).json(chat)
  } catch (error) {
    res.status(500).json({ error: 'Error creating chat' })
  }
}

export const sendMessage = async (req, res) => {
  const { chatId, content } = req.body
  const { userId } = req.user

  try {
    const message = new Message({ chat: chatId, sender: userId, content })
    await message.save()
    res.status(201).json(message)
  } catch (error) {
    res.status(500).json({ error: 'Error sending message' })
  }
}

export const getMessages = async (req, res) => {
  const { chatId } = req.params

  try {
    const messages = await Message.find({ chat: chatId }).populate(
      'sender',
      'username'
    )
    res.status(200).json(messages)
  } catch (error) {
    res.status(500).json({ error: 'Error fetching messages' })
  }
}
