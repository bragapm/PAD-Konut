import crypto from "node:crypto";

export default (str) => {
  return crypto.createHash("md5").update(str).digest("hex");
};
