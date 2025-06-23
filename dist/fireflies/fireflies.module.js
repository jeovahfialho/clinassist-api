"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirefliesModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const fireflies_controller_1 = require("./fireflies.controller");
const fireflies_service_1 = require("./fireflies.service");
const prisma_service_1 = require("../database/prisma.service");
const encryption_service_1 = require("../common/services/encryption.service");
let FirefliesModule = class FirefliesModule {
};
exports.FirefliesModule = FirefliesModule;
exports.FirefliesModule = FirefliesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule,
        ],
        controllers: [fireflies_controller_1.FirefliesController],
        providers: [
            fireflies_service_1.FirefliesService,
            prisma_service_1.PrismaService,
            encryption_service_1.EncryptionService,
        ],
        exports: [
            fireflies_service_1.FirefliesService,
        ],
    })
], FirefliesModule);
//# sourceMappingURL=fireflies.module.js.map