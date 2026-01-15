**
 * 🎮 EXEMPLO: Botões Interativos do Jogo da Velha
    * 
 * Este código mostra como criar botões que desaparecem após serem clicados.
 * A mágica está em regenerar os botões apenas para as posições vazias do tabuleiro!
    */
// ============================================
// 1️⃣ CRIANDO OS BOTÕES DINAMICAMENTE
// ============================================
async function renderBoard(conn, groupId, board, caption, m) {
        // O tabuleiro é uma matriz 3x3, onde:
        // ' ' = posição vazia
        // 'X' = jogada do jogador X
        // 'O' = jogada do jogador O
        const buttons = [];
        // Percorre todas as 9 posições do tabuleiro
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                const pos = i * 3 + j + 1; // Posição de 1 a 9
                // 🔑 CHAVE DO FUNCIONAMENTO:
                // Só cria botão se a posição estiver vazia!
                if (board[i][j] === ' ') {
                    buttons.push({
                        name: 'quick_reply',
                        buttonParamsJson: JSON.stringify({
                            display_text: pos.toString(), // Mostra "1", "2", "3", etc
                            id: `velha_move_${pos}` // ID único para identificar o clique
                        })
                    });
                }
                // Se a posição já tem 'X' ou 'O', simplesmente NÃO cria botão!
            }
        }
        // Adiciona botão de cancelar (sempre presente)
        buttons.push({
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({
                display_text: 'Encerrar',
                id: 'velha_cancel'
            })
        });
        // Envia a mensagem com os botões
        await conn.sendButton(groupId, {
            image: imagemDoTabuleiro, // Imagem do tabuleiro
            caption: caption,
            hasMediaAttachment: true,
            interactiveButtons: buttons
        }, { quoted: m });
    }
// ============================================
// 2️⃣ PROCESSANDO O CLIQUE NO BOTÃO
// ============================================
handler.all = async function (m) {
    // Extrai o ID do botão clicado
    const btn = m.message?.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson;
    let id = null;
    if (btn) {
        try {
            const params = JSON.parse(btn);
            id = params.id; // Por exemplo: "velha_move_5"
        } catch (e) { }
    }
    if (!id || !id.startsWith('velha_')) return;
    // Se o jogador clicou em uma posição (ex: "velha_move_5")
    if (id.startsWith('velha_move_')) {
        const pos = parseInt(id.replace('velha_move_', '')) - 1; // Converte "5" para índice 4
        // Processa a jogada
        const row = Math.floor(pos / 3);
        const col = pos % 3;
        // Atualiza o tabuleiro com a jogada
        game.board[row][col] = 'X'; // Marca a posição
        // 🔄 REGENERA OS BOTÕES
        // Quando chamamos renderBoard() novamente, ele vai:
        // 1. Verificar quais posições estão vazias
        // 2. Criar botões APENAS para essas posições
        // 3. A posição que acabou de ser jogada NÃO terá mais botão!
        await renderBoard(this, groupId, game.board, 'Próxima jogada...', m);
    }
};
// ============================================
// 📊 EXEMPLO VISUAL DO CICLO
// ============================================
/*
INÍCIO DO JOGO:
Tabuleiro: [' ', ' ', ' ']
           [' ', ' ', ' ']
           [' ', ' ', ' ']
Botões criados: 1, 2, 3, 4, 5, 6, 7, 8, 9 ✅
---
JOGADOR CLICA NO BOTÃO "5":
Tabuleiro: [' ', ' ', ' ']
           [' ', 'X', ' ']  <- Posição 5 marcada com X
           [' ', ' ', ' ']
Botões criados: 1, 2, 3, 4, 6, 7, 8, 9 ✅ (botão 5 desapareceu!)
---
BOT JOGA NA POSIÇÃO "1":
Tabuleiro: ['O', ' ', ' ']  <- Posição 1 marcada com O
           [' ', 'X', ' ']
           [' ', ' ', ' ']
Botões criados: 2, 3, 4, 6, 7, 8, 9 ✅ (botões 1 e 5 não aparecem mais!)
E assim por diante... 🎯
*/
// ============================================
// 💡 RESUMO DO FUNCIONAMENTO
// ============================================
/*
O "truque" é simples mas eficaz:
1. Cada vez que o tabuleiro é exibido, TODOS os botões são gerados do ZERO
2. O loop verifica CADA posição do tabuleiro
3. Se a posição está VAZIA (' '), cria o botão
4. Se a posição tem X ou O, NÃO cria o botão
5. Resultado: botões aparecem e desaparecem automaticamente! ✨
Não há necessidade de "remover" botões manualmente.
Simplesmente recriamos a lista de botões baseada no estado atual do jogo!
*/