#!/bin/bash

echo "🔐 TESTE ESPECÍFICO - ANÁLISE DE PERMISSÕES FIREFLIES"
echo "======================================================"
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
    exit 1
fi

log_success "Login realizado!"
echo ""

echo "📋 MENU DE TESTES DE PERMISSÕES:"
echo "==============================="
echo "1. Testar transcrição específica (inserir ID)"
echo "2. Analisar todas as minhas permissões"
echo "3. Tentar acessar transcrição restrita"
echo "4. Demonstrar vinculação manual"
echo "5. Verificar configurações de privacidade"
echo ""
read -p "Escolha uma opção (1-5): " OPTION

case $OPTION in
    1)
        echo ""
        read -p "📝 Digite o Transcript ID para testar: " TRANSCRIPT_ID
        if [ -z "$TRANSCRIPT_ID" ]; then
            log_error "Transcript ID não pode estar vazio"
            exit 1
        fi
        
        echo ""
        echo "🔍 ANALISANDO TRANSCRIÇÃO: $TRANSCRIPT_ID"
        echo "========================================"
        
        # Verificar informações de acesso
        ACCESS_INFO=$(curl -s -X GET "http://localhost:3000/fireflies/transcript/$TRANSCRIPT_ID/access-info" \
          -H "Authorization: Bearer $TOKEN")
        
        if echo $ACCESS_INFO | jq -e '.id' > /dev/null 2>&1; then
            echo "🔐 Informações de acesso:"
            echo $ACCESS_INFO | jq '.'
            
            HAS_ACCESS=$(echo $ACCESS_INFO | jq -r '.hasAccess')
            ACCESS_REASON=$(echo $ACCESS_INFO | jq -r '.accessReason')
            PRIVACY=$(echo $ACCESS_INFO | jq -r '.privacy')
            ORGANIZER=$(echo $ACCESS_INFO | jq -r '.organizer')
            
            echo ""
            if [ "$HAS_ACCESS" = "true" ]; then
                log_success "✅ VOCÊ TEM ACESSO A ESTA TRANSCRIÇÃO"
                echo "💡 Motivo: $ACCESS_REASON"
                
                echo ""
                echo "🧪 Testando acesso ao conteúdo completo..."
                FULL_CONTENT=$(curl -s -X GET "http://localhost:3000/fireflies/transcript/$TRANSCRIPT_ID" \
                  -H "Authorization: Bearer $TOKEN")
                
                if echo $FULL_CONTENT | jq -e '.id' > /dev/null 2>&1; then
                    log_success "✅ Conteúdo obtido com sucesso!"
                    
                    TITLE=$(echo $FULL_CONTENT | jq -r '.title')
                    SENTENCES_COUNT=$(echo $FULL_CONTENT | jq '.sentences | length' 2>/dev/null || echo "0")
                    
                    echo "📝 Título: $TITLE"
                    echo "💬 Sentenças: $SENTENCES_COUNT"
                    
                    if [ "$SENTENCES_COUNT" -gt 0 ]; then
                        echo ""
                        echo "🎯 Primeira sentença:"
                        echo $FULL_CONTENT | jq -r '.sentences[0] | "⏱️ \(.start_time)s - \(.speaker_name): \(.text)"' 2>/dev/null
                    fi
                else
                    log_error "❌ Erro inesperado ao obter conteúdo"
                    echo $FULL_CONTENT | jq '.'
                fi
            else
                log_warning "❌ VOCÊ NÃO TEM ACESSO A ESTA TRANSCRIÇÃO"
                echo "💡 Motivo: $ACCESS_REASON"
                echo "🔒 Privacidade: $PRIVACY"
                echo "👤 Organizador: $ORGANIZER"
                
                echo ""
                echo "💡 COMO OBTER ACESSO:"
                echo "===================="
                if [ "$PRIVACY" = "only_owner" ]; then
                    echo "• Solicite ao organizador ($ORGANIZER) para compartilhar"
                    echo "• Ou peça para mudar a privacidade para 'public'"
                else
                    echo "• Verifique se você participou da reunião"
                    echo "• Confirme se usou o email correto na reunião"
                fi
                
                echo ""
                echo "🧪 Testando tentativa de acesso (deve falhar)..."
                RESTRICTED_ACCESS=$(curl -s -X GET "http://localhost:3000/fireflies/transcript/$TRANSCRIPT_ID" \
                  -H "Authorization: Bearer $TOKEN")
                
                if echo $RESTRICTED_ACCESS | jq -e '.message' > /dev/null 2>&1; then
                    ERROR_MSG=$(echo $RESTRICTED_ACCESS | jq -r '.message')
                    log_warning "Confirmado: $ERROR_MSG"
                else
                    log_error "Comportamento inesperado - deveria ter falhado"
                fi
            fi
        else
            log_error "Erro ao obter informações da transcrição"
            echo $ACCESS_INFO | jq '.'
        fi
        ;;
        
    2)
        echo ""
        echo "🔍 ANALISANDO TODAS AS SUAS PERMISSÕES"
        echo "====================================="
        
        PERMISSIONS=$(curl -s -X GET "http://localhost:3000/fireflies/my-permissions" \
          -H "Authorization: Bearer $TOKEN")
        
        echo "👤 Suas permissões no Fireflies:"
        echo $PERMISSIONS | jq '.'
        
        USER_EMAIL=$(echo $PERMISSIONS | jq -r '.userEmail')
        ORGANIZED=$(echo $PERMISSIONS | jq -r '.summary.organized')
        ACCESSIBLE=$(echo $PERMISSIONS | jq -r '.summary.accessible')
        RESTRICTED=$(echo $PERMISSIONS | jq -r '.summary.restricted')
        
        echo ""
        echo "📊 RESUMO DETALHADO:"
        echo "=================="
        echo "👤 Seu email: $USER_EMAIL"
        echo "🎯 Reuniões organizadas por você: $ORGANIZED"
        echo "✅ Reuniões com acesso como participante: $ACCESSIBLE"
        echo "🔒 Reuniões restritas: $RESTRICTED"
        
        if [ "$ORGANIZED" -gt 0 ]; then
            echo ""
            echo "👑 SUAS REUNIÕES (acesso total):"
            echo $PERMISSIONS | jq -r '.categories.organized[] | "  📄 \(.title) (ID: \(.id))"'
        fi
        
        if [ "$ACCESSIBLE" -gt 0 ]; then
            echo ""
            echo "✅ REUNIÕES ACESSÍVEIS:"
            echo $PERMISSIONS | jq -r '.categories.accessible[] | "  📄 \(.title) (ID: \(.id))"'
        fi
        
        if [ "$RESTRICTED" -gt 0 ]; then
            echo ""
            echo "🔒 REUNIÕES RESTRITAS:"
            echo $PERMISSIONS | jq -r '.categories.restricted[] | "  📄 \(.title) (Org: \(.organizer))"'
            
            echo ""
            echo "💡 Para acessar reuniões restritas:"
            echo "• Entre em contato com os organizadores listados acima"
            echo "• Solicite compartilhamento ou mudança de privacidade"
        fi
        ;;
        
    3)
        echo ""
        echo "🔒 DEMONSTRAÇÃO DE ACESSO RESTRITO"
        echo "================================="
        
        # Primeiro, encontrar uma transcrição restrita
        TRANSCRIPTS=$(curl -s -X GET "http://localhost:3000/fireflies/transcripts?limit=20" \
          -H "Authorization: Bearer $TOKEN")
        
        RESTRICTED_ID=$(echo $TRANSCRIPTS | jq -r '.data[] | select(.hasAccess == false) | .id' | head -1)
        
        if [ -n "$RESTRICTED_ID" ] && [ "$RESTRICTED_ID" != "null" ]; then
            echo "🎯 Encontrada transcrição restrita: $RESTRICTED_ID"
            
            # Tentar acessar
            echo ""
            echo "🧪 Tentando acessar transcrição restrita..."
            RESTRICTED_ACCESS=$(curl -s -X GET "http://localhost:3000/fireflies/transcript/$RESTRICTED_ID" \
              -H "Authorization: Bearer $TOKEN")
            
            if echo $RESTRICTED_ACCESS | jq -e '.message' > /dev/null 2>&1; then
                ERROR_MSG=$(echo $RESTRICTED_ACCESS | jq -r '.message')
                log_warning "✅ Proteção funcionando: $ERROR_MSG"
                
                # Mostrar detalhes da restrição
                ACCESS_INFO=$(curl -s -X GET "http://localhost:3000/fireflies/transcript/$RESTRICTED_ID/access-info" \
                  -H "Authorization: Bearer $TOKEN")
                
                ORGANIZER=$(echo $ACCESS_INFO | jq -r '.organizer')
                PRIVACY=$(echo $ACCESS_INFO | jq -r '.privacy')
                ACCESS_REASON=$(echo $ACCESS_INFO | jq -r '.accessReason')
                
                echo ""
                echo "🔍 DETALHES DA RESTRIÇÃO:"
                echo "========================"
                echo "👤 Organizador: $ORGANIZER"
                echo "🔒 Privacidade: $PRIVACY"
                echo "💡 Motivo: $ACCESS_REASON"
            else
                log_error "❌ PROBLEMA: Acesso deveria ter sido negado!"
                echo $RESTRICTED_ACCESS | jq '.'
            fi
        else
            log_info "✅ Todas as suas transcrições são acessíveis!"
            echo "Isso significa que você tem boa configuração de permissões."
        fi
        ;;
        
    4)
        echo ""
        echo "🔗 DEMONSTRAÇÃO DE VINCULAÇÃO MANUAL"
        echo "===================================="
        
        # Buscar sessão sem transcrição
        SESSIONS=$(curl -s -X GET "http://localhost:3000/sessions?limit=10" \
          -H "Authorization: Bearer $TOKEN")
        
        SESSION_WITHOUT_TRANSCRIPT=$(echo $SESSIONS | jq -r '.data[] | select(.transcriptId == null and .status == "COMPLETED") | .id' | head -1)
        
        if [ -n "$SESSION_WITHOUT_TRANSCRIPT" ] && [ "$SESSION_WITHOUT_TRANSCRIPT" != "null" ]; then
            echo "🎯 Sessão encontrada sem transcrição: $SESSION_WITHOUT_TRANSCRIPT"
            
            # Buscar transcrição acessível
            TRANSCRIPTS=$(curl -s -X GET "http://localhost:3000/fireflies/transcripts?limit=10" \
              -H "Authorization: Bearer $TOKEN")
            
            ACCESSIBLE_TRANSCRIPT=$(echo $TRANSCRIPTS | jq -r '.data[] | select(.hasAccess == true) | .id' | head -1)
            
            if [ -n "$ACCESSIBLE_TRANSCRIPT" ] && [ "$ACCESSIBLE_TRANSCRIPT" != "null" ]; then
                echo "🎯 Transcrição acessível encontrada: $ACCESSIBLE_TRANSCRIPT"
                
                echo ""
                read -p "Deseja vincular a sessão com esta transcrição? (y/n): " CONFIRM
                
                if [ "$CONFIRM" = "y" ] || [ "$CONFIRM" = "Y" ]; then
                    echo ""
                    echo "🔗 Executando vinculação..."
                    
                    LINK_RESULT=$(curl -s -X POST "http://localhost:3000/fireflies/link/$SESSION_WITHOUT_TRANSCRIPT/$ACCESSIBLE_TRANSCRIPT" \
                      -H "Authorization: Bearer $TOKEN")
                    
                    echo "📤 Resultado:"
                    echo $LINK_RESULT | jq '.'
                    
                    if echo $LINK_RESULT | jq -e '.success' > /dev/null 2>&1; then
                        SUCCESS=$(echo $LINK_RESULT | jq -r '.success')
                        if [ "$SUCCESS" = "true" ]; then
                            log_success "✅ Vinculação realizada com sucesso!"
                        else
                            log_error "❌ Falha na vinculação"
                        fi
                    else
                        log_error "❌ Erro na vinculação"
                    fi
                else
                    echo "Vinculação cancelada."
                fi
            else
                log_warning "Nenhuma transcrição acessível encontrada para vincular"
            fi
        else
            log_info "Nenhuma sessão sem transcrição encontrada"
        fi
        ;;
        
    5)
        echo ""
        echo "⚙️  VERIFICAÇÃO DE CONFIGURAÇÕES DE PRIVACIDADE"
        echo "=============================================="
        
        TRANSCRIPTS=$(curl -s -X GET "http://localhost:3000/fireflies/transcripts?limit=20" \
          -H "Authorization: Bearer $TOKEN")
        
        echo "🔍 Análise de privacidade das suas transcrições:"
        echo ""
        
        # Contar por tipo de privacidade
        PUBLIC_COUNT=$(echo $TRANSCRIPTS | jq '[.data[] | select(.privacy != "only_owner")] | length')
        PRIVATE_COUNT=$(echo $TRANSCRIPTS | jq '[.data[] | select(.privacy == "only_owner")] | length')
        
        echo "📊 ESTATÍSTICAS DE PRIVACIDADE:"
        echo "==============================="
        echo "🌐 Reuniões públicas/compartilhadas: $PUBLIC_COUNT"
        echo "🔒 Reuniões privadas (only_owner): $PRIVATE_COUNT"
        
        echo ""
        echo "📋 DETALHES POR TRANSCRIÇÃO:"
        echo "============================"
        echo $TRANSCRIPTS | jq -r '.data[] | "📄 \(.title)\n   🔒 Privacidade: \(.privacy)\n   👤 Organizador: \(.organizer_email)\n   ✅ Tem acesso: \(.hasAccess)\n   💡 Motivo: \(.accessReason)\n"'
        
        if [ "$PRIVATE_COUNT" -gt 0 ]; then
            echo ""
            echo "💡 RECOMENDAÇÕES:"
            echo "================"
            echo "• Para futuras reuniões, configure privacidade como 'public'"
            echo "• Ou certifique-se de ser o organizador das reuniões importantes"
            echo "• Solicite aos organizadores das reuniões privadas para compartilhar"
        fi
        ;;
        
    *)
        log_error "Opção inválida"
        exit 1
        ;;
esac

echo ""
echo "🎯 TESTE CONCLUÍDO!"
echo "=================="
echo "Outros comandos úteis:"
echo "• ./test-fireflies-complete.sh - Teste completo"
echo "• curl -X GET 'http://localhost:3000/fireflies/config-check' -H 'Authorization: Bearer $TOKEN'"
echo "• curl -X GET 'http://localhost:3000/fireflies/my-permissions' -H 'Authorization: Bearer $TOKEN'"