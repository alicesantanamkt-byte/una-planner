# Plano de QA — UNA Planner

## P0 — críticos
1. Cliente A nunca vê dados da Cliente B.
2. Usuário cliente não acessa /admin.
3. Admin acessa todas as clientes autorizadas.
4. Token Google nunca aparece no frontend.
5. Asset privado exige signed URL.
6. Aceite de sugestão não cria evento duplicado.
7. Timezone America/Sao_Paulo permanece correto.
8. Evento protegido nunca vira janela livre.

## P1 — importantes
1. Rejeição preserva motivo.
2. PDF de baixa confiança exige revisão.
3. Importação não duplica conteúdo no mesmo upload.
4. Google sync trata cancelamentos.
5. Erro de API mostra estado recuperável.
6. Upload inválido é bloqueado.
7. Cliente pode desconectar Google.

## P2 — experiência
1. Mobile legível.
2. Linguagem da cliente não expõe termos técnicos.
3. Admin consegue identificar exceções rápido.
4. Estado vazio explica próximo passo.
5. Ações têm feedback visual.
