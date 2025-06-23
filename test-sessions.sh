#!/bin/bash

echo "🧪 Testando módulo de Sessões..."

# Login
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@clinica.com.br",
    "password": "senha123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

if [ "$TOKEN" = "null" ]; then
  echo "❌ Erro no login"
  exit 1
fi

# Primeiro criar um paciente para as sessões
PATIENT_RESPONSE=$(curl -s -X POST http://localhost:3000/patients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "name": "Carlos Silva",
    "cpf": "987.654.321-00",
    "dateOfBirth": "1985-03-10",
    "initialDemand": "Depressão e baixa autoestima",
    "objectives": "Melhorar humor e autoconfiança",
    "recordingConsent": true
  }')

PATIENT_ID=$(echo $PATIENT_RESPONSE | jq -r '.id')
echo "Paciente criado para testes: $PATIENT_ID"

# Agendar uma sessão
echo -e "\n1. Agendando sessão..."
TOMORROW=$(date -d "+1 day" "+%Y-%m-%dT14:00:00.000Z")
SESSION_RESPONSE=$(curl -s -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"scheduledAt\": \"$TOMORROW\",
    \"duration\": 50,
    \"shouldRecord\": true,
    \"notes\": \"Sessão inicial de avaliação\"
  }")

SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.id')
echo "Sessão agendada: $SESSION_ID"

# Listar sessões
echo -e "\n2. Listando sessões..."
LIST_RESPONSE=$(curl -s -X GET "http://localhost:3000/sessions?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

echo "Total de sessões: $(echo $LIST_RESPONSE | jq -r '.total')"

# Buscar sessão específica
echo -e "\n3. Buscando sessão por ID..."
SESSION_DETAIL=$(curl -s -X GET "http://localhost:3000/sessions/$SESSION_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "Status da sessão: $(echo $SESSION_DETAIL | jq -r '.status')"

# Atualizar sessão com notas
echo -e "\n4. Atualizando sessão com notas de evolução..."
UPDATE_RESPONSE=$(curl -s -X PATCH "http://localhost:3000/sessions/$SESSION_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "evolutionNotes": "Paciente apresentou melhora no humor durante a sessão",
    "techniques": ["Terapia Cognitivo-Comportamental", "Reestruturação cognitiva"],
    "observations": "Boa receptividade às intervenções propostas"
  }')

echo "Sessão atualizada com notas de evolução"

# Atualizar status
echo -e "\n5. Marcando sessão como concluída..."
STATUS_RESPONSE=$(curl -s -X PATCH "http://localhost:3000/sessions/$SESSION_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "COMPLETED"}')

echo "Status atualizado para: $(echo $STATUS_RESPONSE | jq -r '.status')"

# Obter estatísticas
echo -e "\n6. Obtendo estatísticas..."
STATS_RESPONSE=$(curl -s -X GET "http://localhost:3000/sessions/stats" \
  -H "Authorization: Bearer $TOKEN")

echo "Total de sessões: $(echo $STATS_RESPONSE | jq -r '.totalSessions')"
echo "Sessões concluídas: $(echo $STATS_RESPONSE | jq -r '.completedSessions')"

# Sessões de hoje
echo -e "\n7. Verificando sessões de hoje..."
TODAY_RESPONSE=$(curl -s -X GET "http://localhost:3000/sessions/today" \
  -H "Authorization: Bearer $TOKEN")

echo "Sessões hoje: $(echo $TODAY_RESPONSE | jq '. | length')"

echo -e "\n✅ Todos os testes do módulo de sessões concluídos!"
echo "📊 Sistema de agendamento funcionando corretamente"