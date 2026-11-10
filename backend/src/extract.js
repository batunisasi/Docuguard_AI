const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

async function extractText(buffer, originalName, mimeType) {
  const ext = (originalName.split('.').pop() || '').toLowerCase();
  let text = '';

  if (ext === 'pdf' || mimeType === 'application/pdf') {
    const parsed = await pdfParse(buffer);
    text = parsed.text || '';
  } else if (ext === 'docx' || mimeType.includes('wordprocessingml')) {
    const parsed = await mammoth.extractRawText({ buffer });
    text = parsed.value || '';
  } else {
    const error = new Error('Format tidak didukung. Gunakan PDF atau DOCX.');
    error.status = 415;
    throw error;
  }

  text = text.replace(/\u0000/g, '').replace(/[ \t]+\n/g, '\n').trim();
  if (text.length < 30) {
    const error = new Error('Teks dokumen tidak terbaca atau terlalu sedikit. Pastikan PDF bukan hasil scan gambar; OCR belum tersedia pada MVP.');
    error.status = 422;
    throw error;
  }
  return text;
}

module.exports = { extractText };
