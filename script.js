let telefonePizzaria;
let pizzas;
let bebidas;

const url = new URL(window.location.href);
const loja = url.searchParams.get("loja");

if (!loja || loja.trim() === "") {
    document.body.innerHTML = `
    <div class="erro-box">
      <h1>Ops! Algo deu errado.</h1>
      <p>Erro: loja não encontrada.</p>
    </div>`;
}

// Configurações
fetch(`dados/${loja}/configuracoes.json`)
    .then(response => response.json())
    .then(data => {
        document.getElementById('logo-pizzaria').src = data.logo;
        document.getElementById('nome-pizzaria').textContent = data.nome;
        telefonePizzaria = data.telefonePizzaria;
    })
    .catch(error => {
        console.error('Erro ao carregar os dados da pizzaria:', error);
    });

fetch(`dados/${loja}/pizzas.json`)
    .then(res => res.json())
    .then(data => {
        pizzas = data;
        renderMenu();
    })
    .catch(err => console.error(err));

fetch(`dados/${loja}/bebidas.json`)
    .then(res => res.json())
    .then(data => {
        bebidas = data;
    })
    .catch(err => console.error(err));

const toggle = document.getElementById('toggleCart');
const content = document.getElementById('cart');

toggle.addEventListener('click', () => {
    content.classList.toggle('hidden');
    toggle.textContent = content.classList.contains('hidden') ? '▼' : '▲';
});

const menuEl = document.getElementById('menu');
const cartList = document.getElementById('cart-list');
const totalEl = document.getElementById('total');
const emptyCartEl = document.getElementById('empty-cart');
const toggleMenuBtn = document.getElementById('toggleMenu');
const btnFinalizar = document.getElementById('btnFinalizar');
const modalFinalizar = document.getElementById('modalFinalizar');
const closeModal = document.getElementById('closeModal');
const formFinalizar = document.getElementById('formFinalizar');
const pagamentoSelect = document.getElementById('pagamento');
const trocoField = document.getElementById('trocoField');

let carrinho = [];
let meiaPizzaPendente = null;
let exibindoBebidas = false;

// Função para verificar se há meia pizza pendente
function hasPendingHalfPizza() {
    return carrinho.some(item => item.type === 'meia' && item.pizzas.length === 1);
}

// Função para alternar entre pizzas e bebidas
function toggleMenu() {
    exibindoBebidas = !exibindoBebidas;
    toggleMenuBtn.textContent = exibindoBebidas ? "🍕 Ir p/ PIZZAS 🍕" : "🍺 Ir p/ BEBIDAS 🍺";
    document.getElementById('filtroInput').value = "";
    renderMenu();
}

let ordenarCrescente = true;
let ordenarPorPreco = false;

const ordenarBtn = document.getElementById('ordenarBtn');

ordenarBtn.addEventListener('click', toggleOrdenacao);
function toggleOrdenacao() {
    ordenarPorPreco = true;
    ordenarCrescente = !ordenarCrescente;
    ordenarBtn.textContent = `${ordenarCrescente ? "⬇️ Mais Barato ⬇️" : "⬆️ Mais Caro ⬆️"}`;
    renderMenu();
}

function renderMenu() {

    menuEl.innerHTML = '';
    let itens = exibindoBebidas ? bebidas : pizzas;

    const termo = document.getElementById('filtroInput').value.toLowerCase();

    // Filtro por nome ou ingredientes (se não bebida)
    itens = itens.filter(item =>
        item.name.toLowerCase().includes(termo) ||
        (!exibindoBebidas && item.ingredients.toLowerCase().includes(termo))
    );

    // Clona e ordena se o botão de ordenação foi usado
    if (ordenarPorPreco) {
        itens = [...itens].sort((a, b) =>
            ordenarCrescente ? a.price - b.price : b.price - a.price
        );

        window.scrollTo({ top: 0, behavior: 'auto' });
    }

    itens.forEach(item => {
        const card = document.createElement('article');
        card.classList.add('pizza-card');
        card.dataset.id = item.id;

        card.innerHTML = `
            <img src="${item.image}" alt="${item.name}" />
            <div class="pizza-info">
                <h3 class="pizza-name">${item.name}</h3>
                ${!exibindoBebidas ? `<p class="pizza-ingredients">${item.ingredients}</p>` : ''}
                <div class="pizza-footer">
                    <div class="pizza-price">${formatarPrecoBR(item.price)}</div>
                </div>
            </div>
        `;

        if (!exibindoBebidas) {
            const meiaBtn = document.createElement('button');
            meiaBtn.textContent = '+ Meia';
            meiaBtn.className = 'btn-meia';
            meiaBtn.onclick = (ev) => {
                ev.stopPropagation();
                addMeiaPizza(item.id);
                toggleResumo(true);
            };
            card.querySelector('.pizza-footer').appendChild(meiaBtn);
        }

        card.addEventListener('click', () => {
            if (exibindoBebidas) {
                addBebidaToCart(item.id);
            } else {
                addPizzaToCart(item.id);
            }
            toggleResumo(true);
        });

        menuEl.appendChild(card);

    });
}

