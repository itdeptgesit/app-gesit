import jsPDF from 'jspdf';
import { PurchaseRequisition } from '../types';

/**
 * Format date to Indonesian style: "DD MMMM YYYY"
 */
const formatIndonesianDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
};

/**
 * Format number to IDR or USD
 */
const formatCurrency = (num: number, currency: string = 'IDR') => {
  const c = String(currency || 'IDR').toUpperCase();
  if (c.includes('USD') || c === 'DOLLAR') {
    const formatted = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
    return `$ ${formatted}`;
  }
  const formatted = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(num);
  return `Rp ${formatted}`;
};

const loadLogoImage = (): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = '/image/logo.png';
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
};

const loadLogoBase64 = async (): Promise<string | null> => {
  try {
    const res = await fetch('/image/logo.png');
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const u8 = new Uint8Array(buf);
    let binary = '';
    const len = u8.byteLength;
    for (let i = 0; i < len; i += 8192) {
      binary += String.fromCharCode.apply(null, u8.subarray(i, Math.min(i + 8192, len)) as any);
    }
    return btoa(binary);
  } catch (e) {
    console.error('Error fetching logo:', e);
    return null;
  }
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i += 8192) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, Math.min(i + 8192, len)) as any);
  }
  return btoa(binary);
}

/**
 * Load Calibri (Carlito) font dynamically from local public assets folder
 */
async function loadCalibriFont(doc: jsPDF) {
  // Check if already registered
  if (doc.getFontList()['calibri']) {
    return;
  }
  
  try {
    // 1. Fetch regular font
    const resReg = await fetch('/fonts/carlito-regular.ttf');
    if (!resReg.ok) throw new Error('Failed to fetch regular font');
    const bufReg = await resReg.arrayBuffer();
    const b64Reg = arrayBufferToBase64(bufReg);
    doc.addFileToVFS('calibri-normal.ttf', b64Reg);
    doc.addFont('calibri-normal.ttf', 'calibri', 'normal');

    // 2. Fetch bold font
    const resBold = await fetch('/fonts/carlito-bold.ttf');
    if (!resBold.ok) throw new Error('Failed to fetch bold font');
    const bufBold = await resBold.arrayBuffer();
    const b64Bold = arrayBufferToBase64(bufBold);
    doc.addFileToVFS('calibri-bold.ttf', b64Bold);
    doc.addFont('calibri-bold.ttf', 'calibri', 'bold');
  } catch (e) {
    console.error('Error loading Calibri font:', e);
    // Fallback: alias Helvetica to calibri
    doc.addFont('Helvetica', 'calibri', 'normal');
    doc.addFont('Helvetica-Bold', 'calibri', 'bold');
  }
}

