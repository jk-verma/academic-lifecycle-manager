import { db } from '../db.js';

export function writeAudit({ req, action, entityType, entityId = null, metadata = {} }) {
  db.prepare(`INSERT INTO audit_logs
    (actor_user_id, action, entity_type, entity_id, metadata_json, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(
      req.user?.id || null,
      action,
      entityType,
      entityId,
      JSON.stringify(metadata),
      req.ip,
      req.get('user-agent') || null
    );
}
