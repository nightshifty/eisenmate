import { useState, useCallback, useRef, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QRCodeSVG } from "qrcode.react";
import { Smartphone, QrCode, Copy, Check, Camera, Keyboard } from "lucide-react";
import type { PairingPayload } from "@/lib/sync-types";

interface PairingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPairingComplete: (payload: PairingPayload, role: "initiator" | "responder") => void;
  /** The local pairing payload to display as QR code (when acting as initiator) */
  localPairingPayload: PairingPayload | null;
  /** Called when the user wants to start as initiator */
  onStartAsInitiator: () => void;
}

type Step = "choose-role" | "show-qr" | "scan-qr" | "manual-input" | "connecting";

export function PairingDialog({
  open,
  onOpenChange,
  onPairingComplete,
  localPairingPayload,
  onStartAsInitiator,
}: PairingDialogProps) {
  const [step, setStep] = useState<Step>("choose-role");
  const [manualInput, setManualInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scannerRef = useRef<any>(null);
  const scannerContainerRef = useRef<HTMLDivElement>(null);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep("choose-role");
      setManualInput("");
      setCopied(false);
      setScanError(null);
      stopScanner();
    }
  }, [open]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => { /* ignore */ });
      scannerRef.current.clear();
      scannerRef.current = null;
    }
  }, []);

  const encodedPayload = localPairingPayload
    ? JSON.stringify(localPairingPayload)
    : null;

  const handleCopyPayload = useCallback(async () => {
    if (!encodedPayload) return;
    await navigator.clipboard.writeText(encodedPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [encodedPayload]);

  const handleStartInitiator = useCallback(() => {
    onStartAsInitiator();
    setStep("show-qr");
  }, [onStartAsInitiator]);

  const handleStartScanner = useCallback(async () => {
    setStep("scan-qr");
    setScanError(null);

    // Give the DOM time to render the container
    await new Promise((r) => setTimeout(r, 100));

    if (!scannerContainerRef.current) return;

    try {
      // Dynamically import html5-qrcode to reduce initial bundle size (~200KB)
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-scanner-container");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText: string) => {
          handleScannedData(decodedText);
          stopScanner();
        },
        () => { /* QR not detected, ignore */ },
      );
    } catch (err) {
      setScanError(
        err instanceof Error
          ? `Kamera nicht verfügbar: ${err.message}`
          : "Kamera konnte nicht gestartet werden",
      );
      setStep("manual-input");
    }
  }, [stopScanner]);

  const handleScannedData = useCallback((data: string) => {
    try {
      const payload = JSON.parse(data) as PairingPayload;
      if (payload.peerId && payload.secret && payload.deviceId) {
        setStep("connecting");
        onPairingComplete(payload, "responder");
      } else {
        setScanError("Ungültiger QR-Code");
      }
    } catch {
      setScanError("QR-Code konnte nicht gelesen werden");
    }
  }, [onPairingComplete]);

  const handleManualSubmit = useCallback(() => {
    if (!manualInput.trim()) return;
    handleScannedData(manualInput.trim());
  }, [manualInput, handleScannedData]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === "choose-role" && "Gerät koppeln"}
            {step === "show-qr" && "QR-Code anzeigen"}
            {step === "scan-qr" && "QR-Code scannen"}
            {step === "manual-input" && "Code eingeben"}
            {step === "connecting" && "Verbinde..."}
          </DialogTitle>
          <DialogDescription>
            {step === "choose-role" && "Verbinde zwei Geräte für die lokale Synchronisation."}
            {step === "show-qr" && "Scanne diesen QR-Code mit dem anderen Gerät."}
            {step === "scan-qr" && "Halte die Kamera auf den QR-Code des anderen Geräts."}
            {step === "manual-input" && "Füge den Verbindungscode des anderen Geräts ein."}
            {step === "connecting" && "Verbindung wird hergestellt..."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Step: Choose Role */}
          {step === "choose-role" && (
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
                onClick={handleStartInitiator}
              >
                <QrCode className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <div className="font-medium">QR-Code anzeigen</div>
                  <div className="text-sm text-muted-foreground">
                    Dieses Gerät zeigt den Code an
                  </div>
                </div>
              </Button>

              <Button
                variant="outline"
                className="w-full h-auto py-4 flex flex-col items-center gap-2"
                onClick={handleStartScanner}
              >
                <Camera className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <div className="font-medium">QR-Code scannen</div>
                  <div className="text-sm text-muted-foreground">
                    Dieses Gerät scannt den Code
                  </div>
                </div>
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep("manual-input")}
              >
                <Keyboard className="h-4 w-4 mr-2" />
                Code manuell eingeben
              </Button>
            </div>
          )}

          {/* Step: Show QR Code (Initiator) */}
          {step === "show-qr" && encodedPayload && (
            <div className="space-y-4">
              <div className="flex justify-center p-4 bg-white rounded-lg">
                <QRCodeSVG
                  value={encodedPayload}
                  size={220}
                  level="M"
                  includeMargin
                />
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 text-sm text-muted-foreground text-center">
                  <Smartphone className="h-4 w-4 inline mr-1" />
                  Warte auf Verbindung vom anderen Gerät...
                </div>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs text-muted-foreground mb-2">
                  Alternativ: Code kopieren und auf dem anderen Gerät einfügen
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={handleCopyPayload}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Kopiert!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      Verbindungscode kopieren
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Step: Scan QR Code (Responder) */}
          {step === "scan-qr" && (
            <div className="space-y-3">
              <div
                id="qr-scanner-container"
                ref={scannerContainerRef}
                className="w-full aspect-square rounded-lg overflow-hidden bg-muted"
              />

              {scanError && (
                <p className="text-sm text-destructive">{scanError}</p>
              )}

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  stopScanner();
                  setStep("manual-input");
                }}
              >
                <Keyboard className="h-4 w-4 mr-2" />
                Stattdessen Code eingeben
              </Button>
            </div>
          )}

          {/* Step: Manual Input (Fallback) */}
          {step === "manual-input" && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="pairing-code">Verbindungscode</Label>
                <Input
                  id="pairing-code"
                  placeholder='{"peerId":"...","secret":"...","deviceId":"..."}'
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleManualSubmit();
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Füge den Verbindungscode ein, der auf dem anderen Gerät angezeigt wird.
                </p>
              </div>

              {scanError && (
                <p className="text-sm text-destructive">{scanError}</p>
              )}

              <Button
                className="w-full"
                onClick={handleManualSubmit}
                disabled={!manualInput.trim()}
              >
                Verbinden
              </Button>

              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setStep("choose-role")}
              >
                Zurück
              </Button>
            </div>
          )}

          {/* Step: Connecting */}
          {step === "connecting" && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">
                Sichere Verbindung wird aufgebaut...
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
