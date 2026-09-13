import { useEffect, useRef, useState } from "react";

/**
 * Custom React Hook for Managing Multi-Threaded Signal Processing via Web Worker
 * Offloads dual-channel ECG & PPG buffer streaming, filtering, and timestamp alignment
 * to a background Web Worker thread.
 */
export function useDualSignalWorker(rawEcg, rawSpo2, filterConfig, timeOffsetMs) {
  const workerRef = useRef(null);
  const [workerState, setWorkerState] = useState({
    processedEcg: [],
    processedPpg: [],
    bufferSize: 0,
    jitterMs: 0.15,
    isWorkerActive: false,
    threadId: "Worker Thread (Background)"
  });

  useEffect(() => {
    // Create inline Web Worker from dualSignalStreamWorker.js script code
    let worker = null;
    try {
      worker = new Worker(
        new URL("../workers/dualSignalStreamWorker.js", import.meta.url),
        { type: "module" }
      );
      workerRef.current = worker;

      worker.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === "STREAM_PROCESSED") {
          setWorkerState({
            processedEcg: payload.processedEcg,
            processedPpg: payload.processedPpg,
            bufferSize: payload.bufferSize,
            jitterMs: payload.jitterMs,
            isWorkerActive: true,
            threadId: payload.threadId || "WebWorker-HardwareStream-01"
          });
        }
      };

      // Initial stream registration
      worker.postMessage({
        type: "INIT_STREAM",
        payload: {
          ecgData: rawEcg,
          ppgData: rawSpo2,
          sampleRateHz: 500,
          timeOffsetMs,
          filterConfig
        }
      });
    } catch (err) {
      console.warn("Web Worker initialization fallback to main thread:", err);
    }

    return () => {
      if (worker) {
        worker.postMessage({ type: "STOP_STREAM" });
        worker.terminate();
      }
    };
  }, []); // Run once on mount

  // Post configuration updates to Web Worker thread when dependencies change
  useEffect(() => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: "UPDATE_CONFIG",
        payload: {
          ecgData: rawEcg,
          ppgData: rawSpo2,
          timeOffsetMs,
          filterConfig
        }
      });
    }
  }, [rawEcg, rawSpo2, timeOffsetMs, filterConfig]);

  return workerState;
}
