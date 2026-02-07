import pino from "pino";
import { BaileysEngine } from "./BaileysEngine";
import { CloudApiEngine } from "./CloudApiEngine";
import { EngineType, InstanceConfig, IEngine } from "../types";

const logger = pino({ name: "engine-factory" });

/**
 * Factory pattern to create the appropriate engine based on type
 */
export class EngineFactory {
  /**
   * Create an engine instance based on the engine type
   */
  static create(instanceId: string, instanceConfig: InstanceConfig): IEngine {
    const engineType: EngineType = instanceConfig.engine || "baileys";

    logger.info({ instanceId, engineType }, "Creating engine");

    switch (engineType) {
      case "baileys":
        return new BaileysEngine(instanceId, instanceConfig);

      case "cloud_api":
        return new CloudApiEngine(instanceId, instanceConfig);

      default:
        throw new Error(`Unknown engine type: ${engineType}`);
    }
  }
}
