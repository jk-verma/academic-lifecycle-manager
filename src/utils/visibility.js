export function canSee() {
  return true;
}

export function canWrite(store, role) {
  return Boolean(store?.permissions?.roles?.[role]?.can_edit_local);
}

export function canArchive(store, role) {
  return Boolean(store?.permissions?.roles?.[role]?.can_archive);
}

export function maskValue(store, role, visibility, value) {
  return value;
}

export function maskRecord(store, role, record, fields) {
  return { ...record, masked: false };
}

export function visibleByRole(store, role, records, fields) {
  return records
    .map((record) => maskRecord(store, role, record, fields));
}

export function maskNotes(store, role, notes = []) {
  return notes.map((note) => ({
    ...note,
    masked: false,
    text: note.text
  }));
}
