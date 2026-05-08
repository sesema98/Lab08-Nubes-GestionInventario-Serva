const fs = require("fs");
const path = require("path");
const env = require("../config/env");

function sendMfaCode({ to, code, challengeId, expiresAt }) {
  fs.mkdirSync(env.mailboxDir, { recursive: true });
  const filePath = path.join(
    env.mailboxDir,
    `${Date.now()}-${challengeId}.json`
  );

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        to,
        subject: "Codigo MFA de TechStore",
        challengeId,
        expiresAt,
        text: `Tu codigo MFA es ${code}. Vence en 5 minutos.`,
      },
      null,
      2
    )
  );

  return filePath;
}

module.exports = {
  sendMfaCode,
};
