/*
 * useWaveform — renders real-time waveform from AnalyserNode to a canvas.
 *
 * Uses requestAnimationFrame for smooth rendering of time-domain data.
 */

import { useRef, useEffect, useLayoutEffect, useCallback } from 'react';

export function useWaveform(getAnalyser: () => AnalyserNode | null) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const isRunningRef = useRef(false);

  const drawRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    drawRef.current = () => {
      const analyser = getAnalyser();
      const canvas = canvasRef.current;
      if (!analyser || !canvas) {
        if (isRunningRef.current) {
          animFrameRef.current = requestAnimationFrame(drawRef.current);
        }
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      analyser.getByteTimeDomainData(dataArray);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Draw waveform
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = '#818cf8';
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();

      if (isRunningRef.current) {
        animFrameRef.current = requestAnimationFrame(drawRef.current);
      }
    };
  });

  const start = useCallback(() => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    animFrameRef.current = requestAnimationFrame(drawRef.current);
  }, []);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
  }, []);

  useEffect(() => {
    return () => { stop(); };
  }, [stop]);

  return { canvasRef, start, stop };
}
