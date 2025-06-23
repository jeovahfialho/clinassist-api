export declare class LoginDto {
    email: string;
    password: string;
}
export declare class RegisterDto {
    name: string;
    email: string;
    password: string;
    crp: string;
    specialty?: string;
    phone?: string;
}
export declare class AuthResponseDto {
    accessToken: string;
    refreshToken: string;
    user: {
        id: string;
        name: string;
        email: string;
        crp: string;
        role: string;
    };
}
export declare class RefreshTokenDto {
    refreshToken: string;
}
