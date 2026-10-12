'use client';

import React from 'react';
import { 
    X, Calendar, ShieldCheck, FileText, 
    Receipt, Fingerprint, Download, 
    Building2, User, CheckCircle2, XCircle, Clock, ShieldAlert, Award, Briefcase,
    FileDown, ExternalLink
} from 'lucide-react';
import { PurchasePlan, UserAccount } from '../types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";


interface PurchaseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: PurchasePlan | null;
  spvName?: string;
  managerName?: string;
  requesterProfile?: UserAccount | null;
}

export const PurchaseDetailModal: React.FC<PurchaseDetailModalProps> = ({ isOpen, onClose, plan, spvName, managerName, requesterProfile }) => {
  if (!isOpen || !plan) return null;

  const formatFullIDR = (num: number) => {
    return new Intl.NumberFormat('id-ID', { 
        style: 'currency', 
        currency: 'IDR', 
        maximumFractionDigits: 0 
    }).format(num);
  };

  const getStatusConfig = (status: string) => {
    if (status === 'Approved') return { 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50', 
        border: 'border-emerald-200',
        icon: <CheckCircle2 size={16} />
    };
    if (status === 'Rejected') return { 
        color: 'text-rose-600', 
        bg: 'bg-rose-50', 
        border: 'border-rose-200',
        icon: <XCircle size={16} />
    };
    return { 
        color: 'text-amber-600', 
        bg: 'bg-amber-50', 
        border: 'border-amber-200',
        icon: <Clock size={16} />
    };
  };

  const handlePrint = () => {
    window.print();
  };

  const statusCfg = getStatusConfig(plan.status);
  const isFinal = plan.status === 'Approved' || plan.status === 'Rejected';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl gap-0">
        <style>
          {`
            @media print {
              @page { size: A4; margin: 0; }
              body * { visibility: hidden; }
              #printable-doc, #printable-doc * { visibility: visible; }
              #printable-doc { 
                position: fixed; 
                left: 0; top: 0; width: 210mm; height: 297mm; padding: 20mm;
                background: white !important; color: black !important;
                box-shadow: none !important; border: none !important;
              }
              .no-print { display: none !important; }
            }
          `}
        </style>

        <DialogHeader className="px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0 no-print">
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-md ${statusCfg.bg} ${statusCfg.color}`}>
                {statusCfg.icon}
              </div>
              <div className="flex flex-col">
                <DialogTitle className="text-lg font-semibold text-foreground">Request Details</DialogTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-medium text-muted-foreground">PR-{plan.id}</span>
                  <Badge variant="outline" className="text-xs h-4 font-medium border-muted-foreground/30">{plan.status}</Badge>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 max-h-[80vh]">
          <div id="printable-doc" className="p-8 space-y-8 bg-card text-card-foreground">
            {/* Branding */}
            <div className="flex justify-between items-start border-b-2 border-primary/20 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                  <Building2 size={24} className="text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">Procurement Request</h1>
                  <p className="text-xs font-medium text-muted-foreground leading-none">Enterprise Management System</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground mb-1">Request number</p>
                <p className="text-lg font-mono font-bold leading-none">#{plan.id.toString().padStart(5, '0')}</p>
                <p className="text-xs text-muted-foreground mt-2 italic">Date: {plan.requestDate}</p>
              </div>
            </div>

            {/* Profile Info */}
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground border-b pb-2 flex items-center gap-2">
                  <User size={12} className="text-primary" /> Originator Information
                </h3>
                <div>
                  <p className="text-sm font-bold uppercase">{plan.requester}</p>
                  {requesterProfile ? (
                    <div className="mt-1 space-y-0.5">
                      <p className="text-[11px] font-medium text-muted-foreground">{requesterProfile.jobTitle || 'Team Member'}</p>
                      <p className="text-xs font-medium text-muted-foreground">{requesterProfile.department}</p>
                      <p className="text-xs font-semibold text-primary mt-1">{requesterProfile.company || 'Corporate Entity'}</p>
                    </div>
                  ) : <p className="text-[11px] text-muted-foreground">Authorized Corporate Account</p>}
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-muted-foreground border-b pb-2 flex items-center gap-2">
                  <ShieldCheck size={12} className="text-emerald-500" /> Status Decision
                </h3>
                <Badge variant="outline" className={`px-3 py-1 text-xs font-medium h-7 ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                  {statusCfg.icon}
                  <span className="ml-1.5">{plan.status}</span>
                </Badge>
              </div>
            </div>

            {/* Content Cards */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-muted-foreground border-b pb-2">Technical specs & Requirements</h3>
              <div className="p-5 bg-muted/20 rounded-lg border">
                <p className="text-sm font-bold mb-1.5">{plan.item}</p>
                <p className="text-[13px] text-muted-foreground leading-relaxed italic">{plan.specs}</p>
              </div>
            </div>

            {/* Justification */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground border-b pb-2">Strategic Justification</h3>
              <p className="text-[13px] text-muted-foreground italic leading-relaxed px-1">"{plan.justification}"</p>
            </div>

            {/* Breakdown Table */}
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground border-b pb-2">Financial Breakdown</h3>
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/30">
                    <tr className="text-xs font-medium text-muted-foreground border-b">
                      <th className="px-5 py-3">Description</th>
                      <th className="px-5 py-3 text-center">Qty</th>
                      <th className="px-5 py-3 text-right">Unit Value</th>
                      <th className="px-5 py-3 text-right">Commitment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="bg-card">
                      <td className="px-5 py-4 font-bold">{plan.item}</td>
                      <td className="px-5 py-4 text-center font-bold text-muted-foreground">{plan.quantity}x</td>
                      <td className="px-5 py-4 text-right font-mono">{formatFullIDR(plan.unitPrice)}</td>
                      <td className="px-5 py-4 text-right font-mono font-bold text-primary">{formatFullIDR(plan.totalPrice)}</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-primary text-primary-foreground">
                    <tr className="font-bold">
                      <td colSpan={3} className="px-5 py-4 text-right text-xs opacity-80">Total Net Investment</td>
                      <td className="px-5 py-4 text-right font-mono text-base">{formatFullIDR(plan.totalPrice)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Matrix */}
            <div className="space-y-4 pt-4">
              <h3 className="text-xs font-semibold text-muted-foreground border-b pb-2">Approval Authorization Matrix</h3>
              <div className="flex items-center justify-between gap-2 px-6 py-8 bg-muted/10 rounded-lg border border-dashed">
                <div className="flex flex-col items-center gap-2 flex-1 text-center">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"><User size={16} /></div>
                  <p className="text-xs font-semibold">Originator</p>
                  <p className="text-[9px] text-muted-foreground italic truncate max-w-[80px]">{plan.requester}</p>
                </div>
                <Separator className="flex-1 w-8" />
                <div className="flex flex-col items-center gap-2 flex-1 text-center">
                  <div className="w-9 h-9 rounded-full bg-muted/50 text-muted-foreground flex items-center justify-center border"><Building2 size={16} /></div>
                  <p className="text-xs font-semibold">Workflow</p>
                  <p className="text-[9px] text-muted-foreground italic truncate max-w-[80px]">{managerName || spvName || 'Authorized Node'}</p>
                </div>
                <Separator className="flex-1 w-8" />
                <div className="flex flex-col items-center gap-2 flex-1 text-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 border-background shadow-md ${plan.status === 'Approved' ? 'bg-emerald-500 text-white' : plan.status === 'Rejected' ? 'bg-destructive text-white' : 'bg-amber-500 text-white'}`}>
                    {plan.status === 'Approved' ? <CheckCircle2 size={20} /> : plan.status === 'Rejected' ? <XCircle size={20} /> : <Clock size={20} />}
                  </div>
                  <p className="text-xs font-semibold">{plan.status}</p>
                  <p className="text-[9px] text-muted-foreground italic truncate">Decision Node</p>
                </div>
              </div>
            </div>

            {/* Signatures */}
            <div className="pt-16 grid grid-cols-3 gap-8">
              <div className="space-y-8">
                <p className="text-xs font-semibold text-muted-foreground">Authorized By (SPV)</p>
                <div className="border-t pt-2 mt-4">
                  <p className="font-bold text-xs">{spvName || '....................'}</p>
                  <p className="text-xs text-muted-foreground">Supervisor Unit</p>
                </div>
              </div>
              <div className="space-y-8">
                <p className="text-xs font-semibold text-muted-foreground">Authorized By (Mgr)</p>
                <div className="border-t pt-2 mt-4">
                  <p className="font-bold text-xs">{managerName || '....................'}</p>
                  <p className="text-xs text-muted-foreground">Managerial Node</p>
                </div>
              </div>
              <div className="text-right flex flex-col justify-end gap-1">
                <div className="text-xs text-muted-foreground font-semibold">PR-{plan.id}</div>
                <div className="text-[8px] text-muted-foreground/60 font-mono">CODE: {Math.random().toString(36).substring(2, 8).toUpperCase()}</div>
                <div className="text-[8px] text-muted-foreground/60">{new Date().toLocaleString()}</div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <div className="px-6 py-4 bg-muted/20 border-t gap-2 flex justify-end items-center no-print">
          <Button variant="ghost" onClick={onClose} className="text-sm">
            Close View
          </Button>
          {isFinal && (
            <Button
                onClick={handlePrint}
                className={`gap-2 ${plan.status === 'Approved' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
            >
                <FileDown size={14} /> Save Official PDF
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};