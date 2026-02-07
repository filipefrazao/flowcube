import { Router, Request, Response } from "express";
import pino from "pino";
import { InstanceManager } from "../services/InstanceManager";
import { ApiResponse, SendMessageBody, MessageResult } from "../types";

const router = Router();
const logger = pino({ name: "routes:messages" });

/**
 * POST /api/messages/:instanceId/send
 * Send a message via an instance
 */
router.post(
  "/:instanceId/send",
  async (
    req: Request<{ instanceId: string }, {}, SendMessageBody>,
    res: Response<ApiResponse<MessageResult>>
  ) => {
    try {
      const { instanceId } = req.params;
      const { to, type, content, mediaUrl, fileName, caption, mimetype } =
        req.body;

      // Validation
      if (!to) {
        res.status(400).json({
          success: false,
          error: "Field to is required (phone number or JID)",
        });
        return;
      }

      if (!type) {
        res.status(400).json({
          success: false,
          error:
            "Field type is required (text, image, video, audio, document)",
        });
        return;
      }

      if (type === "text" && !content) {
        res.status(400).json({
          success: false,
          error: "Field content is required for text messages",
        });
        return;
      }

      if (type !== "text" && !mediaUrl) {
        res.status(400).json({
          success: false,
          error: "Field mediaUrl is required for media messages",
        });
        return;
      }

      const manager = InstanceManager.getInstance();
      const result = await manager.sendMessage(instanceId, to, {
        to,
        type,
        content: content || "",
        mediaUrl,
        fileName,
        caption,
        mimetype,
      });

      if (!result.success) {
        res.status(400).json({
          success: false,
          error: result.error,
        });
        return;
      }

      logger.info(
        {
          instanceId,
          to,
          type,
          messageId: result.messageId,
        },
        "Message sent via API"
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error(
        { error: errMsg, instanceId: req.params.instanceId },
        "Failed to send message"
      );
      res.status(500).json({
        success: false,
        error: errMsg,
      });
    }
  }
);

export default router;
