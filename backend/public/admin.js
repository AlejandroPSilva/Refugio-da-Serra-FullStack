const API_BASE = "https://refugio-backend.onrender.com";

const TOKEN_KEY = "admin_token_refugio";
const THEME_KEY = "admin_tema_refugio";

let dadosNewsletter = [];
let dadosContatos = [];
let dadosReservas = [];

let chartReservasPacote = null;
let chartCadastrosDia = null;

const estadoTabela = {
    newsletter: { filtro: "", pagina: 1, porPagina: 10, ordenacao: { campo: "id", asc: true } },
    contatos:   { filtro: "", pagina: 1, porPagina: 10, ordenacao: { campo: "id", asc: true } },
    reservas:   { filtro: "", pagina: 1, porPagina: 10, ordenacao: { campo: "id", asc: true } }
};

let callbackExcluir = null;

function getToken() {
    return localStorage.getItem(TOKEN_KEY);
}

function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
}

function aplicarTema(tema) {
    const body = document.body;
    body.classList.remove("dark", "light");
    body.classList.add(tema);
    localStorage.setItem(THEME_KEY, tema);
    const checkbox = document.getElementById("tema-checkbox");
    if (checkbox) checkbox.checked = tema === "light";
}

function toggleTema() {
    const temaAtual = document.body.classList.contains("dark") ? "dark" : "light";
    const novoTema = temaAtual === "dark" ? "light" : "dark";
    aplicarTema(novoTema);
}

function initTema() {
    const salvo = localStorage.getItem(THEME_KEY) || "dark";
    aplicarTema(salvo);
}

function mostrarLogin() {
    const login = document.getElementById("login");
    const painel = document.getElementById("painel");
    if (login) login.style.display = "block";
    if (painel) painel.classList.remove("visivel");
}

function mostrarPainel() {
    const login = document.getElementById("login");
    const painel = document.getElementById("painel");
    if (login) login.style.display = "none";
    if (painel) painel.classList.add("visivel");
}

async function apiRequest(path, options = {}) {
    const headers = options.headers || {};
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    if (!headers["Content-Type"] && options.body) headers["Content-Type"] = "application/json";

    const config = {
        method: options.method || "GET",
        headers,
        body: options.body
    };

    const resp = await fetch(`${API_BASE}${path}`, config);

    if (resp.status === 401) {
        logout();
        throw new Error("Não autorizado");
    }

    if (resp.status === 204) return null;

    let data = null;
    try {
        data = await resp.json();
    } catch {}

    if (!resp.ok) {
        const msg = (data && (data.message || data.erro)) || "Erro na requisição";
        throw new Error(msg);
    }

    return data;
}

function apiGet(path) {
    return apiRequest(path, { method: "GET" });
}

function apiPost(path, body) {
    return apiRequest(path, { method: "POST", body: JSON.stringify(body) });
}

function apiPut(path, body) {
    return apiRequest(path, { method: "PUT", body: JSON.stringify(body) });
}

function apiDelete(path) {
    return apiRequest(path, { method: "DELETE" });
}

async function fazerLogin(ev) {
    if (ev) ev.preventDefault();

    const usuarioEl = document.getElementById("login-user");
    const senhaEl = document.getElementById("login-pass");
    const erro = document.getElementById("login-erro");
    const btn = document.getElementById("login-btn");

    const usuario = usuarioEl ? usuarioEl.value.trim() : "";
    const senha = senhaEl ? senhaEl.value.trim() : "";

    if (erro) erro.style.display = "none";

    if (!usuario || !senha) {
        if (erro) {
            erro.textContent = "Preencha usuário e senha.";
            erro.style.display = "block";
        }
        return;
    }

    if (btn) {
        btn.disabled = true;
        var textoOriginal = btn.textContent;
        btn.textContent = "Entrando...";
    }

    try {
        const data = await apiPost("/admin/login", { usuario, senha });

        if (!data || !data.token) {
            if (erro) {
                erro.textContent = "Usuário ou senha inválidos.";
                erro.style.display = "block";
            }
            if (btn) {
                btn.disabled = false;
                btn.textContent = textoOriginal;
            }
            return;
        }

        setToken(data.token);
        mostrarPainel();
        await carregarTudo();
    } catch (e) {
        if (erro) {
            erro.textContent = "Erro ao conectar ao servidor.";
            erro.style.display = "block";
        }
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = textoOriginal;
        }
    }
}

