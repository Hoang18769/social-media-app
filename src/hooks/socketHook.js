// socketHooks.js
import { useEffect, useRef, useCallback, useState } from 'react';
import { useSocket } from '@/providers/SocketProvider'; 

/**
 * Hook để subscribe vào một channel cụ thể
 * @param {string} destination - Channel để subscribe
 * @param {function} onMessage - Callback khi nhận message
 * @param {object} options - Options cho subscription
 * @param {boolean} options.enabled - Có enable subscription không (default: true)
 * @param {object} options.headers - Headers cho subscription
 * @param {array} options.deps - Dependencies để re-subscribe
 */
export const useSocketSubscription = (destination, onMessage, options = {}) => {
  const { subscribe, isConnected } = useSocket();
  const { enabled = true, headers = {}, deps = [] } = options;
  const unsubscribeRef = useRef(null);
  const onMessageRef = useRef(onMessage);

  // Update callback ref
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled || !destination) return;

    // Cleanup previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    // Create new subscription
    const unsubscribe = subscribe(destination, (data, frame) => {
      onMessageRef.current(data, frame);
    }, headers);

    unsubscribeRef.current = unsubscribe;

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [destination, enabled, subscribe, headers, ...deps]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);
};

/**
 * Hook để send message với queue support
 * @returns {function} sendMessage function
 */
export const useSocketSender = () => {
  const { sendMessage } = useSocket();
  
  return useCallback((destination, message, headers = {}) => {
    return sendMessage(destination, message, headers);
  }, [sendMessage]);
};

/**
 * Hook để lắng nghe connection state changes
 * @param {function} onStateChange - Callback khi state thay đổi
 */
export const useSocketConnectionState = (onStateChange) => {
  const { connectionState, error } = useSocket();
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    if (onStateChangeRef.current) {
      onStateChangeRef.current(connectionState, error);
    }
  }, [connectionState, error]);

  return { connectionState, error };
};

/**
 * Hook để tự động reconnect khi connection bị mất
 * @param {object} options - Reconnection options
 */
export const useSocketAutoReconnect = (options = {}) => {
  const { connect, connectionState, error } = useSocket();
  const { 
    enabled = true, 
    maxAttempts = 5, 
    delay = 5000,
    onReconnect,
    onReconnectFailed 
  } = options;
  
  const [attempts, setAttempts] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (!enabled || connectionState !== 'error' || attempts >= maxAttempts) {
      return;
    }

    console.log(`🔄 Auto-reconnect attempt ${attempts + 1}/${maxAttempts}`);

    timeoutRef.current = setTimeout(async () => {
      try {
        const success = await connect();
        if (success) {
          setAttempts(0);
          if (onReconnect) onReconnect();
        } else {
          setAttempts(prev => prev + 1);
        }
      } catch (error) {
        console.error('Auto-reconnect failed:', error);
        setAttempts(prev => prev + 1);
        
        if (attempts + 1 >= maxAttempts && onReconnectFailed) {
          onReconnectFailed(error);
        }
      }
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [connectionState, attempts, maxAttempts, delay, enabled, connect, onReconnect, onReconnectFailed]);

  // Reset attempts when manually connected
  useEffect(() => {
    if (connectionState === 'connected') {
      setAttempts(0);
    }
  }, [connectionState]);

  return { attempts, maxAttempts };
};

/**
 * Hook để lắng nghe multiple channels cùng lúc
 * @param {array} subscriptions - Array of subscription objects
 * @param {object} options - Global options
 */
export const useSocketMultipleSubscriptions = (subscriptions, options = {}) => {
  const { enabled = true } = options;
  const [messages, setMessages] = useState({});
  const [lastMessages, setLastMessages] = useState({});

  subscriptions.forEach(({ destination, onMessage, headers = {} }) => {
    useSocketSubscription(
      destination,
      useCallback((data, frame) => {
        // Update messages state
        setMessages(prev => ({
          ...prev,
          [destination]: [...(prev[destination] || []), { data, frame, timestamp: Date.now() }]
        }));

        // Update last message
        setLastMessages(prev => ({
          ...prev,
          [destination]: { data, frame, timestamp: Date.now() }
        }));

        // Call individual handler if provided
        if (onMessage) {
          onMessage(data, frame);
        }
      }, [destination, onMessage]),
      { enabled, headers }
    );
  });

  const clearMessages = useCallback((destination) => {
    if (destination) {
      setMessages(prev => ({ ...prev, [destination]: [] }));
    } else {
      setMessages({});
    }
  }, []);

  return {
    messages,
    lastMessages,
    clearMessages
  };
};

/**
 * Hook để implement request-response pattern qua socket
 * @param {string} requestDestination - Channel để gửi request
 * @param {string} responseDestination - Channel để nhận response  
 * @param {object} options - Options
 */
export const useSocketRequestResponse = (requestDestination, responseDestination, options = {}) => {
  const { timeout = 10000 } = options;
  const { sendMessage } = useSocket();
  const [loading, setLoading] = useState(false);
  const pendingRequests = useRef(new Map());

  // Subscribe to response channel
  useSocketSubscription(responseDestination, useCallback((data, frame) => {
    const requestId = data.requestId || frame.headers.requestId;
    if (requestId && pendingRequests.current.has(requestId)) {
      const { resolve } = pendingRequests.current.get(requestId);
      pendingRequests.current.delete(requestId);
      resolve(data);
      setLoading(false);
    }
  }, []), { enabled: true });

  const sendRequest = useCallback(async (data, headers = {}) => {
    const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    return new Promise(async (resolve, reject) => {
      // Store pending request
      const timeoutId = setTimeout(() => {
        pendingRequests.current.delete(requestId);
        setLoading(false);
        reject(new Error('Request timeout'));
      }, timeout);

      pendingRequests.current.set(requestId, { 
        resolve: (data) => {
          clearTimeout(timeoutId);
          resolve(data);
        },
        reject
      });

      try {
        setLoading(true);
        const success = await sendMessage(requestDestination, {
          ...data,
          requestId
        }, {
          ...headers,
          requestId
        });

        if (!success) {
          pendingRequests.current.delete(requestId);
          clearTimeout(timeoutId);
          setLoading(false);
          reject(new Error('Failed to send request'));
        }
      } catch (error) {
        pendingRequests.current.delete(requestId);
        clearTimeout(timeoutId);
        setLoading(false);
        reject(error);
      }
    });
  }, [requestDestination, sendMessage, timeout]);

  // Cleanup pending requests on unmount
  useEffect(() => {
    return () => {
      pendingRequests.current.clear();
    };
  }, []);

  return {
    sendRequest,
    loading
  };
};