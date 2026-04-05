import { io } from 'socket.io-client'

export function createDefenseSocket() {
  return io(import.meta.env.VITE_SOCKET_URL, {
    path: '/socket.io',
    transports: ['websocket'],
  })
}
