import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from 'firebase/auth';
import {
  initAuth,
  googleSignIn,
  logoutGoogle,
  getAccessToken,
  setCachedAccessToken,
} from '../services/googleAuth';
import { sendRealApprovalEmail } from '../services/gmailService';
import { Registration } from '../types';

interface GmailContextType {
  currentUser: User | null;
  hasGmailAuth: boolean;
  isLoadingAuth: boolean;
  autoSendOnApprove: boolean;
  setAutoSendOnApprove: (val: boolean) => void;
  signInWithGoogle: () => Promise<boolean>;
  signOutGoogle: () => Promise<void>;
  sendEmailForRegistration: (reg: Registration, skipConfirm?: boolean) => Promise<{ success: boolean; message?: string }>;
  emailConfirmationModal: {
    isOpen: boolean;
    registration: Registration | null;
    isSending: boolean;
  };
  openEmailConfirmation: (reg: Registration) => void;
  closeEmailConfirmation: () => void;
  confirmSendEmail: () => Promise<void>;
}

const GmailContext = createContext<GmailContextType | undefined>(undefined);

export const GmailProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasGmailAuth, setHasGmailAuth] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);
  const [autoSendOnApprove, setAutoSendOnApprove] = useState<boolean>(true);

  // Explicit user confirmation modal state for sending emails (mandatory per Workspace skill)
  const [emailConfirmationModal, setEmailConfirmationModal] = useState<{
    isOpen: boolean;
    registration: Registration | null;
    isSending: boolean;
  }>({
    isOpen: false,
    registration: null,
    isSending: false,
  });

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUser(user);
        setHasGmailAuth(!!token);
      },
      () => {
        setCurrentUser(null);
        setHasGmailAuth(false);
      }
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<boolean> => {
    setIsLoadingAuth(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setHasGmailAuth(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Sign-in failed:', err);
      return false;
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  const signOutGoogle = useCallback(async () => {
    await logoutGoogle();
    setCurrentUser(null);
    setHasGmailAuth(false);
  }, []);

  const sendEmailForRegistration = useCallback(
    async (
      reg: Registration,
      skipConfirm = false
    ): Promise<{ success: boolean; message?: string }> => {
      const token = await getAccessToken();
      if (!token) {
        return {
          success: false,
          message: 'Google authorization required. Please connect your Gmail account.',
        };
      }

      const getGateForTier = (tier: string) => {
        if (tier.includes('VIP')) return 'Gate 1 (Royal Pavilion Turnstile)';
        if (tier.includes('Clubhouse')) return 'Gate 2 (Clubhouse South Entry)';
        if (tier.includes('Garden')) return 'Gate 3 (Garden Terrace Gate)';
        return 'Gate 4 (Grandstand East Turnstile)';
      };

      const ticketId = reg.ticketId || `PINK-2026-${reg.id.replace('REG-2026-', '')}`;
      const qrValue = reg.qrValue || `PINK-POLO-2026-${ticketId}-${reg.name.toUpperCase().replace(/\s+/g, '-')}`;

      const res = await sendRealApprovalEmail({
        toEmail: reg.email,
        attendeeName: reg.name,
        ticketId,
        tier: reg.tier,
        assignedGate: getGateForTier(reg.tier),
        qrValue,
      });

      if (res.success) {
        return {
          success: true,
          message: `Official pass delivered to ${reg.email} via Gmail (Message ID: ${res.messageId})`,
        };
      } else {
        return {
          success: false,
          message: res.error || 'Failed to send email via Gmail.',
        };
      }
    },
    []
  );

  const openEmailConfirmation = useCallback((reg: Registration) => {
    setEmailConfirmationModal({
      isOpen: true,
      registration: reg,
      isSending: false,
    });
  }, []);

  const closeEmailConfirmation = useCallback(() => {
    setEmailConfirmationModal({
      isOpen: false,
      registration: null,
      isSending: false,
    });
  }, []);

  const confirmSendEmail = useCallback(async () => {
    if (!emailConfirmationModal.registration) return;

    setEmailConfirmationModal((prev) => ({ ...prev, isSending: true }));
    try {
      const res = await sendEmailForRegistration(emailConfirmationModal.registration, true);
      setEmailConfirmationModal({
        isOpen: false,
        registration: null,
        isSending: false,
      });
      return;
    } catch (e) {
      console.error(e);
      setEmailConfirmationModal((prev) => ({ ...prev, isSending: false }));
    }
  }, [emailConfirmationModal.registration, sendEmailForRegistration]);

  return (
    <GmailContext.Provider
      value={{
        currentUser,
        hasGmailAuth,
        isLoadingAuth,
        autoSendOnApprove,
        setAutoSendOnApprove,
        signInWithGoogle,
        signOutGoogle,
        sendEmailForRegistration,
        emailConfirmationModal,
        openEmailConfirmation,
        closeEmailConfirmation,
        confirmSendEmail,
      }}
    >
      {children}
    </GmailContext.Provider>
  );
};

export const useGmail = () => {
  const context = useContext(GmailContext);
  if (!context) {
    throw new Error('useGmail must be used within a GmailProvider');
  }
  return context;
};
