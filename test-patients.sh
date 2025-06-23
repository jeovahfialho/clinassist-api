#!/bin/bash

echo "🧪 Testando módulo de Pacientes..."

# Primeiro fazer login para pegar o token
echo "1. Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@clinica.com.br",
    "password": "senha123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

if [ "$TOKEN" = "null" ]; then
  echo "❌ Erro no login. Verifique as credenciais."
  exit 1
fi

echo "✅ Login realizado com sucesso!"

# Cadastrar um paciente
echo -e "\n2. Cadastrando paciente..."
PATIENT_RESPONSE=$(curl -s -X POST http://localhost:3000/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Maria da Silva",
    "cpf": "123.456.789-00",
    "email": "maria@email.com",
    "phone": "(11) 99999-9999",
    "dateOfBirth": "1990-05-15",
    "address": "Rua das Flores, 123",
    "initialDemand": "Ansiedade e dificuldades para dormir",
    "objectives": "Reduzir sintomas de ansiedade e melhorar sono",
    "recordingConsent": true
  }')

PATIENT_ID=$(echo $PATIENT_RESPONSE | jq -r '.id')
echo "Paciente criado: $PATIENT_ID"

# Listar pacientes
echo -e "\n3. Listando pacientes..."
LIST_RESPONSE=$(curl -s -X GET "http://localhost:3000/patients?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "Total de pacientes: $(echo $LIST_RESPONSE | jq -r '.total')"

# Buscar paciente específico
echo -e "\n4. Buscando paciente por ID..."
PATIENT_DETAIL=$(curl -s -X GET "http://localhost:3000/patients/$PATIENT_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Nome do paciente: $(echo $PATIENT_DETAIL | jq -r '.name')"

# Atualizar paciente
echo -e "\n5. Atualizando paciente..."
UPDATE_RESPONSE=$(curl -s -X PATCH "http://localhost:3000/patients/$PATIENT_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "phone": "(11) 88888-8888",
    "objectives": "Reduzir ansiedade, melhorar sono e autoestima"
  }')

echo "Telefone atualizado: $(echo $UPDATE_RESPONSE | jq -r '.phone')"

# Buscar pacientes
echo -e "\n6. Testando busca por nome..."
SEARCH_RESPONSE=$(curl -s -X GET "http://localhost:3000/patients/search?q=Maria" \
  -H "Authorization: Bearer $TOKEN")

echo "Resultados da busca: $(echo $SEARCH_RESPONSE | jq -r '.total')"

echo -e "\n✅ Todos os testes do módulo de pacientes concluídos!"
echo "📊 Verificar dados criptografados no banco de dados"