"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertTriangle, X } from "lucide-react";

export default function RecoveryPassphraseModal({
  isOpen,
  mode, // 'setup' | 'recovery'
  onSetupPassphrase,
  onRecoverWithPassphrase,
  onSkipRecovery,
  onClose,
  isLoading = false,
  error = null,
}) {
  const [passphrase, setPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [localError, setLocalError] = useState("");

  const handleSetup = async () => {
    setLocalError("");
    
    if (passphrase.length < 8) {
      setLocalError("Passphrase must be at least 8 characters");
      return;
    }
    
    if (passphrase !== confirmPassphrase) {
      setLocalError("Passphrases do not match");
      return;
    }
    
    try {
      await onSetupPassphrase(passphrase);
      setPassphrase("");
      setConfirmPassphrase("");
    } catch (err) {
      setLocalError(err.message || "Failed to set up recovery");
    }
  };

  const handleRecover = async () => {
    setLocalError("");
    
    if (!passphrase) {
      setLocalError("Please enter your recovery passphrase");
      return;
    }
    
    try {
      await onRecoverWithPassphrase(passphrase);
      setPassphrase("");
    } catch (err) {
      setLocalError(err.message || "Incorrect passphrase or recovery failed");
    }
  };

  const handleSkip = async () => {
    setLocalError("");
    try {
      await onSkipRecovery();
      setPassphrase("");
      setConfirmPassphrase("");
    } catch (err) {
      setLocalError(err.message || "Failed to skip recovery");
    }
  };

  if (!isOpen) return null;

  const displayError = localError || error;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-sm bg-black/60 border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 pb-4 text-center relative">
            {onClose && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white/60 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-white/10 flex items-center justify-center">
              <KeyRound className="w-7 h-7 text-orange" />
            </div>
            <h2 className="text-xl font-semibold text-white mb-1">
              {mode === "setup" ? "Secure Your Keys" : "Recover Your Keys"}
            </h2>
            <p className="text-sm text-white/50">
              {mode === "setup" 
                ? "Create a recovery passphrase for your encryption keys" 
                : "Enter your passphrase to restore access"
              }
            </p>
          </div>

          {/* Content */}
          <div className="px-6 pb-4 space-y-4">
            {mode === "setup" ? (
              <>
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      type={showPassphrase ? "text" : "password"}
                      value={passphrase}
                      onChange={(e) => setPassphrase(e.target.value)}
                      placeholder="Enter recovery passphrase"
                      autoComplete="new-password"
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder:text-white/40 focus:outline-none focus:border-orange/50 transition-all duration-300"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassphrase(!showPassphrase)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                    >
                      {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  
                  <input
                    type={showPassphrase ? "text" : "password"}
                    value={confirmPassphrase}
                    onChange={(e) => setConfirmPassphrase(e.target.value)}
                    placeholder="Confirm passphrase"
                    autoComplete="new-password"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder:text-white/40 focus:outline-none focus:border-orange/50 transition-all duration-300"
                    disabled={isLoading}
                  />
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-orange/10 border border-orange/20 rounded-xl">
                  <AlertTriangle className="w-4 h-4 text-orange shrink-0 mt-0.5" />
                  <p className="text-xs text-white/70 leading-relaxed">
                    Store this passphrase safely. You&apos;ll need it to access encrypted messages on new devices.
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="relative">
                  <input
                    type={showPassphrase ? "text" : "password"}
                    value={passphrase}
                    onChange={(e) => setPassphrase(e.target.value)}
                    placeholder="Enter recovery passphrase"
                    autoComplete="current-password"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-full text-white placeholder:text-white/40 focus:outline-none focus:border-orange/50 transition-all duration-300"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassphrase(!showPassphrase)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPassphrase ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex items-start gap-2.5 p-3 bg-white/5 border border-white/10 rounded-xl">
                  <ShieldCheck className="w-4 h-4 text-white/50 shrink-0 mt-0.5" />
                  <p className="text-xs text-white/50 leading-relaxed">
                    We found a backup of your encryption keys. Enter your passphrase to restore them.
                  </p>
                </div>
              </>
            )}

            {displayError && (
              <div className="flex items-start gap-2.5 p-3 bg-red/10 border border-red/20 rounded-xl">
                <AlertTriangle className="w-4 h-4 text-red shrink-0 mt-0.5" />
                <p className="text-xs text-red leading-relaxed">{displayError}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 pt-2 space-y-2.5">
            {mode === "setup" ? (
              <>
                <button
                  onClick={handleSetup}
                  disabled={isLoading || !passphrase || !confirmPassphrase}
                  className="w-full px-6 py-3 bg-white/80 hover:bg-white border border-white/40 text-black/80 hover:text-black font-semibold rounded-full cursor-pointer transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Setting up..." : "Set Up Recovery"}
                </button>
                {onClose && (
                  <button
                    onClick={onClose}
                    disabled={isLoading}
                    className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white font-medium rounded-full transition-all duration-300 ease-in-out"
                  >
                    Skip for now
                  </button>
                )}
              </>
            ) : (
              <>
                <button
                  onClick={handleRecover}
                  disabled={isLoading || !passphrase}
                  className="w-full px-6 py-3 bg-white/80 hover:bg-white border border-white/40 text-black/80 hover:text-black font-semibold rounded-full cursor-pointer transition-all duration-300 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Recovering..." : "Recover Keys"}
                </button>
                <button
                  onClick={handleSkip}
                  disabled={isLoading}
                  className="w-full px-6 py-3 bg-white/10 hover:bg-white/20 text-white/70 hover:text-white font-medium rounded-full transition-all duration-300 ease-in-out"
                >
                  Start Fresh
                </button>
                <p className="text-center text-[10px] text-white/30 mt-1">
                  Starting fresh will generate new keys and you won&apos;t be able to read old messages
                </p>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