function logout() {
    clearToken();
    dadosNewsletter = [];
    dadosContatos = [];
    dadosReservas = [];
    mostrarLogin();
}

function abrirSecao(id, botao) {
    document.querySelectorAll(".secao").forEach(s => s.classList.remove("ativa"));
    const alvo = document.getElementById(id);
    if (alvo) alvo.classList.add("ativa");

    document.querySelectorAll(".side-btn").forEach(b => b.classList.remove("ativo"));
    if (botao) botao.classList.add("ativo");

    const sidebar = document.querySelector(".sidebar");
    if (sidebar && sidebar.classList.contains("aberta")) sidebar.classList.remove("aberta");
}

function toggleSidebarMobile() {
    const sidebar = document.querySelector(".sidebar");
    if (sidebar) sidebar.classList.toggle("aberta");
}

function mostrarSkeletonTabela(tbodyId, colunas, linhas = 5) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    tbody.innerHTML = "";
    for (let i = 0; i < linhas; i++) {
        let tds = "";
        for (let j = 0; j < colunas; j++) {
            tds += `<td><span class="skeleton"></span></td>`;
        }
        tbody.innerHTML += `<tr class="skeleton-row">${tds}</tr>`;
    }
}

async function carregarNewsletter() {
    mostrarSkeletonTabela("tabela-news", 4);
    const dados = await apiGet("/admin/newsletter");
    dadosNewsletter = Array.isArray(dados) ? dados : [];
    const elQtd = document.getElementById("qtd-news");
    animarNumero(elQtd, dadosNewsletter.length);
    renderTabelaNewsletter();
}

async function carregarContatos() {
    mostrarSkeletonTabela("tabela-contato", 6);
    const dados = await apiGet("/admin/contato");
    dadosContatos = Array.isArray(dados) ? dados : [];
    const elQtd = document.getElementById("qtd-contato");
    animarNumero(elQtd, dadosContatos.length);
    renderTabelaContatos();
}

async function carregarReservas() {
    mostrarSkeletonTabela("tabela-reserva", 7);
    const dados = await apiGet("/admin/reservas");
    dadosReservas = Array.isArray(dados) ? dados : [];
    const elQtd = document.getElementById("qtd-reserva");
    animarNumero(elQtd, dadosReservas.length);
    renderTabelaReservas();
}

async function carregarTudo() {
    await Promise.all([
        carregarNewsletter(),
        carregarContatos(),
        carregarReservas()
    ]);
    atualizarGraficos();
    gerarInsights();
}

function animarNumero(el, final) {
    if (!el) return;
    let atual = 0;
    const passo = final / 30;
    const intervalo = setInterval(() => {
        atual += passo;
        if (atual >= final) {
            el.textContent = final;
            clearInterval(intervalo);
        } else {
            el.textContent = Math.floor(atual);
        }
    }, 20);
}

function normalizarTexto(txt) {
    return (txt || "").toString().toLowerCase();
}

function ordenarArrayDados(dados, campo, asc) {
    return dados.slice().sort((a, b) => {
        const va = (a[campo] || "").toString().toLowerCase();
        const vb = (b[campo] || "").toString().toLowerCase();
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
        return 0;
    });
}

function filtrarTabela(tipo, termo) {
    const estado = estadoTabela[tipo];
    if (!estado) return;
    estado.filtro = (termo || "").toLowerCase();
    estado.pagina = 1;
    if (tipo === "newsletter") renderTabelaNewsletter();
    if (tipo === "contatos") renderTabelaContatos();
    if (tipo === "reservas") renderTabelaReservas();
}

function ordenarTabela(tipo, campo) {
    const estado = estadoTabela[tipo];
    if (!estado) return;
    if (estado.ordenacao.campo === campo) {
        estado.ordenacao.asc = !estado.ordenacao.asc;
    } else {
        estado.ordenacao.campo = campo;
        estado.ordenacao.asc = true;
    }
    if (tipo === "newsletter") renderTabelaNewsletter();
    if (tipo === "contatos") renderTabelaContatos();
    if (tipo === "reservas") renderTabelaReservas();
}

function irParaPagina(tipo, pagina) {
    const estado = estadoTabela[tipo];
    if (!estado) return;
    estado.pagina = pagina;
    if (tipo === "newsletter") renderTabelaNewsletter();
    if (tipo === "contatos") renderTabelaContatos();
    if (tipo === "reservas") renderTabelaReservas();
}

