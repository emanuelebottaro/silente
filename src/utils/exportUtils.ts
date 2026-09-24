/**
 * Triggers a browser download for a string content with a specific MIME type and filename
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports to plain text
 */
export function exportToTxt(content: string, filename: string) {
  const name = filename.endsWith('.txt') ? filename : `${filename}.txt`;
  downloadFile(content, name, 'text/plain;charset=utf-8');
}

/**
 * Exports to markdown
 */
export function exportToMd(content: string, filename: string) {
  const name = filename.endsWith('.md') ? filename : `${filename}.md`;
  downloadFile(content, name, 'text/markdown;charset=utf-8');
}

/**
 * Exports to Rich Text Format (.rtf), readable by any word processor (MS Word, LibreOffice)
 */
export function exportToRtf(title: string, content: string, filename: string) {
  const name = filename.endsWith('.rtf') ? filename : `${filename}.rtf`;
  
  // Basic RTF document structure
  // Replace newlines with \par
  const escapedContent = content
    .replace(/\\/g, '\\\\')
    .replace(/{/g, '\\{')
    .replace(/}/g, '\\}')
    .replace(/\n/g, '\\par\n');
    
  const rtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\deflang1040{\\fonttbl{\\f0\\fnil\\fcharset0 Georgia;}}
\\viewkind4\\uc1\\pard\\f0\\fs24\\qc{\\b\\fs28 ${title}}\\par\\par
\\pard\\f0\\fs24\\qj ${escapedContent}
}`;

  downloadFile(rtf, name, 'application/rtf;charset=utf-8');
}

/**
 * Exports to beautifully styled HTML page
 */
export function exportToHtml(title: string, content: string, filename: string) {
  const name = filename.endsWith('.html') ? filename : `${filename}.html`;
  
  // Format body by turning empty lines into spacing and paragraphs into <p>
  const paragraphs = content
    .split('\n\n')
    .map(p => `<p style="margin-bottom: 1.5em; text-indent: 1em;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      background-color: #f8fafc;
      color: #1e293b;
      font-family: Georgia, serif;
      line-height: 1.8;
      font-size: 18px;
      margin: 0;
      padding: 40px 20px;
    }
    .container {
      max-width: 720px;
      margin: 0 auto;
      background: white;
      padding: 60px 80px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.05);
      border: 1px solid #e2e8f0;
    }
    h1 {
      text-align: center;
      font-weight: normal;
      font-style: italic;
      color: #0f172a;
      margin-bottom: 2em;
    }
    p {
      text-align: justify;
    }
    @media (max-width: 600px) {
      .container {
        padding: 30px 20px;
      }
      body {
        padding: 10px;
        font-size: 16px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    ${paragraphs}
  </div>
</body>
</html>`;

  downloadFile(html, name, 'text/html;charset=utf-8');
}
