/**
 * Format a date string or ISO timestamp into a human-readable string.
 * e.g. "May 6, 2026, 7:02 AM"
 */
export const formatDate = (dateStr) => {
  if (!dateStr || dateStr === '-') return '-';
  try {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
};

/**
 * Format a date string into date-only: "May 6, 2026"
 */
export const formatDateOnly = (dateStr) => {
  if (!dateStr || dateStr === '-') return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
};
