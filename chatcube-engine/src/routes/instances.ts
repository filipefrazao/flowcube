import { Router, Request, Response } from "express";
import pino from "pino";
import { InstanceManager } from "../services/InstanceManager";
import {
  ApiResponse,
  CreateInstanceBody,
  PairingCodeBody,
  InstanceInfo,
} from "../types";

const router = Router();
const logger = pino({ name: "routes:instances" });

/**
 * POST /api/instances - Create a new WhatsApp instance
 */
router.post(
  "/",
  async (
    req: Request<{}, {}, CreateInstanceBody>,
    res: Response<ApiResponse<InstanceInfo>>
  ) => {
    try {
      const { id, name, engine, config: extraConfig } = req.body;

      if (!id || !name) {
        res.status(400).json({ success: false, error: "Fields id and name are required" });
        return;
      }

      const engineType = engine || "baileys";
      const manager = InstanceManager.getInstance();
      const instance = await manager.createInstance(id, name, engineType, extraConfig);

      logger.info({ id, name, engine: engineType }, "Instance created via API");
      res.status(201).json({ success: true, data: instance, message: "Instance created successfully" });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      logger.error({ error: errMsg }, "Failed to create instance");
      res.status(400).json({ success: false, error: errMsg });
    }
  }
);

/**
 * GET /api/instances - List all instances
 */
router.get("/", (_req: Request, res: Response<ApiResponse<InstanceInfo[]>>) => {
  const manager = InstanceManager.getInstance();
  const instances = manager.getAllInstances();
  res.json({ success: true, data: instances });
});

/**
 * GET /api/instances/:id - Get instance status
 */
router.get("/:id", (req: Request<{ id: string }>, res: Response<ApiResponse<InstanceInfo>>) => {
  const { id } = req.params;
  const manager = InstanceManager.getInstance();
  const info = manager.getInstanceInfo(id);

  if (!info) {
    res.status(404).json({ success: false, error: `Instance ${id} not found` });
    return;
  }
  res.json({ success: true, data: info });
});

/**
 * DELETE /api/instances/:id - Delete an instance
 */
router.delete("/:id", async (req: Request<{ id: string }>, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const manager = InstanceManager.getInstance();
    await manager.deleteInstance(id);
    logger.info({ id }, "Instance deleted via API");
    res.json({ success: true, message: `Instance ${id} deleted` });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    res.status(404).json({ success: false, error: errMsg });
  }
});

/**
 * GET /api/instances/:id/qr-code - Get QR code for instance
 */
router.get(
  "/:id/qr-code",
  async (req: Request<{ id: string }>, res: Response<ApiResponse<{ qrCode: string | null }>>) => {
    const { id } = req.params;
    const manager = InstanceManager.getInstance();
    const info = manager.getInstanceInfo(id);

    if (!info) {
      res.status(404).json({ success: false, error: `Instance ${id} not found` });
      return;
    }
    const qrCode = await manager.getQRCode(id);
    res.json({ success: true, data: { qrCode } });
  }
);

/**
 * POST /api/instances/:id/pairing-code - Get pairing code
 */
router.post(
  "/:id/pairing-code",
  async (req: Request<{ id: string }, {}, PairingCodeBody>, res: Response<ApiResponse<{ pairingCode: string | null }>>) => {
    try {
      const { id } = req.params;
      const { phone } = req.body;

      if (!phone) {
        res.status(400).json({ success: false, error: "Field phone is required" });
        return;
      }

      const manager = InstanceManager.getInstance();
      const pairingCode = await manager.getPairingCode(id, phone);
      res.json({ success: true, data: { pairingCode } });
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : "Unknown error";
      res.status(500).json({ success: false, error: errMsg });
    }
  }
);

/**
 * POST /api/instances/:id/disconnect - Disconnect (preserves session)
 */
router.post("/:id/disconnect", async (req: Request<{ id: string }>, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const manager = InstanceManager.getInstance();
    await manager.disconnectInstance(id);
    logger.info({ id }, "Instance disconnected via API");
    res.json({ success: true, message: `Instance ${id} disconnected (session preserved)` });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    res.status(404).json({ success: false, error: errMsg });
  }
});

/**
 * POST /api/instances/:id/reconnect - Reconnect an instance
 */
router.post("/:id/reconnect", async (req: Request<{ id: string }>, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const manager = InstanceManager.getInstance();
    await manager.reconnectInstance(id);
    logger.info({ id }, "Instance reconnected via API");
    res.json({ success: true, message: `Instance ${id} reconnecting` });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    res.status(404).json({ success: false, error: errMsg });
  }
});

/**
 * GET /api/instances/:id/contacts - List contacts
 */
router.get(
  "/:id/contacts",
  async (req: Request<{ id: string }>, res: Response<ApiResponse<Array<{ id: string; name?: string; notify?: string }>>>) => {
    const { id } = req.params;
    const manager = InstanceManager.getInstance();
    const info = manager.getInstanceInfo(id);

    if (!info) {
      res.status(404).json({ success: false, error: `Instance ${id} not found` });
      return;
    }
    const contacts = await manager.getContacts(id);
    res.json({ success: true, data: contacts });
  }
);