function renderTabelaNewsletter() {
    const tbody = document.getElementById("tabela-news");
    const paginacao = document.getElementById("paginacao-news");
    if (!tbody) return;
    const estado = estadoTabela.newsletter;
    let lista = dadosNewsletter.slice();

    if (estado.filtro) {
        lista = lista.filter(item => {
            const texto = `${item.id} ${item.email} ${item.data_envio}`;
            return normalizarTexto(texto).includes(estado.filtro);
        });
    }

    if (estado.ordenacao.campo) {
        lista = ordenarArrayDados(lista, estado.ordenacao.campo, estado.ordenacao.asc);
    }

    const total = lista.length;
    const inicio = (estado.pagina - 1) * estado.porPagina;
    const fim = inicio + estado.porPagina;
    const paginaDados = lista.slice(inicio, fim);
    const totalPaginas = Math.max(1, Math.ceil(total / estado.porPagina));

    if (estado.pagina > totalPaginas) {
        estado.pagina = totalPaginas;
        return renderTabelaNewsletter();
    }

    tbody.innerHTML = "";

    paginaDados.forEach(d => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${d.id}</td>
            <td>${d.email}</td>
            <td>${d.data_envio}</td>
            <td>
                <button class="acao-btn btn-ver" onclick="abrirModalDetalhe('newsletter', ${d.id})">Ver</button>
                <button class="acao-btn btn-edit" onclick="abrirModalEdicao('newsletter', ${d.id})">Editar</button>
                <button class="acao-btn btn-del" onclick="confirmarExclusao('newsletter', ${d.id})">Excluir</button>
            </td>
        `;
        tr.onclick = ev => {
            if (ev.target.closest("button")) return;
            abrirModalDetalhe("newsletter", d.id);
        };
        tbody.appendChild(tr);
    });

    if (paginacao) {
        paginacao.innerHTML = "";
        for (let p = 1; p <= totalPaginas; p++) {
            const btn = document.createElement("button");
            btn.textContent = p;
            if (p === estado.pagina) btn.classList.add("ativo");
            btn.onclick = () => irParaPagina("newsletter", p);
            paginacao.appendChild(btn);
        }
    }
}

function renderTabelaContatos() {
    const tbody = document.getElementById("tabela-contato");
    const paginacao = document.getElementById("paginacao-contato");
    if (!tbody) return;
    const estado = estadoTabela.contatos;
    let lista = dadosContatos.slice();

    if (estado.filtro) {
        lista = lista.filter(item => {
            const texto = `${item.id} ${item.nome} ${item.email} ${item.mensagem} ${item.data_envio}`;
            return normalizarTexto(texto).includes(estado.filtro);
        });
    }

    if (estado.ordenacao.campo) {
        lista = ordenarArrayDados(lista, estado.ordenacao.campo, estado.ordenacao.asc);
    }

    const total = lista.length;
    const inicio = (estado.pagina - 1) * estado.porPagina;
    const fim = inicio + estado.porPagina;
    const paginaDados = lista.slice(inicio, fim);
    const totalPaginas = Math.max(1, Math.ceil(total / estado.porPagina));

    if (estado.pagina > totalPaginas) {
        estado.pagina = totalPaginas;
        return renderTabelaContatos();
    }

    tbody.innerHTML = "";

    paginaDados.forEach(d => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${d.id}</td>
            <td>${d.nome}</td>
            <td>${d.email}</td>
            <td>${d.mensagem}</td>
            <td>${d.data_envio}</td>
            <td>
                <button class="acao-btn btn-ver" onclick="abrirModalDetalhe('contatos', ${d.id})">Ver</button>
                <button class="acao-btn btn-edit" onclick="abrirModalEdicao('contatos', ${d.id})">Editar</button>
                <button class="acao-btn btn-del" onclick="confirmarExclusao('contatos', ${d.id})">Excluir</button>
            </td>
        `;
        tr.onclick = ev => {
            if (ev.target.closest("button")) return;
            abrirModalDetalhe("contatos", d.id);
        };
        tbody.appendChild(tr);
    });

    if (paginacao) {
        paginacao.innerHTML = "";
        for (let p = 1; p <= totalPaginas; p++) {
            const btn = document.createElement("button");
            btn.textContent = p;
            if (p === estado.pagina) btn.classList.add("ativo");
            btn.onclick = () => irParaPagina("contatos", p);
            paginacao.appendChild(btn);
        }
    }
}

