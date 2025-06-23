#!/bin/bash

echo "🧪 Testando endpoints da API..."

# Registrar um usuário
echo "1. Registrando usuário..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. João Silva",
    "email": "joao@clinica.com.br",
    "password": "senha123",
    "crp": "CRP-01/12345",
    "specialty": "Psicologia Clínica"
  }')

echo "Resposta do registro: $REGISTER_RESPONSE"

# Fazer login
echo -e "\n2. Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@clinica.com.br",
    "password": "senha123"
  }')

echo "Resposta do login: $LOGIN_RESPONSE"

echo -e "\n✅ Testes concluídos!"
