// Função que lê o localStorage e atualiza o número no ícone do carrinho
function atualizarContadorCarrinho() {
    // Busca o carrinho na memória do navegador ou cria um array vazio
    const carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
    // Encontra o elemento na tela que mostra o número
    const contadorElemento = document.querySelector('.cart-count');
    
    // Se o elemento existir, atualiza o número
    if (contadorElemento) {
        contadorElemento.textContent = carrinho.length;
        // Lógica para mostrar/esconder o contador
        if (carrinho.length > 0) {
            contadorElemento.style.display = 'flex'; // Mostra a bolha com o número
        } else {
            contadorElemento.style.display = 'none'; // Esconde se o carrinho estiver vazio
        }
    }
}

// Roda o código principal depois que o HTML da página carregar completamente
document.addEventListener("DOMContentLoaded", () => {
    // Encontra o container onde os produtos serão inseridos
    const container = document.getElementById("produtos-container");

    // Se o container existir, continua
    if (container) {
        const produtosDisponiveis = [
          {
            nome: "Caneca Personalizada",
            preco: 49.9,
            imagem: "./assets/caneca.png",
            alt: "Caneca Personalizada Branca",
            descricao: "Caneca de cerâmica de alta qualidade, perfeita para presentes."
          },
          {
            nome: "Notebook Gamer",
            preco: 149.9,
            imagem: "./assets/macbook.png",
            alt: "Notebook Gamer com tela iluminada",
            descricao: "Performance extrema para seus jogos favoritos."
          },
          {
            nome: "Porsche",
            preco: 1500.0,
            imagem: "./assets/porsche.png",
            alt: "Carro esportivo Porsche azul",
            descricao: "Modelo esportivo de luxo, combinando design icônico e performance."
          }
        ];

        // Limpa o container para garantir que não haja conteúdo duplicado
        container.innerHTML = ""; 

        // Cria o HTML para cada produto e insere na página
        produtosDisponiveis.forEach((produto) => {
            const precoFormatado = produto.preco.toFixed(2).replace(".", ",");
            const cardHTML = `
                <div class="produto-card">
                    <img src="${produto.imagem}" alt="${produto.alt}" class="produto-imagem">
                    <div class="produto-info">
                        <h3 class="produto-titulo">${produto.nome}</h3>
                        <p class="produto-descricao">${produto.descricao}</p>
                        <p class="produto-preco">R$ ${precoFormatado}</p>
                        <button class="btn-comprar" data-nome="${produto.nome}">Adicionar ao Carrinho</button>
                    </div>
                </div>
            `;
            container.innerHTML += cardHTML;
        });

        // Adiciona a funcionalidade a todos os botões "Adicionar ao Carrinho"
        const botoesComprar = document.querySelectorAll('.btn-comprar');
        botoesComprar.forEach(botao => {
            botao.addEventListener('click', (evento) => {
                const nomeProduto = evento.target.getAttribute('data-nome');
                let carrinho = JSON.parse(localStorage.getItem('carrinho')) || [];
                carrinho.push(nomeProduto);
                localStorage.setItem('carrinho', JSON.stringify(carrinho));
                alert(`"${nomeProduto}" foi adicionado ao carrinho!`);

                // Atualiza o contador imediatamente após adicionar um item
                atualizarContadorCarrinho();
            });
        });
    }
    
    // Atualiza o contador assim que qualquer página carregar
    // Isso garante que se o usuário voltar para a Home, o número certo já estará lá
    atualizarContadorCarrinho();
});