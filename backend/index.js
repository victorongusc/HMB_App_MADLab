const { app } = require('@azure/functions');
const uploadHandler = require('./uploadHandler');

app.http(
  'upload',
  {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'upload'
  },
  async (req, ctx) => {
    /* CORS pre-flight */
    if (req.method === 'OPTIONS') {
      ctx.res = {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      };
      return;
    }

    /* real upload */
    await uploadHandler(req, ctx);

    /* CORS on normal reply */
    ctx.res.headers = {
      ...(ctx.res.headers || {}),
      'Access-Control-Allow-Origin': '*'
    };
  }
);

module.exports = app;
