const { app } = require("@azure/functions");
const Busboy  = require("busboy");       // or use Formidable as above
const exifr   = require("exifr");
const fs      = require("fs");
const path    = require("path");

app.http("upload", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  handler: async (req, context) => {
    context.log("Upload triggered");

    const uploadsDir = path.join(__dirname, "uploads");
    const recordsDir = path.join(__dirname, "records");
    [uploadsDir, recordsDir].forEach(d => fs.existsSync(d) || fs.mkdirSync(d, { recursive: true }));

    if (req.method === "OPTIONS") {
      return {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type"
        }
      };
    }

    const record = { timestamp: Date.now(), files: [] };
    await new Promise((resolve, reject) => {
      const bb = Busboy({ headers: req.headers });

      bb.on("file", (field, stream, info) => {
        const { filename } = info;
        const chunks = [];

        stream.on("data", c => chunks.push(c));
        stream.on("end", async () => {
          let buf = Buffer.concat(chunks);

          if (/\.MP\./i.test(filename)) {
            const eoi = Buffer.from([0xFF, 0xD9]);
            const idx = buf.lastIndexOf(eoi);
            if (idx !== -1) buf = buf.slice(0, idx + 2);
          }

          const outPath = path.join(uploadsDir, filename);
          fs.writeFileSync(outPath, buf);

          let exifData = {};
          try {
            exifData = (await exifr.parse(buf)) || {};
          } catch {}

          record.files.push({ filename, savedPath: outPath, exif: exifData });
        });
      });

      bb.on("finish", resolve);
      bb.on("error", reject);
      bb.end(req.rawBody);
    });

    const recFile = path.join(recordsDir, `${record.timestamp}.json`);
    fs.writeFileSync(recFile, JSON.stringify(record, null, 2));
    context.log(`Wrote record → ${recFile}`);

    return {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "*" },
      body: record
    };
  },
});