function renderTabelaReservas() {
    const tbody = document.getElementById("tabela-reserva");
    const paginacao = document.getElementById("paginacao-reserva");
    if (!tbody) return;
    const estado = estadoTabela.reservas;
    let lista = dadosReservas.slice();

    if (estado.filtro) {
        lista = lista.filter(item => {
            const texto = `${item.id} ${item.nome} ${item.telefone} ${item.data_viagem} ${item.pacote} ${item.data_envio}`;
            return normalizarTexto(texto).includes(estado.filtro);
        });
    }

    if (estado.ordenacao.campo) {
        lista = ordenarArrayDados(lista, estado.ordenacao.campo, estado.ordenacao.asc);
    }

    const total = lista.length;
    const inicio = (estado.pagina - 1) * estado.porPagina;
    const fim = inicio + estado.porPagina;
    const paginaDados = lista.slice(inicio, fim);
    const totalPaginas = Math.max(1, Math.ceil(total / estado.porPagina));

    if (estado.pagina > totalPaginas) {
        estado.pagina = totalPaginas;
        return renderTabelaReservas();
    }

    tbody.innerHTML = "";

    paginaDados.forEach(d => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${d.id}</td>
            <td>${d.nome}</td>
            <td>${d.telefone}</td>
            <td>${d.data_viagem}</td>
            <td>${d.pacote}</td>
            <td>${d.data_envio}</td>
            <td>
                <button class="acao-btn btn-ver" onclick="abrirModalDetalhe('reservas', ${d.id})">Ver</button>
                <button class="acao-btn btn-edit" onclick="abrirModalEdicao('reservas', ${d.id})">Editar</button>
                <button class="acao-btn btn-del" onclick="confirmarExclusao('reservas', ${d.id})">Excluir</button>
            </td>
        `;
        tr.onclick = ev => {
            if (ev.target.closest("button")) return;
            abrirModalDetalhe("reservas", d.id);
        };
        tbody.appendChild(tr);
    });

    if (paginacao) {
        paginacao.innerHTML = "";
        for (let p = 1; p <= totalPaginas; p++) {
            const btn = document.createElement("button");
            btn.textContent = p;
            if (p === estado.pagina) btn.classList.add("ativo");
            btn.onclick = () => irParaPagina("reservas", p);
            paginacao.appendChild(btn);
        }
    }
}

function obterListaPorTipo(tipo) {
    if (tipo === "newsletter") return dadosNewsletter;
    if (tipo === "contatos") return dadosContatos;
    if (tipo === "reservas") return dadosReservas;
    return [];
}

function encontrarRegistro(tipo, id) {
    const lista = obterListaPorTipo(tipo);
    return lista.find(r => String(r.id) === String(id));
}

function abrirModalDetalhe(tipo, id) {
    const modal = document.getElementById("modal-detalhe");
    const titulo = document.getElementById("modal-titulo");
    const corpo = document.getElementById("modal-corpo");
    const sound = document.getElementById("sound-open");

    const registro = encontrarRegistro(tipo, id);
    if (!registro || !modal || !titulo || !corpo) return;

    let tituloTexto = "";
    if (tipo === "newsletter") tituloTexto = `Inscrito #${registro.id}`;
    if (tipo === "contatos") tituloTexto = `Contato #${registro.id} - ${registro.nome}`;
    if (tipo === "reservas") tituloTexto = `Reserva #${registro.id} - ${registro.nome}`;

    titulo.textContent = tituloTexto;
    corpo.textContent = JSON.stringify(registro, null, 2);

    modal.classList.add("aberto");
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }
}

function fecharModalDetalhe() {
    const modal = document.getElementById("modal-detalhe");
    if (modal) modal.classList.remove("aberto");
}

let registroEdicaoAtual = null;

