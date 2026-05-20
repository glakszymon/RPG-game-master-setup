import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { MapRenderer } from './MapRenderer';
import { InitiativeOverlay } from './InitiativeOverlay';
import styles from './PlayerApp.module.css';
import type { PlayerBroadcastState } from './types';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export function PlayerApp() {
  const [state, setState] = useState<PlayerBroadcastState | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to the same host that served this page
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setStatus('connected');
    });

    socket.on('state-update', (data: PlayerBroadcastState) => {
      setState(data);
    });

    socket.on('server-shutdown', () => {
      setStatus('disconnected');
    });

    socket.on('disconnect', () => {
      setStatus('disconnected');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  if (status === 'disconnected') {
    return (
      <div className={styles.disconnected}>
        <div className={styles.disconnectedCard}>
          <h1>Connection Lost</h1>
          <p>Refresh the page to reconnect.</p>
        </div>
      </div>
    );
  }

  if (status === 'connecting' || !state) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
        <p>Connecting to Game Master...</p>
      </div>
    );
  }

  const rotationStyle = state.rotation
    ? { transform: `rotate(${state.rotation}deg)` }
    : undefined;

  return (
    <div className={styles.root} style={rotationStyle}>
      {state.map && <MapRenderer map={state.map} />}
      {state.combat?.isStarted && <InitiativeOverlay combat={state.combat} />}
    </div>
  );
}
