export async function exportToPdf(previewElement: HTMLElement, filename = 'document.pdf') {
  // html2pdf.js is a client-only library, dynamic import
  const html2pdf = (await import('html2pdf.js')).default;

  html2pdf()
    .set({
      margin: 10,
      filename,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' as const },
    })
    .from(previewElement)
    .save();
}
