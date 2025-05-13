const { app, HttpRequest, InvocationContext } = require("@azure/functions");
const uploadHandler = require("./uploadHandler");

// -- Global middleware (CORS, logging, etc.)
app.use("http", async (context, next) => {
  const req = context.req;
  // CORS preflight
  if (req.method === "OPTIONS") {
    context.res = {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Methods":"POST,OPTIONS",
        "Access-Control-Allow-Headers":"Content-Type"
      }
    };
    return;
  }
  // for actual requests, continue to handler
  await next();
});

// -- HTTP-triggered function declaration
app.http("upload", {
  methods: ["POST"],
  route: "upload",         // maps to /api/upload
  authLevel: "anonymous"
}, uploadHandler);

module.exports = app;
