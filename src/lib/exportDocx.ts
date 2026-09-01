import { Document, Packer, Paragraph, HeadingLevel, TextRun } from 'docx';
import { saveAs } from 'file-saver';

export async function exportToDocx(markdown: string, filename = 'document.docx') {
  const lines = markdown.split('\n');
  const paragraphs = lines.map((line) => {
    if (line.startsWith('# ')) {
      return new Paragraph({ text: line.slice(2), heading: HeadingLevel.HEADING_1 });
    }
    if (line.startsWith('## ')) {
      return new Paragraph({ text: line.slice(3), heading: HeadingLevel.HEADING_2 });
    }
    if (line.startsWith('### ')) {
      return new Paragraph({ text: line.slice(4), heading: HeadingLevel.HEADING_3 });
    }
    if (line.startsWith('- ') || line.startsWith('* ')) {
      return new Paragraph({
        children: [new TextRun(line.slice(2))],
        bullet: { level: 0 },
      });
    }
    if (line.trim() === '') {
      return new Paragraph({ children: [] });
    }
    return new Paragraph({ children: [new TextRun(line)] });
  });

  const doc = new Document({
    sections: [{ children: paragraphs }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}
