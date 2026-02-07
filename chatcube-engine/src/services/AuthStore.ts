import { Pool } from "pg";
import pino from "pino";
import { config } from "../config";

const logger = pino({ name: "auth-store" });

/**
 * Persists Baileys auth state (creds + keys) in PostgreSQL.
 * Table: chatcube_auth_states
 */
export class AuthStore {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.databaseUrl,
    });
  }

  /**
   * Ensure the auth states table exists
   */
  async initialize(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS chatcube_auth_states (
        instance_id VARCHAR(255) PRIMARY KEY,
        creds TEXT NOT NULL,
        keys TEXT NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
    try {
      await this.pool.query(query);
      logger.info("Auth store table initialized");
    } catch (error) {
      logger.error({ error }, "Failed to initialize auth store table");
      throw error;
    }
  }

  /**
   * Save auth state for an instance
   */
  async saveState(
    instanceId: string,
    creds: Record<string, unknown>,
    keys: Record<string, unknown>
  ): Promise<void> {
    const query = `
      INSERT INTO chatcube_auth_states (instance_id, creds, keys, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (instance_id) DO UPDATE SET
        creds = EXCLUDED.creds,
        keys = EXCLUDED.keys,
        updated_at = NOW();
    `;
    try {
      await this.pool.query(query, [
        instanceId,
        JSON.stringify(creds),
        JSON.stringify(keys),
      ]);
      logger.debug({ instanceId }, "Auth state saved");
    } catch (error) {
      logger.error({ error, instanceId }, "Failed to save auth state");
      throw error;
    }
  }

  /**
   * Load auth state for an instance
   */
  async loadState(
    instanceId: string
  ): Promise<{ creds: Record<string, unknown>; keys: Record<string, unknown> } | null> {
    const query = `SELECT creds, keys FROM chatcube_auth_states WHERE instance_id = $1;`;
    try {
      const result = await this.pool.query(query, [instanceId]);
      if (result.rows.length === 0) {
        return null;
      }
      const row = result.rows[0];
      return {
        creds: JSON.parse(row.creds),
        keys: JSON.parse(row.keys),
      };
    } catch (error) {
      logger.error({ error, instanceId }, "Failed to load auth state");
      return null;
    }
  }

  /**
   * Delete auth state for an instance
   */
  async deleteState(instanceId: string): Promise<void> {
    const query = `DELETE FROM chatcube_auth_states WHERE instance_id = $1;`;
    try {
      await this.pool.query(query, [instanceId]);
      logger.info({ instanceId }, "Auth state deleted");
    } catch (error) {
      logger.error({ error, instanceId }, "Failed to delete auth state");
      throw error;
    }
  }

  /**
   * List all instance IDs that have saved auth state
   */
  async listInstances(): Promise<string[]> {
    const query = `SELECT instance_id FROM chatcube_auth_states;`;
    try {
      const result = await this.pool.query(query);
      return result.rows.map((r: { instance_id: string }) => r.instance_id);
    } catch (error) {
      logger.error({ error }, "Failed to list auth instances");
      return [];
    }
  }

  /**
   * Close the pool connection
   */
  async close(): Promise<void> {
    await this.pool.end();
  }
}
