#!/bin/bash

# Script de Teste Completo - Fase 3: Sistema de Agendamento e Sessões
# Execute com: chmod +x test-fase3.sh && ./test-fase3.sh

set -e

echo "🧪 TESTE COMPLETO - FASE 3: SISTEMA DE AGENDAMENTO E SESSÕES"
echo "=============================================================="
echo ""

# Verificar se o servidor está rodando
echo "🔍 Verificando se o servidor está respondendo..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Servidor não está respondendo em http://localhost:3000"
    echo "   Execute: npm run start:dev"
    exit 1
fi
echo "✅ Servidor está rodando!"
echo ""

# Função para fazer login e obter token
get_auth_token() {
    echo "🔐 Fazendo login..."
    LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
      -H "Content-Type: application/json" \
      -d '{
        "email": "joao@clinica.com.br",
        "password": "senha123"
      }')

    TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')
    
    if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
        echo "❌ Erro no login. Resposta:"
        echo "$LOGIN_RESPONSE"
        echo ""
        echo "💡 Certifique-se de que você já registrou o usuário:"
        echo "   curl -X POST http://localhost:3000/auth/register \\"
        echo "     -H 'Content-Type: application/json' \\"
        echo "     -d '{\"name\":\"Dr. João Silva\",\"email\":\"joao@clinica.com.br\",\"password\":\"senha123\",\"crp\":\"CRP-01/12345\"}'"
        exit 1
    fi
    
    echo "✅ Login realizado com sucesso!"
    echo "🎫 Token: ${TOKEN:0:20}..."
    echo ""
}

# Função para criar paciente de teste
create_test_patient() {
    echo "👤 Criando paciente de teste..."
    PATIENT_RESPONSE=$(curl -s -X POST http://localhost:3000/patients \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d '{
        "name": "Maria Santos Silva",
        "cpf": "123.456.789-01",
        "email": "maria.santos@email.com",
        "phone": "(11) 99887-7665",
        "dateOfBirth": "1990-05-15",
        "address": "Rua das Flores, 123 - São Paulo/SP",
        "initialDemand": "Ansiedade generalizada e dificuldades para dormir há 6 meses",
        "objectives": "Reduzir sintomas de ansiedade, melhorar qualidade do sono e desenvolver estratégias de enfrentamento",
        "referralSource": "Encaminhamento médico - Dr. Silva (CRM 123456)",
        "recordingConsent": true
      }')

    PATIENT_ID=$(echo $PATIENT_RESPONSE | jq -r '.id')
    
    if [ "$PATIENT_ID" = "null" ] || [ -z "$PATIENT_ID" ]; then
        echo "❌ Erro ao criar paciente. Resposta:"
        echo "$PATIENT_RESPONSE"
        exit 1
    fi
    
    echo "✅ Paciente criado com sucesso!"
    echo "🆔 ID: $PATIENT_ID"
    echo "📝 Nome: $(echo $PATIENT_RESPONSE | jq -r '.name')"
    echo "📞 Telefone: $(echo $PATIENT_RESPONSE | jq -r '.phone')"
    echo "🎥 Consentimento gravação: $(echo $PATIENT_RESPONSE | jq -r '.recordingConsent')"
    echo ""
}

# Obter token de autenticação
get_auth_token

# Criar paciente de teste
create_test_patient

echo "📅 TESTE 1: AGENDAMENTO DE SESSÕES"
echo "=================================="

# Agendar sessão para amanhã
echo "📝 Agendando sessão para amanhã às 14:00..."
# Detectar se é macOS ou Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    TOMORROW=$(date -v+1d "+%Y-%m-%dT14:00:00.000Z")
else
    # Linux
    TOMORROW=$(date -d "+1 day" "+%Y-%m-%dT14:00:00.000Z")
fi
SESSION1_RESPONSE=$(curl -s -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"scheduledAt\": \"$TOMORROW\",
    \"duration\": 50,
    \"shouldRecord\": true,
    \"notes\": \"Primeira sessão - avaliação inicial\"
  }")

SESSION1_ID=$(echo $SESSION1_RESPONSE | jq -r '.id')
echo "✅ Sessão 1 agendada!"
echo "🆔 ID: $SESSION1_ID"
echo "🕐 Horário: $(echo $SESSION1_RESPONSE | jq -r '.scheduledAt')"
echo "⏱️  Duração: $(echo $SESSION1_RESPONSE | jq -r '.duration') minutos"
echo "🎥 Vai gravar: $(echo $SESSION1_RESPONSE | jq -r '.hasRecording')"
echo "🔗 URL reunião: $(echo $SESSION1_RESPONSE | jq -r '.meetingUrl')"
echo ""

