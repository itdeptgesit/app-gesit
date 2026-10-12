import jsPDF from 'jspdf';
import { ITAssetLoan, ITAsset } from '../types';

/**
 * Format a date string into formal Indonesian long format: "Hari, DD Bulan YYYY"
 */
const formatIndonesianLongDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  } catch (e) {
    return dateStr;
  }
};

/**
 * Format a date string into formal Indonesian short format: "DD Bulan YYYY"
 */
const formatIndonesianShortDate = (dateStr: string) => {
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

export function exportHandoverBAST(loan: ITAssetLoan) {
  // Create an A4 Portrait PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageW = 210;
  const pageH = 297;
  const marginL = 20;
  const marginR = 20;
  const contentW = pageW - marginL - marginR; // 170mm

  // 1. Top Decorative Sleek Bar (Corporate Theme Accent)
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageW, 6, 'F');

  let currentY = 18;

  // 2. Document Header / Brand Block
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('GESIT CORE SYSTEM', marginL, currentY);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('Information Technology Department', marginL, currentY + 4);

  // Logo placeholder text / emblem on right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(37, 99, 235); // Blue-600
  doc.text('TGC ENTERPRISE', pageW - marginR, currentY, { align: 'right' });

  currentY += 8;

  // Thin separator line
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.5);
  doc.line(marginL, currentY, pageW - marginR, currentY);

  currentY += 12;

  // 3. Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('BERITA ACARA SERAH TERIMA BARANG (BAST)', pageW / 2, currentY, { align: 'center' });

  // Generate dynamic document number format BAST/IT/TGC/YYYY/MM/Sequential-ID
  const now = new Date(loan.loanDate || Date.now());
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const cleanId = String(loan.id || '000').padStart(3, '0');
  const docNumber = `BAST/IT/TGC/${year}/${month}/${cleanId}`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(71, 85, 105); // Slate-600
  doc.text(`Nomor: ${docNumber}`, pageW / 2, currentY + 5.5, { align: 'center' });

  currentY += 18;

  // 4. Opening Statement
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  const openingText = `Pada hari ini, ${formatIndonesianLongDate(loan.loanDate)}, bertempat di Kantor TGC, kami yang bertanda tangan di bawah ini:`;
  const splitOpening = doc.splitTextToSize(openingText, contentW);
  doc.text(splitOpening, marginL, currentY);

  currentY += (splitOpening.length * 4.5) + 3;

  // 5. Parties Blocks (Beautiful Cards style)
  const drawPartyBlock = (title: string, name: string, dept: string, phone: string, statusText: string, yPos: number) => {
    // Left bar indicator
    doc.setFillColor(37, 99, 235); // Blue-600
    doc.rect(marginL, yPos, 2, 22, 'F');

    // Background panel
    doc.setFillColor(248, 250, 252); // Slate-50
    doc.rect(marginL + 2, yPos, contentW - 2, 22, 'F');
    
    // Border around panel
    doc.setDrawColor(241, 245, 249); // Slate-100
    doc.setLineWidth(0.25);
    doc.rect(marginL + 2, yPos, contentW - 2, 22);

    // Write contents
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(37, 99, 235);
    doc.text(title, marginL + 6, yPos + 4.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Nama         :   ${name}`, marginL + 6, yPos + 10.5);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(51, 65, 85);
    doc.text(`Departemen:   ${dept}`, marginL + 6, yPos + 15.5);
    doc.text(`Kontak       :   ${phone || '-'}`, marginL + 6, yPos + 20);

    // Role Indicator
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(statusText, pageW - marginR - 6, yPos + 4.5, { align: 'right' });
  };

  // First Party (IT / Handover Personnel)
  drawPartyBlock(
    'PIHAK PERTAMA (Yang Menyerahkan)',
    loan.itPersonnel || 'IT Support TGC',
    'Information Technology (IT)',
    '-',
    'PEMBERI TUGAS / IT DEPT',
    currentY
  );

  currentY += 26;

  // Second Party (Recipient)
  drawPartyBlock(
    'PIHAK KEDUA (Yang Menerima)',
    loan.borrowerName,
    loan.borrowerDept,
    loan.borrowerPhone || '-',
    'KARYAWAN PENERIMA',
    currentY
  );

  currentY += 28;

  // 6. Transfer Statement
  const statementText = 'Pihak Pertama menyerahkan barang inventaris kantor kepada Pihak Kedua, dan Pihak Kedua menyatakan telah menerima barang tersebut dalam kondisi baik, lengkap, dan berfungsi normal dengan rincian spesifikasi sebagai berikut:';
  const splitStatement = doc.splitTextToSize(statementText, contentW);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(splitStatement, marginL, currentY);

  currentY += (splitStatement.length * 4.5) + 3;

  // 7. Specifications / Asset Details Table (Enterprise Grade Styling)
  const tableY = currentY;
  const colW = [10, 55, 30, 45, 30]; // Sums to 170 (contentW)
  const colX = [
    marginL,
    marginL + colW[0],
    marginL + colW[0] + colW[1],
    marginL + colW[0] + colW[1] + colW[2],
    marginL + colW[0] + colW[1] + colW[2] + colW[3]
  ];

  // Header row
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(marginL, tableY, contentW, 8, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('No', colX[0] + colW[0] / 2, tableY + 5.5, { align: 'center' });
  doc.text('Nama Barang / Deskripsi', colX[1] + 3, tableY + 5.5);
  doc.text('Kategori', colX[2] + 3, tableY + 5.5);
  doc.text('Serial Number (S/N)', colX[3] + 3, tableY + 5.5);
  doc.text('Kondisi Fisik', colX[4] + colW[4] / 2, tableY + 5.5, { align: 'center' });

  // Data row 1
  const rowY = tableY + 8;
  doc.setFillColor(255, 255, 255);
  doc.rect(marginL, rowY, contentW, 10, 'F');
  
  // Table borders (gridlines)
  doc.setDrawColor(203, 213, 225); // Slate-300
  doc.setLineWidth(0.3);
  doc.rect(marginL, tableY, contentW, 18);
  
  // Draw vertical lines
  for (let i = 1; i < colX.length; i++) {
    doc.line(colX[i], tableY, colX[i], tableY + 18);
  }
  doc.line(marginL, rowY, pageW - marginR, rowY);

  // Write Row Values
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('1', colX[0] + colW[0] / 2, rowY + 6, { align: 'center' });
  
  // Truncate long item names safely
  const rawItem = loan.assetName || 'IT Asset Device';
  const cleanItem = rawItem.length > 28 ? rawItem.substring(0, 26) + '...' : rawItem;
  doc.setFont('helvetica', 'bold');
  doc.text(cleanItem, colX[1] + 3, rowY + 6);
  
  doc.setFont('helvetica', 'normal');
  doc.text(loan.assetCategory || 'IT Asset', colX[2] + 3, rowY + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.text(loan.assetSerial || '-', colX[3] + 3, rowY + 6);
  
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129); // Emerald-500
  doc.text('Baik (Good)', colX[4] + colW[4] / 2, rowY + 6, { align: 'center' });

  currentY += 24;

  // 8. Terms & Conditions Section (Polished Box)
  doc.setFillColor(254, 254, 254);
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.setLineWidth(0.4);
  const tcBoxH = 40;
  doc.rect(marginL, currentY, contentW, tcBoxH);

  // T&C Header Ribbon
  doc.setFillColor(241, 245, 249); // Slate-100
  doc.rect(marginL + 0.2, currentY + 0.2, contentW - 0.4, 7, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('KETENTUAN PENGGUNAAN & PERTANGGUNGJAWABAN ASET:', marginL + 4, currentY + 5);

  const tcLines = [
    '1. Pihak Kedua bertanggung jawab penuh atas keamanan, pemeliharaan, dan penggunaan barang tersebut.',
    '2. Barang inventaris ini merupakan milik TGC dan hanya boleh digunakan untuk menunjang kegiatan operasional resmi perusahaan.',
    '3. Apabila terjadi kerusakan karena kelalaian atau kehilangan, Pihak Kedua wajib segera melaporkan ke IT Department dalam 24 jam.',
    '4. Pihak Kedua wajib mengembalikan barang inventaris dalam keadaan lengkap jika mengundurkan diri (resign) atau dinonaktifkan.'
  ];

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  tcLines.forEach((line, idx) => {
    doc.text(line, marginL + 4, currentY + 13 + (idx * 5.5));
  });

  currentY += tcBoxH + 6;

  // 9. Closing Statement
  const closingText = 'Demikian Berita Acara Serah Terima ini dibuat secara sadar, tanpa paksaan, dan ditandatangani oleh kedua belah pihak untuk dipergunakan sebagai bukti pertanggungjawaban inventarisasi yang sah.';
  const splitClosing = doc.splitTextToSize(closingText, contentW);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(splitClosing, marginL, currentY);

  currentY += (splitClosing.length * 4) + 6;

  // 10. Signatures Section (Clean, symmetrical grid)
  const sigY = currentY;

  // City and date header
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Jakarta, ${formatIndonesianShortDate(loan.loanDate)}`, pageW - marginR, sigY, { align: 'right' });

  const sigBlockY = sigY + 6;
  const colSigW = 65;

  // Left Column (Recipient)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('PIHAK KEDUA (Yang Menerima)', marginL + 5, sigBlockY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Tanda Tangan & Nama Terang', marginL + 5, sigBlockY + 4);

  // Placeholder Line for signature
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(marginL + 5, sigBlockY + 23, marginL + colSigW, sigBlockY + 23);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(loan.borrowerName, marginL + 5, sigBlockY + 28);

  // Right Column (Handover)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 41, 59);
  doc.text('PIHAK PERTAMA (Yang Menyerahkan)', pageW - marginR - colSigW, sigBlockY);
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('Tanda Tangan & Nama Terang', pageW - marginR - colSigW, sigBlockY + 4);

  // Placeholder Line for IT signature
  doc.line(pageW - marginR - colSigW, sigBlockY + 23, pageW - marginR - 5, sigBlockY + 23);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text(loan.itPersonnel || 'IT Support Dept.', pageW - marginR - colSigW, sigBlockY + 28);

  // 11. Footer Notes
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text('GESIT CORE • Dokumen Berita Acara resmi IT Department TGC.', marginL, pageH - 8);
  doc.text('Halaman 1 dari 1', pageW - marginR, pageH - 8, { align: 'right' });

  // Save the BAST PDF dynamically
  const cleanName = loan.borrowerName.replace(/\s+/g, '-').substring(0, 15);
  doc.save(`BAST-${loan.loanId}-${cleanName}.pdf`);
}

