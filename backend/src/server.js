require("dotenv").config();

const app = require("./app");
const db = require("./config/database");

const host = process.env.HOST || "0.0.0.0";
const port = Number(process.env.PORT) || 3000;
let server;

async function shutdown(signal) {
  console.log(`Recebido ${signal}. Encerrando aplicacao...`);

  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await db.pool.end();
  console.log("Aplicacao encerrada com sucesso.");
}

async function startServer() {
  try {
    await db.query("SELECT 1");

    server = app.listen(port, host, () => {
      console.log(`Servidor iniciado em http://${host}:${port}`);
    });
  } catch (error) {
    console.error("Falha ao conectar no banco de dados:", error.message);
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  try {
    await shutdown("SIGINT");
    process.exit(0);
  } catch (error) {
    console.error("Erro ao encerrar a aplicacao:", error.message);
    process.exit(1);
  }
});

process.on("SIGTERM", async () => {
  try {
    await shutdown("SIGTERM");
    process.exit(0);
  } catch (error) {
    console.error("Erro ao encerrar a aplicacao:", error.message);
    process.exit(1);
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
});

startServer();
