const Busboy = require("busboy");
const exifr  = require("exifr");
const sharp  = require("sharp");
const fs     = require("fs");
const path   = require("path");

module.exports = async function(context, req) {
  context.log("Upload triggered");

  // ── Ensure directories exist ───────────────────────────
  const uploadsDir = path.join(__dirname, "uploads");
  const recordsDir = path.join(__dirname, "records");
  [uploadsDir, recordsDir].forEach(dir => fs.existsSync(dir) || fs.mkdirSync(dir, { recursive: true }));

  // ── CORS preflight ────────────────────────────────────
  if (req.method === "OPTIONS") {
    context.res = {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    };
    return;
  }

  // ── Parse form fields and buffers via Busboy ───────────
  const record = { userId: "", dateOfSample: "", weights: [] };
  const fileRecords = [];

  await new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers });

    bb.on("field", (name, val) => {
      if (name === "userId")       record.userId = val;
      else if (name === "dateOfSample") record.dateOfSample = val;
      else if (name === "weights")      record.weights.push(val);
    });

    bb.on("file", (field, stream, info) => {
      const { filename } = info;
      const chunks = [];
      stream.on("data", chunk => chunks.push(chunk));
      stream.on("end", () => fileRecords.push({ filename, buffer: Buffer.concat(chunks) }));
      stream.on("error", err => context.log.error(`Stream error for ${filename}: ${err.message}`));
    });

    bb.on("finish", resolve);
    bb.on("error", reject);
    bb.end(req.body);
  });

  // ── Define forbidden EXIF key patterns ────────────────
  const forbidden = [
    /GPS/i, /Latitude/i, /Longitude/i,
    /Location/i, /TimeZone/i, /OffsetTime/i,
    /SerialNumber/i, /Owner/i, /Author/i, /Artist/i
  ];

  // ── Extract and filter EXIF, collect keys ─────────────
  const allExifKeys = new Set();
  for (const rec of fileRecords) {
    let rawExif = {};
    try {
      rawExif = await exifr.parse(rec.buffer) || {};
    } catch (e) {
      context.log.warn(`EXIF parse failed for ${rec.filename}: ${e.message}`);
    }
    const exifData = {};
    for (const [key, value] of Object.entries(rawExif)) {
      if (!forbidden.some(rx => rx.test(key))) {
        exifData[key] = value;
        allExifKeys.add(key);
      }
    }
    rec.exifData = exifData;
  }

  // ── Prepare CSV header with dynamic EXIF columns ──────
  const baseCols = ['userId','dateOfSample','weight','originalFilename','savedFilename'];
  const exifCols = Array.from(allExifKeys).sort();
  const header = baseCols.concat(exifCols).join(',') + '\n';

  const timestamp = Date.now();
  const csvName  = `${record.userId}_${record.dateOfSample}.csv`;
  const csvPath  = path.join(recordsDir, csvName);
  fs.writeFileSync(csvPath, header);

  // ── Save files (stripping metadata) and append CSV rows ─
  const SUPPORTED = ["jpg","jpeg","png","webp","tiff","avif","gif"];
  const filesOut = [];

  for (let idx = 0; idx < fileRecords.length; idx++) {
    const { filename, buffer, exifData } = fileRecords[idx];
    const weight = record.weights[idx] || '';
    const ext = path.extname(filename);
    const savedFilename = `${record.userId}_${record.dateOfSample}_${weight}_${timestamp}${ext}`;
    const outPath = path.join(uploadsDir, savedFilename);

    // Strip metadata by re-encoding for supported types
    let cleanBuf = buffer;
    const extLower = ext.slice(1).toLowerCase();
    if (SUPPORTED.includes(extLower)) {
      try {
        cleanBuf = await sharp(buffer).rotate().toBuffer();
      } catch (e) {
        context.log.warn(`Sharp strip metadata failed for ${filename}: ${e.message}`);
        cleanBuf = buffer;
      }
    }

    fs.writeFileSync(outPath, cleanBuf);
    context.log(`Saved file → ${savedFilename}`);

    // Build and append CSV row
    const row = [
      record.userId,
      record.dateOfSample,
      weight,
      filename,
      savedFilename,
      ...exifCols.map(key => exifData[key] != null ? String(exifData[key]).replace(/"/g,'""') : '')
    ];
    const line = '"' + row.join('","') + '"' + '\n';
    fs.appendFileSync(csvPath, line);

    filesOut.push({ originalFilename: filename, savedFilename, weight, exif: exifData });
  }

  context.log(`Wrote CSV with filtered EXIF → ${csvPath}`);

  // ── Respond with summary ───────────────────────────────
  context.res = {
    status: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: { csvPath, files: filesOut }
  };
};
