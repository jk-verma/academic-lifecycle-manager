const MASK = 'Confidential content hidden';

export function hasRole(user, roleName) {
  return Boolean(user?.roles?.includes(roleName));
}

export function isAdmin(user) {
  return hasRole(user, 'ADMIN');
}

export function isWriter(user) {
  return isAdmin(user) || hasRole(user, 'WRITER');
}

export function canReadVisibility(user, visibility) {
  if (isAdmin(user)) return true;
  if (hasRole(user, 'WRITER')) {
    return ['supervisor-only', 'internal-team', 'candidate-visible', 'sanitized-external'].includes(visibility);
  }
  if (hasRole(user, 'VIEWER')) {
    return ['internal-team', 'candidate-visible', 'sanitized-external'].includes(visibility);
  }
  if (hasRole(user, 'RESTRICTED_EXTERNAL')) {
    return visibility === 'sanitized-external';
  }
  return false;
}

export function maskRecordForUser(record, user, sensitiveFields = []) {
  if (!record) return record;
  if (canReadVisibility(user, record.visibility)) return record;

  const masked = { ...record, masked: true };
  for (const field of sensitiveFields) {
    if (field in masked) masked[field] = MASK;
  }
  return masked;
}

export function filterOrMask(records, user, sensitiveFields) {
  if (isAdmin(user)) return records;
  return records
    .filter((record) => record.visibility !== 'admin-only' || canReadVisibility(user, record.visibility))
    .map((record) => maskRecordForUser(record, user, sensitiveFields));
}

export { MASK };
