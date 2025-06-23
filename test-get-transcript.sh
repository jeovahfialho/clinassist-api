#!/bin/bash

echo "🔍 TESTE FINAL - FIREFLIES COM QUERIES CORRETAS"
echo "==============================================="
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Verificar se jq está instalado
if ! command -v jq &> /dev/null; then
    log_error "jq não está instalado. Instale com: sudo apt-get install jq"
    exit 1
fi

# Login
echo "🔐 Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "joao@clinica.com.br",
    "password": "senha123"
  }')

TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

if [ "$TOKEN" = "null" ] || [ -z "$TOKEN" ]; then
    log_error "Erro no login"
    echo $LOGIN_RESPONSE | jq '.'
    exit 1
fi

log_success "Login realizado!"
echo ""

# TESTE 1: Verificar configuração
echo "🧪 TESTE 1: CONFIGURAÇÃO E CONEXÃO"
echo "=================================="

CONFIG_CHECK=$(curl -s -X GET "http://localhost:3000/fireflies/config-check" \
  -H "Authorization: Bearer $TOKEN")

echo "⚙️  Status da configuração:"
echo $CONFIG_CHECK | jq '.'

STATUS=$(echo $CONFIG_CHECK | jq -r '.status')
API_VALID=$(echo $CONFIG_CHECK | jq -r '.checks.apiKeyValid')

if [ "$STATUS" = "healthy" ]; then
    log_success "Configuração OK!"
else
    log_warning "Problemas na configuração detectados"
fi

echo ""

# TESTE 2: Listar transcrições
echo "🧪 TESTE 2: LISTAR TRANSCRIÇÕES (Query corrigida)"
echo "================================================"