const loadLogoImage = (): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = '/image/logo.png';
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
  });
};

export interface AssetTransferInfo {
  originatorCompany: string;
  originatorName: string;
  originatorPosition: string;
  originatorDept: string;
  
  recipientName: string;
  recipientCompany: string;
  recipientPosition: string;
  recipientDivision: string;
  recipientDept: string;
  recipientLocation: string;
  
  handoverDate: string;
  docNo: string;
  
  supportingEquipment: Array<{ name: string; serialNo: string; remarks: string }>;
  note: string;
}

export async function exportAssetTransferForm(
  asset: ITAsset,
  info: AssetTransferInfo
) {
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

  // Load logo image from local public assets folder asynchronously
  const logoImg = await loadLogoImage();

  // 1. Single Outer Rectangular Page Border (matching the thin outer frame in screenshot)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.rect(4, 4, pageW - 8, pageH - 8);

  let currentY = 10;

  // 2. Title Header Area
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.setTextColor(15, 32, 67);
  doc.text('ASSET TRANSFER FORM', marginL, currentY + 6.5);

  // Render the official logo on top-right with perfect aspect ratio, centering logo and sub-label, and aligning rightmost edge perfectly to right margin
  if (logoImg) {
    const originalW = logoImg.naturalWidth || logoImg.width || 100;
    const originalH = logoImg.naturalHeight || logoImg.height || 100;
    const aspect = originalW / originalH;
    
    // We target a fixed height of 8.5mm to keep it elegant and neat
    const targetH = 8.5;
    const targetW = targetH * aspect;
    
    // Measure exact width of sub-label text to align its right edge exactly with the document margin (X=200)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    const textW = doc.getTextWidth('THE GESIT COMPANIES');
    
    // Calculate the perfect center axis so that the rightmost edge of the text touches the right margin
    const brandCenterX = (pageW - marginR) - (textW / 2);
    
    doc.addImage(logoImg, 'PNG', brandCenterX - (targetW / 2), currentY + 0.5, targetW, targetH);
    
    // Sub-label text "THE GESIT COMPANIES" centered exactly below the image logo
    doc.setTextColor(197, 160, 89); // Elegant Gold Color
    doc.text('THE GESIT COMPANIES', brandCenterX, currentY + 11.2, { align: 'center' });
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const textW = doc.getTextWidth('THE GESIT COMPANIES');
    const brandCenterX = (pageW - marginR) - (textW / 2);
    doc.setTextColor(197, 160, 89);
    doc.text('THE GESIT COMPANIES', brandCenterX, currentY + 7, { align: 'center' });
  }

  // Thin separator line (increased spacing by 3mm to give breathing room for sub-label text!)
  currentY += 15;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.8);
  doc.line(marginL, currentY, pageW - marginR, currentY);

  currentY += 2;

  // 3. Metadata Panel (Grey outline box containing Date, Return Date, Doc No, Return Condition)
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.25);
  doc.rect(marginL, currentY, contentW, 14);

  const formatShortMMM = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const yy = String(date.getFullYear()).substring(2);
      return `${date.getDate()}-${months[date.getMonth()]}-${yy}`;
    } catch {
      return dateStr;
    }
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);

  // Row 1
  doc.text('HANDOVER DATE', marginL + 3, currentY + 4.5);
  doc.text(`:  ${formatShortMMM(info.handoverDate)}`, marginL + 35, currentY + 4.5);
  doc.text('DOC NO', marginL + 120, currentY + 4.5);
  doc.text(`:  ${info.docNo}`, marginL + 138, currentY + 4.5);

  // Row 2
  doc.text('RETURN DATE', marginL + 3, currentY + 10.5);
  doc.text(':', marginL + 35, currentY + 10.5);
  doc.text('RETURN CONDITION', marginL + 102, currentY + 10.5);
  doc.text(':', marginL + 138, currentY + 10.5);
  // Draw a perfect straight vector line instead of messy underscore characters that overflow!
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.3);
  doc.line(marginL + 141, currentY + 10.5, pageW - marginR - 3, currentY + 10.5);

  currentY += 17;

  // Section Header Generator (Rich Navy centered bar)
  const drawSectionHeader = (title: string, yPos: number) => {
    doc.setFillColor(12, 35, 90); // Solid Dark Navy
    doc.rect(marginL, yPos, contentW, 5.5, 'F');
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(title, pageW / 2, yPos + 3.8, { align: 'center' });
  };

  // Helper to draw clean white bordered input boxes
  const drawLabelAndInputBox = (
    label: string,
    value: string,
    labelX: number,
    colonX: number,
    boxX: number,
    boxW: number,
    y: number,
    boxH: number = 4.8
  ) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 32, 67);
    doc.text(label, labelX, y + 3.5);
    
    doc.text(':', colonX, y + 3.5);
    
    // Draw white input box
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.2);
    doc.setFillColor(255, 255, 255);
    doc.rect(boxX, y, boxW, boxH, 'FD');
    
    // Write capitalized text inside with dynamic font scaling to perfectly fit the white input box bounds
    doc.setFont('helvetica', 'bold');
    let fitFontSize = 8;
    doc.setFontSize(fitFontSize);
    const textVal = (value || '').toUpperCase();
    
    // Scale font size down dynamically if it is too wide for the box
    while (doc.getTextWidth(textVal) > (boxW - 4) && fitFontSize > 5.5) {
      fitFontSize -= 0.5;
      doc.setFontSize(fitFontSize);
    }
    
    doc.setTextColor(15, 23, 42);
    // Keep it centered vertically as font size scales
    const yOffset = 3.5 + (8 - fitFontSize) * 0.15;
    doc.text(textVal, boxX + 2, y + yOffset);
  };

  // --- 4. SECTION: DATA ORIGINATOR ---
  drawSectionHeader('DATA ORIGINATOR', currentY);
  currentY += 7.5;

  drawLabelAndInputBox('COMPANY', info.originatorCompany, 11, 32, 34, 166, currentY);
  currentY += 6.5;

  drawLabelAndInputBox('NAME', info.originatorName, 11, 32, 34, 166, currentY);
  currentY += 6.5;

  drawLabelAndInputBox('POSITION', info.originatorPosition, 11, 32, 34, 75, currentY);
  drawLabelAndInputBox('DEPARTMENT', info.originatorDept, 117, 138, 140, 60, currentY);

  currentY += 13;

  // --- 5. SECTION: DATA FIXED ASSET ---
  drawSectionHeader('DATA FIXED ASSET', currentY);
  currentY += 7.5;

  // Asset type indicator block (mathematically aligned columns and white square outline checkboxes)
  doc.setFillColor(12, 35, 90);
  doc.rect(marginL, currentY, contentW, 5.5, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('ASSET TYPE', 11, currentY + 3.8);
  doc.text(':', 32, currentY + 3.8);
  
  // Hardware Checkbox (Checked by default for physical device inventory handovers)
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.25);
  doc.rect(34, currentY + 1.25, 3, 3);
  doc.text('X', 34.8, currentY + 3.65);
  doc.text('Hardware', 39, currentY + 3.8);
  
  // Software Checkbox (Unchecked placeholder)
  doc.rect(65, currentY + 1.25, 3, 3);
  doc.text('Software', 70, currentY + 3.8);

  currentY += 7.5;

  // TABLE 1: Main Fixed Asset Table
  const table1W = [10, 68, 42, 42, 28]; // Sums to 190 (contentW)
  const table1X = [
    marginL,
    marginL + table1W[0],
    marginL + table1W[0] + table1W[1],
    marginL + table1W[0] + table1W[1] + table1W[2],
    marginL + table1W[0] + table1W[1] + table1W[2] + table1W[3]
  ];

  // Table 1 Header
  doc.setFillColor(12, 35, 90);
  doc.rect(marginL, currentY, contentW, 5.5, 'F');
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.rect(marginL, currentY, contentW, 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NO', table1X[0] + table1W[0]/2, currentY + 3.8, { align: 'center' });
  doc.text('ASSET NAME', table1X[1] + table1W[1]/2, currentY + 3.8, { align: 'center' });
  doc.text('SERIAL NO', table1X[2] + table1W[2]/2, currentY + 3.8, { align: 'center' });
  doc.text('ASSET REGISTER NO', table1X[3] + table1W[3]/2, currentY + 3.8, { align: 'center' });
  doc.text('REMARKS', table1X[4] + table1W[4]/2, currentY + 3.8, { align: 'center' });

  // Row 1 (Data)
  let rowY = currentY + 5.5;
  doc.setFillColor(255, 255, 255);
  doc.rect(marginL, rowY, contentW, 7, 'F');
  doc.rect(marginL, rowY, contentW, 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text('1', table1X[0] + table1W[0]/2, rowY + 4.5, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  const itemName = asset.item || '';
  const maxW = table1W[1] - 5; // allow padding
  const nameLines = doc.splitTextToSize(itemName, maxW);
  if (nameLines.length > 1) {
    doc.setFontSize(6.5);
    doc.text(nameLines[0], table1X[1] + 2.5, rowY + 2.8);
    doc.text(nameLines[1], table1X[1] + 2.5, rowY + 5.6);
  } else {
    doc.setFontSize(7.5);
    doc.text(itemName, table1X[1] + 2.5, rowY + 4.5);
  }
  
  doc.setFont('helvetica', 'normal');
  doc.text(asset.serialNumber || '-', table1X[2] + table1W[2]/2, rowY + 4.5, { align: 'center' });
  doc.text(asset.assetId || '-', table1X[3] + table1W[3]/2, rowY + 4.5, { align: 'center' });
  doc.text(asset.remarks || asset.brand || '-', table1X[4] + table1W[4]/2, rowY + 4.5, { align: 'center' });

  // Row 2 (Blank Placeholder)
  doc.rect(marginL, rowY + 7, contentW, 5.5);
  // Row 3 (Blank Placeholder)
  doc.rect(marginL, rowY + 12.5, contentW, 5.5);

  // Vertical Divider gridlines
  for (let i = 1; i < table1X.length; i++) {
    doc.line(table1X[i], currentY, table1X[i], rowY + 18);
  }

  currentY += 31;

  // TABLE 2: Supporting Equipment Table
  const table2W = [10, 80, 50, 50]; // Sums to 190 (contentW)
  const table2X = [
    marginL,
    marginL + table2W[0],
    marginL + table2W[0] + table2W[1],
    marginL + table2W[0] + table2W[1] + table2W[2]
  ];

  doc.setFillColor(12, 35, 90);
  doc.rect(marginL, currentY, contentW, 5.5, 'F');
  doc.rect(marginL, currentY, contentW, 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text('NO', table2X[0] + table2W[0]/2, currentY + 3.8, { align: 'center' });
  doc.text('SUPPORTING EQUIPMENT', table2X[1] + table2W[1]/2, currentY + 3.8, { align: 'center' });
  doc.text('SERIAL NO', table2X[2] + table2W[2]/2, currentY + 3.8, { align: 'center' });
  doc.text('REMARKS', table2X[3] + table2W[3]/2, currentY + 3.8, { align: 'center' });

  // Print 5 rows cleanly (filling with checkboxes or blank placeholders)
  const rowH = 5.5;
  for (let i = 0; i < 5; i++) {
    const rY = currentY + 5.5 + (i * rowH);
    doc.rect(marginL, rY, contentW, rowH);
    for (let j = 1; j < table2X.length; j++) {
      doc.line(table2X[j], currentY, table2X[j], rY + rowH);
    }

    const equip = info.supportingEquipment[i];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(String(i + 1), table2X[0] + table2W[0]/2, rY + 3.8, { align: 'center' });
    
    if (equip) {
      doc.setFont('helvetica', 'bold');
      const eqName = equip.name || '';
      const eqMaxW = table2W[1] - 5;
      const eqLines = doc.splitTextToSize(eqName, eqMaxW);
      if (eqLines.length > 1) {
        doc.setFontSize(6.2);
        doc.text(eqLines[0], table2X[1] + 2.5, rY + 2.2);
        doc.text(eqLines[1], table2X[1] + 2.5, rY + 4.4);
      } else {
        doc.setFontSize(7.5);
        doc.text(eqName, table2X[1] + 2.5, rY + 3.8);
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(equip.serialNo || '-', table2X[2] + table2W[2]/2, rY + 3.8, { align: 'center' });
      doc.text(equip.remarks || '-', table2X[3] + table2W[3]/2, rY + 3.8, { align: 'center' });
    }
  }

  currentY += 40.5;

  // Note Section (matching note bar in screenshot)
  doc.setFillColor(12, 35, 90);
  doc.rect(marginL, currentY, contentW, 5.5, 'F');
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('Note :', marginL + 2, currentY + 3.8);

  doc.rect(marginL, currentY + 5.5, contentW, 10);
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(info.note || '-', marginL + 3, currentY + 11.8);

  currentY += 23;

  // --- 6. SECTION: DATA RECIPIENT ---
  drawSectionHeader('DATA RECIPIENT', currentY);
  currentY += 7.5;

  drawLabelAndInputBox('NAME', info.recipientName, 11, 32, 34, 75, currentY);
  drawLabelAndInputBox('COMPANY', info.recipientCompany, 117, 138, 140, 60, currentY);
  currentY += 6.5;

  drawLabelAndInputBox('POSITION', info.recipientPosition, 11, 32, 34, 75, currentY);
  drawLabelAndInputBox('DIVISION', info.recipientDivision, 117, 138, 140, 60, currentY);
  currentY += 6.5;

  drawLabelAndInputBox('DEPARTMENT', info.recipientDept, 11, 32, 34, 75, currentY);
  drawLabelAndInputBox('LOCATION', info.recipientLocation, 117, 138, 140, 60, currentY);

  currentY += 14.5;

  // Dotted line before Acknowledgement
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.25);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(marginL, currentY, pageW - marginR, currentY);
  doc.setLineDashPattern([], 0); // reset dash pattern

  currentY += 3.5;

  // --- 7. SECTION: ACKNOWLEDGEMENT AND DECLARATION ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 32, 67);
  doc.text('ACKNOWLEDGEMENT AND DECLARATION', marginL, currentY);
  
  // Dotted underline
  doc.setLineDashPattern([1, 1], 0);
  doc.line(marginL, currentY + 1.2, marginL + 65, currentY + 1.2);
  doc.setLineDashPattern([], 0);

  currentY += 4.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  const declText = 'I, as received, hereby acknowledge that I received above mentioned asset. I understand that asset belong to company and hereby assure that I will take care of the assets of the company to the best possible extend. Minimum for next 3 years.';
  const splitDecl = doc.splitTextToSize(declText, contentW);
  doc.text(splitDecl, marginL, currentY);

  currentY += 13.5;

  // --- 8. SECTION: SIGNATURES BLOCK ---
  // Hardcode signatures block and footer elements to sit exactly at the bottom of the A4 page!
  const sigY = 246;
  const sigBoxH = 32;
  const sigW = contentW / 3;

  doc.setDrawColor(80, 80, 80);
  doc.setLineWidth(0.3);
  doc.rect(marginL, sigY, contentW, sigBoxH);

  // Division vertical lines
  doc.line(marginL + sigW, sigY, marginL + sigW, sigY + sigBoxH);
  doc.line(marginL + (sigW * 2), sigY, marginL + (sigW * 2), sigY + sigBoxH);

  // Row header horizontal lines
  doc.line(marginL, sigY + 8, pageW - marginR, sigY + 8);

  const drawSignatureCell = (x: number, label: string, role: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(label, x + 2, sigY + 3.5);
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(role, x + 2, sigY + 6.8);

    // Inside signature space
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor(148, 163, 184);
    doc.text('Signature:', x + 2, sigY + 11.5);
    doc.text('Date:', x + 2, sigY + 30);
  };

  drawSignatureCell(marginL, 'PREPARED by:', 'IT');
  drawSignatureCell(marginL + sigW, 'VERIFIED by:', 'Office Manager');
  drawSignatureCell(marginL + (sigW * 2), 'RECEIVED by:', 'User');

  // 9. THICK BLACK FOOTER LINE
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.6);
  doc.line(marginL, 281, pageW - marginR, 281);

  // Footer notes on left
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 32, 67);
  doc.text('INFORMATION TECHNOLOGY', marginL, 285.5);
  doc.text(info.originatorCompany.toUpperCase(), marginL, 289.5);

  // Save Document
  const cleanName = info.recipientName.replace(/\s+/g, '-').substring(0, 15);
  doc.save(`Asset_Transfer_Form_${asset.assetId}_${cleanName}.pdf`);
}


