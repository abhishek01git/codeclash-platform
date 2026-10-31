import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    // In dev, proxy handles /socket.io, or fallback to window.location.origin
    const socketInstance = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    setSocket(socketInstance);

    socketInstance.on('connect', () => {
      console.log('Socket connected:', socketInstance.id);
      if (user?._id) {
        socketInstance.emit('register_user', user._id);
      }
    });

    socketInstance.on('online_users_list', (users) => {
      setOnlineUsers(users);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  // When user changes, update socket registration
  useEffect(() => {
    if (socket && user?._id) {
      socket.emit('register_user', user._id);
    }
  }, [socket, user?._id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
