const elementos = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observerReveal = new IntersectionObserver(
    (entries, obs) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          obs.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  elementos.forEach((el) => observerReveal.observe(el));
} else {
  elementos.forEach((el) => el.classList.add("visible"));
}

const modal = document.getElementById("reserva-modal");
const botoes = document.querySelectorAll(".reservar");
const fechar = document.getElementById("close-reserva");
const campoPacote = document.getElementById("pacote-escolhido");

if (modal && botoes && campoPacote) {
  botoes.forEach((btn) => {
    btn.onclick = () => {
      modal.style.display = "flex";
      campoPacote.value = btn.dataset.pacote;
    };
  });

  fechar.onclick = () => (modal.style.display = "none");

  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };
}

const telefoneCampo = document.getElementById("telefone");
const alertaTelefone = document.createElement("div");

if (telefoneCampo) {
  alertaTelefone.className = "erro-telefone";
  alertaTelefone.style.display = "none";
  telefoneCampo.insertAdjacentElement("afterend", alertaTelefone);

  const DDD_VALIDOS_BR = [
    11,12,13,14,15,16,17,18,19,
    21,22,24,
    27,28,
    31,32,33,34,35,37,38,
    41,42,43,44,45,46,
    47,48,49,
    51,53,54,55,
    61,
    62,64,
    63,
    65,66,
    67,
    68,
    69,
    71,73,74,75,77,
    79,
    81,87,
    82,83,84,
    85,88,
    86,89,
    91,93,94,
    92,97,
    95,96,
    98,99
  ];

  telefoneCampo.addEventListener("input", () => {
    let v = telefoneCampo.value.replace(/\D/g, "");
    if (v.length > 11) v = v.slice(0, 11);

    if (v.length <= 2) {
      telefoneCampo.value = `(${v}`;
      return;
    }

    const ddd = parseInt(v.slice(0, 2), 10);

    if (!DDD_VALIDOS_BR.includes(ddd)) {
      erroDDD("DDD inválido! Ex: 27, 21, 11...");
      return;
    } else {
      limparErro();
    }

    if (v.length <= 10) {
      telefoneCampo.value = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
    } else {
      telefoneCampo.value = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
    }
  });

  function erroDDD(msg) {
    alertaTelefone.textContent = msg;
    alertaTelefone.style.display = "block";
    telefoneCampo.classList.add("shake");
    setTimeout(() => telefoneCampo.classList.remove("shake"), 500);
  }

  function limparErro() {
    alertaTelefone.style.display = "none";
  }

  if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;

      fetch(
        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=pt`
      )
        .then((r) => r.json())
        .then((data) => {
          const estado = data.principalSubdivision;

          const mapaDDD = {
            "Espírito Santo": 27,
            "Rio de Janeiro": 21,
            "Minas Gerais": 31,
            "São Paulo": 11,
            "Bahia": 71,
            "Pernambuco": 81,
            "Santa Catarina": 48,
            "Paraná": 41
          };

          if (mapaDDD[estado] && !telefoneCampo.value.trim()) {
            telefoneCampo.value = `(${mapaDDD[estado]}) `;
          }
        })
        .catch(() => {});
    });
  }
}

function mostrarToast(texto) {
  const toast = document.getElementById("toast");
  const textoToast = document.getElementById("toast-text");
  if (!toast || !textoToast) return;

  textoToast.textContent = texto;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 4000);
}

async function enviarParaAPI(endpoint, dados) {
  try {
    const baseURL = window.location.hostname.includes("localhost")
      ? "http://localhost:3000"
      : "https://refugio-backend.onrender.com";

    const resposta = await fetch(`${baseURL}/${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dados),
    });

    const json = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      mostrarToast("Erro ao enviar. Tente novamente.");
      console.error(json);
      return null;
    }

    return json;
  } catch (e) {
    mostrarToast("Erro de conexão com o servidor.");
    console.error("API ERROR:", e);
    return null;
  }
}

const formNews = document.getElementById("form-news");
const formContato = document.getElementById("form-contato");
const formReserva = document.getElementById("form-reserva");

if (formNews) {
  formNews.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("news-email")?.value.trim();
    if (!email) return mostrarToast("Digite um e-mail válido.");

    const result = await enviarParaAPI("newsletter", { email });
    if (result) {
      mostrarToast("Inscrição realizada! Obrigado 🌿");
      formNews.reset();
    }
  });
}

