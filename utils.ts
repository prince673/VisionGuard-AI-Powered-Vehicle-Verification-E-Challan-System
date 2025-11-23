import { ScanSession } from "./types";

export const exportToCSV = (data: ScanSession[]) => {
  if (data.length === 0) {
    alert("No data to export.");
    return;
  }

  const headers = ['Scan ID', 'Timestamp', 'Plate Number', 'Vehicle Type', 'Owner', 'Risk Score', 'Total Fine', 'Status'];
  
  // Helper to escape CSV fields containing commas, quotes, or newlines
  const escape = (field: any) => {
    const stringField = String(field || '');
    // If the field contains special characters, wrap it in quotes and escape existing quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      return `"${stringField.replace(/"/g, '""')}"`;
    }
    return stringField;
  };

  const rows = data.map(item => [
    item.id,
    new Date(item.timestamp).toLocaleString(),
    item.plateNumber || 'N/A',
    item.vehicleData?.type || 'N/A',
    item.vehicleData?.owner.name || 'Unknown',
    item.analysis?.riskScore || 0,
    item.analysis?.totalFine || 0,
    item.status
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(escape).join(','))
  ].join('\n');

  // Create a Blob for the CSV file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  // Use ISO date for filename
  link.setAttribute("download", `traffic_report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'Critical': return 'bg-red-600 text-white';
    case 'High': return 'bg-orange-500 text-white';
    case 'Medium': return 'bg-yellow-500 text-black';
    case 'Low': return 'bg-blue-500 text-white';
    default: return 'bg-gray-500 text-white';
  }
};