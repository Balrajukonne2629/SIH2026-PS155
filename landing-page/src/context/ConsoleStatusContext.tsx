import React, { createContext, useContext, useState, useEffect } from 'react';

interface ConsoleStatusContextType {
  isOnline: boolean | null; // null = checking, true = up, false = offline
  checkNow: () => Promise<boolean>;
  openConsoleOrModal: (e?: React.MouseEvent) => void;
  isModalOpen: boolean;
  closeModal: () => void;
}

const ConsoleStatusContext = createContext<ConsoleStatusContextType | undefined>(undefined);

export const ConsoleStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const checkConnection = async (): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      
      // mode: 'no-cors' allows detecting if a server is listening on port 3000 even without CORS headers
      await fetch('http://localhost:3000', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      setIsOnline(true);
      return true;
    } catch {
      setIsOnline(false);
      return false;
    }
  };

  useEffect(() => {
    checkConnection();
    // Poll every 10 seconds to keep live state fresh
    const interval = setInterval(checkConnection, 10000);
    return () => clearInterval(interval);
  }, []);

  const openConsoleOrModal = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    // Quick probe before navigating
    const online = await checkConnection();
    if (online) {
      window.open('http://localhost:3000', '_blank', 'noopener,noreferrer');
    } else {
      setIsModalOpen(true);
    }
  };

  return (
    <ConsoleStatusContext.Provider 
      value={{ 
        isOnline, 
        checkNow: checkConnection, 
        openConsoleOrModal, 
        isModalOpen, 
        closeModal: () => setIsModalOpen(false) 
      }}
    >
      {children}
    </ConsoleStatusContext.Provider>
  );
};

export const useConsoleStatus = () => {
  const context = useContext(ConsoleStatusContext);
  if (!context) {
    throw new Error('useConsoleStatus must be used within a ConsoleStatusProvider');
  }
  return context;
};