function addPizzaToCart(pizzaId) {
    if (meiaPizzaPendente !== null && meiaPizzaPendente !== pizzaId) {
        const nova = [meiaPizzaPendente, pizzaId].sort((a, b) => a - b);
        const existente = carrinho.find(i => i.type === 'meia' && i.pizzas.length === 2 && i.pizzas.join() === nova.join());

        if (existente) {
            existente.quantity++;
        } else {
            carrinho.push({
                type: 'meia',
                pizzas: nova,
                quantity: 1,
                timestamp: Date.now()
            });
        }

        const idxPendente = carrinho.findIndex(item => item.type === 'meia' && item.pizzas.length === 1 && item.pizzas[0] === meiaPizzaPendente);
        if (idxPendente >= 0) {
            carrinho.splice(idxPendente, 1);
        }

        meiaPizzaPendente = null;
    } else {
        const idx = carrinho.findIndex(item => item.type === 'inteira' && item.pizzaId === pizzaId);
        if (idx >= 0) {
            carrinho[idx].quantity++;
        } else {
            carrinho.push({
                type: 'inteira',
                pizzaId,
                quantity: 1,
                timestamp: Date.now()
            });
        }
    }
    renderCart();
}

function addBebidaToCart(bebidaId) {
    const idx = carrinho.findIndex(item => item.type === 'bebida' && item.bebidaId === bebidaId);
    if (idx >= 0) {
        carrinho[idx].quantity++;
    } else {
        carrinho.push({
            type: 'bebida',
            bebidaId,
            quantity: 1,
            timestamp: Date.now()
        });
    }
    renderCart();
}

function addMeiaPizza(pizzaId) {
    if (meiaPizzaPendente !== null && meiaPizzaPendente !== pizzaId) {
        const nova = [meiaPizzaPendente, pizzaId].sort((a, b) => a - b);
        const existente = carrinho.find(i => i.type === 'meia' && i.pizzas.length === 2 && i.pizzas.join() === nova.join());

        if (existente) {
            existente.quantity++;
        } else {
            carrinho.push({
                type: 'meia',
                pizzas: nova,
                quantity: 1,
                timestamp: Date.now()
            });
        }

        const idxPendente = carrinho.findIndex(item => item.type === 'meia' && item.pizzas.length === 1 && item.pizzas[0] === meiaPizzaPendente);
        if (idxPendente >= 0) {
            carrinho.splice(idxPendente, 1);
        }

        meiaPizzaPendente = null;
    } else {
        meiaPizzaPendente = pizzaId;

        const existente = carrinho.find(i => i.type === 'meia' && i.pizzas.length === 1 && i.pizzas[0] === pizzaId);
        if (existente) {
            existente.quantity++;
        } else {
            carrinho.push({
                type: 'meia',
                pizzas: [pizzaId],
                quantity: 1,
                timestamp: Date.now()
            });
        }
    }
    renderCart();
}

