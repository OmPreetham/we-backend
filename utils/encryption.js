import crypto from 'crypto';

// Secret keys from environment variables
const EMAIL_HASH_SECRET_KEY = process.env.EMAIL_HASH_SECRET_KEY; // Must be a secure, random string
const EMAIL_ENCRYPTION_SECRET_KEY = process.env.EMAIL_ENCRYPTION_SECRET_KEY; // 32 bytes hexadecimal
const EMAIL_ENCRYPTION_IV = process.env.EMAIL_ENCRYPTION_IV; // 16 bytes hexadecimal

// Function to hash the email using HMAC-SHA256
export const hashEmail = (email) => {
  const hmac = crypto.createHmac('sha256', EMAIL_HASH_SECRET_KEY);
  hmac.update(email);
  return hmac.digest('hex');
};

// Function to encrypt data
export const encryptData = (data) => {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(EMAIL_ENCRYPTION_SECRET_KEY, 'hex');
  const iv = Buffer.from(EMAIL_ENCRYPTION_IV, 'hex');
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
};

// Function to decrypt data
export const decryptData = (encryptedData) => {
  const algorithm = 'aes-256-cbc';
  const key = Buffer.from(EMAIL_ENCRYPTION_SECRET_KEY, 'hex');
  const iv = Buffer.from(EMAIL_ENCRYPTION_IV, 'hex');
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};