/**
 * GET /api/instances/:id/groups - List groups
 */
router.get(
  "/:id/groups",
  async (req: Request<{ id: string }>, res: Response<ApiResponse<Array<{ id: string; subject: string; participants: number }>>>) => {
    const { id } = req.params;
    const manager = InstanceManager.getInstance();
    const info = manager.getInstanceInfo(id);

    if (!info) {
      res.status(404).json({ success: false, error: `Instance ${id} not found` });
      return;
    }
    const groups = await manager.getGroups(id);
    res.json({ success: true, data: groups });
  }
);

/**
 * POST /api/instances/:id/logout - Logout (clears session, requires new QR)
 */
router.post("/:id/logout", async (req: Request<{ id: string }>, res: Response<ApiResponse>) => {
  try {
    const { id } = req.params;
    const manager = InstanceManager.getInstance();
    await manager.logoutInstance(id);
    logger.info({ id }, "Instance logged out via API");
    res.json({ success: true, message: `Instance ${id} logged out (session cleared, new QR required)` });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    res.status(404).json({ success: false, error: errMsg });
  }
});



// ---------- Group Management Routes ----------

router.post("/:id/groups/create", async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, participants } = req.body;
    if (!subject || !participants?.length) {
      res.status(400).json({ success: false, error: "subject and participants required" });
      return;
    }
    const manager = InstanceManager.getInstance();
    const engine = manager.getEngine(id);
    if (!engine) { res.status(404).json({ success: false, error: `Instance ${id} not found` }); return; }
    const result = await (engine as any).groupCreate(subject, participants);
    res.status(201).json({ success: true, data: result });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.patch("/:id/groups/:jid/subject", async (req, res) => {
  try {
    const { id, jid } = req.params;
    const { subject } = req.body;
    if (!subject) { res.status(400).json({ success: false, error: "subject required" }); return; }
    const manager = InstanceManager.getInstance();
    const engine = manager.getEngine(id);
    if (!engine) { res.status(404).json({ success: false, error: `Instance ${id} not found` }); return; }
    await (engine as any).groupUpdateSubject(jid, subject);
    res.json({ success: true, message: `Group ${jid} renamed to "${subject}"` });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.patch("/:id/groups/:jid/description", async (req, res) => {
  try {
    const { id, jid } = req.params;
    const { description } = req.body;
    const manager = InstanceManager.getInstance();
    const engine = manager.getEngine(id);
    if (!engine) { res.status(404).json({ success: false, error: `Instance ${id} not found` }); return; }
    await (engine as any).groupUpdateDescription(jid, description || "");
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post("/:id/groups/:jid/participants", async (req, res) => {
  try {
    const { id, jid } = req.params;
    const { participants, action } = req.body;
    if (!participants?.length || !action) {
      res.status(400).json({ success: false, error: "participants and action required" });
      return;
    }
    if (!["add", "remove", "promote", "demote"].includes(action)) {
      res.status(400).json({ success: false, error: "action must be add|remove|promote|demote" });
      return;
    }
    const manager = InstanceManager.getInstance();
    const engine = manager.getEngine(id);
    if (!engine) { res.status(404).json({ success: false, error: `Instance ${id} not found` }); return; }
    const results = await (engine as any).groupParticipantsUpdate(jid, participants, action);
    res.json({ success: true, data: results });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get("/:id/groups/:jid/metadata", async (req, res) => {
  try {
    const { id, jid } = req.params;
    const manager = InstanceManager.getInstance();
    const engine = manager.getEngine(id);
    if (!engine) { res.status(404).json({ success: false, error: `Instance ${id} not found` }); return; }
    const meta = await (engine as any).groupMetadata(jid);
    res.json({ success: true, data: meta });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.get("/:id/groups/:jid/invite-code", async (req, res) => {
  try {
    const { id, jid } = req.params;
    const manager = InstanceManager.getInstance();
    const engine = manager.getEngine(id);
    if (!engine) { res.status(404).json({ success: false, error: `Instance ${id} not found` }); return; }
    const code = await (engine as any).groupInviteCode(jid);
    res.json({ success: true, data: { code, url: `https://chat.whatsapp.com/${code}` } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post("/:id/groups/:jid/leave", async (req, res) => {
  try {
    const { id, jid } = req.params;
    const manager = InstanceManager.getInstance();
    const engine = manager.getEngine(id);
    if (!engine) { res.status(404).json({ success: false, error: `Instance ${id} not found` }); return; }
    await (engine as any).groupLeave(jid);
    res.json({ success: true, message: `Left group ${jid}` });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post("/:id/fetch-history", async (req, res) => {
  try {
    const { id } = req.params;
    const { jid, count = 50 } = req.body;
    if (!jid) { res.status(400).json({ success: false, error: "jid required" }); return; }
    const manager = InstanceManager.getInstance();
    const engine = manager.getEngine(id);
    if (!engine) { res.status(404).json({ success: false, error: `Instance ${id} not found` }); return; }
    await (engine as any).fetchHistory(jid, count);
    res.json({ success: true, message: `History fetch triggered for ${jid}. Messages arrive via webhook event history_sync.` });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