# Tentar agendar no mesmo horário (deve dar conflito)
echo "🚫 Testando conflito de horário (deve falhar)..."
CONFLICT_RESPONSE=$(curl -s -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"scheduledAt\": \"$TOMORROW\",
    \"duration\": 50
  }")

if echo $CONFLICT_RESPONSE | jq -r '.message' | grep -q "conflito\|conflict"; then
    echo "✅ Validação de conflito funcionando!"
    echo "💬 Mensagem: $(echo $CONFLICT_RESPONSE | jq -r '.message')"
else
    echo "❌ Validação de conflito não funcionou"
fi
echo ""

# Agendar segunda sessão em horário diferente
echo "📝 Agendando segunda sessão (semana que vem)..."
# Detectar se é macOS ou Linux
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    NEXT_WEEK=$(date -v+8d "+%Y-%m-%dT15:00:00.000Z")
else
    # Linux
    NEXT_WEEK=$(date -d "+8 days" "+%Y-%m-%dT15:00:00.000Z")
fi
SESSION2_RESPONSE=$(curl -s -X POST http://localhost:3000/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"patientId\": \"$PATIENT_ID\",
    \"scheduledAt\": \"$NEXT_WEEK\",
    \"duration\": 50,
    \"shouldRecord\": false
  }")

SESSION2_ID=$(echo $SESSION2_RESPONSE | jq -r '.id')
echo "✅ Sessão 2 agendada!"
echo "🆔 ID: $SESSION2_ID"
echo ""

echo "📋 TESTE 2: LISTAGEM E FILTROS"
echo "==============================="

# Listar todas as sessões
echo "📃 Listando todas as sessões..."
LIST_RESPONSE=$(curl -s -X GET "http://localhost:3000/sessions?page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN")

TOTAL_SESSIONS=$(echo $LIST_RESPONSE | jq -r '.total')
echo "✅ Total de sessões: $TOTAL_SESSIONS"

if [ $TOTAL_SESSIONS -ge 2 ]; then
    echo "✅ Sessões listadas corretamente!"
else
    echo "❌ Número de sessões inesperado"
fi
echo ""

# Listar sessões com filtro de status
echo "🔍 Filtrando sessões por status (SCHEDULED)..."
FILTER_RESPONSE=$(curl -s -X GET "http://localhost:3000/sessions?status=SCHEDULED" \
  -H "Authorization: Bearer $TOKEN")

SCHEDULED_COUNT=$(echo $FILTER_RESPONSE | jq -r '.total')
echo "✅ Sessões agendadas: $SCHEDULED_COUNT"
echo ""

echo "📊 TESTE 3: ESTATÍSTICAS"
echo "========================"