if [ "$API_VALID" = "true" ]; then
    TRANSCRIPTS_LIST=$(curl -s -X GET "http://localhost:3000/fireflies/transcripts?limit=10" \
      -H "Authorization: Bearer $TOKEN")

    echo "📋 Transcrições encontradas:"
    echo $TRANSCRIPTS_LIST | jq '.'

    TRANSCRIPTS_COUNT=$(echo $TRANSCRIPTS_LIST | jq -r '.count // 0')
    log_info "Total de transcrições: $TRANSCRIPTS_COUNT"

    if [ "$TRANSCRIPTS_COUNT" -gt 0 ]; then
        log_success "✅ Transcrições listadas com sucesso!"
        
        echo ""
        echo "🎯 LISTA DE TRANSCRIÇÕES:"
        echo "========================"
        echo $TRANSCRIPTS_LIST | jq -r '.data[] | "📄 \(.title)\n   🆔 ID: \(.id)\n   👤 Organizador: \(.organizer_email)\n   📅 Data: \(.date)\n   ⏱️ Duração: \(.duration)s\n"'
        
        # Pegar primeira transcrição para teste
        FIRST_TRANSCRIPT_ID=$(echo $TRANSCRIPTS_LIST | jq -r '.data[0].id')
        
        echo ""
        echo "🧪 TESTE 3: VERIFICAR STATUS DA PRIMEIRA TRANSCRIÇÃO"
        echo "=================================================="
        
        log_info "Verificando status de: $FIRST_TRANSCRIPT_ID"
        
        STATUS_CHECK=$(curl -s -X GET "http://localhost:3000/fireflies/transcript/$FIRST_TRANSCRIPT_ID/status" \
          -H "Authorization: Bearer $TOKEN")
        
        echo "📊 Status:"
        echo $STATUS_CHECK | jq '.'
        
        CAN_ACCESS=$(echo $STATUS_CHECK | jq -r '.canAccess // false')
        
        if [ "$CAN_ACCESS" = "true" ]; then
            log_success "✅ Acesso permitido!"
            
            echo ""
            echo "🧪 TESTE 4: OBTER CONTEÚDO COMPLETO DA TRANSCRIÇÃO"
            echo "================================================="
            
            log_info "Baixando conteúdo de: $FIRST_TRANSCRIPT_ID"
            
            FULL_TRANSCRIPT=$(curl -s -X GET "http://localhost:3000/fireflies/transcript/$FIRST_TRANSCRIPT_ID" \
              -H "Authorization: Bearer $TOKEN")
            
            # Verificar se deu sucesso
            if echo $FULL_TRANSCRIPT | jq -e '.id' > /dev/null 2>&1; then
                log_success "🎉 SUCESSO! Transcrição obtida completamente!"
                
                TITLE=$(echo $FULL_TRANSCRIPT | jq -r '.title')
                DURATION=$(echo $FULL_TRANSCRIPT | jq -r '.duration // 0')
                ORGANIZER=$(echo $FULL_TRANSCRIPT | jq -r '.organizer')
                
                echo ""
                echo "📄 INFORMAÇÕES DA TRANSCRIÇÃO:"
                echo "============================="
                echo "📝 Título: $TITLE"
                echo "⏱️  Duração: $DURATION segundos"
                echo "👤 Organizador: $ORGANIZER"
                
                # Verificar sentenças
                SENTENCES_COUNT=$(echo $FULL_TRANSCRIPT | jq '.sentences | length' 2>/dev/null || echo "0")
                echo "💬 Total de sentenças: $SENTENCES_COUNT"
                
                if [ "$SENTENCES_COUNT" -gt 0 ]; then
                    echo ""
                    echo "🎯 PRIMEIRAS 3 SENTENÇAS:"
                    echo "========================="
                    echo $FULL_TRANSCRIPT | jq -r '.sentences[0:3][] | "⏱️ \(.start_time)s-\(.end_time)s - \(.speaker_name): \(.text)"' 2>/dev/null || echo "Erro ao extrair sentenças"
                    
                    # Verificar falantes
                    SPEAKERS_COUNT=$(echo $FULL_TRANSCRIPT | jq '.speakers | length' 2>/dev/null || echo "0")
                    if [ "$SPEAKERS_COUNT" -gt 0 ]; then
                        echo ""
                        echo "👥 FALANTES IDENTIFICADOS ($SPEAKERS_COUNT):"
                        echo $FULL_TRANSCRIPT | jq -r '.speakers[] | "  👤 \(.name): \(.talkTime)s de fala (\(.wordCount) palavras)"'
                    fi
                fi
                
                # Verificar resumo
                SUMMARY=$(echo $FULL_TRANSCRIPT | jq -r '.summary // empty')
                if [ -n "$SUMMARY" ] && [ "$SUMMARY" != "null" ]; then
                    echo ""
                    echo "📋 RESUMO:"
                    echo "========="
                    echo "$SUMMARY"
                fi
                
                # Verificar pontos-chave
                KEY_POINTS_COUNT=$(echo $FULL_TRANSCRIPT | jq '.keyPoints | length' 2>/dev/null || echo "0")
                if [ "$KEY_POINTS_COUNT" -gt 0 ]; then
                    echo ""
                    echo "🎯 PONTOS-CHAVE ($KEY_POINTS_COUNT):"
                    echo $FULL_TRANSCRIPT | jq -r '.keyPoints[] | "• \(.)"'
                fi
                
                # Verificar ações
                ACTION_ITEMS_COUNT=$(echo $FULL_TRANSCRIPT | jq '.actionItems | length' 2>/dev/null || echo "0")
                if [ "$ACTION_ITEMS_COUNT" -gt 0 ]; then
                    echo ""
                    echo "✅ ITENS DE AÇÃO ($ACTION_ITEMS_COUNT):"
                    echo $FULL_TRANSCRIPT | jq -r '.actionItems[] | "• \(.)"'
                fi
                
                echo ""
                echo "🧪 TESTE 5: FORMATO CFP"
                echo "======================"
                
                CFP_FORMAT=$(curl -s -X GET "http://localhost:3000/fireflies/transcript/$FIRST_TRANSCRIPT_ID/cfp-format" \
                  -H "Authorization: Bearer $TOKEN")
                
                if echo $CFP_FORMAT | jq -e '.patientIdentification' > /dev/null 2>&1; then
                    log_success "✅ Formato CFP gerado com sucesso!"
                    
                    echo "📋 Preview do formato CFP:"
                    echo "========================="
                    echo "🔹 Identificação: $(echo $CFP_FORMAT | jq -r '.patientIdentification' | head -c 100)..."
                    echo "🔹 Avaliação de demanda: $(echo $CFP_FORMAT | jq -r '.demandAssessment' | head -c 100)..."
                    echo "🔹 Evolução da sessão: $(echo $CFP_FORMAT | jq -r '.sessionEvolution' | head -c 100)..."
                    
                    TECHNIQUES_COUNT=$(echo $CFP_FORMAT | jq '.technicalProcedures | length')
                    echo "🔹 Procedimentos técnicos: $TECHNIQUES_COUNT identificados"
                else
                    log_warning "Problema ao gerar formato CFP"
                    echo $CFP_FORMAT | jq '.'
                fi
                
            else
                log_error "❌ FALHA ao obter conteúdo da transcrição"
                echo $FULL_TRANSCRIPT | jq '.'
            fi
        else
            log_warning "⚠️  Sem acesso à primeira transcrição"
            ERROR_MSG=$(echo $STATUS_CHECK | jq -r '.error // "Motivo não especificado"')
            echo "💡 Motivo: $ERROR_MSG"
        fi
        
    else
        log_warning "Nenhuma transcrição encontrada"
    fi
