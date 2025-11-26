"use client";

import { useEffect, useCallback } from "react";
import { useE2EEStore } from "@/store/e2eeStore";

/**
 * Hook for managing E2EE keys - wrapper around the E2EE store
 * This ensures all components share the same E2EE state
 */
export function useE2EE(userId) {
  const {
    isInitialized,
    isLoading,
    error,
    needsRecovery,
    needsPassphraseSetup,
    hasBackup,
    keyVersion,
    initializeKeys,
    backupPrivateKey,
    restorePrivateKey,
    skipRecoveryAndGenerateNew,
    forceRecovery,
    getSharedKey,
    isFriendE2EEEnabled,
    clearKeys,
    getPublicKeyBase64,
  } = useE2EEStore();

  // Initialize on mount or when userId changes
  useEffect(() => {
    if (userId) {
      initializeKeys(userId);
    }
  }, [userId, initializeKeys]);

  // Wrap getSharedKey to ensure it's memoized properly
  const getSharedKeyMemo = useCallback(
    (friendId) => getSharedKey(friendId),
    [getSharedKey]
  );

  return {
    isInitialized,
    isLoading,
    error,
    needsRecovery,
    needsPassphraseSetup,
    hasBackup,
    keyVersion,
    getSharedKey: getSharedKeyMemo,
    isFriendE2EEEnabled,
    backupPrivateKey,
    restorePrivateKey,
    skipRecoveryAndGenerateNew,
    forceRecovery,
    clearKeys,
    getPublicKeyBase64,
    reinitialize: () => initializeKeys(userId),
  };
}
