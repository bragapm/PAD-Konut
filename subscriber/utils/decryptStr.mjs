import crypto from "node:crypto";

const deriveKeyAndIV = (password, salt) => {
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  const iv = key.subarray(0, 16);
  return { key, iv };
};

export default (str, password) => {
  const data = Buffer.from(str, "base64url");
  const salt = data.subarray(0, 16);
  const encryptedData = data.subarray(16);
  const { key, iv } = deriveKeyAndIV(password, salt);
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decryptedData = Buffer.concat([
    decipher.update(encryptedData),
    decipher.final(),
  ]);
  return decryptedData.toString("utf-8");
};