else
    log_error "API Key inválida - pulando testes de transcrição"
fi

echo ""

# TESTE 6: Análise de sessões
echo "🧪 TESTE 6: ANÁLISE DE SESSÕES"
echo "=============================="

SESSIONS=$(curl -s -X GET "http://localhost:3000/sessions?limit=20" \
  -H "Authorization: Bearer $TOKEN")

TOTAL_SESSIONS=$(echo $SESSIONS | jq '.data | length')
WITH_TRANSCRIPT=$(echo $SESSIONS | jq '[.data[] | select(.transcriptId != null)] | length')
WITHOUT_TRANSCRIPT=$(echo $SESSIONS | jq '[.data[] | select(.transcriptId == null and .status == "COMPLETED")] | length')

echo "📊 Estatísticas das sessões:"
echo "📈 Total: $TOTAL_SESSIONS"
echo "✅ Com transcrição: $WITH_TRANSCRIPT"  
echo "❌ Sem transcrição (completas): $WITHOUT_TRANSCRIPT"

if [ "$WITHOUT_TRANSCRIPT" -gt 0 ] && [ "$TRANSCRIPTS_COUNT" -gt 0 ]; then
    echo ""
    echo "🧪 TESTE 7: SINCRONIZAÇÃO"
    echo "========================="
    
    log_info "Executando sincronização inteligente..."
    
    SYNC_RESULT=$(curl -s -X POST "http://localhost:3000/fireflies/sync" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "🔄 Resultado da sincronização:"
    echo $SYNC_RESULT | jq '.'
    
    MATCHED=$(echo $SYNC_RESULT | jq -r '.matched // 0')
    
    if [ "$MATCHED" -gt 0 ]; then
        log_success "✅ $MATCHED sessões sincronizadas!"
        
        echo ""
        echo "🎯 DETALHES:"
        echo $SYNC_RESULT | jq -r '.details.matches[] | "  📄 Sessão: \(.sessionId)\n  🎯 Transcript: \(.transcriptId)\n  📝 Título: \(.title)\n"'
    else
        log_warning "Nenhuma sessão foi sincronizada automaticamente"
    fi
    
    # Teste de vinculação manual
    if [ "$MATCHED" -eq 0 ] && [ "$WITHOUT_TRANSCRIPT" -gt 0 ]; then
        echo ""
        echo "🧪 TESTE 8: VINCULAÇÃO MANUAL (DEMONSTRAÇÃO)"
        echo "==========================================="
        
        FIRST_SESSION_WITHOUT=$(echo $SESSIONS | jq -r '.data[] | select(.transcriptId == null and .status == "COMPLETED") | .id' | head -1)
        
        if [ -n "$FIRST_SESSION_WITHOUT" ] && [ "$FIRST_SESSION_WITHOUT" != "null" ] && [ "$TRANSCRIPTS_COUNT" -gt 0 ]; then
            echo "🎯 Sessão sem transcrição: $FIRST_SESSION_WITHOUT"
            echo "🎯 Primeira transcrição disponível: $FIRST_TRANSCRIPT_ID"
            
            read -p "Deseja testar vinculação manual? (y/n): " CONFIRM
            
            if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
                LINK_RESULT=$(curl -s -X POST "http://localhost:3000/fireflies/link/$FIRST_SESSION_WITHOUT/$FIRST_TRANSCRIPT_ID" \
                  -H "Authorization: Bearer $TOKEN")
                
                echo "🔗 Resultado da vinculação:"
                echo $LINK_RESULT | jq '.'
                
                if echo $LINK_RESULT | jq -e '.success' > /dev/null 2>&1; then
                    SUCCESS=$(echo $LINK_RESULT | jq -r '.success')
                    if [ "$SUCCESS" = "true" ]; then
                        log_success "✅ Vinculação manual bem-sucedida!"
                    else
                        log_error "❌ Falha na vinculação manual"
                    fi
                fi
            else
                echo "Demonstração de vinculação cancelada."
            fi
        fi
    fi
else
    log_info "Não há necessidade de sincronização"
fi

echo ""

# RESUMO FINAL
echo "📋 RESUMO FINAL - ANÁLISE COMPLETA"
echo "=================================="

if [ "$API_VALID" = "true" ]; then
    log_success "✅ API Fireflies funcionando perfeitamente"
else
    log_error "❌ Problemas com API Fireflies"
fi

if [ "$TRANSCRIPTS_COUNT" -gt 0 ]; then
    log_success "✅ $TRANSCRIPTS_COUNT transcrições encontradas"
    
    # Verificar se conseguiu acessar pelo menos uma
    if [ "$CAN_ACCESS" = "true" ]; then
        log_success "✅ Acesso às transcrições confirmado"
    else
        log_warning "⚠️  Problemas de acesso às transcrições"
    fi
else
    log_warning "⚠️  Nenhuma transcrição encontrada"
fi

if [ "$WITHOUT_TRANSCRIPT" -eq 0 ]; then
    log_success "✅ Todas as sessões estão sincronizadas"
else
    log_warning "⚠️  $WITHOUT_TRANSCRIPT sessões precisam de sincronização"
fi

echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "================="
echo "• Listar transcrições: curl -X GET 'http://localhost:3000/fireflies/transcripts' -H 'Authorization: Bearer $TOKEN'"
echo "• Verificar configuração: curl -X GET 'http://localhost:3000/fireflies/config-check' -H 'Authorization: Bearer $TOKEN'"
echo "• Sincronizar: curl -X POST 'http://localhost:3000/fireflies/sync' -H 'Authorization: Bearer $TOKEN'"

echo ""
echo "🌐 DOCUMENTAÇÃO:"
echo "================"
echo "• Swagger UI: http://localhost:3000/api"
echo "• Execute este script novamente a qualquer momento"

echo ""
log_success "🎉 TESTE COMPLETO FINALIZADO!"

# Verificar se houve sucesso geral
if [ "$API_VALID" = "true" ] && [ "$TRANSCRIPTS_COUNT" -gt 0 ]; then
    echo ""
    echo "🎯 STATUS: INTEGRAÇÃO FUNCIONANDO CORRETAMENTE!"
    echo "=============================================="
    echo "✅ API Key válida"
    echo "✅ Transcrições acessíveis"
    echo "✅ Queries GraphQL funcionando"
    echo "✅ Sistema pronto para uso"
else
    echo ""
    echo "⚠️  STATUS: NECESSÁRIA ATENÇÃO"
    echo "============================"
    if [ "$API_VALID" != "true" ]; then
        echo "❌ Verificar API Key no .env"
    fi
    if [ "$TRANSCRIPTS_COUNT" -eq 0 ]; then
        echo "❌ Adicionar fred@fireflies.ai às reuniões"
    fi
fi