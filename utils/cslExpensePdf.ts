import { jsPDF } from 'jspdf';
import { supabase } from '../lib/supabaseClient';

export interface ExpenseApprovalData {
  expense_number: string;
  company: string;
  department: string;
  project_name: string;
  request_date: string;
  paid_to: string;
  note: string;
  total_amount: number;
  invoice_number: string;
  bank_name: string;
  account_number: string;
  account_name: string;
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
  } catch { return null; }
};

const fetchLogoAsBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
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
        // Grayscale
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          const luma = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          data[i] = luma; data[i + 1] = luma; data[i + 2] = luma;
        }
        ctx.putImageData(imageData, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve('');
      img.src = URL.createObjectURL(blob);
    });
  } catch { return null; }
};

/**
 * Resolves an e-sign image (returns a PNG data URL or null).
 * Accepts raw base64 data URL, remote URL, or local path.
 */
const resolveESignImage = async (eSignUrlOrPath?: string | null): Promise<string | null> => {
  if (!eSignUrlOrPath) return null;
  const trimmed = eSignUrlOrPath.trim();
  if (!trimmed) return null;

  // If already a base64 data URL, return directly
  if (trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  // Otherwise fetch and convert to base64
  return await fetchImageAsBase64(trimmed);
};

/**
 * Fetch all e-signatures for users from user_accounts table, matching by ID, full_name, and email.
 */
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
          if (u.id) cache[u.id.toLowerCase().trim()] = sign;
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

export const generateExpenseApprovalPdf = async (dataList: ExpenseApprovalData[]) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  const logoBase64 = await fetchLogoAsBase64('/image/logo.png');

  // Pre-fetch all e-signatures dynamically from user_accounts
  const eSignMap = await prefetchESignMap();

  const getSign = (userId?: string, userName?: string): string | null => {
    if (userId && eSignMap[userId.toLowerCase().trim()]) {
      return eSignMap[userId.toLowerCase().trim()];
    }
    if (userName && eSignMap[userName.toLowerCase().trim()]) {
      return eSignMap[userName.toLowerCase().trim()];
    }
    if (userName && E_SIGN_MAP[userName.toLowerCase().trim()]) {
      return eSignMap[userName.toLowerCase().trim()] || null;
    }
    return null;
  };

  const cellW = 105;
  const cellH = 99;

  dataList.forEach((data, index) => {
    if (index > 0 && index % 6 === 0) doc.addPage();

    const pageIndex = index % 6;
    const col = pageIndex % 2;
    const row = Math.floor(pageIndex / 2);
    const offsetX = col * cellW;
    const offsetY = row * cellH;

    // Dashed cell border
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([2, 2], 0);
    doc.setLineWidth(0.2);
    doc.rect(offsetX, offsetY, cellW, cellH);
    doc.setDrawColor(0, 0, 0);
    doc.setLineDashPattern([], 0);

    doc.setFont('helvetica');

    // Logo + header
    if (logoBase64) {
      doc.addImage(logoBase64, 'PNG', offsetX + 5, offsetY + 5, 8, 8, 'gesitLogo', 'FAST');
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('THE GESIT COMPANIES', offsetX + 15, offsetY + 10.5);
    } else {
      doc.setFontSize(10); doc.setFont('helvetica', 'bold');
      doc.text('THE GESIT COMPANIES', offsetX + 5, offsetY + 10.5);
    }

    // Title
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    const title = 'Expenses Approval';
    const titleWidth = doc.getTextWidth(title);
    doc.text(title, offsetX + (cellW - titleWidth) / 2, offsetY + 18);
    doc.setLineWidth(0.5);
    doc.line(offsetX + (cellW - titleWidth) / 2, offsetY + 19, offsetX + (cellW + titleWidth) / 2, offsetY + 19);

    doc.setFontSize(8); doc.setFont('helvetica', 'normal');

    const col1X = offsetX + 4;
    const col1ColonX = offsetX + 20;
    const col1ValX = offsetX + 22;
    const col1EndX = offsetX + 50;
    const col2X = offsetX + 53;
    const col2ColonX = offsetX + 64;
    const col2ValX = offsetX + 66;
    const col2EndX = offsetX + 101;

    doc.setLineWidth(0.2);
    doc.setLineHeightFactor(1.3);
    const lineH = 3.66;

    const drawField = (label: string, value: string, x: number, cX: number, vX: number, eX: number, y: number) => {
      doc.text(label, x, y);
      doc.text(':', cX, y);
      const split = doc.splitTextToSize(value, eX - vX);
      doc.text(split, vX, y);
      const lines = Math.max(1, split.length);
      for (let i = 0; i < lines; i++) doc.line(vX, y + i * lineH + 1.2, eX, y + i * lineH + 1.2);
      return lines;
    };

    let y = offsetY + 28;
    y += Math.max(
      drawField('Company', data.company, col1X, col1ColonX, col1ValX, col1EndX, y),
      drawField('Dept.', data.department, col2X, col2ColonX, col2ValX, col2EndX, y)
    ) * lineH + 3.5;
    y += Math.max(
      drawField('Project Name', data.project_name, col1X, col1ColonX, col1ValX, col1EndX, y),
      drawField('Paid to', data.paid_to, col2X, col2ColonX, col2ValX, col2EndX, y)
    ) * lineH + 3.5;
    const dateStr = data.request_date ? new Date(data.request_date).toLocaleDateString('id-ID') : '';
    y += Math.max(
      drawField('Request Date', dateStr, col1X, col1ColonX, col1ValX, col1EndX, y),
      drawField('Note', data.note || '', col2X, col2ColonX, col2ValX, col2EndX, y)
    ) * lineH + 3.5;

    // ── Signature Box ──
    const boxX = offsetX + 5;
    const boxY = y;
    const boxW = 45;
    const boxH = 26;

    doc.rect(boxX, boxY, boxW, boxH);
    doc.line(boxX + boxW / 2, boxY, boxX + boxW / 2, boxY + boxH);
    doc.line(boxX, boxY + 5, boxX + boxW, boxY + 5);
    doc.line(boxX, boxY + boxH - 5, boxX + boxW, boxY + boxH - 5);

    doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
    doc.text('Prepared by', boxX + (boxW / 4) - doc.getTextWidth('Prepared by') / 2, boxY + 3.5);
    doc.text('Approved by', boxX + (boxW * 0.75) - doc.getTextWidth('Approved by') / 2, boxY + 3.5);

    // E-sign images
    const signAreaY = boxY + 5.5;
    const signAreaH = boxH - 10;
    const halfW = boxW / 2;
    const signImgH = Math.min(signAreaH, 12);
    const signImgW = Math.min(halfW - 4, 18);

    const prepSign = getSign(data.prepared_by_id, data.prepared_by_name);
    if (prepSign) {
      doc.addImage(prepSign, 'PNG',
        boxX + (halfW - signImgW) / 2,
        signAreaY + (signAreaH - signImgH) / 2,
        signImgW, signImgH, `prep_${index}`, 'FAST');
    }

    const isApprovedOrDisbursed = data.status === 'APPROVED' || data.status === 'DISBURSED' || data.status === 'PAID';
    const apprSign = isApprovedOrDisbursed
      ? getSign(data.approved_by_id, data.approved_by_name)
      : (data.approved_by_name ? getSign(data.approved_by_id, data.approved_by_name) : null);
    if (apprSign) {
      doc.addImage(apprSign, 'PNG',
        boxX + halfW + (halfW - signImgW) / 2,
        signAreaY + (signAreaH - signImgH) / 2,
        signImgW, signImgH, `appr_${index}`, 'FAST');
    }

    // Name footers
    doc.setFont('helvetica', 'italic'); doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    const fPrep = data.prepared_by_name || '(Name)';
    const fAppr = data.approved_by_name || '(Name)';
    doc.text(fPrep, boxX + (boxW / 4) - doc.getTextWidth(fPrep) / 2, boxY + boxH - 1.5);
    doc.text(fAppr, boxX + (boxW * 0.75) - doc.getTextWidth(fAppr) / 2, boxY + boxH - 1.5);
    doc.setTextColor(0, 0, 0);

    // ── Right: Payment Details ──
    let rightY = y;
    const rX = offsetX + 53;
    const rEX = offsetX + 100;

    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    const amtTxt = `Total Tagihan Rp ${new Intl.NumberFormat('id-ID').format(data.total_amount)},-`;
    doc.text(amtTxt, rX, rightY + 3);
    doc.line(rX, rightY + 4, rEX, rightY + 4);

    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);

    const drawRight = (label: string, rY: number) => {
      const split = doc.splitTextToSize(label, rEX - rX);
      doc.text(split, rX, rY);
      const lines = Math.max(1, split.length);
      for (let i = 0; i < lines; i++) doc.line(rX, rY + i * lineH + 1.2, rEX, rY + i * lineH + 1.2);
      return lines;
    };

    rightY += 8;
    rightY += drawRight(`No Inv: ${data.invoice_number}`, rightY) * lineH + 3.5;
    rightY += drawRight(`Bank: ${data.bank_name}`, rightY) * lineH + 3.5;
    drawRight(`No Rek: ${data.account_number} an. ${data.account_name}`, rightY);
  });

  // Page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: 'center' });
  }

  const fileName = dataList.length === 1
    ? `${dataList[0].expense_number}_Expenses_Approval.pdf`
    : `Batch_${dataList.length}_Expenses_Approval.pdf`;
  doc.save(fileName);
};