export async function exportPurchaseRequisitionPDF(req: PurchaseRequisition) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageW = 210;
  const pageH = 297;
  const marginL = 10;
  const marginR = 10;
  const contentW = pageW - marginL - marginR; // 190mm

  const logoImg = await loadLogoImage();
  const logoBase64 = await loadLogoBase64();

  // Load Calibri font before doing any text drawing
  await loadCalibriFont(doc);

  let y = 18;

  // ─────────────────────────────────────────────────────
  // LOGO + TITLE (matching original: logo left, title center-right)
  // ─────────────────────────────────────────────────────
  if (logoImg && logoBase64) {
    const originalW = logoImg.naturalWidth || logoImg.width || 100;
    const originalH = logoImg.naturalHeight || logoImg.height || 100;
    const aspect = originalW / originalH;
    const logoH = 12.5;
    const logoW = logoH * aspect;
    
    // Dynamically calculate the text width to perfectly align text to the left margin (20mm)
    // and center the logo emblem exactly above the text.
    const companyText = 'THE GESIT COMPANIES';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(180, 140, 60);
    
    const textW = doc.getTextWidth(companyText);
    const textX = marginL; // Starts exactly at the left margin
    const emblemX = (marginL + textW / 2) - logoW / 2; // Center of emblem matches center of text
    
    // Draw emblem and company text
    doc.addImage(logoBase64, 'PNG', emblemX, y - 1, logoW, logoH, undefined, 'FAST');
    doc.text(companyText, textX, y + 14.5);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(180, 140, 60);
    doc.text('THE GESIT COMPANIES', marginL, y + 6);
  }

  // Main title – Calibri 16 bold, centered perfectly in the page to prevent overflow
  doc.setFont('calibri', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Formulir Pembelian/ Perbaikan Barang/ Asset', pageW / 2 + 10, y + 14.5, { align: 'center' });

  y += 28;

  // ─────────────────────────────────────────────────────
  // SECTION: Permohonan dari Pengguna (header) - Calibri 14 bold
  // ─────────────────────────────────────────────────────
  doc.setFont('calibri', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Permohonan dari Pengguna', pageW / 2, y, { align: 'center' });
  
  y += 8;

  // ─────────────────────────────────────────────────────
  // METADATA FIELDS - Calibri 11 regular
  // ─────────────────────────────────────────────────────
  doc.setFont('calibri', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(0, 0, 0);

  const labelX = marginL;
  const valueX = marginL + 28;
  const rightLabelX = pageW / 2 + 10;
  const rightValueX = pageW / 2 + 28;
  const lineH = 6;
  
  // Row 1
  doc.text('Nama', labelX, y);
  doc.text(`:  ${req.requesterFullname}`, valueX, y);
  doc.text('Paid To', rightLabelX, y);
  doc.text(`:  ${req.paidTo || '-'}`, rightValueX, y);

  // Row 2
  doc.text('Departemen', labelX, y + lineH);
  doc.text(`:  ${req.department}`, valueX, y + lineH);
  doc.text('No. Rek', rightLabelX, y + lineH);
  doc.text(`:  ${req.bankAccount || '-'}`, rightValueX, y + lineH);

  // Row 3
  doc.text('Tanggal', labelX, y + lineH * 2);
  doc.text(`:  ${formatIndonesianDate(req.requestDate)}`, valueX, y + lineH * 2);

  y += lineH * 2 + 8;

  // ─────────────────────────────────────────────────────
  // TABLE 1: Permohonan dari Pengguna
  // Columns: No | Jenis Barang/Asset | Jumlah - Calibri 11 bold
  // ─────────────────────────────────────────────────────
  const t1ColW = [15, 140, 35]; // total = 190 = contentW
  const t1ColX = [marginL, marginL + t1ColW[0], marginL + t1ColW[0] + t1ColW[1]];
  const t1HeaderH = 7;
  const t1RowH = 9;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);

  // Header row
  doc.rect(marginL, y, contentW, t1HeaderH);
  doc.line(t1ColX[1], y, t1ColX[1], y + t1HeaderH);
  doc.line(t1ColX[2], y, t1ColX[2], y + t1HeaderH);

  doc.setFont('calibri', 'bold');
  doc.setFontSize(11);
  doc.text('No', t1ColX[0] + t1ColW[0] / 2, y + 4.8, { align: 'center' });
  doc.text('Jenis Barang/ Asset', t1ColX[1] + t1ColW[1] / 2, y + 4.8, { align: 'center' });
  doc.text('Jumlah', t1ColX[2] + t1ColW[2] / 2, y + 4.8, { align: 'center' });

  y += t1HeaderH;

  // Data rows (minimum 2 rows to match template look) - Calibri 11 regular
  const reqItems = req.requestedItems || [];
  const t1RowCount = Math.max(reqItems.length + 1, 2); // +1 empty row at bottom like template
  const t1DataHeight = Math.max(t1RowCount * t1RowH, 22);

  doc.setFont('calibri', 'normal');
  doc.setFontSize(11);

  // Draw the single outer border for the entire data area
  doc.rect(marginL, y, contentW, t1DataHeight);
  // Draw the vertical divider lines spanning the entire height
  doc.line(t1ColX[1], y, t1ColX[1], y + t1DataHeight);
  doc.line(t1ColX[2], y, t1ColX[2], y + t1DataHeight);

  // Render the text items inside their virtual slots, without horizontal lines
  for (let i = 0; i < reqItems.length; i++) {
    const item = reqItems[i];
    const rowY = y + (i * t1RowH);
    
    doc.text(String(i + 1), t1ColX[0] + t1ColW[0] / 2, rowY + 6.2, { align: 'center' });
    const lines = doc.splitTextToSize(item.description, t1ColW[1] - 8);
    doc.text(lines, t1ColX[1] + 4, rowY + 6.2);
    doc.text(String(item.qty), t1ColX[2] + t1ColW[2] / 2, rowY + 6.2, { align: 'center' });
  }

  y += t1DataHeight + 10;

  // ─────────────────────────────────────────────────────
  // SECTION: Rekomendasi oleh IT (header) - Calibri 14 bold
  // ─────────────────────────────────────────────────────
  doc.setFont('calibri', 'bold');
  doc.setFontSize(14);
  doc.text('Rekomendasi oleh IT', pageW / 2, y, { align: 'center' });

  y += 7;

  // ─────────────────────────────────────────────────────
  // TABLE 2: Rekomendasi oleh IT
  // Columns: No | Jenis Barang/Asset | Jumlah | Rekomendasi Vendor | Harga - Calibri 11 bold
  // ─────────────────────────────────────────────────────
  const t2ColW = [15, 80, 22, 38, 35]; // total = 190 = contentW
  const t2ColX: number[] = [];
  let acc = marginL;
  for (const w of t2ColW) { t2ColX.push(acc); acc += w; }

  const t2HeaderH = 7;
  const t2RowH = 9;

  // Header row
  doc.rect(marginL, y, contentW, t2HeaderH);
  for (let j = 1; j < t2ColX.length; j++) {
    doc.line(t2ColX[j], y, t2ColX[j], y + t2HeaderH);
  }

  doc.setFont('calibri', 'bold');
  doc.setFontSize(11);
  doc.text('No', t2ColX[0] + t2ColW[0] / 2, y + 4.8, { align: 'center' });
  doc.text('Jenis Barang/ Asset', t2ColX[1] + t2ColW[1] / 2, y + 4.8, { align: 'center' });
  doc.text('Jumlah', t2ColX[2] + t2ColW[2] / 2, y + 4.8, { align: 'center' });
  doc.text('Rekomendasi Vendor', t2ColX[3] + t2ColW[3] / 2, y + 4.8, { align: 'center' });
  doc.text('Harga', t2ColX[4] + t2ColW[4] / 2, y + 4.8, { align: 'center' });

  y += t2HeaderH;

  // Data rows (minimum items + 1 empty row at bottom like template) - Calibri 11 regular
  const recItems = req.itRecommendations || [];
  const t2RowCount = Math.max(recItems.length + 1, 3);
  const t2DataHeight = Math.max(t2RowCount * t2RowH, 30);

  doc.setFont('calibri', 'normal');
  doc.setFontSize(11);

  // Draw the single outer border for the entire data area
  doc.rect(marginL, y, contentW, t2DataHeight);
  // Draw the vertical divider lines spanning the entire height
  for (let j = 1; j < t2ColX.length; j++) {
    doc.line(t2ColX[j], y, t2ColX[j], y + t2DataHeight);
  }

  // Render the text items inside their virtual slots, without horizontal lines
  for (let i = 0; i < recItems.length; i++) {
    const item = recItems[i];
    const rowY = y + (i * t2RowH);
    
    doc.text(String(i + 1), t2ColX[0] + t2ColW[0] / 2, rowY + 6.2, { align: 'center' });
    const lines = doc.splitTextToSize(item.description, t2ColW[1] - 6);
    doc.text(lines, t2ColX[1] + 3, rowY + 6.2);
    doc.text(String(item.qty), t2ColX[2] + t2ColW[2] / 2, rowY + 6.2, { align: 'center' });
    
    const vendorLines = doc.splitTextToSize(item.vendor || '-', t2ColW[3] - 6);
    doc.text(vendorLines, t2ColX[3] + 3, rowY + 6.2);
    
    if (item.price && item.price > 0) {
      doc.text(formatCurrency(item.price, req.currency), t2ColX[4] + 3, rowY + 6.2);
    }
  }

  y += t2DataHeight + 10;

  // ─────────────────────────────────────────────────────
  // CATATAN Section - Calibri 11
  // ─────────────────────────────────────────────────────
  doc.setFont('calibri', 'bold');
  doc.setFontSize(11);
  doc.text('Catatan:', marginL, y);
  y += 5;

  doc.setFont('calibri', 'normal');
  doc.setFontSize(11);
  const noteLines = doc.splitTextToSize(req.notes || '-', contentW - 4);
  doc.text(noteLines, marginL, y);
  y += noteLines.length * 4.8 + 6;

  // ─────────────────────────────────────────────────────
  // GRAND TOTAL - Calibri 11 bold
  // ─────────────────────────────────────────────────────
  doc.setFontSize(11);
  if ((req.discount && req.discount > 0) || (req.deliveryFee && req.deliveryFee > 0)) {
    const subTotal = (req.itRecommendations || []).reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0);
    doc.setFont('calibri', 'normal');
    doc.text(`Subtotal : ${formatCurrency(subTotal, req.currency)}`, marginL, y);
    y += 5;
    if (req.discount && req.discount > 0) {
      doc.text(`Diskon : -${formatCurrency(req.discount, req.currency)}`, marginL, y);
      y += 5;
    }
    if (req.deliveryFee && req.deliveryFee > 0) {
      doc.text(`Ongkos Kirim : +${formatCurrency(req.deliveryFee, req.currency)}`, marginL, y);
      y += 5;
    }
  }
  doc.setFont('calibri', 'bold');
  doc.text(`Grand Total : ${formatCurrency(req.grandTotal, req.currency)}`, marginL, y);

  y += 12;

  // ─────────────────────────────────────────────────────
  // SIGNATURE TABLE (blank boxes for wet/physical signatures)
  // Columns: Pemohon | Atasan Langsung | VP HR&Logistic | Finance | Accounting - Calibri 11 bold
  // ─────────────────────────────────────────────────────
  const sigColW = contentW / 5; // 34mm each
  const sigHeaderH = 7;
  const sigBodyH = 25; // tall enough for wet signature
  const sigTotalH = sigHeaderH + sigBodyH;
  
  // If signature table would overflow the page, place it at the bottom
  const sigY = Math.max(y, pageH - 50);

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);

  // Outer rect
  doc.rect(marginL, sigY, contentW, sigTotalH);

  // Header divider line
  doc.line(marginL, sigY + sigHeaderH, marginL + contentW, sigY + sigHeaderH);

  const sigHeaders = ['Pemohon', 'Atasan Langsung', 'VP HR&Logistic', 'Finance', 'Accounting'];
  const sigNames = [
    req.requesterFullname || '',
    req.supervisorName || '',
    req.vpName || '',
    '',
    ''
  ];

  for (let i = 0; i < 5; i++) {
    const colX = marginL + (i * sigColW);

    // Vertical dividers (skip first)
    if (i > 0) {
      doc.line(colX, sigY, colX, sigY + sigTotalH);
    }

    // Header text - Calibri 11 bold
    doc.setFont('calibri', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(sigHeaders[i], colX + sigColW / 2, sigY + 4.8, { align: 'center' });

    // Printed Name at the bottom of the signature box - Calibri 11 normal
    if (sigNames[i]) {
      doc.setFont('calibri', 'normal');
      doc.setFontSize(11);
      doc.text(sigNames[i], colX + sigColW / 2, sigY + sigTotalH - 3, { align: 'center' });
    }
  }

  // Save/Download PDF
  const cleanId = String(req.id || '000').padStart(4, '0');
  const cleanName = req.requesterUsername.replace(/\s+/g, '-').substring(0, 15);
  doc.save(`PR-${cleanId}-${cleanName}.pdf`);
}
