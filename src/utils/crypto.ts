import CryptoJS from 'crypto-js';

// Generar
export function generateLicenseKey() {
  const array = new Uint8Array(18);
  crypto.getRandomValues(array);
  const randomHex = Array.from(array)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  return `ts_${randomHex}`;
}

// Hash (Buscar)
export function hashLicense(license) {
  return CryptoJS.SHA256(license).toString();
}

// Encriptar (Guardar)
export function encryptLicense(license, masterKey) {
  if (!masterKey) throw new Error("Falta MASTER_KEY");
  return CryptoJS.AES.encrypt(license, masterKey).toString();
}

// Desencriptar (Leer)
export function decryptLicense(encryptedLicense, masterKey) {
  if (!masterKey) return "Error: No Master Key";
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedLicense, masterKey);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch (e) {
    return "Error decrypting";
  }
}
