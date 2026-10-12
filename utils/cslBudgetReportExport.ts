import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BudgetExpensesReportData, 
  ReportFilters, 
  formatIdr, 
  formatCurrencyAmount 
} from '@/services/cslBudgetReportService';

/**
 * Generates an Excel report containing Executive Summary, Budget Variance,
 * Category Breakdown, Currency Exposure, and Filtered Transactions.
 */
export const exportBudgetReportToExcel = (
  report: BudgetExpensesReportData,
  filters: ReportFilters,
  fileName: string = 'Budget_Expenses_Report'
) => {
  const workbook = XLSX.utils.book_new();

  // 1. Sheet: Executive Summary & Variance
  const summaryRows = [
    ['BUDGET & EXPENSES REPORT'],
    ['Generated At', report.lastUpdated],
    ['Filter Period', report.periodLabel || 'FY 2026'],
    ['Payee Type', filters.payeeType === 'all' ? 'All Payees' : filters.payeeType],
    ['Company', filters.company === 'all' ? 'All Companies' : filters.company],
    ['Department', filters.department === 'all' ? 'All Departments' : filters.department],
    ['Project', filters.project === 'all' ? 'All Projects' : filters.project],
    ['Status Filter', filters.status === 'all' ? 'All Statuses' : filters.status],
    [],
    ['EXECUTIVE SUMMARY'],
    ['Metric', 'Amount (IDR)', 'Notes'],
    ['Total Budget', report.summary.totalBudget, 'Allocated budget for selected scope'],
    ['Actual Expenses', report.summary.actualExpenses, 'Verified & settled expenditures (Disbursed/Approved/Paid)'],
    ['Budget Remaining', report.summary.budgetRemaining, 'Unspent balance'],
    ['Budget Utilization', `${report.summary.budgetUtilization.toFixed(1)}%`, 'Rate of budget consumed'],
    ['Pending Approval Amount', report.summary.pendingApprovalAmount, `${report.summary.pendingApprovalCount} requests awaiting approval`],
    ['Payment Exposure', report.summary.paymentExposure, 'Approved payments awaiting cash disbursement'],
    [],
    ['BUDGET VS ACTUAL (MONTHLY)'],
    ['Period', 'Budget (IDR)', 'Actual (IDR)', 'Variance (IDR)', 'Utilization (%)'],
    ...report.budgetVsActual.map(b => [
      b.periodLabel,
      b.budget,
      b.actual,
      b.variance,
      `${b.utilization}%`
    ]),
    [],
    ['BUDGET VARIANCE BY PROJECT'],
    ['Project Name', 'Department', 'Budget (IDR)', 'Actual (IDR)', 'Variance (IDR)', 'Utilization (%)', 'Status'],
    ...report.budgetVarianceList.map(p => [
      p.projectName,
      p.department,
      p.budget,
      p.actual,
      p.variance,
      `${p.utilization}%`,
      p.status
    ]),
    [],
    ['EXPENSE BY CATEGORY'],
    ['Category', 'Amount (IDR)', 'Percentage (%)', 'Transaction Count'],
    ...report.expenseByCategory.map(c => [
      c.category,
      c.amount,
      `${c.percentage}%`,
      c.transactionCount
    ]),
    [],
    ['CURRENCY EXPOSURE'],
    ['Currency', 'Original Amount', 'Equivalent IDR', 'Transactions Count', 'Exchange Rate'],
    ...report.currencyExposureList.map(ce => [
      ce.currency,
      ce.originalAmount,
      ce.reportingAmountIdr,
      ce.transactionCount,
      ce.latestRate
    ])
  ];

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 35 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');

  // 2. Sheet: Transactions
  const txnHeader = [
    'Expense No',
    'Invoice No',
    'Voucher No',
    'Request Date',
    'Company',
    'Department',
    'Project',
    'Payee',
    'Payee Type',
    'Payment Location',
    'Payment Method',
    'Description',
    'Category',
    'Currency',
    'Original Amount',
    'Exchange Rate',
    'Reporting Amount (IDR)',
    'Status',
    'Prepared By'
  ];

  const txnRows = report.transactions.map(t => [
    t.expense_number,
    t.invoice_number || '-',
    t.voucher_number || '-',
    t.request_date,
    t.company,
    t.department,
    t.project_name,
    t.paid_to,
    t.payee_type,
    t.payment_location,
    t.payment_method,
    t.payment_description,
    t.category,
    t.currency,
    t.amount,
    t.exchange_rate,
    t.reporting_amount,
    t.status,
    t.prepared_by_name
  ]);

  const txnSheet = XLSX.utils.aoa_to_sheet([txnHeader, ...txnRows]);
  txnSheet['!cols'] = [
    { wch: 20 }, { wch: 22 }, { wch: 18 }, { wch: 12 }, { wch: 24 },
    { wch: 18 }, { wch: 32 }, { wch: 25 }, { wch: 14 }, { wch: 16 },
    { wch: 20 }, { wch: 40 }, { wch: 20 }, { wch: 10 }, { wch: 18 },
    { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(workbook, txnSheet, 'Transactions');

  // Write file
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `${fileName}_${dateStr}.xlsx`);
};

/**
 * Generates a formal PDF report using jsPDF and autotable.
 */
export const exportBudgetReportToPdf = (
  report: BudgetExpensesReportData,
  filters: ReportFilters,
  fileName: string = 'Budget_Expenses_Report'
) => {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont('helvetica', 'bold');
  doc.text('BUDGET & EXPENSES REPORT', 14, 11);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${report.lastUpdated} | Period: ${report.periodLabel || 'FY 2026'} | Payee: ${filters.payeeType === 'all' ? 'All Payees' : filters.payeeType} | Scope: ${filters.company === 'all' ? 'All Entities' : filters.company}`, 14, 18);

  // KPI Overview Section (4 Core Management KPIs)
  let currentY = 32;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. EXECUTIVE FINANCIAL SUMMARY', 14, currentY);

  currentY += 4;
  autoTable(doc, {
    startY: currentY,
    head: [['TOTAL BUDGET', 'ACTUAL EXPENSES', 'BUDGET REMAINING', 'UTILIZATION']],
    body: [[
      formatIdr(report.summary.totalBudget),
      formatIdr(report.summary.actualExpenses),
      formatIdr(report.summary.budgetRemaining),
      `${report.summary.budgetUtilization.toFixed(1)}%`
    ]],
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8.5, halign: 'center' },
    bodyStyles: { fontSize: 9, halign: 'center', fontStyle: 'bold' }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Budget Variance Table
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('2. EXPENSE BY PROJECT (VARIANCE)', 14, currentY);

  currentY += 4;
  const varianceBody = report.budgetVarianceList.slice(0, 15).map(p => [
    p.projectName,
    p.department,
    formatIdr(p.budget),
    formatIdr(p.actual),
    `${p.variance < 0 ? '-' : '+'}${formatIdr(Math.abs(p.variance))}`,
    `${p.utilization}%`,
    p.status
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['Project Name', 'Department', 'Allocated Budget', 'Actual Spend', 'Variance', 'Utilization', 'Status']],
    body: varianceBody,
    theme: 'striped',
    headStyles: { fillColor: [51, 65, 85], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center' },
      6: { halign: 'center', fontStyle: 'bold' }
    }
  });

  // New Page: Transactions
  doc.addPage();
  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, pageWidth, 16, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('3. DETAILED EXPENSE TRANSACTIONS', 14, 11);

  const txnBody = report.transactions.slice(0, 40).map(t => [
    t.expense_number,
    t.request_date,
    t.project_name.length > 25 ? t.project_name.slice(0, 23) + '...' : t.project_name,
    t.paid_to.length > 22 ? t.paid_to.slice(0, 20) + '...' : t.paid_to,
    t.department,
    formatCurrencyAmount(t.currency, t.amount),
    formatIdr(t.reporting_amount),
    t.status
  ]);

  autoTable(doc, {
    startY: 22,
    head: [['Expense No', 'Date', 'Project', 'Payee', 'Dept', 'Original Amount', 'Reporting Amount (IDR)', 'Status']],
    body: txnBody,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], textColor: 255, fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    columnStyles: {
      5: { halign: 'right' },
      6: { halign: 'right', fontStyle: 'bold' },
      7: { halign: 'center' }
    }
  });

  const dateStr = new Date().toISOString().split('T')[0];
  doc.save(`${fileName}_${dateStr}.pdf`);
};
