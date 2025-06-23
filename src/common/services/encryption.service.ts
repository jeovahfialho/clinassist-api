import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CryptoJS from 'crypto-js';

@Injectable()
export class EncryptionService {
  private readonly key: string;

  constructor(private configService: ConfigService) {
    const key = this.configService.get<string>('ENCRYPTION_KEY');
    if (!key) {
      throw new Error('ENCRYPTION_KEY is not defined in environment variables');
    }
    this.key = key;
  }

  encrypt(text: string): string {
    if (!text) return text;
    return CryptoJS.AES.encrypt(text, this.key).toString();
  }

  decrypt(encryptedText: string): string {
    if (!encryptedText) return encryptedText;
    const bytes = CryptoJS.AES.decrypt(encryptedText, this.key);
    return bytes.toString(CryptoJS.enc.Utf8);
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
          decrypted[key] = value; // Se não conseguir descriptografar, mantém original
        }
      } else {
        decrypted[key] = value;
      }
    }
    return decrypted;
  }
}
