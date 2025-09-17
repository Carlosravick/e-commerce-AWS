// =================================================================================
// CHAVE DE CONTROLE: Mude para 'false' quando for para a produção na AWS
const MODO_DESENVOLVIMENTO = false;
// =================================================================================

// 🔧 Substitua pela sua Chave Publicável de TESTE que você pegou do Stripe
const STRIPE_PUBLISHABLE_KEY = 'pk_test';

// 🔧 Substitua pela URL do seu endpoint do API Gateway
const API_URL = "endpoint do API Gateway";

// --- FUNÇÕES AUXILIARES PARA MOSTRAR AS TELAS FINAIS ---

function mostrarTelaDeSucesso(pedidoId) {
    const container = document.getElementById('pagamento-container');
    container.innerHTML = `
        <div class="success-container">
            <h1>✅ Pagamento Aprovado!</h1>
            <p>Obrigado pela sua compra. Seu pedido foi confirmado.</p>
            <p>ID do Pedido: <code>${pedidoId}</code></p>
            <a href="./meus-pedidos.html" class="btn-meus-pedidos">Ver Meus Pedidos</a>
        </div>
    `;
    localStorage.removeItem("totalPedido");
    localStorage.removeItem("produtosPedido"); // Limpa o carrinho
}

function mostrarTelaDeFalha(motivo) {
    const container = document.getElementById('pagamento-container');
    container.innerHTML = `
        <div class="error-container">
            <h1>❌ Falha no Pagamento</h1>
            <p>Não foi possível processar seu pagamento.</p>
            <p><strong>Motivo:</strong> ${motivo || 'Pagamento Recusado.'}</p>
            <a href="./revisar-pedido.html" class="btn-voltar">Voltar e Tentar Novamente</a>
        </div>
    `;
}

// --- FUNÇÃO DE POLLING: A NOVA INTELIGÊNCIA ---

function iniciarPollingDeStatus(pedidoId) {
    const INTERVALO = 3000; // Pergunta a cada 3 segundos
    const MAX_TENTATIVAS = 10; // Para depois de 30 segundos (10 x 3s)
    let tentativas = 0;

    const pollingId = setInterval(async () => {
        tentativas++;
        console.log(`Tentativa de polling #${tentativas} para o pedido ${pedidoId}`);

        if (tentativas > MAX_TENTATIVAS) {
            clearInterval(pollingId);
            mostrarTelaDeFalha("O processamento está demorando mais que o esperado. Por favor, verifique a página 'Meus Pedidos' mais tarde.");
            return;
        }

        try {
            // Chama o novo endpoint GET /pedidos/{pedidoId}
            const response = await fetch(`${API_URL}/pedidos/${pedidoId}`);
            if (!response.ok) { throw new Error('Falha ao buscar status do pedido.'); }

            const data = await response.json();

            // Se a busca não retornar um pedido ainda (pode demorar um pouco para salvar no DB), continue tentando
            if (!data || !data.status) {
                console.log("Pedido ainda não encontrado no DB, continuando polling...");
                return;
            }

            // VERIFICA O STATUS RETORNADO PELA LAMBDA 'recupera-pedido'
            if (data.status === 'pago') {
                clearInterval(pollingId); // PARA o loop
                console.log('Status: PAGO. Polling encerrado.');
                mostrarTelaDeSucesso(pedidoId);
            } else if (data.status === 'recusado' || data.status === 'cancelado' || data.status === 'erro') {
                clearInterval(pollingId); // PARA o loop
                console.log(`Status: ${data.status}. Polling encerrado.`);
                mostrarTelaDeFalha(data.motivo);
            }
            // Se o status for 'processando' ou qualquer outra coisa, o loop continua na próxima tentativa...

        } catch (error) {
            console.error("Erro durante o polling:", error);
            clearInterval(pollingId); // Para o loop em caso de erro de rede/API
            mostrarTelaDeFalha("Ocorreu um erro de comunicação ao verificar seu pagamento.");
        }
    }, INTERVALO);
}


// --- LÓGICA PRINCIPAL DA PÁGINA ---

document.addEventListener('DOMContentLoaded', () => {
    if (MODO_DESENVOLVIMENTO) { /* ... modo de desenvolvimento ... */ return; }

    const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
    const elements = stripe.elements({ locale: 'pt-BR' });
    const container = document.getElementById("pagamento-container");
    const form = document.getElementById("payment-form");
    const payButton = document.getElementById('pay-button');
    const cardErrors = document.getElementById('card-errors');
    const pedidoIdDisplay = document.getElementById('pedido-id-display');
    const totalDisplay = document.getElementById('total-display');

    const urlParams = new URLSearchParams(window.location.search);
    const pedidoId = urlParams.get("pedidoId");
    const total = localStorage.getItem('totalPedido') || '0.00';

    if (pedidoId) { pedidoIdDisplay.textContent = `#${pedidoId}`; }
    totalDisplay.textContent = parseFloat(total).toFixed(2).replace('.', ',');

    const cardElement = elements.create('card');
    cardElement.mount('#card-element');
    cardElement.on('change', (event) => {
        cardErrors.textContent = event.error ? event.error.message : '';
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        payButton.textContent = 'Processando...';
        payButton.disabled = true;
        cardErrors.textContent = '';

        const { error, paymentMethod } = await stripe.createPaymentMethod({
            type: 'card',
            card: cardElement,
            billing_details: { name: document.getElementById("nome").value },
        });

        if (error) {
            cardErrors.textContent = error.message;
            payButton.textContent = 'Pagar Agora';
            payButton.disabled = false;
            return;
        }

        try {
            const response = await fetch(`${API_URL}/pagamentos`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    pedidoId: pedidoId,
                    payment_token: paymentMethod.id
                })
            });

            if (!response.ok) { throw new Error("Erro do servidor ao iniciar o pagamento."); }

            // --- MUDANÇA PRINCIPAL ---
            // Se a requisição inicial foi aceita, mostramos uma tela de processamento e começamos a sondagem (polling)
            console.log("Requisição inicial enviada com sucesso. Iniciando polling...");
            container.innerHTML = `
                <div class="processing-container">
                    <h1>⏳ Processando seu pagamento...</h1>
                    <p>Isso pode levar alguns segundos. Por favor, não feche ou atualize esta página.</p>
                </div>
            `;
            // Inicia a função que vai ficar verificando o status
            iniciarPollingDeStatus(pedidoId);

        } catch (apiError) {
            cardErrors.textContent = "Não foi possível se comunicar com nosso servidor. Tente novamente.";
            payButton.textContent = 'Pagar Agora';
            payButton.disabled = false;
            console.error("Erro na API:", apiError);
        }
    });
});