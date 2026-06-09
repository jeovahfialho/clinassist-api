import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService {
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const keyHex = this.configService.get<string>('ENCRYPTION_KEY');
    if (!keyHex) {
      throw new Error('ENCRYPTION_KEY is not defined in environment variables');
    }
    this.key = Buffer.from(keyHex.padEnd(32, '0').slice(0, 32), 'utf-8');
  }

  encrypt(text: string): string {
    if (!text) return text;
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText) return encryptedText;
    try {
      const data = Buffer.from(encryptedText, 'base64');
      if (data.length < 28) {
        return this.decryptLegacy(encryptedText);
      }
      const iv = data.subarray(0, 12);
      const authTag = data.subarray(12, 28);
      const encrypted = data.subarray(28);
      const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
      decipher.setAuthTag(authTag);
      return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    } catch {
      return this.decryptLegacy(encryptedText);
    }
  }

  private decryptLegacy(encryptedText: string): string {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const CryptoJS = require('crypto-js');
      const keyStr = this.configService.get<string>('ENCRYPTION_KEY');
      const bytes = CryptoJS.AES.decrypt(encryptedText, keyStr);
      const result = bytes.toString(CryptoJS.enc.Utf8);
      if (!result) throw new Error('Empty decryption result');
      return result;
    } catch {
      return encryptedText;
    }
  }

  encryptObject(obj: Record<string, any>): Record<string, any> {
    const encrypted = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value) {
        encrypted[key] = this.encrypt(value);
      } else {
        encrypted[key] = value;
      }
    }
    return encrypted;
  }

  decryptObject(obj: Record<string, any>): Record<string, any> {
    const decrypted = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && value) {
        try {
          decrypted[key] = this.decrypt(value);
        } catch {
          decrypted[key] = value;
        }
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }
}
