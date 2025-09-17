// =================================================================================
// CHAVE DE CONTROLE: Mude para 'false' quando for para a produção na AWS
const MODO_DESENVOLVIMENTO = false; 
// =================================================================================

// 🔧 Substitua pela URL do seu endpoint do API Gateway quando for para produção
const API_URL = "API Gateway";

console.log("🚀 Arquivo carregado - MODO_DESENVOLVIMENTO:", MODO_DESENVOLVIMENTO);

// --- LÓGICA PARA EXIBIR OS PRODUTOS NO CARRINHO ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 DOM carregado, iniciando...");
    
    const container = document.getElementById("resumo-pedido");
    const limparCarrinhoContainer = document.getElementById('limpar-carrinho-container'); 
    
    if (!container) {
        console.error("❌ Elemento 'resumo-pedido' não encontrado!");
        return;
    }
    
    console.log("✅ Container encontrado:", container);
    
    const produtosSelecionados = JSON.parse(localStorage.getItem('carrinho')) || [];
    console.log("🛒 Produtos no carrinho:", produtosSelecionados);
    
    const produtosDisponiveis = [
        { nome: "Caneca Personalizada", preco: 49.90, imagem: "../assets/caneca.png" },
        { nome: "Notebook Gamer", preco: 149.90, imagem: "../assets/macbook.png" },
        { nome: "Porsche", preco: 1500.00, imagem: "../assets/porsche.png" }
    ];
    
    const encontrados = produtosDisponiveis.filter(p => produtosSelecionados.includes(p.nome));
    console.log("🎯 Produtos encontrados:", encontrados);
    
    let total = 0;

    if (encontrados.length === 0) {
        console.log("📦 Carrinho vazio");
        container.innerHTML = "<p>Seu carrinho está vazio.</p>";
        const finalizarContainer = document.getElementById('finalizar-container');
        if (finalizarContainer) {
            finalizarContainer.innerHTML = '';
        }
    } else {
        console.log("🛍️ Carrinho com", encontrados.length, "produtos");
        
        // Criar botão de limpar carrinho (com verificação de segurança)
        if (limparCarrinhoContainer) {
            limparCarrinhoContainer.innerHTML = `<button id="limpar-carrinho-btn">Esvaziar Carrinho</button>`;
            const limparBtn = document.getElementById('limpar-carrinho-btn');
            if (limparBtn) {
                limparBtn.addEventListener('click', () => {
                    if (confirm("Você tem certeza que deseja remover todos os itens do carrinho?")) {
                        localStorage.removeItem('carrinho');
                        window.location.reload();
                    }
                });
            }
        } else {
            console.warn("⚠️ Elemento 'limpar-carrinho-container' não encontrado");
        }

        container.innerHTML = '';
        encontrados.forEach((prod) => {
            total += prod.preco;
            const div = document.createElement("div");
            div.className = "cart-item"; 
            div.innerHTML = `
                <img src="${prod.imagem}" alt="${prod.nome}">
                <div class="item-details">
                    <h2>${prod.nome}</h2>
                    <p>R$ ${prod.preco.toFixed(2).replace('.', ',')}</p> 
                </div>
            `;
            container.appendChild(div);
        });

        console.log("💰 Total calculado:", total);

        // Atualizar elementos com verificação de segurança
        const totalContainer = document.getElementById('total-container');
        if (totalContainer) {
            totalContainer.innerHTML = `<div class="cart-total">Total: R$ ${total.toFixed(2).replace('.', ',')}</div>`;
        }
        
        const finalizarContainer = document.getElementById('finalizar-container');
        if (finalizarContainer) {
            finalizarContainer.innerHTML = `<button id="finalizar-pedido">Finalizar Pedido</button>`;
            console.log("✅ Botão 'Finalizar Pedido' criado");
            
            // Aguardar um pouco antes de vincular o evento
            setTimeout(() => {
                vincularEventoFinalizarPedido(encontrados, total);
            }, 100);
        } else {
            console.error("❌ Elemento 'finalizar-container' não encontrado!");
        }
    }
});

