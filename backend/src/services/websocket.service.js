// src/services/WebSocketService.js
const { v4: uuidv4 } = require('uuid')

class WebSocketService {
  constructor() {
    this.io = null
    this.subscriptions = new Map() // webhookId -> Set<socket>
  }

  initialize(io) {
    this.io = io
    
    io.engine.on('connection_error', (err) => {
      console.error('[WS-B]: Connection error:', {
        error: err,
      })
    })

    io.on('connection', socket => {
      console.log('[WS-B]: Client connected:', {
        socketId: socket.id,
      })

      socket.on('subscribe', webhookId => {
        if (!webhookId || typeof webhookId !== 'string') {
          console.error('[WS-B]: Invalid webhookId:', webhookId)
          socket.emit('subscribed', { webhookId, success: false, error: 'Invalid webhookId' })
          return
        }

        console.log('[WS-B]: Subscribe request:', {
          socketId: socket.id,
          webhookId: webhookId
        })
        
        if (!this.subscriptions.has(webhookId))
          this.subscriptions.set(webhookId, new Set())
        this.subscriptions.get(webhookId).add(socket)
        
        console.log('[WS-B]: Socket subscribed:', {
          socketId: socket.id,
          webhookId: webhookId,
          totalSubscriptions: this.subscriptions.get(webhookId).size || 0
        })
        
        socket.emit('subscribed', { webhookId, success: true })
      })

      socket.on('unsubscribe', webhookId => {
        console.log('[WS-B]: Unsubscribe request:', {
          socketId: socket.id,
          webhookId: webhookId
        })
        
        this.subscriptions.get(webhookId)?.delete(socket)
        
        console.log('[WS-B]: Socket unsubscribed:', {
          socketId: socket.id,
          webhookId: webhookId,
        })
        
        // Acknowledge unsubscription
        socket.emit('unsubscribed', { webhookId, success: true })
      })

      socket.on('disconnect', (reason) => {
        console.log('[WS-B]: Client disconnected:', {
          socketId: socket.id,
          reason: reason
        })
        
        // Clean up subscriptions
        let removedCount = 0
        this.subscriptions.forEach((sockets, webhookId) => {
          if (sockets.delete(socket)) {
            removedCount++
          }
        })
        
        if (removedCount > 0) {
          console.log('[WS-B]: Cleaned up subscriptions:', {
            socketId: socket.id,
            removedSubscriptions: removedCount
          })
        }
      })

      socket.on('error', (error) => {
        console.error('[WS-B]: Socket error:', {
          socketId: socket.id,
     error: error.message || error
        })
      })
    })

    console.log('[WS-B]: Service initialized successfully', {
      totalConnections: this.io.engine.clientsCount,
      activeWebhooks: this.subscriptions.size
    })
  }

  // Publish webhook data to all subscribed sockets
  publishWebhook(webhookId, data) {
    const sockets = this.subscriptions.get(webhookId)
    console.log('[WS-B]: Publishing webhook:', {      
      webhookId: webhookId,
    })

    if (sockets && sockets.size > 0) {
      for (const socket of sockets) {
        console.log('[WS-B]: Sending data to socket:', {
          socketId: socket.id,
          webhookId: webhookId,
          data: data
        })
        socket.emit('webhook_response', { webhookId, data })
      }
      return true
    }

    console.log('[WS-B]: No subscriptions for webhook:', webhookId)
    return false
  }

  // Send timeout message for webhooks that take too long
  publishWebhookTimeout(webhookId, message = 'Webhook request timed out') {
    const sockets = this.subscriptions.get(webhookId)

    console.log('[WS-B]: Publishing timeout:', {
      webhookId: webhookId,
      message: message
    })
    
    if (sockets && sockets.size > 0) {
      for (const socket of sockets) {
        socket.emit('webhook_timeout', { webhookId, message })
      }
      return true
    }
    return false
  }

  generateWebhookId() {
    return uuidv4()
  }
}

module.exports = new WebSocketService()
