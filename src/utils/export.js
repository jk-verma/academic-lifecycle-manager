export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(compactJson(data), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function compactJson(value, parent = null, key = '') {
  if (value === null || value === undefined || value === '') return undefined;
  if (key === 'visibility' && value === 'open') return undefined;
  if (key === 'hours' && parent?.total_hours !== undefined && Number(value) === Number(parent.total_hours)) return undefined;

  if (Array.isArray(value)) {
    const compacted = value.map((item) => compactJson(item)).filter((item) => item !== undefined);
    return compacted.length ? compacted : undefined;
  }

  if (typeof value === 'object') {
    const compacted = {};
    Object.entries(value).forEach(([childKey, childValue]) => {
      const nextValue = compactJson(childValue, value, childKey);
      if (nextValue !== undefined) compacted[childKey] = nextValue;
    });
    return Object.keys(compacted).length ? compacted : undefined;
  }

  return value;
}

export function diffSummary(beforeRecord, afterRecord) {
  if (!beforeRecord) return ['New record will be added'];
  return Object.keys(afterRecord)
    .filter((key) => JSON.stringify(beforeRecord[key]) !== JSON.stringify(afterRecord[key]))
    .map((key) => `${key}: changed`);
}