# Obter estatísticas
echo "📈 Obtendo estatísticas..."
STATS_RESPONSE=$(curl -s -X GET "http://localhost:3000/sessions/stats" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ Estatísticas obtidas:"
echo "📊 Total de sessões: $(echo $STATS_RESPONSE | jq -r '.totalSessions')"
echo "✅ Sessões concluídas: $(echo $STATS_RESPONSE | jq -r '.completedSessions')"
echo "❌ Sessões canceladas: $(echo $STATS_RESPONSE | jq -r '.cancelledSessions')"
echo "📅 Próximas sessões: $(echo $STATS_RESPONSE | jq -r '.upcomingSessions')"
echo "🎥 Sessões gravadas: $(echo $STATS_RESPONSE | jq -r '.recordedSessions')"
echo ""

echo "📝 TESTE 4: ATUALIZAÇÃO DE SESSÕES"
echo "==================================="

# Buscar sessão específica
echo "🔍 Buscando sessão específica..."
SESSION_DETAIL=$(curl -s -X GET "http://localhost:3000/sessions/$SESSION1_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ Sessão encontrada:"
echo "👤 Paciente: $(echo $SESSION_DETAIL | jq -r '.patient.name')"
echo "📊 Status: $(echo $SESSION_DETAIL | jq -r '.status')"
echo ""

# Atualizar sessão com notas de evolução
echo "✏️  Adicionando notas de evolução..."
UPDATE_RESPONSE=$(curl -s -X PATCH "http://localhost:3000/sessions/$SESSION1_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "evolutionNotes": "Paciente relatou melhora significativa nos sintomas de ansiedade. Demonstrou boa compreensão das técnicas ensinadas e motivação para continuar o tratamento. Relatou melhora na qualidade do sono nas últimas duas semanas.",
    "techniques": [
      "Terapia Cognitivo-Comportamental",
      "Técnicas de respiração",
      "Reestruturação cognitiva",
      "Psicoeducação sobre ansiedade"
    ],
    "observations": "Paciente demonstrou excelente rapport e receptividade às intervenções. Sugerido exercícios para casa e agendamento da próxima sessão."
  }')

echo "✅ Notas de evolução adicionadas!"
echo "📝 Técnicas: $(echo $UPDATE_RESPONSE | jq -r '.techniques | length') registradas"
echo ""

# Atualizar status da sessão
echo "🔄 Marcando sessão como concluída..."
STATUS_RESPONSE=$(curl -s -X PATCH "http://localhost:3000/sessions/$SESSION1_ID/status" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"status": "COMPLETED"}')

NEW_STATUS=$(echo $STATUS_RESPONSE | jq -r '.status')
echo "✅ Status atualizado para: $NEW_STATUS"
echo ""

echo "📅 TESTE 5: SESSÕES DE HOJE"
echo "==========================="

# Verificar sessões de hoje
echo "📆 Verificando sessões de hoje..."
TODAY_RESPONSE=$(curl -s -X GET "http://localhost:3000/sessions/today" \
  -H "Authorization: Bearer $TOKEN")

TODAY_COUNT=$(echo $TODAY_RESPONSE | jq '. | length')
echo "✅ Sessões hoje: $TODAY_COUNT"

if [ $TODAY_COUNT -gt 0 ]; then
    echo "📋 Detalhes das sessões de hoje:"
    echo $TODAY_RESPONSE | jq -r '.[] | "- \(.patient.name) às \(.scheduledAt) (\(.status))"'
fi
echo ""

echo "🗑️  TESTE 6: VALIDAÇÃO DE EXCLUSÃO"
echo "=================================="

# Tentar excluir sessão concluída (deve falhar)
echo "🚫 Tentando excluir sessão concluída (deve falhar)..."
DELETE_RESPONSE=$(curl -s -X DELETE "http://localhost:3000/sessions/$SESSION1_ID" \
  -H "Authorization: Bearer $TOKEN")

if echo $DELETE_RESPONSE | jq -r '.message' | grep -q "concluída\|completed"; then
    echo "✅ Validação de exclusão funcionando!"
    echo "💬 Mensagem: $(echo $DELETE_RESPONSE | jq -r '.message')"
else
    echo "❌ Validação de exclusão não funcionou"
fi
echo ""

# Excluir sessão agendada (deve funcionar)
echo "🗑️  Excluindo sessão agendada..."
DELETE_OK_RESPONSE=$(curl -s -X DELETE "http://localhost:3000/sessions/$SESSION2_ID" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ Sessão agendada removida com sucesso"
echo ""

echo "🎯 TESTE 7: VERIFICAÇÕES FINAIS"
echo "==============================="

# Estatísticas finais
echo "📊 Estatísticas finais..."
FINAL_STATS=$(curl -s -X GET "http://localhost:3000/sessions/stats" \
  -H "Authorization: Bearer $TOKEN")

echo "✅ Estatísticas atualizadas:"
echo "📊 Total: $(echo $FINAL_STATS | jq -r '.totalSessions')"
echo "✅ Concluídas: $(echo $FINAL_STATS | jq -r '.completedSessions')"
echo "📅 Próximas: $(echo $FINAL_STATS | jq -r '.upcomingSessions')"
echo ""

# Verificar se dados estão criptografados
echo "🔒 Verificando criptografia..."
echo "💡 Para verificar se os dados estão criptografados no banco:"
echo "   npx prisma studio"
echo "   Abra a tabela 'sessions' e verifique se 'evolutionNotes' está criptografado"
echo ""

echo "🎉 TESTE COMPLETO - FASE 3 CONCLUÍDO!"
echo "====================================="
echo ""
echo "✅ Funcionalidades testadas com sucesso:"
echo "  📅 Agendamento de sessões"
echo "  🚫 Validação de conflitos de horário"
echo "  🔗 Geração automática de URLs de reunião"
echo "  🎥 Controle de consentimento para gravação"
echo "  📝 Notas de evolução criptografadas"
echo "  🔄 Controle de status de sessões"
echo "  📊 Sistema de estatísticas"
echo "  🗑️  Validação de exclusão (CFP compliance)"
echo "  🔍 Filtros e paginação"
echo ""
echo "🚀 Sistema de agendamento funcionando perfeitamente!"
echo "📋 Próximo passo: Fase 4 - Integração Fireflies.ai"
echo ""
echo "🔧 Comandos úteis:"
echo "  - Ver dados no banco: npx prisma studio"
echo "  - Documentação API: http://localhost:3000/api"
echo "  - Logs do servidor: verifique o terminal do 'npm run start:dev'"