function abrirModalEdicao(tipo, id) {
    const modal = document.getElementById("modal-edicao");
    const titulo = document.getElementById("modal-edit-titulo");
    const container = document.getElementById("campos-edicao");
    const sound = document.getElementById("sound-open");

    const registro = encontrarRegistro(tipo, id);
    if (!registro || !modal || !titulo || !container) return;

    registroEdicaoAtual = { tipo, id };
    let tituloTexto = "";
    if (tipo === "newsletter") tituloTexto = `Editar inscrito #${registro.id}`;
    if (tipo === "contatos") tituloTexto = `Editar contato #${registro.id}`;
    if (tipo === "reservas") tituloTexto = `Editar reserva #${registro.id}`;
    titulo.textContent = tituloTexto;

    container.innerHTML = "";

    const criarInput = (labelTexto, nome, valor, tipoInput = "text", textarea = false) => {
        const wrapper = document.createElement("div");
        const lbl = document.createElement("label");
        lbl.textContent = labelTexto;
        let campo;
        if (textarea) {
            campo = document.createElement("textarea");
            campo.rows = 4;
        } else {
            campo = document.createElement("input");
            campo.type = tipoInput;
        }
        campo.name = nome;
        campo.value = valor || "";
        wrapper.appendChild(lbl);
        wrapper.appendChild(campo);
        container.appendChild(wrapper);
    };

    if (tipo === "newsletter") {
        criarInput("Email", "email", registro.email, "email");
    }

    if (tipo === "contatos") {
        criarInput("Nome", "nome", registro.nome);
        criarInput("Email", "email", registro.email, "email");
        criarInput("Mensagem", "mensagem", registro.mensagem, "text", true);
    }

    if (tipo === "reservas") {
        criarInput("Nome", "nome", registro.nome);
        criarInput("Telefone", "telefone", registro.telefone);
        criarInput("Data da Viagem", "data_viagem", registro.data_viagem, "date");
        criarInput("Pacote", "pacote", registro.pacote);
    }

    modal.classList.add("aberto");
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }
}

function fecharModalEdicao() {
    const modal = document.getElementById("modal-edicao");
    if (modal) modal.classList.remove("aberto");
    registroEdicaoAtual = null;
}

async function salvarEdicao(ev) {
    ev.preventDefault();
    if (!registroEdicaoAtual) return;

    const { tipo, id } = registroEdicaoAtual;
    const form = document.getElementById("form-edicao");
    if (!form) return;

    const formData = new FormData(form);
    const payload = {};
    for (const [chave, valor] of formData.entries()) {
        payload[chave] = valor;
    }

    let rotaBase = "";
    if (tipo === "newsletter") rotaBase = "/admin/newsletter";
    if (tipo === "contatos") rotaBase = "/admin/contato";
    if (tipo === "reservas") rotaBase = "/admin/reservas";

    try {
        await apiPut(`${rotaBase}/${id}`, payload);
        if (tipo === "newsletter") await carregarNewsletter();
        if (tipo === "contatos") await carregarContatos();
        if (tipo === "reservas") await carregarReservas();
        fecharModalEdicao();
        const soundSuccess = document.getElementById("sound-success");
        if (soundSuccess) {
            soundSuccess.currentTime = 0;
            soundSuccess.play().catch(() => {});
        } else {
            alert("Registro atualizado com sucesso!");
        }
    } catch (e) {
        const soundError = document.getElementById("sound-error");
        if (soundError) {
            soundError.currentTime = 0;
            soundError.play().catch(() => {});
        }
        alert("Erro ao salvar alterações: " + e.message);
    }
}

function confirmarExclusao(tipo, id) {
    const modal = document.getElementById("modal-confirmar");
    const texto = document.getElementById("texto-confirmar");
    const soundOpen = document.getElementById("sound-open");

    if (!modal || !texto) {
        if (!confirm("Tem certeza que deseja excluir este registro?")) return;
        executarExclusao(tipo, id);
        return;
    }

    if (tipo === "newsletter") texto.textContent = "Excluir este email da newsletter?";
    else if (tipo === "contatos") texto.textContent = "Excluir este contato e sua mensagem?";
    else if (tipo === "reservas") texto.textContent = "Excluir esta reserva permanentemente?";
    else texto.textContent = "Tem certeza que deseja excluir este registro?";

    modal.classList.remove("fechar");
    modal.classList.add("aberto");

    if (soundOpen) {
        soundOpen.currentTime = 0;
        soundOpen.play().catch(() => {});
    }

    callbackExcluir = async () => {
        const btn = document.getElementById("btn-excluir-confirmado");
        if (btn) {
            btn.classList.add("shake");
            setTimeout(() => btn.classList.remove("shake"), 450);
        }

        try {
            await executarExclusao(tipo, id);
            const sOk = document.getElementById("sound-success");
            if (sOk) {
                sOk.currentTime = 0;
                sOk.play().catch(() => {});
            }
        } catch (e) {
            const sErr = document.getElementById("sound-error");
            if (sErr) {
                sErr.currentTime = 0;
                sErr.play().catch(() => {});
            }
            alert("Erro ao excluir registro: " + e.message);
        }
    };
}

