"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, RefreshCw, AlertTriangle, X } from "lucide-react";

interface QrScannerProps {
  onScan: (scannedText: string) => void;
  onClose: () => void;
}

export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasScannedRef = useRef<boolean>(false);

  const [cameraState, setCameraState] = useState<"INITIALIZING" | "ACTIVE" | "DENIED" | "NOT_FOUND" | "ERROR">("INITIALIZING");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const stopCamera = () => {
    if (animFrameIdRef.current !== null) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const startCamera = async () => {
    stopCamera();
    hasScannedRef.current = false;
    setCameraState("INITIALIZING");
    setErrorMessage("");

    if (typeof window !== "undefined" && !window.isSecureContext && window.location.hostname !== "localhost") {
      setCameraState("ERROR");
      setErrorMessage("HTTPS connection is required to access the camera in browser.");
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState("ERROR");
      setErrorMessage("Camera access API is unsupported in this browser.");
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true"); // required for iOS Safari
        await videoRef.current.play();
        setCameraState("ACTIVE");
        requestAnimationFrame(processFrame);
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setCameraState("DENIED");
        setErrorMessage("Camera permission was denied. Please grant camera permission to scan NirmalTag QR codes.");
      } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        setCameraState("NOT_FOUND");
        setErrorMessage("No camera device was detected on your device.");
      } else {
        setCameraState("ERROR");
        setErrorMessage(err.message || "Unable to start the camera.");
      }
    }
  };

  const processFrame = () => {
    if (hasScannedRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data && code.data.trim().length > 0) {
          hasScannedRef.current = true;
          stopCamera();
          onScan(code.data.trim());
          return;
        }
      }
    }

    animFrameIdRef.current = requestAnimationFrame(processFrame);
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="relative bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
      {/* Header bar */}
      <div className="flex items-center justify-between p-3 bg-slate-800 text-white border-b border-slate-700">
        <div className="flex items-center gap-2 text-xs font-bold">
          <Camera className="w-4 h-4 text-emerald-400" />
          <span>Live Optical QR Scanner</span>
        </div>
        <button
          onClick={() => {
            stopCamera();
            onClose();
          }}
          className="p-1 rounded-lg hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
          aria-label="Close Camera Scanner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Video Preview Container */}
      <div className="relative aspect-square sm:aspect-video w-full bg-black flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${cameraState === "ACTIVE" ? "block" : "hidden"}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Viewfinder Target Box Overlay */}
        {cameraState === "ACTIVE" && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            <div className="w-56 h-56 border-2 border-emerald-400 rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-lg" />
              <div className="w-full h-0.5 bg-emerald-400/80 animate-pulse absolute top-1/2 -translate-y-1/2" />
            </div>
          </div>
        )}

        {/* State / Loading / Error overlays */}
        {cameraState === "INITIALIZING" && (
          <div className="p-6 text-center space-y-3 text-white">
            <RefreshCw className="w-8 h-8 animate-spin text-emerald-400 mx-auto" />
            <p className="text-xs font-semibold">Initializing browser camera feed...</p>
          </div>
        )}

        {(cameraState === "DENIED" || cameraState === "NOT_FOUND" || cameraState === "ERROR") && (
          <div className="p-6 max-w-xs text-center space-y-4 text-white">
            <div className="w-12 h-12 rounded-full bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-400">Camera Unavailable</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{errorMessage}</p>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-sm"
              >
                Retry Camera
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold text-xs rounded-xl transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Instructions */}
      <div className="p-3 bg-slate-900 text-center border-t border-slate-800">
        <p className="text-[11px] font-medium text-slate-400">
          Position physical pouch QR code within viewfinder target frame.
        </p>
      </div>
    </div>
  );
}
