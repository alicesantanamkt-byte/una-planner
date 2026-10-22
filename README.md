# UNA Planner — App v7 (Banco de Conteúdo)

## Novo nesta versão
- upload de imagem e vídeo
- Supabase Storage
- metadados de contexto e tags
- exclusão de assets
- banco de conteúdo por cliente
- matching com conteúdos pendentes usando IA
- score de compatibilidade
- justificativa do uso
- sugestão de como reaproveitar o material
- área "Sugestões de uso"

## Fluxo
1. cliente grava ou já possui material
2. envia ao Banco de conteúdo
3. informa contexto e tags
4. app salva arquivo + metadados
5. IA cruza assets com conteúdos pendentes
6. associações com score >= 70 são salvas
7. cliente/UNA visualiza onde aquele material pode ser reaproveitado

## Segurança
- cada cliente só acessa seu próprio bucket lógico
- RLS em content_assets
- policies de Storage por pasta client_id
- exclusão remove arquivo e registro

## Observação
O bucket está público nesta primeira base para simplificar o MVP.
Antes de produção, recomenda-se trocar para bucket privado e usar signed URLs.

## Próximos passos
- marcar asset como "usado"
- incrementar used_count
- vincular microcaptação concluída ao asset
- signed URLs
- thumbnails
- duração e metadados técnicos de vídeo
- painel da UNA vendo o banco da cliente
