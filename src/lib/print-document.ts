/**
 * Shared HTML shell for the browser's "Save as PDF" flow.
 * Keeping the print rules in one place makes all exported documents feel like
 * part of the same product and gives new exports a dependable A4 foundation.
 */
export function createPrintDocument(title: string, content: string) {
  return `<!doctype html>
<html lang="nl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${title}</title>
    <style>
      @page { size: A4; margin: 18mm 17mm 18mm; }
      :root { color-scheme: light; }
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; background: #fff; color: #172033; font-family: Inter, ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
      body { font-size: 10.5pt; line-height: 1.58; }
      .print-document { max-width: 176mm; margin: 0 auto; }
      .document-header { text-align: center; border-bottom: 1px solid #dbe3ee; padding: 3mm 0 6mm; margin-bottom: 8mm; }
      .document-eyebrow { color: #52709a; font-size: 8pt; font-weight: 700; letter-spacing: .14em; margin-bottom: 2mm; text-transform: uppercase; }
      .document-title { color: #14213d; font-size: 25pt; font-weight: 800; letter-spacing: -.035em; line-height: 1.12; margin: 0; overflow-wrap: anywhere; }
      .document-subtitle { color: #64748b; font-size: 10pt; margin: 3mm 0 0; }
      .section { margin: 0 0 8mm; break-inside: avoid; page-break-inside: avoid; }
      .section-heading { align-items: center; color: #14213d; display: flex; font-size: 11pt; font-weight: 750; gap: 2.5mm; letter-spacing: .02em; margin: 0 0 3.5mm; text-transform: uppercase; }
      .section-heading::before { background: #52709a; border-radius: 2px; content: ""; display: block; height: 4mm; width: 1mm; }
      .metadata { display: flex; flex-wrap: wrap; gap: 2mm; justify-content: center; }
      .metadata-item { background: #f2f6fa; border: 1px solid #dce6f0; border-radius: 99px; color: #334155; font-size: 8.8pt; font-weight: 600; padding: 1.5mm 3mm; }
      .note-content { background: #f8fafc; border-left: 3px solid #7b96b9; color: #263449; padding: 4.5mm 5mm; white-space: pre-wrap; }
      .note-content + .note-content { border-top: 1px solid #e2e8f0; }
      .attachment { break-inside: avoid; margin: 0 0 7mm; page-break-inside: avoid; text-align: center; }
      .attachment img { display: block; height: auto; margin: 0 auto; max-height: 235mm; max-width: 100%; object-fit: contain; opacity: 1; }
      .attachment img[loading] { opacity: 1; }
      .attachment img[error] { opacity: 0.3; border: 2px dashed #cbd5e1; }
      .attachment-caption { color: #64748b; font-size: 8.5pt; font-style: italic; margin: 2mm auto 0; max-width: 140mm; }
      .document-footer { border-top: 1px solid #e2e8f0; color: #94a3b8; font-size: 8pt; margin-top: 9mm; padding-top: 3mm; text-align: center; }
      .document-footer .page-number::after { content: counter(page); }
      @media print { .print-document { max-width: none; } .document-footer { position: fixed; bottom: 0; left: 0; right: 0; } }
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
        }, 8000);
      }
      window.addEventListener('load', function() { window.setTimeout(printWhenReady, 150); });
    </script>
  </head>
  <body><main class="print-document">${content}</main></body>
</html>`;
}
