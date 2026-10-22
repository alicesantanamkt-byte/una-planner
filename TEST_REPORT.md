# Test report — v8.1

## Executado
- Verificação sintática de 64 arquivos TS/TSX da v8: 0 erros.
- Teste unitário manual do score: cenário ideal retornou 85/100.
- Teste da geração de janelas revelou que dias totalmente livres não eram gerados.

## Corrigido nesta versão
- rotina salva com início/fim do expediente;
- dias ativos adicionados ao perfil;
- motor agora avalia também dias sem eventos;
- motor não agenda horários no passado;
- local só é inferido quando há evidência consistente entre compromissos adjacentes;
- conteúdo com local obrigatório não usa slot de local desconhecido;
- aceite repetido não tenta criar novo evento;
- PDF limitado a 50 MB e MIME application/pdf antes da chamada à OpenAI.

## Limitação do ambiente de teste
O `npm install` excedeu a janela disponível duas vezes, portanto o `next build` completo não pôde ser executado aqui. Isso é uma limitação da instalação de dependências no ambiente, não um erro já observado no código.

## Ainda exige teste integrado
- migrations reais no Supabase;
- OAuth real do Google;
- chamada real à OpenAI;
- upload real no Storage;
- build completo após `npm install`.
