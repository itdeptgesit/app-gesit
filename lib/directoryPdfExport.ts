import jsPDF from 'jspdf';
import { PhoneExtension } from '../types';
import cabinFonts from './cabinFonts.json';

export function exportDirectoryPDF(extensions: PhoneExtension[]) {
  // A4 Landscape is 297mm x 210mm
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  // Register modern Google Font 'Cabin' from static Base64 assets
  doc.addFileToVFS('Cabin-Regular.ttf', cabinFonts.regular);
  doc.addFont('Cabin-Regular.ttf', 'Cabin', 'normal');

  doc.addFileToVFS('Cabin-Bold.ttf', cabinFonts.bold);
  doc.addFont('Cabin-Bold.ttf', 'Cabin', 'bold');

  doc.addFileToVFS('Cabin-Italic.ttf', cabinFonts.italic);
  doc.addFont('Cabin-Italic.ttf', 'Cabin', 'italic');

  const pageW = 297;
  const pageH = 210;
  const midX = 148.5;

  const titleCase = (s: string) =>
    s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());

  const getDeptLike = (floor: number, partial: string): PhoneExtension[] =>
    extensions
      .filter((e) => Number(e.floor) === floor && e.dept.toLowerCase().includes(partial.toLowerCase()))
      .sort((a, b) => a.id - b.id);

  const getDept = (floor: number, dept: string): PhoneExtension[] =>
    extensions
      .filter((e) => Number(e.floor) === floor && e.dept.toLowerCase() === dept.toLowerCase())
      .sort((a, b) => a.id - b.id);

  // Spacious row breathing room
  const ROW_H = 2.5;
  const HDR_H = 3.2;

  // ── Draw cutting guide line down the middle ──
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.25);
  const dashLength = 1.5;
  const gapLength = 1.5;
  for (let y = 4; y < pageH - 4; y += dashLength + gapLength) {
    doc.line(midX, y, midX, Math.min(y + dashLength, pageH - 4));
  }

  // ── Draw a single bordered row (for commissioners & assistants) ──
  const drawRow = (name: string, ext: string, x: number, y: number, w: number, dashed = false) => {
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.15);
    if (dashed) {
      const dl = 1.0, gl = 0.6;
      for (let dx = x; dx < x + w; dx += dl + gl) doc.line(dx, y, Math.min(dx + dl, x + w), y);
      for (let dx = x; dx < x + w; dx += dl + gl) doc.line(dx, y + ROW_H, Math.min(dx + dl, x + w), y + ROW_H);
      for (let dy = y; dy < y + ROW_H; dy += dl + gl) doc.line(x, dy, x, Math.min(dy + dl, y + ROW_H));
      for (let dy = y; dy < y + ROW_H; dy += dl + gl) doc.line(x + w, dy, x + w, Math.min(dy + dl, y + ROW_H));
    } else {
      doc.rect(x, y, w, ROW_H);
    }
    doc.setFont('Cabin', 'bold');
    doc.setFontSize(5.2);
    doc.setTextColor(30, 30, 30);
    doc.text(name, x + 1.2, y + 1.8, { maxWidth: w - 8 });
    doc.setFont('Cabin', 'bold');
    doc.text(ext, x + w - 1.2, y + 1.8, { align: 'right' });
  };

  // ── Draw department block ──
  const drawDeptBlock = (
    label: string, items: PhoneExtension[], x: number, y: number, w: number, dashed = false
  ): { totalH: number; boxCenterY: number } => {
    if (items.length === 0) return { totalH: 0, boxCenterY: 0 };

    const hasLabel = label !== "";

    if (hasLabel) {
      doc.setFont('Cabin', 'normal');
      doc.setFontSize(5.8);
      doc.setTextColor(20, 20, 20);
      const tw = doc.getTextWidth(label);
      const tx = x + (w - tw) / 2;
      doc.text(label, tx, y + 2.0);
      doc.setDrawColor(20, 20, 20);
      doc.setLineWidth(0.20);
      doc.line(tx, y + 2.4, tx + tw, y + 2.4);
    }

    const boxY = hasLabel ? (y + 3.2) : y;
    const boxH = items.length * ROW_H + 1.0;

    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.15);
    
    if (dashed) {
      const dl = 1.0, gl = 0.6;
      for (let dx = x; dx < x + w; dx += dl + gl) {
        doc.line(dx, boxY, Math.min(dx + dl, x + w), boxY);
        doc.line(dx, boxY + boxH, Math.min(dx + dl, x + w), boxY + boxH);
      }
      for (let dy = boxY; dy < boxY + boxH; dy += dl + gl) {
        doc.line(x, dy, x, Math.min(dy + dl, boxY + boxH));
        doc.line(x + w, dy, x + w, Math.min(dy + dl, boxY + boxH));
      }
    } else {
      doc.rect(x, boxY, w, boxH);
    }

    items.forEach((item, idx) => {
      const ry = boxY + 0.5 + idx * ROW_H;
      const name = titleCase(item.name);
      let roleStr = item.role ? ` (${item.role})` : '';
      if (name.toLowerCase() === 'widya' && !roleStr) {
        roleStr = ' (receptionist)';
      }
      
      doc.setFont('Cabin', 'bold');
      doc.setFontSize(5.0);
      doc.setTextColor(30, 30, 30);
      doc.text(name + roleStr, x + 1.2, ry + 1.8, { maxWidth: w - 8 });
      
      doc.setFont('Cabin', 'bold');
      doc.text(item.ext, x + w - 1.2, ry + 1.8, { align: 'right' });
    });

    return {
      totalH: (hasLabel ? 3.2 : 0) + boxH,
      boxCenterY: boxY + boxH / 2
    };
  };

  const drawCopy = (startX: number) => {
    // Increased side margins (M = 15) to make the columns narrower, tighter, and beautifully proportioned
    const M = 15;
    const usableW = midX - M * 2;
    const colGap = 2.5;
    const colW = (usableW - colGap * 2) / 3;
    const colXs = [startX + M, startX + M + colW + colGap, startX + M + (colW + colGap) * 2];

    // Title Block
    doc.setFontSize(13);
    doc.setFont('Cabin', 'bold');
    doc.setTextColor(20, 20, 20);
    doc.text('TGC Internal Directory', startX + midX / 2, 9, { align: 'center' });

    doc.setFontSize(5.2);
    doc.setFont('Cabin', 'normal');
    doc.setTextColor(40, 40, 40);
    doc.text('The City Tower 27th Floor', startX + M, 13);
    doc.text('Jl. M.H. Thamrin no. 81, Jakarta - 10310', startX + M, 15.2);
    doc.text('021 3101601 (Hunting)', startX + M, 17.4);

    const now = new Date();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    doc.setTextColor(40, 40, 40);
    doc.setFont('Cabin', 'italic');
    doc.text(`Last update: ${months[now.getMonth()]} ${now.getFullYear()}`, startX + midX - M, 13, { align: 'right' });

    // Commissioners Area
    const boardX = colXs[1];
    const boardW = colW;
    const paX = colXs[2];
    const paW = colW;
    let boardY = 20.0;

    doc.setFont('Cabin', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(20, 20, 20);
    const bhText = 'Board of Commissioners';
    doc.text(bhText, boardX + boardW / 2, boardY, { align: 'center' });
    boardY += 1.2;

    const boardItems = getDeptLike(27, 'Board of Com');
    const paItems = getDeptLike(27, 'PA')
      .concat(getDeptLike(27, 'Secretary'))
      .filter(e => !e.name.toLowerCase().includes('artika'));

    const findItem = (list: PhoneExtension[], name: string) =>
      list.find((e) => e.name.toLowerCase().startsWith(name.toLowerCase()));

    // Draw central vertical organizational trunk line inside Board column
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.15);

    let bRow = boardY;

    // MSA
    const msa = findItem(boardItems, 'MSA');
    const msaBed = findItem(boardItems, 'MSA Bed');
    const ety = findItem(paItems, 'Ety');
    if (msa) { drawRow(msa.name, msa.ext, boardX, bRow, boardW); bRow += ROW_H; }
    if (msaBed) { drawRow(msaBed.name, msaBed.ext, boardX, bRow, boardW); bRow += ROW_H; }
    if (ety) drawRow(titleCase(ety.name), ety.ext, paX, boardY, paW, true);

    // Draw connecting line between MSA Bed Room and JSB
    doc.line(boardX + boardW / 2, bRow, boardX + boardW / 2, bRow + 0.6);
    bRow += 0.6;

    // JSB
    const jsb = findItem(boardItems, 'JSB');
    const kiki = findItem(paItems, 'Kiki') || findItem(paItems, 'Intan');
    if (jsb) drawRow(jsb.name, jsb.ext, boardX, bRow, boardW);
    if (kiki) drawRow(titleCase(kiki.name), kiki.ext, paX, bRow, paW, true);
    
    // Draw connecting line between JSB and JSC
    doc.line(boardX + boardW / 2, bRow + ROW_H, boardX + boardW / 2, bRow + ROW_H + 0.6);
    bRow += ROW_H + 0.6;

    // JSC
    const jsc = findItem(boardItems, 'JSC');
    const dinny = findItem(paItems, 'Dinny');
    if (jsc) drawRow(jsc.name, jsc.ext, boardX, bRow, boardW);
    if (dinny) drawRow(titleCase(dinny.name), dinny.ext, paX, bRow, paW, true);
    
    // Draw connecting line between JSC and MSB/MSC/MSD
    doc.line(boardX + boardW / 2, bRow + ROW_H, boardX + boardW / 2, bRow + ROW_H + 0.6);
    bRow += ROW_H + 0.6;

    // MSB, MSC, MSD
    const msb = findItem(boardItems, 'MSB');
    const msc = findItem(boardItems, 'MSC');
    const msd = findItem(boardItems, 'MSD');
    const asma = findItem(paItems, 'Asma');
    const msbY = bRow;
    
    // MSB/MSC/MSD outer bordered box
    doc.rect(boardX, bRow, boardW, ROW_H * 3);
    if (msb) {
      doc.setFont('Cabin', 'bold'); doc.setFontSize(5.2); doc.setTextColor(30, 30, 30);
      doc.text(msb.name, boardX + 1.2, bRow + 1.8);
      doc.setFont('Cabin', 'bold'); doc.text(msb.ext, boardX + boardW - 1.2, bRow + 1.8, { align: 'right' });
      bRow += ROW_H;
    }
    if (msc) {
      doc.setFont('Cabin', 'bold'); doc.setFontSize(5.2); doc.setTextColor(30, 30, 30);
      doc.text(msc.name, boardX + 1.2, bRow + 1.8);
      doc.setFont('Cabin', 'bold'); doc.text(msc.ext, boardX + boardW - 1.2, bRow + 1.8, { align: 'right' });
      bRow += ROW_H;
    }
    if (msd) {
      doc.setFont('Cabin', 'bold'); doc.setFontSize(5.2); doc.setTextColor(30, 30, 30);
      doc.text(msd.name, boardX + 1.2, bRow + 1.8);
      doc.setFont('Cabin', 'bold'); doc.text(msd.ext, boardX + boardW - 1.2, bRow + 1.8, { align: 'right' });
      bRow += ROW_H;
    }
    // Centered alignment for Asma (aligned with MSC - 2nd row)
    if (asma) drawRow(titleCase(asma.name), asma.ext, paX, msbY + ROW_H, paW, true);

    // Draw connecting line between MSB/MSC/MSD and Deputy CEO header
    doc.line(boardX + boardW / 2, bRow, boardX + boardW / 2, bRow + 0.4);
    bRow += 0.4;

    // Deputy CEO
    doc.setFont('Cabin', 'normal'); doc.setFontSize(5.8); doc.setTextColor(20, 20, 20);
    const depText = 'Deputy CEO & President';
    doc.text(depText, boardX + boardW / 2, bRow + 1.6, { align: 'center' });
    const dtw = doc.getTextWidth(depText);
    doc.setLineWidth(0.20);
    doc.line(boardX + (boardW - dtw) / 2, bRow + 2.0, boardX + (boardW + dtw) / 2, bRow + 2.0);
    
    // Connecting line from header to box
    doc.setLineWidth(0.15);
    doc.line(boardX + boardW / 2, bRow + 2.0, boardX + boardW / 2, bRow + 2.4);
    bRow += 2.4;

    const jones = findItem(getDeptLike(27, 'Deputy CEO'), 'Jones');
    const dwi = findItem(paItems, 'Dwi');
    if (jones) drawRow(titleCase(jones.name), jones.ext, boardX, bRow, boardW);
    if (dwi) drawRow(titleCase(dwi.name), dwi.ext, paX, bRow, paW, true);
    bRow += ROW_H;

    // Dialing Instructions (Left column alongside board)
    let iy = 21.0;
    const drawInstr = (label: string, code: string) => {
      doc.setFont('Cabin', 'bold'); doc.setFontSize(4.5); doc.setTextColor(40, 40, 40);
      doc.text(label, startX + M, iy);
      if (code) { doc.setFont('Cabin', 'normal'); doc.text(code, startX + M, iy + 2.0); }
      iy += code ? 4.5 : 2.5;
    };
    drawInstr('Pick up Incoming Call: #70', '');
    drawInstr('How to make ext call Lt.26', '## + Ext lt. 26');
    drawInstr('How to make outgoing call', '* + PIN + 9 + Phone No.');
    drawInstr('How to make international call', '* + PIN + 9 + 01017 + Country + Phone No.');

    // ── Floor 27 Columns ──
    const deptStartY = bRow + 0.5;
    let leftY = deptStartY;
    let rightY = deptStartY;
    const gap = 1.4;

    // Left Column Floor 27 (Perfectly balanced with 20 items)
    const resCA = drawDeptBlock('Corporate Affair', getDeptLike(27, 'Corporate Affair'), colXs[0], leftY, colW);
    leftY += resCA.totalH + gap;
    
    const faList = getDept(27, 'Finance & Accounting').filter(e => !e.name.toLowerCase().includes('lisi'));
    const resFA = drawDeptBlock('Finance & Accounting', faList, colXs[0], leftY, colW);
    leftY += resFA.totalH + gap;
    
    const rawPropFin = getDeptLike(27, 'Property')
      .concat(getDeptLike(27, 'Business Development'))
      .concat(getDeptLike(27, 'Financial Investment'));
      
    // Deduplicate by extension ID
    const uniquePropFin = rawPropFin.filter(
      (value, index, self) => self.findIndex((t) => t.id === value.id) === index
    );
      
    const artika = extensions.find(e => Number(e.floor) === 27 && e.name.toLowerCase().includes('artika'));
    if (artika && !uniquePropFin.some(e => e.id === artika.id)) {
      uniquePropFin.push(artika);
    }

    // Order Jave first, followed by Artika (Sec. to Jave), then others sorted by ID
    const javeItem = uniquePropFin.find(e => e.name.toLowerCase().includes('jave'));
    const artikaItem = uniquePropFin.find(e => e.name.toLowerCase().includes('artika'));
    const others = uniquePropFin.filter(e => !e.name.toLowerCase().includes('jave') && !e.name.toLowerCase().includes('artika'));
    others.sort((a, b) => a.id - b.id);

    const propFin: PhoneExtension[] = [];
    if (javeItem) propFin.push(javeItem);
    if (artikaItem) propFin.push(artikaItem);
    propFin.push(...others);

    const resProp = drawDeptBlock('Property & Financial Investment', propFin, colXs[0], leftY, colW);
    leftY += resProp.totalH + gap;

    // Draw Lisi under Property block in her own bordered block without department name
    const lisiList = extensions.filter(e => Number(e.floor) === 27 && e.name.toLowerCase().includes('lisi'));
    const resLisi = drawDeptBlock("", lisiList, colXs[0], leftY, colW);
    leftY += resLisi.totalH + gap;

    // Right Column Floor 27 (Perfectly balanced with 20 items)
    const resCS = drawDeptBlock('Corporate Secretary', getDeptLike(27, 'Corporate Secretary'), colXs[2], rightY, colW);
    rightY += resCS.totalH + gap;
    
    const resHR = drawDeptBlock('HR & Logistic', getDeptLike(27, 'HR & Logistic'), colXs[2], rightY, colW);
    rightY += resHR.totalH + gap;
    
    const resTrading = drawDeptBlock('Trading', getDept(27, 'Trading'), colXs[2], rightY, colW);
    rightY += resTrading.totalH + gap;

    const resFound = drawDeptBlock('Gesit Foundation', getDeptLike(27, 'Gesit Foundation'), colXs[2], rightY, colW);
    rightY += resFound.totalH + gap;

    // ── Floor 27 Tree Lines Implementation ──
    const trunkCenter = startX + midX / 2;
    // The trunk line goes down to the lowest branch junction
    const bottomBranchY = Math.max(resProp.boxCenterY, resTrading.boxCenterY);
    
    // Draw vertical organizational trunk line down the center column
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.15);
    doc.line(trunkCenter, bRow, trunkCenter, bottomBranchY);

    // Pair 1: Corporate Affair & Corporate Secretary (drawn precisely at each box center)
    doc.line(trunkCenter, resCA.boxCenterY, colXs[0] + colW, resCA.boxCenterY);
    doc.line(trunkCenter, resCS.boxCenterY, colXs[2], resCS.boxCenterY);

    // Pair 2: Finance & Accounting & HR & Logistic (drawn precisely at each box center)
    doc.line(trunkCenter, resFA.boxCenterY, colXs[0] + colW, resFA.boxCenterY);
    doc.line(trunkCenter, resHR.boxCenterY, colXs[2], resHR.boxCenterY);

    // Pair 3: Property & Financial Investment & Trading (drawn precisely at each box center)
    doc.line(trunkCenter, resProp.boxCenterY, colXs[0] + colW, resProp.boxCenterY);
    doc.line(trunkCenter, resTrading.boxCenterY, colXs[2], resTrading.boxCenterY);

    // ── Unified Receptionist & Common Areas block (Centered, NO header text, NO tree lines!) ──
    const recep = getDeptLike(27, 'Receptionist');
    const common = getDeptLike(27, 'Common Area');
    const unifiedRecepCommon = recep.concat(common);
    
    const recepY = bottomBranchY + 5.0;
    const resRecepCommon = drawDeptBlock("", unifiedRecepCommon, colXs[1], recepY, colW, true);

    // ── Floor 26 Banner ──
    const floor26Y = Math.max(leftY, rightY, recepY + resRecepCommon.totalH) + 1.5;
    doc.setFillColor(30, 30, 30);
    doc.rect(startX + M, floor26Y, usableW, 3.5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(6.8);
    doc.setFont('Cabin', 'bold');
    doc.text('Gesit Natural Resources the 26th Floor', startX + midX / 2, floor26Y + 2.4, { align: 'center' });

    // ── Floor 26 Columns (Engineered for absolute height symmetry!) ──
    const y26Start = floor26Y + 4.8;
    let l26 = y26Start, c26 = y26Start, r26 = y26Start;

    // LEFT COLUMN (Floor 26) - Total 13 items
    const resLegal26 = drawDeptBlock('Legal & Compliance', getDeptLike(26, 'Legal'), colXs[0], l26, colW);
    l26 += resLegal26.totalH + gap;
    
    const hrgaRaw = getDeptLike(26, 'HRGA');
    const adityaItem = hrgaRaw.find(e => e.name.toLowerCase().includes('adit') || e.name.toLowerCase().includes('adty') || e.name.toLowerCase().includes('adya'));
    const hrgaOthers = hrgaRaw.filter(e => e.id !== (adityaItem ? adityaItem.id : -1));
    hrgaOthers.sort((a, b) => a.id - b.id);
    const hrga26: PhoneExtension[] = [];
    if (adityaItem) hrga26.push(adityaItem);
    hrga26.push(...hrgaOthers);

    const resHRGA26 = drawDeptBlock('HRGA', hrga26, colXs[0], l26, colW);
    l26 += resHRGA26.totalH + gap;
    
    const bu = getDeptLike(26, 'Bussines').concat(getDeptLike(26, 'Business Unit'));
    const resBU26 = bu.length > 0 ? drawDeptBlock('Business Unit', bu, colXs[0], l26, colW) : { totalH: 0, boxCenterY: 0 };
    if (bu.length > 0) l26 += resBU26.totalH + gap;
    
    const resGov26 = drawDeptBlock('Government Relation', getDeptLike(26, 'Government'), colXs[0], l26, colW);
    l26 += resGov26.totalH + gap;

    const resProc26 = drawDeptBlock('Procurement', getDeptLike(26, 'Procurement'), colXs[0], l26, colW);
    l26 += resProc26.totalH + gap;

    // CENTER COLUMN (Floor 26) - Total 11 items
    const resDep26 = drawDeptBlock('Deputy Head', getDeptLike(26, 'Deputy Head'), colXs[1], c26, colW);
    c26 += resDep26.totalH > 0 ? resDep26.totalH + gap : 0;
    
    const resVP26 = drawDeptBlock('Vice President', getDeptLike(26, 'Vice President'), colXs[1], c26, colW);
    c26 += resVP26.totalH + gap;
    
    const resOM26 = drawDeptBlock('Office Management', getDeptLike(26, 'Office Management'), colXs[1], c26, colW);
    c26 += resOM26.totalH + gap;
    
    const resIT26 = drawDeptBlock('Information Technology', getDeptLike(26, 'Information Technology'), colXs[1], c26, colW);
    c26 += resIT26.totalH + gap;
    
    const resEng26 = drawDeptBlock('Engineering', getDeptLike(26, 'Engineering'), colXs[1], c26, colW);
    c26 += resEng26.totalH + gap;
    
    const fd = getDeptLike(26, 'Front Desk').concat(getDeptLike(26, 'Common Area'));
    const fdY = c26 + 1.5; // Lower it slightly to create a beautiful breathing space
    const resFD26 = fd.length > 0 ? drawDeptBlock("", fd, colXs[1], fdY, colW, true) : { totalH: 0, boxCenterY: 0 };
    if (fd.length > 0) c26 = fdY + resFD26.totalH + gap;

    // RIGHT COLUMN (Floor 26) - Total 17 items (Perfect height balance)
    const permitRaw = getDeptLike(26, 'Permit');
    const rahmatItem = permitRaw.find(e => e.name.toLowerCase().includes('rahmat'));
    const permitOthers = permitRaw.filter(e => e.id !== (rahmatItem ? rahmatItem.id : -1));
    permitOthers.sort((a, b) => a.id - b.id);
    const permit26: PhoneExtension[] = [];
    if (rahmatItem) permit26.push(rahmatItem);
    permit26.push(...permitOthers);

    const resPermit26 = drawDeptBlock('Permit & License', permit26, colXs[2], r26, colW);
    r26 += resPermit26.totalH + gap;

    const resFA26 = drawDeptBlock('Finance & Accounting', getDept(26, 'Finance & Accounting'), colXs[2], r26, colW);
    r26 += resFA26.totalH + gap;
    
    const resSales26 = drawDeptBlock('Sales / Marketing', getDeptLike(26, 'Sales'), colXs[2], r26, colW);
    r26 += resSales26.totalH > 0 ? resSales26.totalH + gap : 0;

    // 26th Dialing Instructions placed beautifully under Sales / Marketing
    r26 += 2.0;
    doc.setFontSize(4.5); doc.setTextColor(40, 40, 40);
    doc.setFont('Cabin', 'bold');
    doc.text('How to make outgoing call', colXs[2], r26);
    doc.setFont('Cabin', 'normal');
    doc.text('81** + PIN + Phone No.', colXs[2], r26 + 2.0);
    doc.setFont('Cabin', 'bold');
    doc.text('How to make ext call Lt.27', colXs[2], r26 + 4.5);
    doc.setFont('Cabin', 'normal');
    doc.text('88** + PIN + Ext lt. 27', colXs[2], r26 + 6.5);


    // Page Footer
    doc.setFontSize(4.2);
    doc.setFont('Cabin', 'normal');
    doc.setTextColor(150, 150, 150);
    doc.text('GESIT Internal Directory - Confidential', startX + M, pageH - 4);
    doc.text(`Generated: ${now.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, startX + midX - M, pageH - 4, { align: 'right' });
  };

  // Draw two identical copies side-by-side
  drawCopy(0);
  drawCopy(midX);

  const now = new Date();
  doc.save(`GESIT-Directory-${now.toISOString().split('T')[0]}.pdf`);
}
