"use client";

import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { supabase } from "@/lib/supabase";
import {
  generateKeyPair,
  exportPublicKey,
  importPublicKey,
  importPrivateKey,
  exportPrivateKey,
  deriveSharedKey,
  encryptPrivateKeyForBackup,
  decryptPrivateKeyFromBackup,
} from "@/lib/crypto";

const E2EE_KEYS_STORAGE_KEY = "e2ee_keys";

export const useE2EEStore = create((set, get) => ({
  // State
  isInitialized: false,
  isLoading: false,
  error: null,
  needsRecovery: false,
  needsPassphraseSetup: false,
  hasBackup: false,
  userId: null,
  keyVersion: 0, // Increment when keys change to trigger re-decryption
  
  // Keys stored in memory (not persisted in Zustand)
  publicKey: null,
  privateKey: null,
  
  // Cache for derived shared keys (friendId -> CryptoKey)
  sharedKeysCache: new Map(),

  // Actions
  setUserId: (userId) => set({ userId }),
  
  /**
   * Initialize E2EE keys for the user
   */
  initializeKeys: async (userId) => {
    if (!userId) return;
    
    const state = get();
    // Prevent re-initialization if already initialized for same user
    if (state.isInitialized && state.userId === userId) {
      return;
    }
    
    console.log("[E2EE] Initializing keys for user:", userId);
    set({ 
      isLoading: true, 
      error: null, 
      needsRecovery: false, 
      needsPassphraseSetup: false,
      userId 
    });
    
    try {
      // Try to load from IndexedDB first
      const storedKeys = await idbGet(`${E2EE_KEYS_STORAGE_KEY}_${userId}`);
      console.log("[E2EE] Stored keys in IndexedDB:", !!storedKeys);
      
      if (storedKeys && storedKeys.privateKey && storedKeys.publicKey) {
        // Import keys from stored base64 strings
        const privateKey = await importPrivateKey(storedKeys.privateKey);
        const publicKey = await importPublicKey(storedKeys.publicKey);
        console.log("[E2EE] Keys loaded from IndexedDB successfully");
        console.log("[E2EE] My public key:", storedKeys.publicKey.substring(0, 50) + "...");
        
        set({ 
          publicKey, 
          privateKey, 
          isInitialized: true, 
          isLoading: false 
        });
        
        // Check if backup exists
        const { data: userData } = await supabase
          .from("User")
          .select("encrypted_private_key")
          .eq("id", userId)
          .single();
        
        const hasBackup = !!userData?.encrypted_private_key;
        set({ hasBackup });
        
        // If no backup, prompt user to set up recovery passphrase
        if (!hasBackup) {
          set({ needsPassphraseSetup: true });
        }
        return;
      }
      
      // No local keys - check if backup exists on server
      const { data: userData, error: fetchError } = await supabase
        .from("User")
        .select("public_key, encrypted_private_key, key_salt, key_iv")
        .eq("id", userId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // If user has encrypted backup, they need to enter recovery passphrase
      if (userData?.encrypted_private_key) {
        console.log("[E2EE] Backup found on server - need recovery passphrase");
        set({ needsRecovery: true, hasBackup: true, isLoading: false });
        return;
      }
      
      // No local keys and no backup - generate new keys
      console.log("[E2EE] Generating new key pair...");
      const keyPair = await generateKeyPair();
      
      // Export keys for storage
      const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
      const privateKeyBase64 = await exportPrivateKey(keyPair.privateKey);
      
      console.log("[E2EE] New public key:", publicKeyBase64.substring(0, 50) + "...");
      
      // Store in IndexedDB
      await idbSet(`${E2EE_KEYS_STORAGE_KEY}_${userId}`, {
        publicKey: publicKeyBase64,
        privateKey: privateKeyBase64,
      });
      
      // Update public key in Supabase
      const { error: updateError } = await supabase
        .from("User")
        .update({ public_key: publicKeyBase64 })
        .eq("id", userId);
      
      if (updateError) {
        console.error("[E2EE] Failed to update public key in Supabase:", updateError);
      }
      
      set({ 
        publicKey: keyPair.publicKey, 
        privateKey: keyPair.privateKey, 
        isInitialized: true, 
        needsPassphraseSetup: true,
        hasBackup: false,
        isLoading: false 
      });
    } catch (err) {
      console.error("E2EE initialization error:", err);
      set({ error: err.message, isLoading: false });
    }
  },

  /**
   * Backup the private key to Supabase (encrypted with password)
   */
  backupPrivateKey: async (password) => {
    const state = get();
    if (!state.privateKey || !state.userId) {
      throw new Error("No private key to backup");
    }
    
    const { encryptedPrivateKey, salt, iv } = await encryptPrivateKeyForBackup(
      state.privateKey,
      password
    );
    
    const { error } = await supabase
      .from("User")
      .update({
        encrypted_private_key: encryptedPrivateKey,
        key_salt: salt,
        key_iv: iv,
      })
      .eq("id", state.userId);
    
    if (error) throw error;
    
    set({ hasBackup: true, needsPassphraseSetup: false });
    return true;
  },

  /**
   * Restore the private key from Supabase backup
   */
  restorePrivateKey: async (password) => {
    const state = get();
    if (!state.userId) {
      throw new Error("No user ID");
    }
    
    const { data: userData, error: fetchError } = await supabase
      .from("User")
      .select("public_key, encrypted_private_key, key_salt, key_iv")
      .eq("id", state.userId)
      .single();
    
    if (fetchError) throw fetchError;
    
    if (!userData?.encrypted_private_key) {
      throw new Error("No backup found");
    }
    
    const privateKey = await decryptPrivateKeyFromBackup(
      userData.encrypted_private_key,
      password,
      userData.key_salt,
      userData.key_iv
    );
    
    const publicKey = await importPublicKey(userData.public_key);
    
    // Store in IndexedDB
    const privateKeyBase64 = await exportPrivateKey(privateKey);
    await idbSet(`${E2EE_KEYS_STORAGE_KEY}_${state.userId}`, {
      publicKey: userData.public_key,
      privateKey: privateKeyBase64,
    });
    
    // Clear shared keys cache and update state, increment keyVersion to trigger re-decryption
    set({ 
      publicKey, 
      privateKey, 
      sharedKeysCache: new Map(),
      isInitialized: true, 
      needsRecovery: false, 
      hasBackup: true,
      keyVersion: state.keyVersion + 1,
    });
    
    console.log("[E2EE] Keys restored successfully, keyVersion:", state.keyVersion + 1);
    return true;
  },

  /**
   * Skip recovery and generate new keys
   */
  skipRecoveryAndGenerateNew: async () => {
    const state = get();
    if (!state.userId) return;
    
    console.log("[E2EE] Skipping recovery, generating new keys...");
    
    const keyPair = await generateKeyPair();
    const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
    const privateKeyBase64 = await exportPrivateKey(keyPair.privateKey);
    
    // Store in IndexedDB
    await idbSet(`${E2EE_KEYS_STORAGE_KEY}_${state.userId}`, {
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64,
    });
    
    // Update public key in Supabase and clear old backup
    const { error: updateError } = await supabase
      .from("User")
      .update({ 
        public_key: publicKeyBase64,
        encrypted_private_key: null,
        key_salt: null,
        key_iv: null,
      })
      .eq("id", state.userId);
    
    if (updateError) {
      console.error("[E2EE] Failed to update keys in Supabase:", updateError);
    }
    
    set({ 
      publicKey: keyPair.publicKey, 
      privateKey: keyPair.privateKey, 
      sharedKeysCache: new Map(),
      isInitialized: true, 
      needsRecovery: false, 
      needsPassphraseSetup: true,
      hasBackup: false,
      keyVersion: state.keyVersion + 1,
    });
    
    return true;
  },

  /**
   * Get or derive a shared key for a specific friend
   */
  getSharedKey: async (friendId) => {
    const state = get();
    console.log("[E2EE] getSharedKey called for:", friendId);
    console.log("[E2EE] Private key available:", !!state.privateKey);
    
    if (!state.privateKey) {
      console.error("[E2EE] Private key not available");
      return null;
    }
    
    // Check cache first
    if (state.sharedKeysCache.has(friendId)) {
      console.log("[E2EE] Returning cached shared key");
      return state.sharedKeysCache.get(friendId);
    }
    
    try {
      // Fetch friend's public key from Supabase
      const { data: friendData, error } = await supabase
        .from("User")
        .select("public_key")
        .eq("id", friendId)
        .single();
      
      console.log("[E2EE] Friend public key data:", !!friendData?.public_key, "error:", error);
      
      if (error || !friendData?.public_key) {
        console.error("[E2EE] Friend's public key not found:", error);
        return null;
      }
      
      // Import friend's public key
      const friendPublicKey = await importPublicKey(friendData.public_key);
      console.log("[E2EE] Friend public key imported");
      
      // Derive shared key
      const sharedKey = await deriveSharedKey(state.privateKey, friendPublicKey);
      console.log("[E2EE] Shared key derived successfully");
      
      // Cache it
      const newCache = new Map(state.sharedKeysCache);
      newCache.set(friendId, sharedKey);
      set({ sharedKeysCache: newCache });
      
      return sharedKey;
    } catch (err) {
      console.error("[E2EE] Error deriving shared key:", err);
      return null;
    }
  },

  /**
   * Check if a friend has E2EE enabled
   */
  isFriendE2EEEnabled: async (friendId) => {
    try {
      const { data, error } = await supabase
        .from("User")
        .select("public_key")
        .eq("id", friendId)
        .single();
      
      if (error) return false;
      return !!data?.public_key;
    } catch {
      return false;
    }
  },

  /**
   * Clear all E2EE keys (for logout)
   */
  clearKeys: async () => {
    const state = get();
    if (state.userId) {
      await idbSet(`${E2EE_KEYS_STORAGE_KEY}_${state.userId}`, null);
    }
    set({ 
      publicKey: null, 
      privateKey: null, 
      sharedKeysCache: new Map(),
      isInitialized: false,
      userId: null 
    });
  },

  /**
   * Force recovery mode - clears local keys and prompts for passphrase
   * Use when decryption fails due to key mismatch
   */
  forceRecovery: async () => {
    const state = get();
    if (!state.userId) return;
    
    // Check if backup exists
    const { data: userData } = await supabase
      .from("User")
      .select("encrypted_private_key")
      .eq("id", state.userId)
      .single();
    
    if (!userData?.encrypted_private_key) {
      throw new Error("No backup found. You'll need to generate new keys.");
    }
    
    // Clear local keys
    await idbSet(`${E2EE_KEYS_STORAGE_KEY}_${state.userId}`, null);
    
    set({ 
      publicKey: null, 
      privateKey: null, 
      sharedKeysCache: new Map(),
      isInitialized: false,
      needsRecovery: true,
      hasBackup: true,
    });
    
    console.log("[E2EE] Forced recovery mode - please enter passphrase");
  },

  /**
   * Get the current public key as base64
   */
  getPublicKeyBase64: async () => {
    const state = get();
    if (!state.publicKey) return null;
    return exportPublicKey(state.publicKey);
  },
}));