async function executarExclusao(tipo, id) {
    let rotaBase = "";
    if (tipo === "newsletter") rotaBase = "/admin/newsletter";
    if (tipo === "contatos") rotaBase = "/admin/contato";
    if (tipo === "reservas") rotaBase = "/admin/reservas";

    await apiDelete(`${rotaBase}/${id}`);

    if (tipo === "newsletter") await carregarNewsletter();
    if (tipo === "contatos") await carregarContatos();
    if (tipo === "reservas") await carregarReservas();
    atualizarGraficos();
    gerarInsights();
}

function fecharConfirmacao() {
    const modal = document.getElementById("modal-confirmar");
    if (!modal) return;
    modal.classList.remove("aberto");
    modal.classList.add("fechar");
    setTimeout(() => {
        modal.classList.remove("fechar");
    }, 250);
    callbackExcluir = null;
}

function baixarBackupJSON() {
    const backup = {
        newsletter: dadosNewsletter,
        contatos: dadosContatos,
        reservas: dadosReservas,
        gerado_em: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backup-refugio-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function getDadosExportacao(tipo) {
    if (tipo === "newsletter") {
        return {
            cabecalho: ["ID", "Email", "Data"],
            dados: dadosNewsletter.map(d => [d.id, d.email, d.data_envio])
        };
    }
    if (tipo === "contatos") {
        return {
            cabecalho: ["ID", "Nome", "Email", "Mensagem", "Data"],
            dados: dadosContatos.map(d => [d.id, d.nome, d.email, d.mensagem, d.data_envio])
        };
    }
    if (tipo === "reservas") {
        return {
            cabecalho: ["ID", "Nome", "Telefone", "Data Viagem", "Pacote", "Data"],
            dados: dadosReservas.map(d => [d.id, d.nome, d.telefone, d.data_viagem, d.pacote, d.data_envio])
        };
    }
    return { cabecalho: [], dados: [] };
}

function exportarCSV(tipo) {
    const { cabecalho, dados } = getDadosExportacao(tipo);
    if (!cabecalho.length) return;

    const linhas = [];
    linhas.push(cabecalho.join(";"));

    dados.forEach(l => {
        const linha = l.map(campo => {
            const txt = (campo || "").toString().replace(/"/g, '""');
            return `"${txt}"`;
        }).join(";");
        linhas.push(linha);
    });

    const csv = linhas.join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tipo}-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function exportarExcel(tipo) {
    const { cabecalho, dados } = getDadosExportacao(tipo);
    if (!cabecalho.length) return;

    let html = "<table><thead><tr>";
    cabecalho.forEach(c => html += `<th>${c}</th>`);
    html += "</tr></thead><tbody>";

    dados.forEach(linha => {
        html += "<tr>";
        linha.forEach(c => html += `<td>${c || ""}</td>`);
        html += "</tr>";
    });
    html += "</tbody></table>";

    const blob = new Blob([html], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${tipo}-${new Date().toISOString().slice(0,10)}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function atualizarGraficos() {
    const canvasPacote = document.getElementById("chartReservasPacote");
    const canvasDia = document.getElementById("chartCadastrosDia");
    if (!canvasPacote || !canvasDia || typeof Chart === "undefined") return;

    const ctxPacote = canvasPacote.getContext("2d");
    const ctxDia = canvasDia.getContext("2d");

    const mapaPacotes = {};
    dadosReservas.forEach(r => {
        const pacote = r.pacote || "Indefinido";
        mapaPacotes[pacote] = (mapaPacotes[pacote] || 0) + 1;
    });

    const labelsPacotes = Object.keys(mapaPacotes);
    const valoresPacotes = Object.values(mapaPacotes);

    if (chartReservasPacote) chartReservasPacote.destroy();

    const gradBar = ctxPacote.createLinearGradient(0, 0, 0, 300);
    gradBar.addColorStop(0, "#00ffa3");
    gradBar.addColorStop(1, "#72ffe6");

    chartReservasPacote = new Chart(ctxPacote, {
        type: "bar",
        data: {
            labels: labelsPacotes,
            datasets: [{
                label: "Reservas",
                data: valoresPacotes,
                backgroundColor: gradBar,
                borderRadius: 6
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            responsive: true,
            scales: {
                x: { ticks: { color: "#d7ffe8" } },
                y: { ticks: { color: "#d7ffe8" } }
            }
        }
    });

    const mapaDias = {};

    function contarPorData(lista) {
        lista.forEach(i => {
            if (!i.data_envio) return;
            const dia = i.data_envio.toString().slice(0, 10);
            mapaDias[dia] = (mapaDias[dia] || 0) + 1;
        });
    }

    contarPorData(dadosNewsletter);
    contarPorData(dadosContatos);
    contarPorData(dadosReservas);

    const labelsDias = Object.keys(mapaDias).sort();
    const valoresDias = labelsDias.map(d => mapaDias[d]);

    if (chartCadastrosDia) chartCadastrosDia.destroy();

    const gradLinha = ctxDia.createLinearGradient(0, 0, 0, 300);
    gradLinha.addColorStop(0, "rgba(0,255,163,0.9)");
    gradLinha.addColorStop(1, "rgba(0,255,163,0.1)");

    chartCadastrosDia = new Chart(ctxDia, {
        type: "line",
        data: {
            labels: labelsDias,
            datasets: [{
                label: "Cadastros",
                data: valoresDias,
                borderColor: "#00ffa3",
                backgroundColor: gradLinha,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            responsive: true,
            scales: {
                x: { ticks: { color: "#d7ffe8" } },
                y: { ticks: { color: "#d7ffe8" } }
            }
        }
    });
}

function gerarInsights() {
    const box = document.getElementById("insight-text");
    if (!box) return;

    const totalNews = dadosNewsletter.length;
    const totalContatos = dadosContatos.length;
    const totalReservas = dadosReservas.length;

    const mapaPacotes = {};
    dadosReservas.forEach(r => {
        const pacote = r.pacote || "Indefinido";
        mapaPacotes[pacote] = (mapaPacotes[pacote] || 0) + 1;
    });

    let pacoteTop = "-";
    let pacoteTopQtd = 0;
    Object.entries(mapaPacotes).forEach(([nome, qtd]) => {
        if (qtd > pacoteTopQtd) {
            pacoteTopQtd = qtd;
            pacoteTop = nome;
        }
    });

    const texto = `
• Há ${totalNews} email(s) cadastrado(s) na newsletter.
• Foram recebidos ${totalContatos} contato(s) pelo site.
• Existem ${totalReservas} reserva(s) registradas.
${pacoteTopQtd ? `• O pacote mais escolhido é "${pacoteTop}", com ${pacoteTopQtd} reserva(s).` : ""}
• Use os gráficos do dashboard para acompanhar a evolução diária dos cadastros.
    `.trim();

    box.textContent = texto;
}

function criarParticulas(qtd = 30) {
    const container = document.querySelector(".particles");
    if (!container) return;
    for (let i = 0; i < qtd; i++) {
        const p = document.createElement("div");
        p.classList.add("particle");
        p.style.left = Math.random() * 100 + "vw";
        p.style.animationDelay = Math.random() * 10 + "s";
        p.style.animationDuration = 10 + Math.random() * 10 + "s";
        container.appendChild(p);
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    initTema();
    criarParticulas();

    const btnConfirm = document.getElementById("btn-excluir-confirmado");
    const modalConfirm = document.getElementById("modal-confirmar");

    if (btnConfirm) {
        btnConfirm.addEventListener("click", async () => {
            if (callbackExcluir) {
                await callbackExcluir();
            }
            fecharConfirmacao();
        });
    }

    if (modalConfirm) {
        modalConfirm.addEventListener("click", ev => {
            if (ev.target === modalConfirm) fecharConfirmacao();
        });
    }

    document.addEventListener("keydown", ev => {
        if (ev.key === "Escape") {
            fecharConfirmacao();
            fecharModalDetalhe();
            fecharModalEdicao();
        }
    });

    if (getToken()) {
        mostrarPainel();
        try {
            await carregarTudo();
        } catch {}
    } else {
        mostrarLogin();
    }
});