if (formContato) {
  formContato.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("contato-nome")?.value.trim();
    const email = document.getElementById("contato-email")?.value.trim();
    const mensagem = document.getElementById("contato-mensagem")?.value.trim();

    if (!nome || !email || !mensagem)
      return mostrarToast("Preencha todos os campos.");

    const result = await enviarParaAPI("contato", {
      nome,
      email,
      mensagem,
    });

    if (result) {
      mostrarToast("Mensagem enviada! Retorno em breve.");
      formContato.reset();
    }
  });
}

if (formReserva) {
  formReserva.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = document.getElementById("nome")?.value.trim();
    const telefone = document.getElementById("telefone")?.value.trim();
    const data_viagem = document.getElementById("data")?.value;
    const pacote = document.getElementById("pacote-escolhido")?.value;

    if (!nome || !telefone || !data_viagem || !pacote)
      return mostrarToast("Preencha todos os dados da reserva.");

    const result = await enviarParaAPI("reservas", {
      nome,
      telefone,
      data_viagem,
      pacote,
    });

    if (result) {
      mostrarToast("Reserva confirmada! 📞");
      modal.style.display = "none";
      formReserva.reset();
    }
  });
}

const toggleBtn = document.getElementById("toggle-darkmode");

if (toggleBtn) {
  if (localStorage.getItem("darkmode") === "on") {
    document.body.classList.add("dark");
    toggleBtn.textContent = "☀️";
  }

  toggleBtn.addEventListener("click", () => {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
      toggleBtn.textContent = "☀️";
      localStorage.setItem("darkmode", "on");
    } else {
      toggleBtn.textContent = "🌙";
      localStorage.setItem("darkmode", "off");
    }
  });
}

const impactoNums = document.querySelectorAll(".impacto-num");
const secImpacto = document.getElementById("impacto");

if (secImpacto && impactoNums.length) {
  const impactoObs = new IntersectionObserver(
    (entries, obs) => {
      if (!entries[0].isIntersecting) return;

      impactoNums.forEach((num) => {
        const target = parseInt(num.dataset.target, 10);
        let atual = 0;

        const intervalo = setInterval(() => {
          atual++;
          if (atual >= target) clearInterval(intervalo);
          num.textContent = atual;
        }, 10);
      });

      obs.unobserve(secImpacto);
    },
    { threshold: 0.3 }
  );

  impactoObs.observe(secImpacto);
}

document.querySelectorAll(".faq details").forEach((det) => {
  det.addEventListener("toggle", () => {
    if (det.open) {
      document.querySelectorAll(".faq details").forEach((d) => {
        if (d !== det) d.removeAttribute("open");
      });
    }
  });
});

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", function (e) {
    const destino = document.querySelector(this.getAttribute("href"));
    if (!destino) return;

    e.preventDefault();
    const offset = 80;
    const pos = destino.getBoundingClientRect().top + window.scrollY - offset;

    window.scrollTo({
      top: pos,
      behavior: "smooth",
    });
  });
});

window.addEventListener("scroll", () => {
  const top = document.documentElement.scrollTop;
  const height =
    document.documentElement.scrollHeight -
    document.documentElement.clientHeight;
  const percent = (top / height) * 100;

  const barra = document.getElementById("scroll-progress");
  if (barra) barra.style.width = percent + "%";
});

const cards = document.querySelectorAll(".destino, .pacote, .dif-card");

if (cards.length) {
  const cardsObs = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("card-ativo");
        } else {
          entry.target.classList.remove("card-ativo");
        }
      });
    },
    { threshold: 0.55 }
  );

  cards.forEach((c) => cardsObs.observe(c));
}

const menuToggle = document.getElementById("menu-toggle");
const navList = document.querySelector("header nav ul");

if (menuToggle && navList) {
  menuToggle.addEventListener("click", () => {
    navList.classList.toggle("show");
  });

  navList.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navList.classList.remove("show");
    });
  });
}

const botoesCat = document.querySelectorAll(".categoria-btn");
const pacotes = document.querySelectorAll(".pacote");

if (botoesCat.length && pacotes.length) {
  botoesCat.forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelector(".categoria-btn.active")?.classList.remove("active");
      btn.classList.add("active");

      const categoria = btn.dataset.cat;

      pacotes.forEach((p) => {
        const catPacote = p.dataset.category;

        if (categoria === "todos" || categoria === catPacote) {
          p.style.display = "block";
          p.classList.add("card-ativo");
        } else {
          p.style.display = "none";
          p.classList.remove("card-ativo");
        }
      });
    });
  });
}
