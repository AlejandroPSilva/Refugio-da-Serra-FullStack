const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");
const helmet = require("helmet");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { Pool } = require("pg");
const rateLimit = require("express-rate-limit");
const app = express();
const app = express();
  app.set('trust proxy', true);

// ========= BANCO ==========
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ========= MIDDLEWARES GLOBAIS ==========
app.use(express.json());
app.use(helmet());

// ========= CORS SEGURO ==========
const allowedOrigins = [
  "https://AlejandroPSilva.github.io",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.static(path.join(__dirname, "public")));

//  IP SUSPEITO — BLOQUEIO AUTOMÁTICO

// Armazena "pontuação de suspeita" por IP
const suspiciousIPs = {};

// Se o IP acumular muitos pontos → é bloqueado temporariamente
const autoBlacklist = new Set();

const blockThreshold = 12;         // Número de ações suspeitas permitidas
const blockDuration = 60 * 60 * 1000; // 1 hora de bloqueio

// Middleware global para detectar comportamento suspeito
app.use((req, res, next) => {
  const ip = req.ip;

  // Se IP estiver bloqueado → recusa acesso
  if (autoBlacklist.has(ip)) {
    return res.status(403).json({
      erro: "Seu IP foi temporariamente bloqueado por comportamento suspeito.",
    });
  }

  // --- Definição de comportamentos suspeitos ---
  const isSuspicious =
    req.path.startsWith("/admin") && !req.headers.authorization ||
    req.path.includes("..") ||                    // tentativa de directory traversal
    req.path.includes("config") ||                // varredura
    req.path.includes("php") ||                   // ataque a PHP
    req.path.includes("wp-") ||                   // ataque a WordPress
    req.method === "OPTIONS" && req.headers.origin === undefined ||
    req.headers["user-agent"]?.includes("curl") ||
    req.headers["user-agent"]?.includes("bot");

  if (isSuspicious) {
    suspiciousIPs[ip] = (suspiciousIPs[ip] || 0) + 1;
  }

  // Se chegou no limite → bloqueia automaticamente
  if (suspiciousIPs[ip] >= blockThreshold) {
    autoBlacklist.add(ip);

    // Remove do bloqueio após 1 hora
    setTimeout(() => {
      autoBlacklist.delete(ip);
      suspiciousIPs[ip] = 0;
    }, blockDuration);

    return res.status(403).json({
      erro: "IP bloqueado temporariamente por comportamento suspeito.",
    });
  }

  next();
});


// RATE LIMIT LOGIN (ANTI-BRUTE-FORCE)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 5,
  message: { erro: "Muitas tentativas de login. Tente novamente mais tarde." },
});


// CONFIG DO ADMIN + JWT

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";

const tokenBlacklist = new Set();


// ROTAS NORMAIS

app.post("/newsletter", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ erro: "E-mail obrigatório." });

  try {
    const result = await pool.query(
      "INSERT INTO newsletter (email) VALUES ($1) RETURNING id",
      [email]
    );
    return res.json({ sucesso: true, id: result.rows[0].id });
  } catch {
    return res.status(500).json({ erro: "Erro ao salvar no banco." });
  }
});

app.post("/contato", async (req, res) => {
  const { nome, email, mensagem } = req.body;

  if (!nome || !email || !mensagem)
    return res.status(400).json({ erro: "Preencha todos os campos." });

  try {
    const result = await pool.query(
      "INSERT INTO contato (nome, email, mensagem) VALUES ($1, $2, $3) RETURNING id",
      [nome, email, mensagem]
    );
    return res.json({ sucesso: true, id: result.rows[0].id });
  } catch {
    return res.status(500).json({ erro: "Erro ao salvar no banco." });
  }
});

app.post("/reservas", async (req, res) => {
  const { nome, telefone, data_viagem, pacote } = req.body;

  if (!nome || !telefone || !data_viagem || !pacote)
    return res.status(400).json({ erro: "Dados incompletos." });

  try {
    const result = await pool.query(
      "INSERT INTO reservas (nome, telefone, data_viagem, pacote) VALUES ($1, $2, $3, $4) RETURNING id",
      [nome, telefone, data_viagem, pacote]
    );
    return res.json({ sucesso: true, id: result.rows[0].id });
  } catch {
    return res.status(500).json({ erro: "Erro ao salvar no banco." });
  }
});

// LOGIN ADMIN (JWT + RATE LIMIT)

app.post("/admin/login", loginLimiter, (req, res) => {
  const { usuario, senha } = req.body;

  if (usuario === ADMIN_USER && senha === ADMIN_PASS) {
    const jti = crypto.randomBytes(16).toString("hex");

    const token = jwt.sign(
      { user: usuario, role: "admin", jti },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    return res.json({ token });
  }

  return res.status(401).json({ erro: "Credenciais inválidas" });
});


// MIDDLEWARE JWT

function autenticarAdmin(req, res, next) {
  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");

  if (!token) return res.status(401).json({ erro: "Token não fornecido." });

  if (tokenBlacklist.has(token)) {
    return res.status(401).json({ erro: "Token inválido." });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (payload.role !== "admin") {
      return res.status(403).json({ erro: "Acesso negado." });
    }

    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ erro: "Token inválido ou expirado." });
  }
}


//  LOGOUT
app.post("/admin/logout", autenticarAdmin, (req, res) => {
  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");

  tokenBlacklist.add(token);

  setTimeout(() => tokenBlacklist.delete(token), 60 * 60 * 1000);

  return res.json({ sucesso: true });
});


//  ROTAS ADMIN PROTEGIDAS

app.get("/admin/newsletter", autenticarAdmin, async (_, res) => {
  try {
    const result = await pool.query("SELECT * FROM newsletter ORDER BY id DESC");
    res.json(result.rows);
  } catch {
    res.status(500).json({ erro: "Erro ao buscar dados." });
  }
});

app.get("/admin/contato", autenticarAdmin, async (_, res) => {
  try {
    const result = await pool.query("SELECT * FROM contato ORDER BY id DESC");
    res.json(result.rows);
  } catch {
    res.status(500).json({ erro: "Erro ao buscar dados." });
  }
});

app.get("/admin/reservas", autenticarAdmin, async (_, res) => {
  try {
    const result = await pool.query("SELECT * FROM reservas ORDER BY id DESC");
    res.json(result.rows);
  } catch {
    res.status(500).json({ erro: "Erro ao buscar dados." });
  }
});


// PÁGINA ADMIN

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

// SERVIDOR

app.get("/", (req, res) => {
  res.send("API Refúgio funcionando com proteção contra IP suspeito!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Servidor rodando na porta", PORT);
});
