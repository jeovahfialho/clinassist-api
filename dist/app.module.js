"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const auth_module_1 = require("./auth/auth.module");
const patients_module_1 = require("./patients/patients.module");
const sessions_module_1 = require("./sessions/sessions.module");
const fireflies_module_1 = require("./fireflies/fireflies.module");
const documents_module_1 = require("./documents/documents.module");
const prisma_service_1 = require("./database/prisma.service");
const encryption_service_1 = require("./common/services/encryption.service");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            auth_module_1.AuthModule,
            patients_module_1.PatientsModule,
            sessions_module_1.SessionsModule,
            fireflies_module_1.FirefliesModule,
            documents_module_1.DocumentsModule,
        ],
        providers: [prisma_service_1.PrismaService, encryption_service_1.EncryptionService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map