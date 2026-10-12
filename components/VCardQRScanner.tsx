import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { QrCode, ScanLine, CameraOff, Upload } from 'lucide-react';

interface VCardQRScannerProps {
  open: boolean;
  onClose: () => void;
  /** Called with the raw decoded text (expected to be vCard or URL) */
  onResult: (text: string) => void;
}

const SCANNER_ID = 'vcard-qr-scanner-region';

export const VCardQRScanner: React.FC<VCardQRScannerProps> = ({ open, onClose, onResult }) => {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const hasStarted = useRef(false);

  const stopScanner = async () => {
    if (scannerRef.current && hasStarted.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (_) {}
      hasStarted.current = false;
    }
    setScanning(false);
  };

  useEffect(() => {
    if (!open) {
      stopScanner();
      setError(null);
      return;
    }

    // Small delay to ensure the DOM element is mounted inside the Dialog
    const timer = setTimeout(() => {
      const el = document.getElementById(SCANNER_ID);
      if (!el) return;

      try {
        const scanner = new Html5Qrcode(SCANNER_ID, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
        });
        scannerRef.current = scanner;

        scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decodedText) => {
            // Success – stop scanner and pass result up
            stopScanner().then(() => {
              onResult(decodedText);
              onClose();
            });
          },
          () => {
            // QR not found yet – silently ignore
          }
        ).then(() => {
          hasStarted.current = true;
          setScanning(true);
          setError(null);
        }).catch((err: any) => {
          const msg = err?.message || String(err);
          if (msg.toLowerCase().includes('permission')) {
            setError('Akses kamera ditolak. Izinkan akses kamera di browser Anda.');
          } else {
            setError('Tidak dapat membuka kamera. Pastikan perangkat Anda memiliki kamera.');
          }
        });
      } catch (err: any) {
        setError('Gagal menginisialisasi scanner. Coba refresh halaman.');
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden font-sans border border-border/60 shadow-2xl rounded-2xl">
        <DialogHeader className="p-6 pb-4 border-b border-border/30 bg-muted/20">
          <div className="flex items-center gap-2 text-violet-600 mb-1">
            <QrCode size={20} />
            <span className="text-[10px] font-black uppercase tracking-widest">Scan QR vCard</span>
          </div>
          <DialogTitle className="text-xl font-black text-foreground">
            Scan Business Card QR
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            Arahkan kamera ke QR code pada kartu nama. Data kontak akan otomatis terbaca.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Scanner viewport */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-black min-h-[300px] flex items-center justify-center">
            {/* html5-qrcode mounts a video element inside this div */}
            <div
              id={SCANNER_ID}
              className="w-full"
              style={{ minHeight: 300 }}
            />

            {/* Scanning overlay UI */}
            {scanning && !error && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="relative w-[260px] h-[260px]">
                  {/* Corner brackets */}
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-violet-400 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-violet-400 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-violet-400 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-violet-400 rounded-br-lg" />
                  {/* Scan line animation */}
                  <div className="absolute left-1 right-1 h-0.5 bg-violet-400/80 rounded-full animate-[scan_2s_linear_infinite]"
                    style={{
                      boxShadow: '0 0 8px 2px rgba(139,92,246,0.6)',
                      animation: 'scan 2s linear infinite',
                    }}
                  />
                </div>
              </div>
            )}

            {/* Error state */}
            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
                <CameraOff className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-white font-bold text-sm">{error}</p>
              </div>
            )}

            {/* Loading state before camera starts */}
            {!scanning && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-900">
                <ScanLine className="w-10 h-10 text-violet-400 animate-pulse mb-2" />
                <p className="text-zinc-400 text-xs font-medium">Membuka kamera...</p>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-muted-foreground font-medium">
            Pastikan QR code terlihat jelas dalam bingkai • Jaga tangan tetap stabil
          </p>

          <Button
            type="button"
            variant="outline"
            className="w-full text-xs font-bold rounded-xl h-9 border-violet-300 text-violet-700 hover:bg-violet-50"
            onClick={handleClose}
          >
            Batal / Tutup Kamera
          </Button>
        </div>

        {/* Scan line CSS animation */}
        <style>{`
          @keyframes scan {
            0%   { top: 10px; }
            50%  { top: calc(100% - 10px); }
            100% { top: 10px; }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};
