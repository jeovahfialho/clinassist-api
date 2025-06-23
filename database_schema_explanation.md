# Estrutura Relacional do Banco de Dados

## 📊 Diagrama de Relacionamentos

```
┌─────────────────┐    1:N    ┌─────────────────┐    1:N    ┌─────────────────┐
│      USERS      │ ────────▶ │    PATIENTS     │ ────────▶ │    SESSIONS     │
│                 │           │                 │           │                 │
│ • id (PK)       │           │ • id (PK)       │           │ • id (PK)       │
│ • email         │           │ • name          │           │ • scheduledAt   │
│ • password      │           │ • cpf           │           │ • duration      │
│ • name          │           │ • email         │           │ • status        │
│ • crp           │           │ • phone         │           │ • evolutionNotes│
│ • role          │           │ • dateOfBirth   │           │ • techniques    │
│ • specialty     │           │ • initialDemand │           │ • observations  │
│ • isActive      │           │ • objectives    │           │ • meetingUrl    │
│                 │           │ • recordingConsent │        │ • firefliesId   │
│                 │           │ • dataConsent   │           │ • transcriptId  │
│                 │           │ • psychologistId│           │ • hasRecording  │
│                 │           │   (FK → users)  │           │ • patientId     │
│                 │           │                 │           │   (FK → patients)│
│                 │           │                 │           │ • psychologistId│
│                 │           │                 │           │   (FK → users)  │
└─────────────────┘           └─────────────────┘           └─────────────────┘
         │                             │                             │
         │ 1:N                         │ 1:N                        │
         ▼                             ▼                             │
┌─────────────────┐           ┌─────────────────┐                   │
│   DOCUMENTS     │           │                 │                   │
│                 │           │  (Relacionamento │                   │
│ • id (PK)       │           │   indireto via   │                   │
│ • title         │           │   patients)      │                   │
│ • type          │           │                 │                   │
│ • content       │           └─────────────────┘                   │
│ • fileName      │                                                 │
│ • patientId     │                                                 │
│   (FK → patients)│◀────────────────────────────────────────────────┘
└─────────────────┘
```

## 🔗 Relacionamentos Detalhados

### **1. USER → PATIENTS (1:N)**
**"Um psicólogo pode ter vários pacientes"**

```sql
-- Relacionamento definido em Patient
psychologistId String
psychologist   User @relation(fields: [psychologistId], references: [id])

-- Relacionamento definido em User  
patients       Patient[]
```

**Exemplo prático:**
```
👨‍⚕️ Dr. João Silva (user_123)
├── 👤 Maria Santos (patient_456)
├── 👤 Carlos Lima (patient_789) 
└── 👤 Ana Costa (patient_101)
```

### **2. PATIENT → SESSIONS (1:N)**
**"Um paciente pode ter várias sessões"**

```sql
-- Relacionamento definido em Session
patientId      String
patient        Patient @relation(fields: [patientId], references: [id])

-- Relacionamento definido em Patient
sessions       Session[]
```

**Exemplo prático:**
```
👤 Maria Santos (patient_456)
├── 📅 Sessão 1 - 15/06/2024 (session_111)
├── 📅 Sessão 2 - 22/06/2024 (session_222)
└── 📅 Sessão 3 - 29/06/2024 (session_333)
```

### **3. USER → SESSIONS (1:N)**
**"Um psicólogo pode ter várias sessões (direto)"**

```sql
-- Relacionamento definido em Session
psychologistId String
psychologist   User @relation(fields: [psychologistId], references: [id])

-- Relacionamento definido em User
sessions       Session[]
```

### **4. PATIENT → DOCUMENTS (1:N)**
**"Um paciente pode ter vários documentos"**

```sql
-- Relacionamento definido em Document
patientId      String
patient        Patient @relation(fields: [patientId], references: [id])

-- Relacionamento definido em Patient
documents      Document[]
```

## 📋 Consultas Práticas

### **1. Buscar todos os pacientes de um psicólogo:**
```typescript
const pacientes = await prisma.patient.findMany({
  where: {
    psychologistId: "user_123"
  }
});
```

### **2. Buscar todas as sessões de um paciente:**
```typescript
const sessoes = await prisma.session.findMany({
  where: {
    patientId: "patient_456"
  },
  orderBy: {
    scheduledAt: 'asc'
  }
});
```

### **3. Buscar todas as sessões de um psicólogo:**
```typescript
const todasSessoes = await prisma.session.findMany({
  where: {
    psychologistId: "user_123"
  },
  include: {
    patient: {
      select: {
        name: true,
        phone: true
      }
    }
  }
});
```

