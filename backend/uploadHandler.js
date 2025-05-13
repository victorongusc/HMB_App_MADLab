const { BlobServiceClient } = require("@azure/storage-blob");
const formidable = require("formidable");
// …any other imports…

module.exports = async function (req, context) {
  // 1. Parse multipart:  
  const form = formidable({ multiples: false });
  const data = await new Promise((resolve, reject) => {
    form.parse(req, (err, fields, files) => err ? reject(err) : resolve({ fields, files }));
  });

  // 2. Process file (e.g. resize with sharp, extract metadata)  
  const file = data.files.upload;  
  // …your sharp/exifr code here…

  // 3. (Optional) upload to Blob Storage instead of fs:  
  const blobClient = BlobServiceClient
    .fromConnectionString(process.env.AzureWebJobsStorage)
    .getContainerClient("uploads")
    .getBlockBlobClient(file.newFilename);
  await blobClient.uploadFile(file.filepath);

  // 4. Return a JSON response  
  context.res = {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
    body: { message: "Upload successful", url: blobClient.url }
  };
};
