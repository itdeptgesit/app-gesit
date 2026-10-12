import jsPDF from 'jspdf';
import { PurchaseRequisition } from '../types';
import { supabase } from './supabaseClient';

/**
 * Format date to Indonesian style: "DD MMMM YYYY"
 */
const formatIndonesianDate = (dateStr: string) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;

    // We want the format dd/mm/yy as requested in the image (dd/mm/yy)
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = String(date.getFullYear()).slice(-2);
    return `${d}/${m}/${y}`;
  } catch (e) {
    return dateStr;
  }
};

/**
 * Format number to currency
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
    const resReg = await fetch('/fonts/carlito-regular.ttf');
    if (resReg.ok) {
      const bufReg = await resReg.arrayBuffer();
      const b64Reg = arrayBufferToBase64(bufReg);
      doc.addFileToVFS('calibri-normal.ttf', b64Reg);
      doc.addFont('calibri-normal.ttf', 'calibri', 'normal');
    }

    const resBold = await fetch('/fonts/carlito-bold.ttf');
    if (resBold.ok) {
      const bufBold = await resBold.arrayBuffer();
      const b64Bold = arrayBufferToBase64(bufBold);
      doc.addFileToVFS('calibri-bold.ttf', b64Bold);
      doc.addFont('calibri-bold.ttf', 'calibri', 'bold');
    }
  } catch (e) {
    console.error('Error loading Calibri font:', e);
    doc.addFont('Helvetica', 'calibri', 'normal');
    doc.addFont('Helvetica-Bold', 'calibri', 'bold');
  }
}

function convertNumberToWords(amount: number): string {
  if (amount === 0) return "Nol Rupiah";

  const units = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];

  function toWords(num: number): string {
    if (num < 12) return units[num];
    if (num < 20) return toWords(num - 10) + " Belas";
    if (num < 100) return toWords(Math.floor(num / 10)) + " Puluh" + (num % 10 > 0 ? " " + toWords(num % 10) : "");
    if (num < 200) return "Seratus" + (num % 100 > 0 ? " " + toWords(num % 100) : "");
    if (num < 1000) return toWords(Math.floor(num / 100)) + " Ratus" + (num % 100 > 0 ? " " + toWords(num % 100) : "");
    if (num < 2000) return "Seribu" + (num % 1000 > 0 ? " " + toWords(num % 1000) : "");
    if (num < 1000000) return toWords(Math.floor(num / 1000)) + " Ribu" + (num % 1000 > 0 ? " " + toWords(num % 1000) : "");
    if (num < 1000000000) return toWords(Math.floor(num / 1000000)) + " Juta" + (num % 1000000 > 0 ? " " + toWords(num % 1000000) : "");
    if (num < 1000000000000) return toWords(Math.floor(num / 1000000000)) + " Milyar" + (num % 1000000000 > 0 ? " " + toWords(num % 1000000000) : "");
    if (num < 1000000000000000) return toWords(Math.floor(num / 1000000000000)) + " Triliun" + (num % 1000000000000 > 0 ? " " + toWords(num % 1000000000000) : "");
    return "";
  }

  return toWords(amount) + " Rupiah";
}

export interface FinanceFormData {
  companyName: string;
  costCenter: string;   // abbreviation e.g. "GA" for "GESIT ALUMAS"
  projectName: string;
  cekBgNo: string;
  bankName: string;
  paymentMethod: 'Cash' | 'Transfer';
  transferTo: string;
  amount?: number; // Optional override
}


type PdfCardContext = {
  doc: jsPDF;
  x: number;
  y: number;
  w: number;
  h: number;
  index: number;
};

const drawCardFrame = ({ doc, x, y, w, h }: PdfCardContext) => {
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.setLineDashPattern([2, 2], 0);
  doc.rect(x, y, w, h);
  doc.setLineDashPattern([], 0);
  doc.setDrawColor(0, 0, 0);
};

const drawCompactHeader = (
  doc: jsPDF,
  logoBase64: string | null,
  x: number,
  y: number,
  w: number,
  title: string
) => {
  if (logoBase64) {
    doc.addImage(logoBase64, 'PNG', x + 4, y + 4, 7, 7, undefined, 'FAST');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('THE GESIT COMPANIES', x + 13, y + 8.5);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('THE GESIT COMPANIES', x + 4, y + 8.5);
  }

  doc.setFont('calibri', 'bold');
  doc.setFontSize(10);
  const tw = doc.getTextWidth(title);
  const tx = x + (w - tw) / 2;
  doc.text(title, tx, y + 17);
  doc.setLineWidth(0.35);
  doc.line(tx, y + 18, tx + tw, y + 18);
};

const drawCompactField = (
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  labelW: number,
  valueW: number,
  fontSize = 6.6
) => {
  doc.setFont('calibri', 'normal');
  doc.setFontSize(fontSize);
  doc.text(label, x, y);
  doc.text(':', x + labelW, y);

  const valueX = x + labelW + 1.5;
  const lines = doc.splitTextToSize(value || '', valueW);
  doc.text(lines[0] || '', valueX, y);
  doc.setLineWidth(0.15);
  doc.line(valueX, y + 0.9, valueX + valueW, y + 0.9);
};

const drawPaymentMethod = (
  doc: jsPDF,
  method: 'Cash' | 'Transfer',
  transferTo: string,
  x: number,
  y: number,
  w: number
) => {
  doc.setFont('calibri', 'normal');
  doc.setFontSize(6.6);
  doc.text('Payment Method', x, y);
  doc.text(':', x + 25, y);

  const boxY = y - 3.2;
  const cashX = x + 28;
  const transferX = x + 48;

  doc.rect(cashX, boxY, 3.2, 3.2);
  doc.text('Cash', cashX + 4.5, y);

  doc.rect(transferX, boxY, 3.2, 3.2);
  doc.text('Transfer', transferX + 4.5, y);

  if (method === 'Cash') {
    doc.setLineWidth(0.25);
    doc.line(cashX + 0.4, boxY + 1.5, cashX + 1.3, boxY + 2.4);
    doc.line(cashX + 1.3, boxY + 2.4, cashX + 2.8, boxY + 0.8);
  } else {
    doc.setLineWidth(0.25);
    doc.line(transferX + 0.4, boxY + 1.5, transferX + 1.3, boxY + 2.4);
    doc.line(transferX + 1.3, boxY + 2.4, transferX + 2.8, boxY + 0.8);
  }

  doc.setLineWidth(0.15);
  const destX = x + 69;
  doc.text('To', destX, y);
  doc.text(':', destX + 7, y);
  doc.text(method === 'Transfer' ? (transferTo || '') : '', destX + 9, y);
  doc.line(destX + 8, y + 0.9, x + w, y + 0.9);

  doc.setLineWidth(0.2);
};

const drawCompactItemsTable = (
  doc: jsPDF,
  req: PurchaseRequisition,
  costCenter: string,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  const colW = [8, 18, w - 8 - 18 - 21, 21];
  const colX = [x];
  for (let i = 0; i < colW.length - 1; i++) {
    colX.push(colX[i] + colW[i]);
  }

  const headerH = 5.5;
  doc.setLineWidth(0.2);
  doc.rect(x, y, w, h);
  for (let i = 1; i < colX.length; i++) {
    doc.line(colX[i], y, colX[i], y + h);
  }
  doc.line(x, y + headerH, x + w, y + headerH);

  doc.setFont('calibri', 'bold');
  doc.setFontSize(5.9);
  doc.text('No.', colX[0] + colW[0] / 2, y + 3.7, { align: 'center' });
  doc.text('Dept.', colX[1] + colW[1] / 2, y + 3.7, { align: 'center' });
  doc.text('Description', colX[2] + colW[2] / 2, y + 3.7, { align: 'center' });
  doc.text('Amount', colX[3] + colW[3] / 2, y + 3.7, { align: 'center' });

  const items = req.itRecommendations || req.requestedItems || [];
  const maxRows = Math.max(1, Math.floor((h - headerH - 1.5) / 5.2));

  doc.setFont('calibri', 'normal');
  doc.setFontSize(5.8);

  if (items.length === 0) {
    doc.text('-', colX[2] + 2, y + headerH + 4);
    return;
  }

  const visible = items.slice(0, maxRows);
  let rowY = y + headerH + 3.8;

  visible.forEach((item, i) => {
    doc.text(String(i + 1), colX[0] + colW[0] / 2, rowY, { align: 'center' });

    if (i === 0) {
      doc.text(costCenter || req.department || '', colX[1] + colW[1] / 2, rowY, {
        align: 'center'
      });
    }

    const desc = doc.splitTextToSize(item.description || '-', colW[2] - 3);
    doc.text(desc[0] || '-', colX[2] + 1.5, rowY);

    const hasPrice = 'price' in item && Number((item as any).price || 0) > 0;
    const amount = hasPrice
      ? Number((item as any).price || 0) * Number(item.qty || 1)
      : 0;

    if (amount > 0) {
      doc.text(
        new Intl.NumberFormat('id-ID').format(amount),
        colX[3] + colW[3] - 1.5,
        rowY,
        { align: 'right' }
      );
    }

    rowY += 5.2;
  });

  if (items.length > visible.length) {
    doc.setFont('calibri', 'italic');
    doc.setFontSize(5.2);
    doc.text(
      `+ ${items.length - visible.length} item lainnya`,
      colX[2] + 1.5,
      y + h - 1.5
    );
  }
};

const drawCompactSignatures = (
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number
) => {
  const labels = ['Requested by', 'Approved by', 'Finance', 'Accounting', 'Received by'];
  const slotW = w / labels.length;
  const headerH = 5;

  doc.setLineWidth(0.2);
  doc.setFont('calibri', 'bold');
  doc.setFontSize(5.5);

  labels.forEach((label, i) => {
    const sx = x + i * slotW;
    doc.rect(sx, y, slotW, h);
    doc.line(sx, y + headerH, sx + slotW, y + headerH);
    doc.text(label, sx + slotW / 2, y + 3.5, { align: 'center' });

    if (i === labels.length - 1) {
      doc.line(sx + 3, y + h - 3, sx + slotW - 3, y + h - 3);
    }
  });
};

const drawFinanceCard = async (
  ctx: PdfCardContext,
  req: PurchaseRequisition,
  type: 'cash_advance' | 'payment_requisition',
  formData: FinanceFormData,
  logoBase64: string | null
) => {
  const { doc, x, y, w } = ctx;

  drawCardFrame(ctx);

  const title = type === 'cash_advance' ? 'CASH ADVANCE' : 'PAYMENT REQUISITION';
  drawCompactHeader(doc, logoBase64, x, y, w, title);

  const leftX = x + 4;
  const rightX = x + 53;
  const fieldWLeft = 45;
  const fieldWRight = 47;
  let fy = y + 24;

  drawCompactField(doc, 'Company', formData.companyName, leftX, fy, 17, fieldWLeft - 18);
  drawCompactField(doc, 'Cek / BG No.', formData.cekBgNo, rightX, fy, 16, fieldWRight - 17);

  fy += 7;
  drawCompactField(doc, 'Project', formData.projectName, leftX, fy, 17, fieldWLeft - 18);
  drawCompactField(doc, 'Bank', formData.bankName, rightX, fy, 16, fieldWRight - 17);

  fy += 7;
  drawCompactField(doc, 'Request Date', formatIndonesianDate(req.requestDate), leftX, fy, 17, fieldWLeft - 18);
  drawCompactField(doc, 'Pay to', req.paidTo || formData.transferTo || '', rightX, fy, 16, fieldWRight - 17);

  fy += 7;
  drawPaymentMethod(
    doc,
    formData.paymentMethod,
    formData.transferTo || req.bankAccount || '',
    leftX,
    fy,
    97
  );

  fy += 5.5;

  // Compact item area. The second file uses a 2 x 3 card layout,
  // so the table is intentionally kept compact to stay inside each 105 x 99 mm card.
  drawCompactItemsTable(
    doc,
    req,
    formData.costCenter,
    x + 4,
    fy,
    97,
    24
  );

  fy += 27;

  const amount = formData.amount !== undefined ? formData.amount : (req.grandTotal || 0);
  doc.setFont('calibri', 'bold');
  doc.setFontSize(7.5);
  doc.text(
    `TOTAL ${new Intl.NumberFormat('id-ID').format(amount)} ${req.currency || 'IDR'}`,
    x + 101,
    fy,
    { align: 'right' }
  );
  doc.line(x + 4, fy + 1.2, x + 101, fy + 1.2);

  fy += 5.5;
  doc.setFont('calibri', 'normal');
  doc.setFontSize(6.1);
  doc.text('In Words :', x + 4, fy);
  const words = amount > 0 ? convertNumberToWords(amount) : '';
  const wordsLines = doc.splitTextToSize(words, 78);
  doc.text(wordsLines[0] || '', x + 18, fy);
  doc.line(x + 17, fy + 0.9, x + 101, fy + 0.9);

  fy += 7;
  drawCompactSignatures(doc, x + 4, fy, 97, 16);
};


export async function exportFinanceFormPDF(
  req: PurchaseRequisition,
  type: 'cash_advance' | 'payment_requisition',
  formData: FinanceFormData
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const logoBase64 = await loadLogoBase64();

  await loadCalibriFont(doc);

  // A4 portrait = 210 x 297 mm.
  // 6 forms = 2 columns x 3 rows, exactly like the second file.
  const pageW = 210;
  const pageH = 297;
  const cardW = pageW / 2;   // 105 mm
  const cardH = pageH / 3;   // 99 mm

  // Dashed cutting guides: vertical center + two horizontal divisions.
  const drawCutGuides = () => {
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.25);
    doc.setLineDashPattern([2, 2], 0);

    doc.line(cardW, 0, cardW, pageH);
    doc.line(0, cardH, pageW, cardH);
    doc.line(0, cardH * 2, pageW, cardH * 2);

    doc.setLineDashPattern([], 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5);
    doc.setTextColor(150, 150, 150);

    doc.text('✂', cardW, 3, { align: 'center' });
    doc.text('✂', cardW, cardH + 3, { align: 'center' });
    doc.text('✂', cardW, cardH * 2 + 3, { align: 'center' });

    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);
  };

  // One requested form per card.
  drawFinanceCard(
    { doc, x: 0, y: 0, w: cardW, h: cardH, index: 0 },
    req,
    type,
    formData,
    logoBase64
  );

  drawCutGuides();

  const cleanId = String(req.id || '000').padStart(4, '0');
  const typeStr = type === 'cash_advance' ? 'CA' : 'PRQ';
  doc.save(`${typeStr}-${cleanId}-6UP.pdf`);
}

// ==========================================
// EXPENSE APPROVAL — Cash Advance Settlement
// ==========================================

export interface ExpenseApprovalFormData {
  companyName: string;
  costCenter: string;
  projectName: string;
  cekBgNo: string;
  bankName: string;
  paymentMethod: 'Cash' | 'Transfer';
  transferTo: string;
  paidTo: string;
  requestDate: string;
  note: string;
  actualExpense: number;
  cashAdvanceAmount: number;
}

export interface ExpenseApprovalData {
  expense_number: string;
  company: string;
  department: string;
  project_name: string;
  request_date: string;
  paid_to: string;
  note: string;
  total_amount: number;
  // Settlement fields (matching Cash Advance settlement voucher)
  cash_advance_amount?: number;
  actual_expense?: number;
  refund_amount?: number;
  items_description?: string;
  // Fallback invoice fields
  invoice_number?: string;
  bank_name?: string;
  account_number?: string;
  account_name?: string;
  // Signatures
  prepared_by_name: string;
  prepared_by_id?: string;
  approved_by_name?: string;
  approved_by_id?: string;
  status?: string;
}

// Map: user email → local e-sign image path (in /public/image/e-sign/)
const E_SIGN_MAP: Record<string, string> = {
  'sylvia@gesit.co.id': '/image/e-sign/sylvia.png',
  'rudi.siarudin@gesit.co.id': '/image/e-sign/siarudin.png',
  'desi@gesit.co.id': '/image/e-sign/desi.png',
  'natalia@gesit.co.id': '/image/e-sign/e-sign_bu-nata.png',
};

const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve('');
      img.src = URL.createObjectURL(blob);
    });
  } catch {
    return null;
  }
};

const fetchGrayscaleLogoAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise<string>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(''); return; }
        ctx.drawImage(img, 0, 0);
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;
          for (let i = 0; i < data.length; i += 4) {
            const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            data[i] = luma;
            data[i + 1] = luma;
            data[i + 2] = luma;
          }
          ctx.putImageData(imageData, 0, 0);
        } catch {
          // ignore security canvas error if any
        }
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve('');
      img.src = URL.createObjectURL(blob);
    });
  } catch {
    return null;
  }
};

const resolveESignImage = async (eSignUrlOrPath?: string | null): Promise<string | null> => {
  if (!eSignUrlOrPath) return null;
  const trimmed = eSignUrlOrPath.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  return await fetchImageAsBase64(trimmed);
};

const prefetchESignMap = async (): Promise<Record<string, string | null>> => {
  const cache: Record<string, string | null> = {};
  try {
    const { data: users } = await supabase
      .from('user_accounts')
      .select('id, email, full_name, e_sign_url');

    if (users && Array.isArray(users)) {
      for (const u of users) {
        let sign = u.e_sign_url ? await resolveESignImage(u.e_sign_url) : null;
        if (!sign && u.email) {
          const fallback = E_SIGN_MAP[u.email.toLowerCase().trim()];
          if (fallback) sign = await fetchImageAsBase64(fallback);
        }

        if (sign) {
          if (u.id) cache[String(u.id).toLowerCase().trim()] = sign;
          if (u.email) cache[u.email.toLowerCase().trim()] = sign;
          if (u.full_name) cache[u.full_name.toLowerCase().trim()] = sign;
        }
      }
    }
  } catch (err) {
    console.error('Error prefetching e-signs:', err);
  }
  return cache;
};

const getSign = (
  eSignMap: Record<string, string | null>,
  userId?: string,
  userName?: string
): string | null => {
  if (userId) {
    const key = String(userId).toLowerCase().trim();
    if (eSignMap[key]) return eSignMap[key];
  }
  if (userName) {
    const key = userName.toLowerCase().trim();
    if (eSignMap[key]) return eSignMap[key];
    if (E_SIGN_MAP[key]) return E_SIGN_MAP[key] || null;
  }
  return null;
};

const formatCardDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const d = date.getDate();
    const m = date.getMonth() + 1;
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  } catch {
    return dateStr;
  }
};

const formatRupiahWithDot = (num: number): string => {
  return `Rp. ${new Intl.NumberFormat('id-ID').format(Math.round(num || 0))}`;
};


export const generateExpenseApprovalPdf = async (dataList: ExpenseApprovalData[]) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const pageW = 210;
  const pageH = 297;
  const cellW = 105;
  const cellH = 99;

  let logoBase64 = await fetchGrayscaleLogoAsBase64('/image/logo.png');
  if (!logoBase64) {
    logoBase64 = await loadLogoBase64();
  }

  const eSignMap = await prefetchESignMap();

  const drawPageCutGuides = (targetDoc: jsPDF) => {
    targetDoc.setDrawColor(180, 180, 180);
    targetDoc.setLineWidth(0.25);
    targetDoc.setLineDashPattern([2, 2], 0);

    targetDoc.line(cellW, 0, cellW, pageH);
    targetDoc.line(0, cellH, pageW, cellH);
    targetDoc.line(0, cellH * 2, pageW, cellH * 2);

    targetDoc.setLineDashPattern([], 0);
    targetDoc.setFont('helvetica', 'normal');
    targetDoc.setFontSize(5);
    targetDoc.setTextColor(150, 150, 150);

    targetDoc.text('✂', cellW, 3, { align: 'center' });
    targetDoc.text('✂', cellW, cellH + 3, { align: 'center' });
    targetDoc.text('✂', cellW, cellH * 2 + 3, { align: 'center' });

    targetDoc.setDrawColor(0, 0, 0);
    targetDoc.setTextColor(0, 0, 0);
  };

  const drawCard = (data: ExpenseApprovalData, index: number, offsetX: number, offsetY: number) => {
    // 1. Dashed cell frame
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.setLineWidth(0.2);
    doc.rect(offsetX, offsetY, cellW, cellH);
    doc.setDrawColor(0, 0, 0);
    doc.setLineDashPattern([], 0);

    // 2. Logo + company header
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', offsetX + 5, offsetY + 4, 7.5, 7.5, undefined, 'FAST');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('THE GESIT COMPANIES', offsetX + 14, offsetY + 8.5);
    } else {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text('THE GESIT COMPANIES', offsetX + 5, offsetY + 8.5);
    }

    // 3. Title: "Expenses Approval" (Centered & Underlined)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    const title = 'Expenses Approval';
    const titleWidth = doc.getTextWidth(title);
    const titleX = offsetX + (cellW - titleWidth) / 2;
    doc.text(title, titleX, offsetY + 15.5);
    doc.setLineWidth(0.4);
    doc.line(titleX, offsetY + 16.5, titleX + titleWidth, offsetY + 16.5);

    // 4. Metadata Fields (2 columns)
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setLineWidth(0.2);

    const col1X = offsetX + 5;
    const col1ColonX = offsetX + 22;
    const col1ValX = offsetX + 24;
    const col1EndX = offsetX + 51;

    const col2X = offsetX + 54;
    const col2ColonX = offsetX + 66;
    const col2ValX = offsetX + 68;
    const col2EndX = offsetX + 100;

    const drawFieldLine = (
      label: string,
      val: string,
      lX: number,
      cX: number,
      vX: number,
      eX: number,
      yPos: number
    ) => {
      doc.text(label, lX, yPos);
      doc.text(':', cX, yPos);
      const split = doc.splitTextToSize(val || '', eX - vX);
      doc.text(split[0] || '', vX, yPos);
      doc.line(vX, yPos + 0.9, eX, yPos + 0.9);
    };

    // Row 1: Company & Dept.
    drawFieldLine('Company', data.company || '', col1X, col1ColonX, col1ValX, col1EndX, offsetY + 22);
    drawFieldLine('Dept.', data.department || '', col2X, col2ColonX, col2ValX, col2EndX, offsetY + 22);

    // Row 2: Project & Paid to
    drawFieldLine('Project', data.project_name || '', col1X, col1ColonX, col1ValX, col1EndX, offsetY + 29);
    drawFieldLine('Paid to', data.paid_to || 'Finance & Accounting', col2X, col2ColonX, col2ValX, col2EndX, offsetY + 29);

    // Row 3: Date & Note (Note = "Penyelesaian Cash Advance")
    drawFieldLine('Date', formatCardDate(data.request_date), col1X, col1ColonX, col1ValX, col1EndX, offsetY + 36);
    drawFieldLine('Note', 'Penyelesaian Cash Advance', col2X, col2ColonX, col2ValX, col2EndX, offsetY + 36);

    // Full-width description row (6mm gap after date row)
    const rawDesc = (data.items_description || data.project_name || '')
      .replace(/:\s*$/, '').trim();
    if (rawDesc) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const labelDesc = 'Pembelian';
      const labelDescW = doc.getTextWidth(labelDesc + ' : ');
      doc.text(labelDesc + ' : ', col1X, offsetY + 43);
      // Description lines: italic
      doc.setFont('helvetica', 'italic');
      const descAvailW = (offsetX + 100) - col1X - labelDescW;
      const descLines = doc.splitTextToSize(rawDesc, descAvailW);
      doc.text(descLines[0] || '', col1X + labelDescW, offsetY + 43);
      if (descLines[1]) {
        doc.text(descLines[1], col1X, offsetY + 47);
      }
    }


    // 5. Signature Box (Left half, starts at +55)
    const boxX = offsetX + 5;
    const boxY = offsetY + 55;
    const boxW = 46;
    const boxH = 28;

    doc.setLineWidth(0.3);
    doc.rect(boxX, boxY, boxW, boxH);
    doc.line(boxX + boxW / 2, boxY, boxX + boxW / 2, boxY + boxH);
    doc.line(boxX, boxY + 6, boxX + boxW, boxY + 6);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text('Prepared by', boxX + boxW / 4, boxY + 4.5, { align: 'center' });
    doc.text('Approved by', boxX + (boxW * 3) / 4, boxY + 4.5, { align: 'center' });

    // 6. Cash Advance Settlement (Right half, same Y as box)
    const rX  = offsetX + 54;
    const rEX = offsetX + 100;
    const rY  = offsetY + 55;

    const actual = data.actual_expense !== undefined ? data.actual_expense : (data.total_amount || 0);
    const ca     = data.cash_advance_amount !== undefined ? data.cash_advance_amount : (data.total_amount || actual);
    const refund = data.refund_amount !== undefined ? data.refund_amount : (ca - actual);

    // CA amount (large)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(formatRupiahWithDot(ca), rEX, rY + 9, { align: 'right' });
    doc.setLineWidth(0.3);
    doc.line(rX, rY + 11, rEX, rY + 11);

    // CA formula
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const formula = `CA  :  ${formatRupiahWithDot(ca)}  -  ${formatRupiahWithDot(actual)}`;
    doc.text(formula, rEX, rY + 18, { align: 'right' });
    doc.setLineWidth(0.2);
    doc.line(rX, rY + 19.5, rEX, rY + 19.5);

    // Kembali / Kurang Bayar
    const refundLabel = refund >= 0 ? 'Kembali' : 'Kurang Bayar';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    const boxBottomY = boxY + boxH;
    doc.text(`${refundLabel} : ${formatRupiahWithDot(Math.abs(refund))}`, rEX, boxBottomY - 1.5, { align: 'right' });
    doc.setLineWidth(0.5);
    doc.line(rX, boxBottomY, rEX, boxBottomY);
  };

  for (let i = 0; i < dataList.length; i++) {
    const slotIdx = i % 6;
    if (i > 0 && slotIdx === 0) {
      doc.addPage();
    }
    const col = slotIdx % 2;
    const row = Math.floor(slotIdx / 2);
    const offsetX = col * cellW;
    const offsetY = row * cellH;
    drawCard(dataList[i], i, offsetX, offsetY);
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawPageCutGuides(doc);
  }

  const fileName =
    dataList.length === 1
      ? `${dataList[0].expense_number || '000'}_Expenses_Approval.pdf`
      : `Batch_${dataList.length}_Expenses_Approval.pdf`;
  doc.save(fileName);
};

export async function exportExpenseApprovalPDF(
  req: PurchaseRequisition,
  formData: ExpenseApprovalFormData
) {
  const cleanId = String(req.id || '000').padStart(4, '0');
  const actual = formData.actualExpense !== undefined ? formData.actualExpense : (req.grandTotal || 0);
  const ca = formData.cashAdvanceAmount !== undefined ? formData.cashAdvanceAmount : (req.grandTotal || 0);
  const refund = ca - actual;

  const requestedItemsDesc = (req.requestedItems || []).map((i) => i.description).filter(Boolean).join(', ');
  const itRecommendationsDesc = (req.itRecommendations || []).map((i) => i.description).filter(Boolean).join(', ');

  const dataItem: ExpenseApprovalData = {
    expense_number: `EA-${cleanId}`,
    company: formData.companyName || 'PT Gesit Perkasa',
    department: formData.costCenter || req.department || 'IT',
    project_name: formData.projectName || requestedItemsDesc || itRecommendationsDesc || '',
    request_date: formData.requestDate || req.requestDate || '',
    paid_to: formData.paidTo || 'Finance & Accounting',
    note: ' ',
    total_amount: actual,
    actual_expense: actual,
    cash_advance_amount: ca,
    refund_amount: refund,
    items_description: itRecommendationsDesc || requestedItemsDesc || formData.projectName || '',
    prepared_by_name: '',
    prepared_by_id: '',
    approved_by_name: '',
    approved_by_id: '',
    status: req.status || 'Approved',
  };

  await generateExpenseApprovalPdf([dataItem]);
}
