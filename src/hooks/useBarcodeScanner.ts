import { useEffect, useRef, useState } from 'react'
// A URL, not the binary: Vite emits the .wasm as an asset and inlines only
// the path here, so nothing heavy lands in the main bundle. Serving it from
// our own origin rather than the package's default jsDelivr URL keeps the
// scanner working behind a strict CSP or a blocked CDN.
import zxingWasmUrl from 'zxing-wasm/reader/zxing_reader.wasm?url'
import { hapticTick } from '../lib/haptics'

// Only Code 128, which is what our labels print (see lib/code128.ts). The
// same label also carries two QR codes linking to the item docs and the
// checkout policy; with QR enabled, whichever code the detector saw first
// won, so a URL was read as the serial. Manufacturer EAN/Code 39 barcodes on
// the hardware itself are never our serial either.
const SERIAL_FORMATS = ['code_128']

/**
 * Opens the device camera and watches for a barcode.
 *
 * Chromium browsers have BarcodeDetector natively. Safari and Firefox never
 * implemented it — which means no iPhone has it, since every browser there is
 * Safari underneath — so those load a WebAssembly polyfill instead. The
 * polyfill is imported dynamically and only when needed: it costs a few
 * hundred KB, and the browsers that already have the API shouldn't pay for
 * it.
 *
 * `isSupported` therefore starts optimistic and only turns false if the
 * polyfill itself can't be loaded, which is the one case where the caller
 * genuinely has to fall back to entering the serial by hand.
 */
export function useBarcodeScanner(
  onDetected: (value: string) => void,
  active: boolean,
  /**
   * Bump to restart the camera loop. The scan loop stops for good once it
   * detects something, which is right when any barcode ends the step — but
   * a caller that checks *which* barcode it got (the hand-off flow verifies
   * the scan against one specific serial) needs a way to resume after a
   * wrong one.
   */
  resetKey: number = 0,
) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const onDetectedRef = useRef(onDetected)
  onDetectedRef.current = onDetected

  const [isSupported, setSupported] = useState(true)
  const [permissionError, setPermissionError] = useState<string | null>(null)

  useEffect(() => {
    if (!active) return

    let stream: MediaStream | null = null
    let frameId = 0
    let cancelled = false

    const start = async () => {
      try {
        if (!('BarcodeDetector' in window)) {
          const { prepareZXingModule } = await import('barcode-detector/polyfill')
          // Point the decoder at the copy we ship instead of the CDN the
          // package defaults to.
          prepareZXingModule({
            overrides: {
              locateFile: (path: string, prefix: string) =>
                path.endsWith('.wasm') ? zxingWasmUrl : prefix + path,
            },
          })
          if (cancelled) return
        }

        const acquired = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        // The screen can be left (or the effect re-run) while the browser is
        // still asking for permission. Cleanup has already run by then and saw
        // no stream, so this one has to be released here or the camera stays on.
        if (cancelled) {
          acquired.getTracks().forEach((track) => track.stop())
          return
        }
        stream = acquired

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        const detector = new BarcodeDetector({ formats: SERIAL_FORMATS })

        const scan = async () => {
          if (cancelled || !videoRef.current) return
          try {
            const barcodes = await detector.detect(videoRef.current)
            // Filtered again in case a detector reports formats it wasn't
            // asked for.
            const serial = barcodes.find((b) => SERIAL_FORMATS.includes(b.format))
            if (serial) {
              hapticTick()
              onDetectedRef.current(serial.rawValue)
              return // stop the loop; the caller will move to the next step
            }
          } catch {
            // Transient detection errors are expected mid-frame; keep scanning.
          }
          frameId = requestAnimationFrame(scan)
        }

        frameId = requestAnimationFrame(scan)
      } catch {
        if (cancelled) return
        if (!('BarcodeDetector' in window)) {
          // The polyfill never arrived, so there is no scanner to offer.
          setSupported(false)
        } else {
          setPermissionError("Couldn't access the camera. Check your browser permissions.")
        }
      }
    }

    start()

    return () => {
      cancelled = true
      if (frameId) cancelAnimationFrame(frameId)
      stream?.getTracks().forEach(track => track.stop())
      if (videoRef.current) videoRef.current.srcObject = null
    }
  }, [active, resetKey])

  return { videoRef, isSupported, permissionError }
}
