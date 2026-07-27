/**
 * Shared HTML shell for the browser's "Save as PDF" flow.
 * Professional, modern PDF export with improved typography, spacing, and visual hierarchy.
 */
export function createPrintDocument(title: string, content: string) {
  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
    <style>
      @page { size: A4; margin: 20mm 20mm 20mm 20mm; }
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; color: #1a1a2e; font-family: "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
      body { font-size: 11pt; line-height: 1.6; }
      .print-document { max-width: 170mm; margin: 0 auto; }
      
      /* Header */
      .document-header { text-align: center; border-bottom: 2px solid #e2e8f0; padding: 5mm 0 8mm; margin-bottom: 10mm; }
      .document-eyebrow { color: #64748b; font-size: 8pt; font-weight: 600; letter-spacing: 0.15em; margin-bottom: 3mm; text-transform: uppercase; }
      .document-title { color: #0f172a; font-size: 28pt; font-weight: 800; letter-spacing: -0.02em; line-height: 1.1; margin: 0; overflow-wrap: anywhere; }
      .document-subtitle { color: #64748b; font-size: 11pt; margin: 4mm 0 0; font-weight: 500; }
      
      /* Sections */
      .section { margin: 0 0 10mm; break-inside: avoid; page-break-inside: avoid; }
      .section-heading { align-items: center; color: #0f172a; display: flex; font-size: 12pt; font-weight: 700; gap: 3mm; letter-spacing: 0.01em; margin: 0 0 5mm; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 2mm; }
      .section-heading::before { background: linear-gradient(135deg, #3b82f6, #8b5cf6); border-radius: 2px; content: ""; display: block; height: 5mm; width: 1.5mm; }
      
      /* Metadata badges */
      .metadata { display: flex; flex-wrap: wrap; gap: 2.5mm; justify-content: center; margin-top: 4mm; }
      .metadata-item { background: linear-gradient(135deg, #f8fafc, #f1f5f9); border: 1px solid #e2e8f0; border-radius: 99px; color: #475569; font-size: 9pt; font-weight: 600; padding: 2mm 4mm; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
      
      /* Notes */
      .note-content { background: linear-gradient(135deg, #fafbfc, #f8fafc); border-left: 4px solid #6366f1; color: #334155; padding: 5mm 6mm; white-space: pre-wrap; border-radius: 0 4px 4px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
      .note-content + .note-content { margin-top: 3mm; border-top: 1px solid #e2e8f0; border-left: 4px solid #8b5cf6; }
      
      /* Attachments/Images */
      .attachment { break-inside: avoid; margin: 0 0 10mm; page-break-inside: avoid; text-align: center; }
      .attachment img { display: block; height: auto; margin: 0 auto; max-height: 220mm; max-width: 100%; object-fit: contain; opacity: 1; border-radius: 4px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
      .attachment img[loading] { opacity: 1; }
      .attachment img[error] { opacity: 0.3; border: 2px dashed #cbd5e1; border-radius: 4px; }
      .attachment-caption { color: #64748b; font-size: 9pt; font-style: italic; margin: 3mm auto 0; max-width: 150mm; line-height: 1.4; }
      
      /* Setlist specific styles */
      .setlist-item { margin-bottom: 6mm; padding-bottom: 6mm; border-bottom: 1px solid #e2e8f0; break-inside: avoid; page-break-inside: avoid; }
      .setlist-item:last-child { border-bottom: none; }
      .setlist-item-title { font-size: 12pt; font-weight: 700; color: #0f172a; margin: 0 0 2mm 0; }
      .setlist-item-number { color: #6366f1; font-weight: 800; margin-right: 2mm; }
      .setlist-item-meta { font-size: 9pt; color: #64748b; margin: 0; font-style: italic; }
      
      /* Footer */
      .document-footer { border-top: 2px solid #e2e8f0; color: #94a3b8; font-size: 8pt; margin-top: 12mm; padding-top: 4mm; text-align: center; font-weight: 500; }
      .document-footer .page-number::after { content: counter(page); }
      
      @media print { 
        .print-document { max-width: none; } 
        .document-footer { position: fixed; bottom: 0; left: 0; right: 0; }
        .section { break-after: auto; }
      }
    </style>
    <script>
      function printWhenReady() {
        const images = Array.from(document.images);
        let completed = 0;
        const total = images.length;
        const finish = function() {
          completed += 1;
          const progress = completed / total;
          if (total > 0) {
            document.title = 'Loading images... ' + Math.round(progress * 100) + '%';
          }
          if (completed >= total) {
            document.title = document.title.replace(/Loading images\.\.\. \d+%/, 'Ready to print');
            window.focus();
            window.print();
          }
        };
        if (!images.length) {
          window.focus();
          window.print();
          return;
        }
        images.forEach(function(image) {
          image.addEventListener('error', function() {
            image.style.opacity = '0.3';
            image.style.border = '2px dashed #ccc';
            image.style.borderRadius = '4px';
            finish();
          }, { once: true });
          if (image.complete) {
            finish();
          } else {
            image.addEventListener('load', finish, { once: true });
          }
        });
        window.setTimeout(function() {
          if (completed < total) {
            console.warn('Print timeout: ' + completed + '/' + total + ' images loaded');
            document.title = document.title.replace(/Loading images\.\.\. \d+%/, 'Partial load - printing');
            window.focus();
            window.print();
          }
        }, 10000);
      }
      window.addEventListener('load', function() { window.setTimeout(printWhenReady, 150); });
    </script>
  </head>
  <body><main class="print-document">${content}</main></body>
</html>`;
}
