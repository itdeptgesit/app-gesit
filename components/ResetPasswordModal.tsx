'use client';

import React, { useState } from 'react';
import { X, KeyRound, Eye, EyeOff, Check, Loader2, ShieldAlert } from 'lucide-react';
import { UserAccount } from '../types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { motion, AnimatePresence } from 'framer-motion';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserAccount | null;
  onSave: (user: UserAccount, newPassword: string) => Promise<boolean>;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ isOpen, onClose, user, onSave }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError('Confirm passcode does not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Passcode must be at least 6 characters');
      return;
    }
    if (!user) return;

    setIsLoading(true);
    try {
      const ok = await onSave(user, newPassword);
      if (ok) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setNewPassword('');
          setConfirmPassword('');
        }, 1800);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()} disablePointerDismissal={true}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl">
        <DialogHeader className="px-6 py-4 relative overflow-hidden border-b border-border/40 bg-muted/20 shrink-0">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <KeyRound size={80} />
          </div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-4 mb-2">
                <div className="w-10 h-10 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-lg flex items-center justify-center">
                  <KeyRound size={20} />
                </div>
                <DialogTitle className="text-lg font-semibold text-foreground">Reset Passcode</DialogTitle>
              </div>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                Force override for target identity
              </DialogDescription>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={onClose} className="text-muted-foreground hover:text-destructive"><X size={16} /></Button>
          </div>
        </DialogHeader>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center text-center py-6"
              >
                <div className="w-16 h-16 rounded-xl bg-emerald-500 text-white flex items-center justify-center mb-6 shadow-xl shadow-emerald-500/20">
                  <Check size={32} strokeWidth={3} />
                </div>
                <h3 className="text-lg font-semibold text-emerald-700 dark:text-emerald-400">Passcode Overridden</h3>
                <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                  Secure passcode for {user?.email} has been <br /> successfully reset.
                </p>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-amber-500/10 border border-amber-500/25 p-4 rounded-lg">
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Target Identity</p>
                  <p className="text-sm font-semibold text-foreground mt-1">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg text-xs font-medium text-destructive flex items-center gap-3"
                  >
                    <ShieldAlert size={14} />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">New Passcode</Label>
                    <div className="relative">
                      <Input
                        type={showPassword ? "text" : "password"}
                        required
                        minLength={6}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="pr-12"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Confirm Identity</Label>
                    <Input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-6 border-t border-border/40 mt-2">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="font-semibold"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="mr-3 animate-spin" />
                        Overriding...
                      </>
                    ) : (
                      'Reset Passcode'
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onClose}
                    className="text-sm font-medium text-muted-foreground"
                  >
                    Dismiss
                  </Button>
                </div>
              </form>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};