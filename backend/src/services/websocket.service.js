// src/services/WebSocketService.js
const { v4: uuidv4 } = require('uuid')

class WebSocketService {
  constructor() {
    this.io = null
    this.subscriptions = new Map() // webhookId -> Set<socket>
    this.activeTesters = new Map() // socketId -> { runId, caseId, userId, userName }
  }

  initialize(io) {
    this.io = io
    
    io.engine.on('connection_error', (err) => {
      console.error('[WS-B]: Connection error:', {
        error: err,
      })
    })

    // Register handlers for default root namespace '/'
    io.on('connection', socket => {
      this._registerSocketHandlers(socket)
    })

    // Also register handlers for '/api' namespace in case client connects with /api path
    io.of('/api').on('connection', socket => {
      this._registerSocketHandlers(socket)
    })

    console.log('[WS-B]: Service initialized successfully', {
      totalConnections: this.io.engine.clientsCount,
      activeWebhooks: this.subscriptions.size
    })
  }

  _registerSocketHandlers(socket) {
    console.log('[WS-B]: Client connected:', {
      socketId: socket.id,
      namespace: socket.nsp.name,
    })

    // === Real-time Collaborative Test Runs ===
    socket.on('run:join', (runId) => {
      if (!runId) return
      const roomName = `run_${runId}`
      socket.join(roomName)
      console.log(`[WS-B]: Socket ${socket.id} joined room ${roomName} in nsp ${socket.nsp.name}`)
      
      // Send current active testers to newly joined user
      this.sendActiveTestersToSocket(socket, runId)
    })

    socket.on('run:leave', (runId) => {
      if (!runId) return
      const roomName = `run_${runId}`
      socket.leave(roomName)
      console.log(`[WS-B]: Socket ${socket.id} left room ${roomName}`)

      // If this socket was actively testing a case in this run, clear it
      if (this.activeTesters.has(socket.id)) {
        const current = this.activeTesters.get(socket.id)
        if (String(current.runId) === String(runId)) {
          this.activeTesters.delete(socket.id)
          this.broadcastActiveTesters(runId)
        }
      }
    })

    socket.on('case:start_testing', ({ runId, caseId, userId, userName }) => {
      if (!runId || !caseId) return
      console.log(`[WS-B]: User ${userName || userId} started testing case ${caseId} in run ${runId}`)
      
      // Update presence (automatically replaces previous case if any)
      this.activeTesters.set(socket.id, {
        runId: String(runId),
        caseId: Number(caseId),
        userId: Number(userId),
        userName: String(userName || 'Tester'),
      })

      this.broadcastActiveTesters(runId)
    })

    socket.on('case:stop_testing', ({ runId, caseId }) => {
      if (!runId) return
      if (this.activeTesters.has(socket.id)) {
        const current = this.activeTesters.get(socket.id)
        if (String(current.runId) === String(runId) && (!caseId || Number(current.caseId) === Number(caseId))) {
          this.activeTesters.delete(socket.id)
          this.broadcastActiveTesters(runId)
        }
      }
    })

    // === Webhook Subscriptions (Legacy) ===
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
      
      socket.emit('subscribed', { webhookId, success: true })
    })

    socket.on('unsubscribe', webhookId => {
      this.subscriptions.get(webhookId)?.delete(socket)
      socket.emit('unsubscribed', { webhookId, success: true })
    })

    socket.on('disconnect', (reason) => {
      console.log('[WS-B]: Client disconnected:', {
        socketId: socket.id,
        reason: reason
      })
      
      // Dọn dẹp Active Testers dứt điểm khi disconnect, chống Zombie badge
      if (this.activeTesters.has(socket.id)) {
        const { runId } = this.activeTesters.get(socket.id)
        this.activeTesters.delete(socket.id)
        this.broadcastActiveTesters(runId)
        console.log(`[WS-B]: Cleaned up active tester presence for run ${runId}`)
      }

      // Clean up subscriptions
      this.subscriptions.forEach((sockets) => {
        sockets.delete(socket)
      })
    })

    socket.on('error', (error) => {
      console.error('[WS-B]: Socket error:', {
        socketId: socket.id,
        error: error.message || error
      })
    })
  }

  // Lấy danh sách active testers của 1 run
  getActiveTestersForRun(runId) {
    const testers = []
    this.activeTesters.forEach((tester) => {
      if (String(tester.runId) === String(runId)) {
        testers.push({
          caseId: tester.caseId,
          userId: tester.userId,
          userName: tester.userName,
        })
      }
    })
    return testers
  }

  // Broadcast danh sách active testers cho room
  broadcastActiveTesters(runId) {
    if (!this.io) return
    const activeTesters = this.getActiveTestersForRun(runId)
    const payload = {
      runId: Number(runId),
      activeTesters,
    }
    this.io.to(`run_${runId}`).emit('case:active_testers_changed', payload)
    try {
      this.io.of('/api').to(`run_${runId}`).emit('case:active_testers_changed', payload)
    } catch (_) {}
  }

  // Gửi danh sách active testers cho 1 socket cụ thể khi vừa vào phòng
  sendActiveTestersToSocket(socket, runId) {
    const activeTesters = this.getActiveTestersForRun(runId)
    socket.emit('case:active_testers_changed', {
      runId: Number(runId),
      activeTesters,
    })
  }

  // Broadcast delta status update tới room sau khi DB commit
  broadcastCaseStatusUpdated(runId, payload) {
    if (!this.io) return
    console.log(`[WS-B]: Emitting case:status_updated to room run_${runId}:`, payload)
    this.io.to(`run_${runId}`).emit('case:status_updated', payload)
    try {
      this.io.of('/api').to(`run_${runId}`).emit('case:status_updated', payload)
    } catch (_) {}
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
