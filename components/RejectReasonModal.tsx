
'use client';

import React, { useState } from 'react';
import { useToast } from './ToastProvider';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (reason: string) => void;
    itemName?: string;
}

export const RejectReasonModal: React.FC<Props> = ({
    isOpen,
    onClose,
    onSubmit,
    itemName
}) => {
    const { showToast } = useToast();
    const [reason, setReason] = useState('');

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent showCloseButton={false} className="sm:max-w-md p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl">
                <DialogHeader className="px-6 py-4 border-b border-border/40 bg-muted/20 shrink-0">
                    <DialogTitle className="text-lg font-semibold text-foreground">
                        Deny Request
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground mt-1">Procurement Audit Protocol</DialogDescription>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="p-4 bg-muted/20 rounded-lg border border-border/40">
                        <p className="text-xs text-muted-foreground mb-1">Hardware Target</p>
                        <p className="text-sm font-semibold text-foreground">
                            {itemName || 'Unknown Item'}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-foreground">Reason for Rejection</label>
                        <Textarea
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            placeholder="Briefly explain why this procurement node is being rejected (required for registry sync)..."
                            className="min-h-[120px] resize-none"
                        />
                    </div>
                </div>

                <DialogFooter className="px-6 py-3.5 border-t border-border/40 gap-2 flex sm:justify-end bg-muted/10">
                    <Button variant="outline" onClick={onClose}>Cancel Protocol</Button>
                    <Button variant="destructive" onClick={() => {
                        if (!reason.trim()) {
                            showToast('A technical or administrative reason is required to finalize the rejection.', 'error');
                            return;
                        }
                        onSubmit(reason.trim());
                        setReason('');
                    }}>
                        Confirm Denial
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};