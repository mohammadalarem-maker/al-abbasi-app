// crypto.utils.js — تشفير بيانات الإدارة المحلية
// Simple XOR + Base64 encoding for local credential storage

const SECRET_KEY = 'ALABBASI_SECURE_2024_XK9';

const CryptoUtils = {
  encrypt(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length)
      );
    }
    return btoa(unescape(encodeURIComponent(result)));
  },

  decrypt(encoded) {
    try {
      const text = decodeURIComponent(escape(atob(encoded)));
      let result = '';
      for (let i = 0; i < text.length; i++) {
        result += String.fromCharCode(
          text.charCodeAt(i) ^ SECRET_KEY.charCodeAt(i % SECRET_KEY.length)
        );
      }
      return result;
    } catch {
      return '{}';
    }
  },

  hash(text) {
    // Simple deterministic hash for staff passwords
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36) + text.length.toString(36);
  }
};

export default CryptoUtils;
