// backend/index.js
const { app } = require("@azure/functions");
const uploadHandler = require("./uploadHandler");

/**
 * Single HTTP-triggered function:  POST /api/upload
 *    – also handles the CORS pre-flight OPTIONS request
 */
app.http("upload", {
  methods: ["POST", "OPTIONS"],
  route:   "upload",
  authLevel: "anonymous"
}, async (req, context) => {

  /* ---- CORS pre-flight ---- */
  if (req.method === "OPTIONS") {
    context.res = {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin":  "*",
        "Access-Control-Allow-Methods": "POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    };
    return;                                 // nothing else to do
  }

  /* ---- real POST ---- */
  await uploadHandler(req, context);

  /* ---- CORS headers on normal response ---- */
  if (context.res && context.res.headers) {
    context.res.headers["Access-Control-Allow-Origin"]  = "*";
    context.res.headers["Access-Control-Allow-Methods"] = "POST,OPTIONS";
    context.res.headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
});

/* Export the app object so the Functions host picks it up */
module.exports = app;