// --- LÓGICA DO BOTÃO "FINALIZAR PEDIDO" ---

function vincularEventoFinalizarPedido(encontrados, total) {
    console.log("🔗 Vinculando evento ao botão finalizar");
    
    const botaoFinalizar = document.getElementById("finalizar-pedido");
    
    if (!botaoFinalizar) {
        console.error("❌ Botão 'finalizar-pedido' não encontrado!");
        return;
    }
    
    console.log("✅ Botão encontrado, adicionando listener");
    
    botaoFinalizar.addEventListener("click", (event) => {
        event.preventDefault(); // Previne comportamento padrão
        console.log("🔥 BOTÃO CLICADO! Modo desenvolvimento:", MODO_DESENVOLVIMENTO);
        
        if (MODO_DESENVOLVIMENTO) {
            console.log("🧪 Executando modo desenvolvimento...");
            
            // --- MODO DE DESENVOLVIMENTO (FRONT-END APENAS) ---
            console.warn("AVISO: Rodando em Modo de Desenvolvimento. Simulando finalização.");
            const pedidoIdSimulado = `pedido_${new Date().getTime()}`;
            
            console.log("💾 Salvando dados no localStorage...");
            localStorage.setItem("produtosPedido", JSON.stringify(encontrados));
            localStorage.setItem("totalPedido", total.toFixed(2));
            localStorage.removeItem('carrinho');
            
            console.log("✅ Dados salvos:", {
                produtosPedido: localStorage.getItem("produtosPedido"),
                totalPedido: localStorage.getItem("totalPedido"),
                pedidoId: pedidoIdSimulado
            });
            
            alert("Pedido finalizado com sucesso! (Simulação)");
            
            // Tentar diferentes caminhos de redirecionamento
            const caminhos = [
                `pedido.html?pedidoId=${pedidoIdSimulado}`
            ];
            
            console.log("🔄 Tentando redirecionamento para:", caminhos[0]);
            window.location.href = caminhos[0];

        } else {
            console.log("🏭 Executando modo produção...");
            
            // --- MODO DE PRODUÇÃO (CÓDIGO FINAL PARA AWS) ---
            // if (API_URL === "https://1exg8dffji.execute-api.sa-east-1.amazonaws.com/dev") {
            //     alert("Erro: A URL da API ainda não foi configurada no arquivo revisar-pedido.js");
            //     return;
            // }
            
            const botao = document.getElementById("finalizar-pedido");
            botao.disabled = true;
            botao.textContent = "Processando...";

            fetch(`${API_URL}/pedidos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    produtos: encontrados.map((p) => p.nome),
                    total: total,
                }),
            })
            .then(res => res.json())
            .then(data => {
                let respostaFinal = data;
                if (typeof data.body === "string") {
                    try { respostaFinal = JSON.parse(data.body); } 
                    catch (e) { console.error("Erro ao fazer parse do body:", e); }
                }
                const pedidoId = respostaFinal.pedidoId;
                if (pedidoId) {
                    alert("Pedido realizado com sucesso!");
                    localStorage.removeItem('carrinho');
                    localStorage.setItem("produtosPedido", JSON.stringify(encontrados));
                    localStorage.setItem("totalPedido", total.toFixed(2));
                    localStorage.setItem("pedidoId", pedidoId);
                    window.location.href = `/pages/pedido.html?pedidoId=${pedidoId}`;
                } else {
                    alert("Ocorreu um erro com o seu pedido. Tente novamente.");
                    botao.disabled = false;
                    botao.textContent = "Finalizar Pedido";
                }
            })
            .catch(err => {
                console.error("Erro ao iniciar pedido:", err);
                alert("Erro de comunicação ao iniciar o pedido. Verifique sua conexão e tente novamente.");
                botao.disabled = false;
                botao.textContent = "Finalizar Pedido";
            });
        } 
    });
    
    console.log("✅ Event listener adicionado com sucesso!");
}