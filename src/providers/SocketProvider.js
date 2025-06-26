// SocketContext.js
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import socketManager from '@/context/socketContext';

const SocketContext = createContext(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children, autoConnect = true, ...socketOptions }) => {
  const [connectionState, setConnectionState] = useState('disconnected');
  const [error, setError] = useState(null);
  const subscriptionsRef = useRef(new Map()); // Track subscriptions for cleanup

  // Update connection state
  const updateConnectionState = useCallback(() => {
    const state = socketManager.getConnectionState();
    setConnectionState(state);
  }, []);

  // Connect to socket
  const connect = useCallback(async (options = {}) => {
    try {
      setError(null);
      setConnectionState('connecting');
      await socketManager.connect({ ...socketOptions, ...options });
      updateConnectionState();
      return true;
    } catch (error) {
      console.error('Failed to connect:', error);
      setError(error.message);
      setConnectionState('error');
      return false;
    }
  }, [socketOptions, updateConnectionState]);

  // Disconnect from socket
  const disconnect = useCallback(() => {
    socketManager.disconnect();
    setConnectionState('disconnected');
    setError(null);
    
    // Clear all subscriptions
    subscriptionsRef.current.clear();
  }, []);

  // Subscribe to a channel
  const subscribe = useCallback((destination, callback, headers = {}) => {
    const wrappedCallback = (frame) => {
      try {
        const data = JSON.parse(frame.body);
        callback(data, frame);
      } catch (error) {
        console.error('Error parsing message:', error);
        callback(frame.body, frame);
      }
    };

    const subscription = socketManager.subscribe(destination, wrappedCallback, headers);
    
    // Store subscription for cleanup
    if (!subscriptionsRef.current.has(destination)) {
      subscriptionsRef.current.set(destination, new Set());
    }
    subscriptionsRef.current.get(destination).add(wrappedCallback);

    // Return unsubscribe function
    return () => {
      socketManager.unsubscribe(destination, wrappedCallback);
      const destSubs = subscriptionsRef.current.get(destination);
      if (destSubs) {
        destSubs.delete(wrappedCallback);
        if (destSubs.size === 0) {
          subscriptionsRef.current.delete(destination);
        }
      }
    };
  }, []);

  // Send message
  const sendMessage = useCallback(async (destination, message, headers = {}) => {
    try {
      const success = await socketManager.sendMessage(destination, message, headers);
      if (!success) {
        console.warn('Message queued due to connection issues');
      }
      return success;
    } catch (error) {
      console.error('Error sending message:', error);
      return false;
    }
  }, []);

  // Check if connected
  const isConnected = useCallback(() => {
    return socketManager.isConnected();
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    // Periodic connection state check
    const interval = setInterval(updateConnectionState, 1000);

    return () => {
      clearInterval(interval);
      if (autoConnect) {
        disconnect();
      }
    };
  }, [autoConnect, connect, disconnect, updateConnectionState]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      // Clean up all subscriptions
      for (const [destination, callbacks] of subscriptionsRef.current.entries()) {
        for (const callback of callbacks) {
          socketManager.unsubscribe(destination, callback);
        }
      }
      subscriptionsRef.current.clear();
    };
  }, []);

  const contextValue = {
    // Connection management
    connect,
    disconnect,
    isConnected,
    connectionState,
    error,
    
    // Messaging
    subscribe,
    sendMessage,
    
    // Utils
    socketManager // Expose for advanced usage
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};