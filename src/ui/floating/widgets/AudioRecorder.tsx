/*
 * AudioRecorder — session recording floating widget.
 * Creates separate audio segments saved to campaign folder.
 */

import { useState, useRef, useCallback, useEffect, memo } from 'react';
import styles from './AudioRecorder.module.css';

interface AudioRecorderProps {
  campaignId: string;
}

export const AudioRecorder = memo(function AudioRecorder({ campaignId }: AudioRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [segmentCount, setSegmentCount] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const buffer = await blob.arrayBuffer();
        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const seg = segmentCount + 1;
        const filename = `session-${dateStr}-${String(seg).padStart(3, '0')}.webm`;

        await window.electronAPI?.floating.saveAudioSegment(campaignId, buffer, filename);
        setSegmentCount(seg);
      };

      mediaRecorder.start(1000); // collect chunks every second
      startTimeRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 200);
      setRecording(true);
    } catch (err) {
      setError('Microphone access denied');
      console.error('[AudioRecorder] getUserMedia failed:', err);
    }
  }, [campaignId, segmentCount]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecording(false);
    setElapsed(0);
  }, []);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className={styles.recorder}>
      <div className={styles.display}>
        <span className={`${styles.indicator} ${recording ? styles.indicatorActive : ''}`} />
        <span className={styles.time}>{formatTime(elapsed)}</span>
        {segmentCount > 0 && (
          <span className={styles.segments}>#{segmentCount}</span>
        )}
      </div>
      <button
        className={`${styles.recordBtn} ${recording ? styles.recordBtnActive : ''}`}
        onClick={recording ? stopRecording : startRecording}
        title={recording ? 'Stop recording' : 'Start recording'}
      >
        {recording ? '⏹' : '⏺'}
      </button>
      {error && <div className={styles.error}>{error}</div>}
    </div>
  );
});
