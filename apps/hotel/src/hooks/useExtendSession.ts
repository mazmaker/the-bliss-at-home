/**
 * Hotel App - useExtendSession Hook
 * React hook for managing booking extension functionality
 */

import { useState, useCallback } from 'react';
import {
  extendBookingSession,
  getExtensionOptions
} from '../services/extendSessionService';
import {
  ExtendSessionRequest,
  ExtendSessionResponse,
  ExtensionOption,
  ExtensionError,
  ExtensionErrorCode
} from '../types/extendSession';

interface UseExtendSessionState {
  loading: boolean;
  error: string | null;
  extensionOptions: ExtensionOption[];
  lastExtensionResult: ExtendSessionResponse | null;
}

interface UseExtendSessionActions {
  extendSession: (request: ExtendSessionRequest) => Promise<ExtendSessionResponse | null>;
  loadExtensionOptions: (bookingId: string) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

type UseExtendSessionReturn = UseExtendSessionState & UseExtendSessionActions;

/**
 * Hook for managing booking extension functionality
 */
export function useExtendSession(): UseExtendSessionReturn {
  const [state, setState] = useState<UseExtendSessionState>({
    loading: false,
    error: null,
    extensionOptions: [],
    lastExtensionResult: null
  });

  /**
   * Extend a booking session
   */
  const extendSession = useCallback(async (
    request: ExtendSessionRequest
  ): Promise<ExtendSessionResponse | null> => {
    console.log('🔄 Hook: Starting extend session:', request);

    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }));

    try {
      const result = await extendBookingSession(request);

      setState(prev => ({
        ...prev,
        loading: false,
        lastExtensionResult: result
      }));

      // Show success feedback
      if (typeof window !== 'undefined') {
        // You could use a toast library here instead of alert
        const message = `เพิ่มเวลาสำเร็จ!\n` +
                       `⏱️ เวลารวม: ${result.timing.newTotalDuration} นาที\n` +
                       `💰 ราคารวม: ฿${result.pricing.newTotalPrice.toLocaleString()}`;
        alert(message);
      }

      console.log('✅ Hook: Extension successful:', result);
      return result;

    } catch (error) {
      console.error('❌ Hook: Extension failed:', error);

      let errorMessage = 'เกิดข้อผิดพลาดไม่ทราบสาเหตุ';

      if (error instanceof ExtensionError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage
      }));

      // Show error feedback
      if (typeof window !== 'undefined') {
        alert(`ไม่สามารถเพิ่มเวลาได้: ${errorMessage}`);
      }

      return null;
    }
  }, []);

  /**
   * Load available extension options for a booking
   */
  const loadExtensionOptions = useCallback(async (bookingId: string): Promise<void> => {
    console.log('🔍 Hook: Loading extension options for booking:', bookingId);

    setState(prev => ({
      ...prev,
      loading: true,
      error: null
    }));

    try {
      const options = await getExtensionOptions(bookingId);

      setState(prev => ({
        ...prev,
        loading: false,
        extensionOptions: options
      }));

      console.log('✅ Hook: Extension options loaded:', options);

    } catch (error) {
      console.error('❌ Hook: Failed to load extension options:', error);

      let errorMessage = 'ไม่สามารถโหลดตัวเลือกเพิ่มเวลาได้';

      if (error instanceof ExtensionError) {
        errorMessage = error.message;
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
        extensionOptions: []
      }));
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  /**
   * Reset all state
   */
  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      extensionOptions: [],
      lastExtensionResult: null
    });
  }, []);

  return {
    // State
    loading: state.loading,
    error: state.error,
    extensionOptions: state.extensionOptions,
    lastExtensionResult: state.lastExtensionResult,

    // Actions
    extendSession,
    loadExtensionOptions,
    clearError,
    reset
  };
}

/**
 * Hook for validation before extending
 */
export function useExtensionValidation() {
  const [validating, setValidating] = useState(false);

  const validateExtension = useCallback(async (bookingId: string) => {
    setValidating(true);

    try {
      // Load extension options to check if extension is possible
      const options = await getExtensionOptions(bookingId);

      const canExtend = options.length > 0;
      const hasAvailableOptions = options.some(opt => opt.isAvailable);

      return {
        canExtend: canExtend && hasAvailableOptions,
        options,
        reasons: canExtend
          ? []
          : ['ไม่มีตัวเลือกเวลาที่สามารถเพิ่มได้']
      };

    } catch (error) {
      console.error('Validation error:', error);

      return {
        canExtend: false,
        options: [],
        reasons: [
          error instanceof ExtensionError
            ? error.message
            : 'ไม่สามารถตรวจสอบได้'
        ]
      };

    } finally {
      setValidating(false);
    }
  }, []);

  return {
    validating,
    validateExtension
  };
}

/**
 * Utility hooks for common extension checks
 */
export function useExtensionStatus(booking: any) {
  return {
    canExtend: booking?.status === 'confirmed' && (booking?.extension_count || 0) < 3,
    extensionCount: booking?.extension_count || 0,
    maxExtensionsReached: (booking?.extension_count || 0) >= 3,
    hasExtensions: (booking?.extension_count || 0) > 0,
    lastExtendedAt: booking?.last_extended_at,
    totalExtensionPrice: booking?.total_extensions_price || 0
  };
}