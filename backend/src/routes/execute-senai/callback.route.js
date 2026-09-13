const express = require('express')
const router = express.Router()
const ResponseUtil = require('../../utils/response.util')

module.exports = function (sequelize, webSocketService) {
  router.post('/:webhookId', async (req, res) => {
    try {
      const { webhookId } = req.params
      const callbackData = req.body
      console.log('[WS]: Received webhook callback:', {
        webhookId: webhookId,
        callbackData: callbackData,
      })
      // Validate required fields
      if (!callbackData) {
        console.log('[WS]: Callback data is missing')
        return ResponseUtil.validationError(res, ['WS: Callback data is required'])
      }

      // Process the webhook callback
      console.log('[WS]: Calling publishWebhook with:', {
    webhookId: webhookId,
        callbackData: callbackData, 
      })
      
      const processed = webSocketService.publishWebhook(webhookId, callbackData)

      if (processed) {
        console.log('[WS]: Webhook callback processed successfully:', {
          webhookId: webhookId,
          callbackData: callbackData,
        })
          return ResponseUtil.success(res, { 
          message: '[WS]: Webhook callback processed successfully',
          webhookId 
        })
      } else {
        console.log('[WS]: No subscribers found for webhook')
        return ResponseUtil.notFound(res, '[WS]: No active subscription found for this webhook ID')
      }
    } catch (error) {
      console.log('[WS]: Error processing webhook callback:', error)
      return ResponseUtil.serverError(res, error, 'Failed to process webhook callback')
    }
  })

  return router
} 