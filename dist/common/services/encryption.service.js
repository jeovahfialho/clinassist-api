"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EncryptionService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const CryptoJS = require("crypto-js");
let EncryptionService = class EncryptionService {
    configService;
    key;
    constructor(configService) {
        this.configService = configService;
        const key = this.configService.get('ENCRYPTION_KEY');
        if (!key) {
            throw new Error('ENCRYPTION_KEY is not defined in environment variables');
        }
        this.key = key;
    }
    encrypt(text) {
        if (!text)
            return text;
        return CryptoJS.AES.encrypt(text, this.key).toString();
    }
    decrypt(encryptedText) {
        if (!encryptedText)
            return encryptedText;
        const bytes = CryptoJS.AES.decrypt(encryptedText, this.key);
        return bytes.toString(CryptoJS.enc.Utf8);
    }
    encryptObject(obj) {
        const encrypted = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && value) {
                encrypted[key] = this.encrypt(value);
            }
            else {
                encrypted[key] = value;
            }
        }
        return encrypted;
    }
    decryptObject(obj) {
        const decrypted = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string' && value) {
                try {
                    decrypted[key] = this.decrypt(value);
                }
                catch {
                    decrypted[key] = value;
                }
            }
            else {
                decrypted[key] = value;
            }
        }
        return decrypted;
    }
};
exports.EncryptionService = EncryptionService;
exports.EncryptionService = EncryptionService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], EncryptionService);
//# sourceMappingURL=encryption.service.js.map