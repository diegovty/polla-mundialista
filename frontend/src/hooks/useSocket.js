import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

let socket = null;

export function useSocket(handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!socket) {
      socket = io(window.location.origin, { withCredentials: true });
    }

    const events = Object.keys(handlersRef.current);
    events.forEach(event => {
      socket.on(event, (...args) => handlersRef.current[event]?.(...args));
    });

    return () => {
      events.forEach(event => socket.off(event));
    };
  }, []);
}
