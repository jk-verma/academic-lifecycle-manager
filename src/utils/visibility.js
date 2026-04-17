export const MASK = 'Confidential content hidden';

export function canSee(store, role, visibility) {
  return Boolean(store?.permissions?.roles?.[role]?.visible_levels?.includes(visibility));
}

export function canWrite(store, role) {
  return Boolean(store?.permissions?.roles?.[role]?.can_edit_local);
}

export function canArchive(store, role) {
  return Boolean(store?.permissions?.roles?.[role]?.can_archive);
}

export function maskValue(store, role, visibility, value) {
  return canSee(store, role, visibility) ? value : (store?.permissions?.masked_text || MASK);
}

export function maskRecord(store, role, record, fields) {
  const masked = !canSee(store, role, record.visibility);
  const copy = { ...record, masked };
  if (masked) {
    fields.forEach((field) => {
      if (field in copy) copy[field] = store?.permissions?.masked_text || MASK;
    });
  }
  return copy;
}

export function visibleByRole(store, role, records, fields) {
  return records
    .map((record) => maskRecord(store, role, record, fields));
}

export function maskNotes(store, role, notes = []) {
  return notes.map((note) => ({
    ...note,
    masked: !canSee(store, role, note.visibility),
    text: maskValue(store, role, note.visibility, note.text)
  }));
}
