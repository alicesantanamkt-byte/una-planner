# UNA Planner — Checklist de Beta Fechado

## Objetivo
Testar com 1 a 3 clientes reais antes de ampliar.

## Cliente ideal para primeiro beta
Escolher clientes que:
- já produzem conteúdo com frequência;
- tenham rotina relativamente previsível;
- aceitem testar o Google Agenda;
- deem feedback rápido;
- não tenham um fluxo excessivamente sensível no início.

## Antes de convidar
- [ ] banco de produção separado do desenvolvimento
- [ ] domínio HTTPS
- [ ] e-mail de suporte
- [ ] política de privacidade
- [ ] termos de uso
- [ ] rotina de backup
- [ ] logs de erro
- [ ] credenciais Google de produção
- [ ] bucket privado
- [ ] revisão das políticas RLS
- [ ] limite de upload definido
- [ ] chaves fora do código

## Teste do onboarding
- [ ] cliente entende Google/manual/híbrido
- [ ] conclui sem ajuda
- [ ] preferências ficam salvas
- [ ] restrições são respeitadas

## Teste da agenda
- [ ] compromisso manual persiste
- [ ] Google conecta
- [ ] eventos sincronizam
- [ ] eventos cancelados somem
- [ ] não há duplicidade
- [ ] timezone correto

## Teste do calendário editorial
- [ ] XLSX importa corretamente
- [ ] PDF passa por revisão
- [ ] datas não são inventadas
- [ ] conteúdos de baixa confiança ficam claros

## Teste do motor
- [ ] não usa período ocupado
- [ ] respeita duração
- [ ] respeita local
- [ ] respeita restrições
- [ ] score faz sentido
- [ ] aceitar cria evento
- [ ] rejeitar registra motivo
- [ ] novo cálculo funciona

## Teste das microcaptações
- [ ] não sugere durante direção
- [ ] não sugere em contexto privado
- [ ] não gera excesso
- [ ] sugestão é realmente executável
- [ ] cliente entende que é opcional

## Teste do banco
- [ ] upload funciona no celular
- [ ] vídeos grandes são bloqueados
- [ ] arquivo privado abre com signed URL
- [ ] cliente não acessa asset de outra
- [ ] matching não força associação

## Métricas do beta
Registrar por cliente:
- % sugestões aceitas
- % conteúdos gravados no prazo
- rejeições por semana
- intervenções manuais da UNA
- microcaptações concluídas
- assets reaproveitados
- tempo economizado pela UNA
- satisfação da cliente

## Critérios para considerar o beta bem-sucedido
- >= 70% das sugestões consideradas úteis
- redução perceptível do acompanhamento manual
- nenhuma falha de isolamento entre clientes
- cliente consegue operar sem treinamento longo
- motor não aumenta sensação de cobrança