function renderCart() {
    if (carrinho.length === 0) {
        emptyCartEl.style.display = 'block';
        cartList.style.display = 'none';
        totalEl.style.display = 'none';
        btnFinalizar.disabled = true;
        return;
    }

    emptyCartEl.style.display = 'none';
    cartList.style.display = 'block';
    totalEl.style.display = 'block';

    // Desabilita o botão se houver meia pizza pendente
    btnFinalizar.disabled = hasPendingHalfPizza();

    cartList.innerHTML = '';

    // Ordena os itens por timestamp (mais recente primeiro)
    const carrinhoOrdenado = [...carrinho].sort((a, b) => b.timestamp - a.timestamp);

    carrinhoOrdenado.forEach((item, index) => {
        const originalIndex = carrinho.findIndex(i => i.timestamp === item.timestamp);
        const li = document.createElement('li');
        let name, price;

        if (item.type === 'inteira') {
            const pizza = pizzas.find(p => p.id === item.pizzaId);
            name = pizza.name;
            price = pizza.price;
        } else if (item.type === 'meia') {
            if (item.pizzas.length === 1) {
                const pizza = pizzas.find(p => p.id === item.pizzas[0]);
                name = `Meia pizza de ${pizza.name} <b>(escolha outra metade)</b>`;
                price = pizza.price / 2;
            } else if (item.pizzas.length === 2) {
                const pizza1 = pizzas.find(p => p.id === item.pizzas[0]);
                const pizza2 = pizzas.find(p => p.id === item.pizzas[1]);
                name = `Meia ${pizza1.name} + meia ${pizza2.name}`;
                price = Math.max(pizza1.price, pizza2.price);
            }
        } else if (item.type === 'bebida') {
            const bebida = bebidas.find(b => b.id === item.bebidaId);
            name = bebida.name;
            price = bebida.price;
        }

        const itemTotalPrice = price * item.quantity;

        li.innerHTML = `
    <div class="item-name">${name} ${formatarPrecoBR(price)}</div>
    <div class="quantity-controls">
        <button onclick="decrement(${originalIndex})">−</button>
        <span>${item.quantity}</span>
        <button onclick="increment(${originalIndex})">+</button>
    </div>
    <div class="item-price">${formatarPrecoBR(itemTotalPrice)}</div>
    `;

        cartList.appendChild(li);
    });

    const total = carrinho.reduce((acc, item) => {
        let price = 0;
        if (item.type === 'inteira') {
            const pizza = pizzas.find(p => p.id === item.pizzaId);
            price = pizza.price;
        } else if (item.type === 'meia') {
            if (item.pizzas.length === 1) {
                const pizza = pizzas.find(p => p.id === item.pizzas[0]);
                price = pizza.price / 2;
            } else if (item.pizzas.length === 2) {
                const pizza1 = pizzas.find(p => p.id === item.pizzas[0]);
                const pizza2 = pizzas.find(p => p.id === item.pizzas[1]);
                price = Math.max(pizza1.price, pizza2.price);
            }
        } else if (item.type === 'bebida') {
            const bebida = bebidas.find(b => b.id === item.bebidaId);
            price = bebida.price;
        }
        return acc + price * item.quantity;
    }, 0);

    totalEl.textContent = `Total: ${formatarPrecoBR(total)}`;
}

function increment(index) {
    carrinho[index].quantity++;
    renderCart();
}

function decrement(index) {
    if (carrinho[index].quantity > 1) {
        carrinho[index].quantity--;
    } else {
        if (meiaPizzaPendente !== null && carrinho[index].type === 'meia' && carrinho[index].pizzas[0] === meiaPizzaPendente) {
            meiaPizzaPendente = null;
        }
        carrinho.splice(index, 1);
    }
    renderCart();
}

function abrirModalFinalizar() {
    if (hasPendingHalfPizza()) {
        alert('Você tem meia pizza pendente. Por favor, selecione a outra metade antes de finalizar.');
        return;
    }
    modalFinalizar.classList.add('active');
}

function fecharModalFinalizar() {
    modalFinalizar.classList.remove('active');
}