### **4. Buscar sessões de um psicólogo com um paciente específico:**
```typescript
const sessoesPaciente = await prisma.session.findMany({
  where: {
    psychologistId: "user_123",
    patientId: "patient_456"
  }
});
```

### **5. Buscar todos os documentos de um paciente:**
```typescript
const documentos = await prisma.document.findMany({
  where: {
    patientId: "patient_456"
  }
});
```

## 🔒 Segurança dos Relacionamentos

### **Isolamento por Psicólogo:**
```typescript
// ✅ CORRETO: Sempre filtrar por psychologistId
const pacientes = await prisma.patient.findMany({
  where: {
    psychologistId: req.user.id  // Psicólogo só vê seus pacientes
  }
});

// ❌ ERRADO: Buscar paciente sem filtro
const paciente = await prisma.patient.findUnique({
  where: { id: patientId }  // Pode acessar paciente de outro psicólogo!
});

// ✅ CORRETO: Sempre validar pertencimento
const paciente = await prisma.patient.findFirst({
  where: {
    id: patientId,
    psychologistId: req.user.id  // Garantir que pertence ao psicólogo
  }
});
```

## 📊 Exemplos de Dados Relacionados

### **Cenário Real:**
```json
{
  "psicologo": {
    "id": "user_123",
    "name": "Dr. João Silva",
    "crp": "CRP-01/12345",
    "email": "joao@clinica.com",
    "pacientes": [
      {
        "id": "patient_456", 
        "name": "Maria Santos",
        "cpf": "123.456.789-00",
        "sessoes": [
          {
            "id": "session_111",
            "scheduledAt": "2024-06-15T14:00:00Z",
            "status": "COMPLETED",
            "evolutionNotes": "Paciente demonstrou melhora...",
            "hasRecording": true,
            "transcriptId": "transcript_aaa"
          },
          {
            "id": "session_222", 
            "scheduledAt": "2024-06-22T14:00:00Z",
            "status": "SCHEDULED",
            "hasRecording": false
          }
        ],
        "documentos": [
          {
            "id": "doc_111",
            "title": "Relatório de Evolução - Junho 2024",
            "type": "EVOLUTION_REPORT",
            "content": "[Conteúdo criptografado]"
          }
        ]
      }
    ]
  }
}
```

## 🎯 Principais Características

### **✅ Vantagens da Estrutura:**

1. **Isolamento Completo:**
   - Cada psicólogo só acessa seus próprios dados
   - Impossível ver pacientes de outros profissionais

2. **Flexibilidade:**
   - Paciente pode ter quantas sessões precisar
   - Documentos ilimitados por paciente
   - Histórico completo mantido

3. **Integridade Referencial:**
   - Relacionamentos garantidos pelo Prisma
   - Exclusões em cascata controladas
   - Consistência de dados

4. **Escalabilidade:**
   - Suporta milhares de psicólogos
   - Cada um com milhares de pacientes
   - Performance otimizada com índices

### **🔐 Segurança Implementada:**

1. **Filtros Obrigatórios:**
   ```typescript
   // Todo acesso sempre filtra por psychologistId
   where: {
     psychologistId: req.user.id
   }
   ```

2. **Validação de Propriedade:**
   ```typescript
   // Verificar se paciente pertence ao psicólogo
   const patient = await prisma.patient.findFirst({
     where: { id: patientId, psychologistId }
   });
   if (!patient) throw new NotFoundException();
   ```

3. **Criptografia de Dados:**
   - Dados sensíveis criptografados
   - Descriptografia apenas no momento da consulta

## 📈 Resumo dos Relacionamentos

| Tabela | Relacionamento | Descrição |
|--------|---------------|-----------|
| **User** | 1:N → Patient | Um psicólogo tem vários pacientes |
| **User** | 1:N → Session | Um psicólogo tem várias sessões |
| **Patient** | 1:N → Session | Um paciente tem várias sessões |
| **Patient** | 1:N → Document | Um paciente tem vários documentos |
| **Session** | N:1 → Patient | Cada sessão pertence a um paciente |
| **Session** | N:1 → User | Cada sessão pertence a um psicólogo |
| **Document** | N:1 → Patient | Cada documento pertence a um paciente |

**A estrutura garante total isolamento e segurança entre psicólogos, permitindo flexibilidade total no atendimento aos pacientes!** 🔒✨