// lib/encryption.ts
import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

// Helper function to ensure key is the correct length
function normalizeKey(key: string): Buffer {
  // If key is base64 encoded, decode it first
  let buffer: Buffer;
  try {
    buffer = Buffer.from(key, 'base64');
  } catch {
    buffer = Buffer.from(key);
  }
  
  // Ensure key is exactly 32 bytes
  if (buffer.length < KEY_LENGTH) {
    // If key is too short, pad it
    buffer = Buffer.concat([buffer, crypto.randomBytes(KEY_LENGTH - buffer.length)]);
  } else if (buffer.length > KEY_LENGTH) {
    // If key is too long, hash it
    buffer = crypto.createHash('sha256').update(buffer).digest();
  }
  
  return buffer;
}

export function encrypt(text: string): string {
  if (!text) {
    throw new Error('Cannot encrypt empty or undefined text');
  }

  try {
    const key = normalizeKey(process.env.ENCRYPTION_KEY || 'fallback-key-that-is-at-least-32-bytes-!!');
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    const encryptedBuffer = Buffer.concat([
      cipher.update(Buffer.from(text, 'utf8')),
      cipher.final()
    ]);
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV, encrypted data, and auth tag
    return Buffer.concat([
      iv,
      encryptedBuffer,
      authTag
    ]).toString('base64');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Encryption failed');
  }
}

export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    throw new Error('Cannot decrypt empty or undefined data');
  }

  try {
    const key = normalizeKey(process.env.ENCRYPTION_KEY || 'fallback-key-that-is-at-least-32-bytes-!!');
    const buffer = Buffer.from(encryptedData, 'base64');

    // Extract the pieces
    const iv = buffer.slice(0, IV_LENGTH);
    const authTag = buffer.slice(buffer.length - AUTH_TAG_LENGTH);
    const encryptedText = buffer.slice(IV_LENGTH, buffer.length - AUTH_TAG_LENGTH);

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Decryption failed');
  }
}

// Testing function
export function testEncryption() {
  try {
    const testText = 'Hello, World!';
    const encrypted = encrypt(testText);
    const decrypted = decrypt(encrypted);
    
    console.log('Test encryption:');
    console.log('Original:', testText);
    console.log('Encrypted:', encrypted);
    console.log('Decrypted:', decrypted);
    console.log('Success:', testText === decrypted);
    
    return testText === decrypted;
  } catch (error) {
    console.error('Test failed:', error);
    return false;
  }
}