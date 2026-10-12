import React from 'react';
import { UserAccount } from '../types';
import { CSLExpenseApproval } from './CSLExpenseApproval';
import { CSLBudgetExpensesReport } from './CSLBudgetExpensesReport';

interface CSLBudgetManagerProps {
  currentUser: UserAccount | null;
  view?: 'plan' | 'request' | 'expense' | 'monitoring' | 'offshore-invoice' | 'report';
}

export const CSLBudgetManager: React.FC<CSLBudgetManagerProps> = ({ currentUser, view }) => {
  if (view === 'report') {
    return <CSLBudgetExpensesReport currentUser={currentUser} />;
  }
  return <CSLExpenseApproval currentUser={currentUser} />;
};
