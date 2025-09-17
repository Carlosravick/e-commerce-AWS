// 🔧 Substitua pela URL do seu endpoint do API Gateway (ex: https://abc123.execute-api.sa-east-1.amazonaws.com/dev)
const API_URL = "API Gateway";

const container = document.getElementById("lista-pedidos");

// Adicionando um feedback de "Carregando..." para o usuário
container.innerHTML = "<p>Carregando seus pedidos...</p>";

fetch(`${API_URL}/pedidos`)
  .then((res) => {
    if (!res.ok) {
        // Se a resposta da API não for de sucesso (ex: erro 500, 404), lança um erro
        throw new Error(`Erro na API: ${res.statusText}`);
    }
    return res.json();
  })
  .then((pedidos) => {
    // Limpa a mensagem de "Carregando..."
    container.innerHTML = "";

    if (!Array.isArray(pedidos) || pedidos.length === 0) {
      container.innerHTML = "<p>Nenhum pedido encontrado.</p>";
      return;
    }

    pedidos.forEach((pedido) => {
      const div = document.createElement("div");
      div.className = "card-pedido";

      // Lógica para os produtos (seu código com ?. é ótimo para segurança)
      const produtosHTML =
        pedido.produtos?.map((nome) => `<li>${nome}</li>`).join("") || "<li>Informação de produtos indisponível.</li>";
      
      const status = pedido.status || "Pendente";
      let statusClass = "pendente"; // Classe padrão
      if (status.toLowerCase().includes("pago")) {
        statusClass = "pago";
      } else if (status.toLowerCase().includes("cancelado")) {
        statusClass = "cancelado";
      }

      // --- MELHORIA 1: Mensagem de Motivo Profissional ---
      // A mensagem sobre o FBI, embora engraçada para testes, foi substituída por uma mais profissional.
      let motivoHTML = "";
      if (status.toLowerCase() === "cancelado" && pedido.motivo) {
        motivoHTML = `<p><strong>Motivo:</strong> ${pedido.motivo}</p>`;
        
        // Exemplo de uma mensagem útil para o cliente
        if (pedido.motivo.toLowerCase().includes("cartão") || pedido.motivo.toLowerCase().includes("pagamento")) {
            motivoHTML += `<p style="color: #c0392b;"><strong>Ação:</strong> Por favor, verifique os dados de pagamento ou tente com outro cartão.</p>`;
        }
      }
      
      // --- MELHORIA 2: Formatação de Preço Consistente ---
      // Usando .replace('.', ',') para manter o padrão do resto do site (ex: R$ 1.649,90)
      const totalFormatado = parseFloat(pedido.total).toFixed(2).replace('.', ',');

      div.innerHTML = `
        <h3>Pedido #${pedido.pedidoId}</h3>
        <p><strong>Status:</strong> <span class="status ${statusClass}">${status}</span></p>
        <p><strong>Total:</strong> R$ ${totalFormatado}</p>
        <p><strong>Produtos:</strong></p>
        <ul>${produtosHTML}</ul>
        ${motivoHTML}
      `;

      container.appendChild(div);
    });
  })
  .catch((err) => {
    console.error("Erro ao buscar pedidos:", err);
    container.innerHTML =
      "<p>❌ Erro ao carregar seus pedidos. Por favor, tente novamente mais tarde.</p>";
  });