document.addEventListener("DOMContentLoaded", () => {
    // Pega o container principal da página
    const container = document.getElementById("pedido-finalizado");
    if (!container) {
        console.error("Container com ID 'pedido-finalizado' não encontrado.");
        return;
    }

    // Pega os dados do pedido do localStorage e da URL
    const produtosPedido = JSON.parse(localStorage.getItem("produtosPedido")) || [];
    const total = localStorage.getItem("totalPedido") || "0.00";
    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get("pedidoId");

    // Limpa o container antes de adicionar o novo conteúdo
    container.innerHTML = ''; 

    if (produtosPedido.length === 0 || !pedidoId) {
        container.innerHTML = "<p>Não foi possível carregar os detalhes do pedido.</p>";
    } else {
        // Cria o HTML para a lista de produtos dentro do card
        const produtosHTML = produtosPedido.map(p => `
            <div class="produto-item">
                <span>${p.nome}</span>
                <strong>R$ ${p.preco.toFixed(2).replace('.', ',')}</strong>
            </div>
        `).join('');
        
        // Cria o HTML completo do card de resumo do pedido com as classes de estilo
        const resumoHTML = `
            <div class="resumo-pedido-card">
                <p><strong>Pedido ID:</strong> #${pedidoId}</p>
                <hr>
                ${produtosHTML}
                <div class="total">
                    <span>Total do Pedido:</span>
                    <span>R$ ${parseFloat(total).toFixed(2).replace('.', ',')}</span>
                </div>
                <div class="status">
                    <span>⏳</span> Status: Aguardando Pagamento
                </div>
            </div>
            <button id="btn-pagamento">Ir para Pagamento</button>
        `;

        // Insere o HTML completo na página de uma só vez
        container.innerHTML = resumoHTML;

        // Adiciona o evento de clique ao botão que acabamos de criar
        document.getElementById("btn-pagamento").onclick = () => {
            // Lógica para construir a URL da página de pagamento
            const produtosURL = produtosPedido
                .map((p) => `produto=${encodeURIComponent(p.nome)}`)
                .join("&");

            // Limpa os dados temporários do localStorage antes de redirecionar
            localStorage.removeItem("produtosPedido");
            
            let url = `/pages/pagamento.html?${produtosURL}`;
            if (pedidoId) {
                url += `&pedidoId=${pedidoId}`;
            }
            
            // Redireciona o usuário para a página de pagamento
            window.location.href = url;
        };
    }
});