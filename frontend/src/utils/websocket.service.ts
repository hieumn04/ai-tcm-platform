import path from 'path'
import { io, Socket } from 'socket.io-client'
import { server } from 'typescript'

interface WebhookResponse {
  webhookId: string
  data?: any
  error?: string
  message?: string
}

class WebSocketService {
  private socket: Socket | null = null
  private isConnected = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3
  private reconnectDelay = 1000

  constructor() {
    this.connect()
  }

  private connect() {

    const wsServer = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || 'http://localhost:8001'

    console.log('[WS: Connecting] with config', {
      server: wsServer,
      path: '/backend/socket.io/' ,
      transports: ['websocket', 'polling'],
      envDomain: process.env.NEXT_PUBLIC_BACKEND_ORIGIN,
    })

    this.socket = io(wsServer, {
      path: '/backend/socket.io/',  
      transports: ['websocket', 'polling'],
      withCredentials: true,  
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      timeout: 20000,
      forceNew: true,
      upgrade: true,
    });


    this.socket.on('connect', () => {
      console.log('[WS: Connected] with info:', {
        id: this.socket?.id,
        transport: this.socket?.io.engine.transport.name
      })
      this.isConnected = true
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log('[WS: Disconnected] -', { reason })
      this.isConnected = false
    })

    this.socket.on('connect_error', (error) => {
      console.log('[WS: Connection error] -', { error })
      this.isConnected = false
      this.reconnectAttempts++
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('[WS: Max reconnection attempts reached] -', { attempts: this.maxReconnectAttempts })
      }
    })

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[WS: Reconnected] -', { attemptNumber })
    })

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[WS: Reconnect attempt] -', { attemptNumber })
    })  

    this.socket.on('reconnect_error', (error) => {
      console.log('[WS: Reconnect error] -', { error })
    })

    this.socket.on('reconnect_failed', () => {
      console.log('[WS: Reconnection failed]')
    })
  }

  async waitForConnection(timeout: number = 10000): Promise<void> {
    if (this.isConnected) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('WebSocket not initialized'))
        return
      }

      const timeoutId = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'))
      }, timeout)

      const onConnect = () => {
        clearTimeout(timeoutId)
        this.socket?.off('connect', onConnect)
        this.socket?.off('connect_error', onError)
        resolve()
      }

      const onError = (error: any) => {
        clearTimeout(timeoutId)
        this.socket?.off('connect', onConnect)
        this.socket?.off('connect_error', onError)
        reject(new Error(`WebSocket connection failed: ${error.message || error}`))
      }

      this.socket.on('connect', onConnect)
      this.socket.on('connect_error', onError)
    })
  }

  subscribeToWebhook(webhookId: string, cb: (data: any) => void): boolean {
    if (!webhookId || typeof webhookId !== 'string') {
      console.log('[WS: Invalid webhookId] -', { webhookId })
      return false
    }
    
    if (!this.socket || !this.isConnected) {
      console.log('[WS: Not connected, cannot subscribe] -', { webhookId })
      return false
    }

    console.log('[WS: Subscribing to] -', { webhookId })
    this.socket.emit('subscribe', webhookId)
    
    this.socket.on('subscribed', (res: { webhookId: string; success: boolean; error?: string }) => {
      if (res.webhookId === webhookId) {
        if (res.success) {
          console.log('[WS: Subscribed to] -', { webhookId })
        } else {
          console.error('[WS: Subscription failed for] -', { webhookId, error: res.error })
        }
      }
    })
    
    this.socket.on('webhook_response', (res: WebhookResponse) => {
      if (res.webhookId === webhookId) {
        console.log('[WS: Webhook response received] -', { webhookId, data: res.data })
        cb(res.data)
      }
    })
    
    this.socket.on('webhook_timeout', (res: WebhookResponse) => {
      if (res.webhookId === webhookId) {
        console.log('[WS: Timeout for] -', { webhookId, message: res.message })
        cb({ error: 'timeout', message: res.message })
      }
    })
    
    return true
  }

  unsubscribeFromWebhook(webhookId: string): boolean {
    if (!this.socket || !this.isConnected) return false

    console.log('[WS: Unsubscribing from] -', { webhookId })
    this.socket.emit('unsubscribe', webhookId)
    
    this.socket.on('unsubscribed', (res: { webhookId: string; success: boolean }) => {
      if (res.webhookId === webhookId) {
        console.log('[WS: Unsubscribed from] -', { webhookId })
      }
    })
    
    return true
  }

  disconnect() {
    if (this.socket) {
      console.log('[WS: Disconnecting]')
      this.socket.disconnect()
      this.socket = null
      this.isConnected = false
    }
  }
}

export default WebSocketService