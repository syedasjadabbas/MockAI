export const exportToCSV = (data, filename) => {
  if (!data || !data.length) {
    window.dispatchEvent(new CustomEvent('notify', { detail: { message: 'No data to export', type: 'error' } }));
    return;
  }
  
  // Extract headers
  const headers = Object.keys(data[0]);
  
  // Build CSV string
  const csvContent = [
    headers.join(','),
    ...data.map(row => {
      return headers.map(header => {
        let val = row[header];
        if (val === null || val === undefined) val = '-';
        // Escape quotes and commas
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      }).join(',');
    })
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  window.dispatchEvent(new CustomEvent('notify', { detail: { message: 'Export successful', type: 'success' } }));
};
