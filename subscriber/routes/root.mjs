export default (fastify, _opts) => {
  fastify.get(
    "/",
    {
      schema: {
        response: {
          200: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    async function (_req, _res) {
      return { message: "Hello from Geodashboard Subscriber Service!" };
    }
  );
};
