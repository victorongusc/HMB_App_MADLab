const fs = require('fs');
const path = require('path');
const formidable = require('formidable');

/*  OPTION A — OneDrive via Microsoft Graph  ----------------------------- */
// const { Client } = require('@microsoft/microsoft-graph-client');
// const { ClientSecretCredential } = require('@azure/identity');
// require('isomorphic-fetch');

/*  OPTION B — Azure Blob Storage  -------------------------------------- */
// const { BlobServiceClient } = require('@azure/storage-blob');

/*  ---- pick ONE of the two options above and comment the other -------- */
/*  ---- for illustration I'll leave OPTION A enabled ------------------- */

let graphClient;
function getGraphClient() {
  if (graphClient) return graphClient;

  const credential = new ClientSecretCredential(
    process.env.GRAPH_TENANT_ID,
    process.env.GRAPH_CLIENT_ID,
    process.env.GRAPH_CLIENT_SECRET
  );

  graphClient = Client.initWithMiddleware({
    authProvider: {
      getAccessToken: async () =>
        (await credential.getToken('https://graph.microsoft.com/.default'))
          .token
    }
  });

  return graphClient;
}

module.exports = async function (req, context) {
  /* ---------- parse multipart form ----------------------------------- */
  const form = formidable({ multiples: false });
  const { fields, files } = await new Promise((resolve, reject) =>
    form.parse(req, (err, flds, fls) =>
      err ? reject(err) : resolve({ fields: flds, files: fls })
    )
  );

  const { participantId, sessionDate, mass } = fields;
  const file = files.upload;

  if (!participantId || !sessionDate || !mass || !file) {
    context.res = { status: 400, body: 'Missing required fields' };
    return;
  }

  /* ---------- choose storage target ---------------------------------- */
  /* --- OneDrive (Graph) ---------------------------------------------- */
  const drivePath = `/drive/root:/HMB_Patient_Data/${participantId}/${sessionDate}/${
    mass
  }g_${file.originalFilename}:/content`;

  const graph = getGraphClient();
  const fileStream = fs.createReadStream(file.filepath);

  if (file.size <= 4 * 1024 * 1024) {
    await graph.api(drivePath).put(fileStream);
  } else {
    await graph.api(drivePath).upload(fileStream, file.size);
  }

  /* --- Blob alternative (uncomment if you use Blob) -------------------
  const blobSvc = BlobServiceClient.fromConnectionString(
    process.env.BLOB_STORAGE
  );
  const container = blobSvc.getContainerClient('uploads');
  await container.createIfNotExists();
  const blobName = `${participantId}/${sessionDate}/${mass}g_${file.newFilename}`;
  const blockBlob = container.getBlockBlobClient(blobName);
  await blockBlob.uploadFile(file.filepath);
  ---------------------------------------------------------------------*/

  context.res = { status: 200, body: 'Upload complete' };
};
