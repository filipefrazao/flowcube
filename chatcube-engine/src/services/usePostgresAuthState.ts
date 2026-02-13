import { Pool } from "pg";
import {
  AuthenticationCreds,
  AuthenticationState,
  SignalDataTypeMap,
  initAuthCreds,
  BufferJSON,
  proto,
} from "@whiskeysockets/baileys";
import pino from "pino";

const logger = pino({ name: "postgres-auth-state" });

/**
 * PostgreSQL-backed auth state for Baileys.
 * Drop-in replacement for useMultiFileAuthState.
 * Stores creds and signal keys in PostgreSQL for persistence across restarts.
 */
export async function usePostgresAuthState(
  pool: Pool,
  instanceId: string
): Promise<{
  state: AuthenticationState;
  saveCreds: () => Promise<void>;
}> {
  // Ensure tables exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chatcube_auth_creds (
      instance_id VARCHAR(255) PRIMARY KEY,
      creds TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS chatcube_auth_keys (
      instance_id VARCHAR(255) NOT NULL,
      key_type VARCHAR(127) NOT NULL,
      key_id VARCHAR(255) NOT NULL,
      key_data TEXT NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      PRIMARY KEY (instance_id, key_type, key_id)
    );
  `);

  // Load or initialize creds
  let creds: AuthenticationCreds;
  const credsResult = await pool.query(
    "SELECT creds FROM chatcube_auth_creds WHERE instance_id = $1",
    [instanceId]
  );

  if (credsResult.rows.length > 0) {
    creds = JSON.parse(credsResult.rows[0].creds, BufferJSON.reviver);
    logger.info({ instanceId }, "Loaded existing credentials from PostgreSQL");
  } else {
    creds = initAuthCreds();
    logger.info({ instanceId }, "Initialized new credentials");
  }

  // Save credentials to PostgreSQL
  const saveCreds = async (): Promise<void> => {
    const serialized = JSON.stringify(creds, BufferJSON.replacer);
    await pool.query(
      `INSERT INTO chatcube_auth_creds (instance_id, creds, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (instance_id) DO UPDATE SET
         creds = EXCLUDED.creds,
         updated_at = NOW()`,
      [instanceId, serialized]
    );
    logger.debug({ instanceId }, "Credentials saved to PostgreSQL");
  };

  // Signal protocol key store backed by PostgreSQL
  const keys = {
    get: async <T extends keyof SignalDataTypeMap>(
      type: T,
      ids: string[]
    ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
      const result: { [id: string]: SignalDataTypeMap[T] } = {};
      if (ids.length === 0) return result;

      const placeholders = ids.map((_, i) => `$${i + 3}`).join(", ");
      const query = `
        SELECT key_id, key_data FROM chatcube_auth_keys
        WHERE instance_id = $1 AND key_type = $2 AND key_id IN (${placeholders})
      `;

      try {
        const queryResult = await pool.query(query, [instanceId, type, ...ids]);
        for (const row of queryResult.rows) {
          try {
            result[row.key_id] = JSON.parse(row.key_data, BufferJSON.reviver);
          } catch {
            logger.warn({ instanceId, type, keyId: row.key_id }, "Failed to parse key data");
          }
        }
      } catch (error) {
        logger.error({ instanceId, type, error }, "Failed to get keys from PostgreSQL");
      }

      return result;
    },

    set: async (data: { [type: string]: { [id: string]: any } }): Promise<void> => {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        for (const [type, typeData] of Object.entries(data)) {
          for (const [id, value] of Object.entries(typeData)) {
            if (value) {
              const serialized = JSON.stringify(value, BufferJSON.replacer);
              await client.query(
                `INSERT INTO chatcube_auth_keys (instance_id, key_type, key_id, key_data, updated_at)
                 VALUES ($1, $2, $3, $4, NOW())
                 ON CONFLICT (instance_id, key_type, key_id) DO UPDATE SET
                   key_data = EXCLUDED.key_data,
                   updated_at = NOW()`,
                [instanceId, type, id, serialized]
              );
            } else {
              // null means delete the key
              await client.query(
                `DELETE FROM chatcube_auth_keys
                 WHERE instance_id = $1 AND key_type = $2 AND key_id = $3`,
                [instanceId, type, id]
              );
            }
          }
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        logger.error({ instanceId, error }, "Failed to set keys in PostgreSQL");
        throw error;
      } finally {
        client.release();
      }
    },
  };

  return {
    state: { creds, keys },
    saveCreds,
  };
}

/**
 * Delete all auth state for an instance (on logout)
 */
export async function deletePostgresAuthState(
  pool: Pool,
  instanceId: string
): Promise<void> {
  await pool.query("DELETE FROM chatcube_auth_creds WHERE instance_id = $1", [instanceId]);
  await pool.query("DELETE FROM chatcube_auth_keys WHERE instance_id = $1", [instanceId]);
  logger.info({ instanceId }, "Auth state deleted from PostgreSQL");
}

/**
 * Check if auth state exists for an instance
 */
export async function hasPostgresAuthState(
  pool: Pool,
  instanceId: string
): Promise<boolean> {
  const result = await pool.query(
    "SELECT 1 FROM chatcube_auth_creds WHERE instance_id = $1",
    [instanceId]
  );
  return result.rows.length > 0;
}

/**
 * List all instance IDs with saved auth state
 */
export async function listPostgresAuthInstances(
  pool: Pool
): Promise<string[]> {
  const result = await pool.query("SELECT instance_id FROM chatcube_auth_creds");
  return result.rows.map((r: any) => r.instance_id);
}
