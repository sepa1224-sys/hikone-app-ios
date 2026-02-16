'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

interface QRScannerProps {
  onScan: (decodedText: string) => void
  onError?: (error: any) => void
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isMounted, setIsMounted] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)
  
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    const elementId = "reader"
    // Ensure element exists
    if (!document.getElementById(elementId)) return

    const html5QrCode = new Html5Qrcode(elementId, /* verbose= */ false)
    scannerRef.current = html5QrCode

    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ]
    }

    let isRunning = false

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            onScan(decodedText)
          },
          (errorMessage) => {
            // Ignore parse errors, only report critical setup errors via catch
          }
        )
        isRunning = true
      } catch (err) {
        console.error("Error starting scanner:", err)
        if (onError) onError(err)
      }
    }

    startScanner()

    return () => {
      if (isRunning) {
        html5QrCode.stop().then(() => {
          html5QrCode.clear()
        }).catch(err => {
          console.error("Failed to stop scanner", err)
        })
      } else {
        // If it didn't start yet or failed, just clear
        html5QrCode.clear()
      }
    }
  }, [isMounted, onScan, onError])

  if (!isMounted) return <div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>

  return (
    <div className="w-full max-w-sm mx-auto relative">
      <div 
        id="reader" 
        className="w-full overflow-hidden rounded-lg bg-black"
        style={{ minHeight: '300px' }}
      ></div>
      {/* Overlay guide */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
        <div className="w-64 h-64 border-2 border-white/50 rounded-lg relative">
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1"></div>
        </div>
      </div>
      <p className="text-xs text-center text-gray-500 mt-4">QRコードを枠内に合わせてください</p>
    </div>
  )
}
