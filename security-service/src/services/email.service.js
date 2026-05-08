const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter;

function resolveDeliveryMode() {
  if (env.emailDeliveryMode === "smtp") {
    return "smtp";
  }

  if (
    env.emailDeliveryMode === "auto" &&
    env.smtpHost &&
    env.smtpUser &&
    env.smtpPass
  ) {
    return "smtp";
  }

  return "preview";
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth:
        env.smtpUser && env.smtpPass
          ? {
              user: env.smtpUser,
              pass: env.smtpPass,
            }
          : undefined,
    });
  }

  return transporter;
}

async function sendMfaEmail({ to, code, challengeId, expiresAt }) {
  const mode = resolveDeliveryMode();
  if (mode === "preview") {
    return {
      mode,
      previewCode: code,
      message: "Modo laboratorio: el código se muestra en la interfaz.",
    };
  }

  const transport = getTransporter();
  await transport.sendMail({
    from: env.smtpFrom,
    to,
    subject: "Codigo MFA de TechStore",
    text: `Tu código MFA es ${code}. Vence en 5 minutos. Challenge: ${challengeId}. Expira: ${expiresAt}.`,
    html: `
      <h2>TechStore</h2>
      <p>Tu código MFA es <strong>${code}</strong>.</p>
      <p>Vence en 5 minutos.</p>
      <p>Challenge: ${challengeId}</p>
      <p>Expira: ${expiresAt}</p>
    `,
  });

  return {
    mode,
    message: "Código MFA enviado por correo.",
  };
}

module.exports = {
  resolveDeliveryMode,
  sendMfaEmail,
};