function formatarPedidoParaWhatsApp() {
    let mensagem = "🍕 *Meu Pedido* 🍕\n\n";
    mensagem += "*Itens do Pedido:*\n";

    carrinho.forEach(item => {
        let name, price;

        if (item.type === 'inteira') {
            const pizza = pizzas.find(p => p.id === item.pizzaId);
            name = pizza.name;
            price = pizza.price;
        } else if (item.type === 'meia') {
            if (item.pizzas.length === 1) {
                const pizza = pizzas.find(p => p.id === item.pizzas[0]);
                name = `Meia pizza de ${pizza.name} (escolha outra metade)`;
                price = pizza.price / 2;
            } else if (item.pizzas.length === 2) {
                const pizza1 = pizzas.find(p => p.id === item.pizzas[0]);
                const pizza2 = pizzas.find(p => p.id === item.pizzas[1]);
                name = `Meia ${pizza1.name} + meia ${pizza2.name}`;
                price = Math.max(pizza1.price, pizza2.price);
            }
        } else if (item.type === 'bebida') {
            const bebida = bebidas.find(b => b.id === item.bebidaId);
            name = bebida.name;
            price = bebida.price;
        }

        mensagem += `- x${item.quantity} ${name} - ${formatarPrecoBR((price * item.quantity))}\n`;
    });

    const total = carrinho.reduce((acc, item) => {
        let price = 0;
        if (item.type === 'inteira') {
            const pizza = pizzas.find(p => p.id === item.pizzaId);
            price = pizza.price;
        } else if (item.type === 'meia') {
            if (item.pizzas.length === 1) {
                const pizza = pizzas.find(p => p.id === item.pizzas[0]);
                price = pizza.price / 2;
            } else if (item.pizzas.length === 2) {
                const pizza1 = pizzas.find(p => p.id === item.pizzas[0]);
                const pizza2 = pizzas.find(p => p.id === item.pizzas[1]);
                price = Math.max(pizza1.price, pizza2.price);
            }
        } else if (item.type === 'bebida') {
            const bebida = bebidas.find(b => b.id === item.bebidaId);
            price = bebida.price;
        }
        return acc + price * item.quantity;
    }, 0);

    mensagem += `\n*Total: ${formatarPrecoBR(total)}*`;

    const observacao = document.getElementById('observacao').value;
    if (observacao) {
        mensagem += `\n\n*Observações:*\n${observacao}`;
    }

    mensagem += `\n\n*Endereço de Entrega:*\n${document.getElementById('endereco').value}, ${document.getElementById('numero').value}`;

    const complemento = document.getElementById('complemento').value;
    if (complemento) {
        mensagem += ` - ${complemento}`;
    }

    mensagem += `\n\n*Forma de Pagamento:* ${document.getElementById('pagamento').value}`;

    const troco = document.getElementById('troco').value;
    if (troco && document.getElementById('pagamento').value === 'Dinheiro') {
        mensagem += `\n*Troco para:* ${troco}`;
    }

    return encodeURIComponent(mensagem);
}

// Event listeners
toggleMenuBtn.addEventListener('click', toggleMenu);
btnFinalizar.addEventListener('click', abrirModalFinalizar);
closeModal.addEventListener('click', fecharModalFinalizar);

document.getElementById('filtroInput').addEventListener('input', () => {
    renderMenu();
    setTimeout(() => { window.scrollTo({ top: 0, behavior: 'auto' }); }, 0);
});

// Fechar modal ao clicar fora
modalFinalizar.addEventListener('click', (e) => {
    if (e.target === modalFinalizar) {
        fecharModalFinalizar();
    }
});

// Mostrar campo de troco quando selecionar Dinheiro
pagamentoSelect.addEventListener('change', () => {
    if (pagamentoSelect.value === 'Dinheiro') {
        trocoField.style.display = 'block';
    } else {
        trocoField.style.display = 'none';
    }
});

// Enviar pedido via WhatsApp
formFinalizar.addEventListener('submit', (e) => {
    e.preventDefault();

    const mensagem = formatarPedidoParaWhatsApp();
    const urlWhatsApp = `https://wa.me/${telefonePizzaria}?text=${mensagem}`;

    window.open(urlWhatsApp, '_blank');
    fecharModalFinalizar();

    // Limpar carrinho após enviar
    carrinho = [];
    meiaPizzaPendente = null;
    renderCart();
    formFinalizar.reset();
});

function formatarPrecoBR(valor) {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function toggleResumo(mostrar = false) {
    if (mostrar) {
        content.classList.remove('hidden');
    } else {
        content.classList.toggle('hidden');
    }

    toggle.textContent = content.classList.contains('hidden') ? '▼' : '▲';
}

// Inicialização
toggleResumo();
renderCart();
