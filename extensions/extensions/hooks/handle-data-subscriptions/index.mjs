import crypto from "node:crypto";

const SUBSCRIBER_SERVICE_URL =
  process.env.SUBSCRIBER_SERVICE_URL || "http://subscriber:3000";

const deriveKeyAndIV = (password, salt) => {
  const key = crypto.pbkdf2Sync(password, salt, 100000, 32, "sha256");
  const iv = key.subarray(0, 16);
  return { key, iv };
};

const encryptStr = (str, password) => {
  const salt = crypto.randomBytes(16);
  const { key, iv } = deriveKeyAndIV(password, salt);
  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encryptedData = Buffer.concat([cipher.update(str), cipher.final()]);
  const dataWithSalt = Buffer.concat([salt, encryptedData]);
  return dataWithSalt.toString("base64url");
};

const decryptStr = (str, password) => {
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

export default ({ filter, action }, { env }) => {
  // we use filter to encrypt password before storing it in db
  filter("data_subscriptions.items.create", async (payload) => {
    if (!payload.subscription_id) {
      payload.subscription_id = crypto.randomUUID();
    }
    if (payload.protocol === "mqtt") {
      const res = await fetch(SUBSCRIBER_SERVICE_URL + "/mqtt", {
        method: "POST",
        body: JSON.stringify({
          subscriptionId: payload.subscription_id,
          url: payload.url,
          topics: payload.topics,
          username: payload.username,
          password: payload.password,
        }),
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        throw new Error(
          `Subscriber service response not ok: ${res.status} ${
            res.statusText
          }. Response body: ${await res.text()}`
        );
      }
    }
    if (payload.password) {
      const encryptionPass = crypto
        .createHash("md5")
        .update(env.KEY + env.SECRET)
        .digest("hex");
      payload.password = encryptStr(payload.password, encryptionPass);
    }
    return payload;
  });

  // we use filter because we need to fetch protocol first
  filter(
    "data_subscriptions.items.delete",
    async (keys, _meta, { database }) => {
      const dataSubs = await database("data_subscriptions")
        .select("subscription_id", "protocol")
        .whereIn("subscription_id", keys);
      for (const row of dataSubs) {
        if (row.protocol === "mqtt") {
          const res = await fetch(
            `${SUBSCRIBER_SERVICE_URL}/mqtt/${row.subscription_id}`,
            { method: "DELETE" }
          );
          if (!res.ok) {
            throw new Error(
              `Subscriber service response not ok: ${res.status} ${
                res.statusText
              }. Response body: ${await res.text()}`
            );
          }
        }
      }
      return keys;
    }
  );

  // we use filter to encrypt password before storing it in db
  filter("data_subscriptions.items.update", async (payload) => {
    if (payload.password) {
      const encryptionPass = crypto
        .createHash("md5")
        .update(env.KEY + env.SECRET)
        .digest("hex");
      payload.password = encryptStr(payload.password, encryptionPass);
    }
    return payload;
  });

  // we use action to make sure we get all the updated columns from db
  action("data_subscriptions.items.update", async ({ keys }, { database }) => {
    const encryptionPass = crypto
      .createHash("md5")
      .update(env.KEY + env.SECRET)
      .digest("hex");

    const dataSubs = await database("data_subscriptions")
      .select(
        "subscription_id",
        "protocol",
        "url",
        "topics",
        "username",
        "password"
      )
      .whereIn("subscription_id", keys);

    for (const row of dataSubs) {
      if (row.protocol === "mqtt") {
        const res = await fetch(
          `${SUBSCRIBER_SERVICE_URL}/mqtt/${row.subscription_id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              subscriptionId: row.subscription_id,
              url: row.url,
              topics: row.topics,
              username: row.username,
              password: decryptStr(row.password, encryptionPass),
            }),
            headers: { "Content-Type": "application/json" },
          }
        );
        if (!res.ok) {
          throw new Error(
            `Subscriber service response not ok: ${res.status} ${
              res.statusText
            }. Response body: ${await res.text()}`
          );
        }
      }
    }
  });
};
