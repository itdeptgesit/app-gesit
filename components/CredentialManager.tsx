import React from 'react';

export const CredentialManager: React.FC<{ currentUser?: any }> = () => {
  return (
    <div className="flex min-h-[400px] items-center justify-center p-8 text-center text-muted-foreground">
      <div className="max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h3 className="text-lg font-semibold text-foreground">Modul Dinonaktifkan</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Modul ini dinonaktifkan demi alasan kepatuhan dan keamanan.
        </p>
      </div>
    </div>
  );
};

export default CredentialManager;
