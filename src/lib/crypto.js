/**
 * End-to-End Encryption (E2EE) Cryptography Utilities
 * Uses ECDH for key exchange and AES-GCM for symmetric encryption
 */

const ECDH_ALGORITHM = {
  name: "ECDH",
  namedCurve: "P-256",
};

const AES_ALGORITHM = {
  name: "AES-GCM",
  length: 256,
};

/**
 * Generate a new ECDH key pair for the user
 * @returns {Promise<{publicKey: CryptoKey, privateKey: CryptoKey}>}
 */
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(ECDH_ALGORITHM, true, [
    "deriveKey",
    "deriveBits",
  ]);
  return keyPair;
}

/**
 * Export a public key to base64 string for storage/transmission
 * @param {CryptoKey} publicKey
 * @returns {Promise<string>}
 */
export async function exportPublicKey(publicKey) {
  const exported = await crypto.subtle.exportKey("spki", publicKey);
  return arrayBufferToBase64(exported);
}

/**
 * Import a public key from base64 string
 * @param {string} base64Key
 * @returns {Promise<CryptoKey>}
 */
export async function importPublicKey(base64Key) {
  const keyBuffer = base64ToArrayBuffer(base64Key);
  return crypto.subtle.importKey(
    "spki",
    keyBuffer,
    ECDH_ALGORITHM,
    true,
    []
  );
}

/**
 * Export a private key to base64 string (for encryption/backup)
 * @param {CryptoKey} privateKey
 * @returns {Promise<string>}
 */
export async function exportPrivateKey(privateKey) {
  const exported = await crypto.subtle.exportKey("pkcs8", privateKey);
  return arrayBufferToBase64(exported);
}

/**
 * Import a private key from base64 string
 * @param {string} base64Key
 * @returns {Promise<CryptoKey>}
 */
export async function importPrivateKey(base64Key) {
  const keyBuffer = base64ToArrayBuffer(base64Key);
  return crypto.subtle.importKey(
    "pkcs8",
    keyBuffer,
    ECDH_ALGORITHM,
    true,
    ["deriveKey", "deriveBits"]
  );
}

/**
 * Derive a shared secret key from our private key and their public key
 * This creates the same key on both ends for symmetric encryption
 * @param {CryptoKey} privateKey - Our private key
 * @param {CryptoKey} publicKey - Their public key
 * @returns {Promise<CryptoKey>}
 */
export async function deriveSharedKey(privateKey, publicKey) {
  return crypto.subtle.deriveKey(
    {
      name: "ECDH",
      public: publicKey,
    },
    privateKey,
    AES_ALGORITHM,
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a message using AES-GCM
 * @param {string} message - The plaintext message
 * @param {CryptoKey} sharedKey - The derived shared key
 * @returns {Promise<{ciphertext: string, iv: string}>}
 */
export async function encryptMessage(message, sharedKey) {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // Generate a random IV for each message
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    sharedKey,
    data
  );
  
  return {
    ciphertext: arrayBufferToBase64(ciphertext),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt a message using AES-GCM
 * @param {string} ciphertextBase64 - The encrypted message in base64
 * @param {string} ivBase64 - The IV in base64
 * @param {CryptoKey} sharedKey - The derived shared key
 * @returns {Promise<string>}
 */
export async function decryptMessage(ciphertextBase64, ivBase64, sharedKey) {
  const ciphertext = base64ToArrayBuffer(ciphertextBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
    },
    sharedKey,
    ciphertext
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Derive an encryption key from a password using PBKDF2
 * Used to encrypt the private key for backup
 * @param {string} password - User's recovery password
 * @param {Uint8Array} salt - Random salt
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKeyFromPassword(password, salt) {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt,
      iterations: 100000,
      hash: "SHA-256",
    },
    passwordKey,
    AES_ALGORITHM,
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt the private key for backup using a password
 * @param {CryptoKey} privateKey - The private key to encrypt
 * @param {string} password - User's recovery password
 * @returns {Promise<{encryptedPrivateKey: string, salt: string, iv: string}>}
 */
export async function encryptPrivateKeyForBackup(privateKey, password) {
  // Export the private key
  const exportedKey = await exportPrivateKey(privateKey);
  const keyData = new TextEncoder().encode(exportedKey);
  
  // Generate salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Derive encryption key from password
  const encryptionKey = await deriveKeyFromPassword(password, salt);
  
  // Encrypt the private key
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: iv,
    },
    encryptionKey,
    keyData
  );
  
  return {
    encryptedPrivateKey: arrayBufferToBase64(encrypted),
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
  };
}

/**
 * Decrypt the private key from backup using a password
 * @param {string} encryptedPrivateKey - The encrypted private key in base64
 * @param {string} password - User's recovery password
 * @param {string} saltBase64 - The salt in base64
 * @param {string} ivBase64 - The IV in base64
 * @returns {Promise<CryptoKey>}
 */
export async function decryptPrivateKeyFromBackup(encryptedPrivateKey, password, saltBase64, ivBase64) {
  const salt = base64ToArrayBuffer(saltBase64);
  const iv = base64ToArrayBuffer(ivBase64);
  const encrypted = base64ToArrayBuffer(encryptedPrivateKey);
  
  // Derive decryption key from password
  const decryptionKey = await deriveKeyFromPassword(password, new Uint8Array(salt));
  
  // Decrypt the private key
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: new Uint8Array(iv),
    },
    decryptionKey,
    encrypted
  );
  
  // Import the private key
  const decoder = new TextDecoder();
  const privateKeyBase64 = decoder.decode(decrypted);
  return importPrivateKey(privateKeyBase64);
}

/**
 * Generate a random salt
 * @param {number} length - Length in bytes
 * @returns {Uint8Array}
 */
export function generateSalt(length = 16) {
  return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Convert ArrayBuffer to base64 string
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 * @param {string} base64
 * @returns {ArrayBuffer}
 */
export function base64ToArrayBuffer(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Check if the message is encrypted (has the E2EE format)
 * @param {object} message - The message object
 * @returns {boolean}
 */
export function isEncryptedMessage(message) {
  return message && message.encrypted === true && message.ciphertext && message.iv;
}

/**
 * Create an encrypted message payload
 * @param {string} ciphertext - The encrypted content
 * @param {string} iv - The initialization vector
 * @returns {object}
 */
export function createEncryptedPayload(ciphertext, iv) {
  return {
    encrypted: true,
    ciphertext,
    iv,
  };
}

/**
 * Parse an encrypted message content
 * @param {string|object} content - The message content (could be JSON string or object)
 * @returns {object|null}
 */
export function parseEncryptedContent(content) {
  try {
    const parsed = typeof content === "string" ? JSON.parse(content) : content;
    if (isEncryptedMessage(parsed)) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}
