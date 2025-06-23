# Sistema de Psicologia - Backend

## Instalação e Configuração

### 1. Banco de Dados
```bash
# Usando Docker (recomendado)
docker-compose up -d

# Ou instalar PostgreSQL localmente
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações
```

### 3. Configurar banco de dados
```bash
npx prisma generate
npx prisma db push
```

### 4. Iniciar servidor
```bash
npm run start:dev
```

## Endpoints Disponíveis

- `POST /auth/register` - Registrar psicólogo
- `POST /auth/login` - Fazer login
- `POST /auth/refresh` - Renovar token

## Documentação
Acesse http://localhost:3000/api para ver a documentação Swagger

## Testes
```bash
# Testar endpoints básicos
./test-endpoints.sh
```
