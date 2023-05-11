// importing the dependencies
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const AWS = require("aws-sdk");
var multer = require("multer");
var upload = multer();
const axios = require("axios");
// const { response } = require('express');

const excelJS = require("exceljs");

require("dotenv").config();

// defining the Express app
const app = express();

// adding Helmet to enhance your Rest API's security
app.use(helmet());

// using express to parse JSON bodies into JS objects
app.use(express.json());

// enabling CORS for all requests
app.use(cors());

// adding morgan to log HTTP requests
app.use(morgan("combined"));

// for parsing multipart/form-data
// app.use(upload.array());
// app.use(express.static('public'));

const s3 = new AWS.S3({
  accessKeyId: process.env.ACCESS_KEY,
  secretAccessKey: process.env.SECRET_KEY,
  region: process.env.REGION,
});

let pipeline_uri =
  "https://api.pipelinecrm.com/api/v3/documents?api_key=" +
  process.env.PIPELINE_API_KEY +
  "&app_key=" +
  process.env.PIPELINE_APP_KEY;

const per_page = 2;
if (per_page) {
  pipeline_uri = pipeline_uri + "&per_page=" + per_page;
}

// Defining an endpoint to return all doc
app.post("/", async (req, res) => {
  let doc_res = [];
  if (per_page) {
    const pipeline_record = await axios.get(pipeline_uri);
    for (let i = 1; i <= pipeline_record.data.pagination.pages; i++) {
      let pipeline_page_uri;
      pipeline_page_uri = pipeline_uri + "&page=" + i;
      console.log("pipeline_uri if - ", pipeline_page_uri);
      const pipeline_data = await update_zoho_doc_record(pipeline_page_uri);

      // res.json({"status":"success", 'data':pipeline_data});

      doc_res = doc_res.concat(pipeline_data);
      console.log("pipeline_data data AA- ", pipeline_data);
    }
  } else {
    const pipeline_data = await update_zoho_doc_record(pipeline_uri);
    console.log("pipeline_uri else - ", pipeline_uri);
    doc_res.push(pipeline_data[0]);
  }

  // Export data call
  console.log("Export function call - ");
  const res_data = await export_documents_data(doc_res);
  console.log("Export function call End- ");
  res.status(200).json(res_data);
});

//
const update_zoho_doc_record = async (pipeline_uri) => {
  try {
    const response_data = await axios.get(pipeline_uri);

    if (response_data.data.entries) {
      let generatedResponse = [];
      await Promise.all(
        response_data.data.entries.map(async (element) => {
          try {
            let entrie = {};
            let updated_image = element.public_link;

            updated_image = await get_uploaded_s3_image(element.public_link);
            element.public_link = updated_image;

            entrie = {
              document_Id: element.id,
              title: element.title,
              created_at: element.created_at,
              updated_at: element.updated_at,
              deal_id: element.deal_id,
              owner_id: element.owner_id,
              person_id: element.person_id,
              document_type: element.document_type,
              upload_status: element.upload_status,
              upload_status_error_message: element.upload_status_error_message,
              document_url_s3: updated_image,
              size_in_k: element.size_in_k,
              upload_state: element.upload_state,
              etag: element.etag,
              document_tag_ids: element.document_tag_ids,
              owner_f_name: element.owner.first_name,
              owner_l_name: element.owner.last_name,
              document_tags: element.document_tags,
              row_data: element,
            };

            generatedResponse.push(entrie);
          } catch (err) {
            console.log("err", err);
            // res.status(500).json(err);
          }
        })
      );
      console.log("complete all"); // gets loged first
      return generatedResponse; // return without waiting for process of
    }

    // return res.status(200).json(response_data.data);
  } catch (err) {
    console.log("err", err);
    // res.status(500).json(err);
  }
};

// Add Image on s3 server and get uploaded image url
const get_uploaded_s3_image = async (imageURL) => {
  if (!imageURL) {
    return null;
  }

  const response = await axios.get(imageURL, { responseType: "arraybuffer" });
  const buffer = Buffer.from(response.data, "utf-8");
  let fileArray = imageURL.split("?")[0].split("/");
  let fileName = fileArray[fileArray.length - 1];
  console.log("file name - ", fileName);

  const params = {
    Bucket: `${process.env.BUCKET_NAME}/dev`,
    Key: fileName,
    Body: buffer,
  };

  const data = await s3.upload(params).promise();
  // console.log("data.Location is - ", data.Location);
  return data.Location;
};

// Export Data in Excel File
const export_documents_data = async (doc_records) => {
  const date = new Date();
  const timestamp = date.getTime();

  const workbook = new excelJS.Workbook(); // Create a new workbook
  const worksheet = workbook.addWorksheet("Documents"); // New Worksheet
  const path = "./files"; // Path to download excel

  // Column for data in excel. key must match data key
  worksheet.columns = [
    { header: "Sno", key: "s_no", width: 10 },
    { header: "document_Id", key: "document_Id", width: 10 },
    { header: "title", key: "title", width: 10 },
    { header: "created_at", key: "created_at", width: 10 },
    { header: "updated_at", key: "updated_at", width: 10 },
    { header: "deal_id", key: "deal_id", width: 10 },
    { header: "owner_id", key: "owner_id", width: 10 },
    { header: "person_id", key: "person_id", width: 10 },
    { header: "document_type", key: "document_type", width: 10 },
    { header: "upload_status", key: "upload_status", width: 10 },
    {
      header: "upload_status_error_message",
      key: "upload_status_error_message",
      width: 10,
    },
    { header: "document_url_s3", key: "document_url_s3", width: 10 },
    { header: "size_in_k", key: "size_in_k", width: 10 },
    { header: "upload_state", key: "upload_state", width: 10 },
    { header: "etag", key: "etag", width: 10 },
    { header: "document_tag_ids", key: "document_tag_ids", width: 10 },
    { header: "owner_f_name", key: "owner_f_name", width: 10 },
    { header: "owner_l_name", key: "owner_l_name", width: 10 },
    { header: "document_tags", key: "document_tags", width: 10 },
    { header: "row_data", key: "row_data", width: 30 },
  ];

  // Looping through document data
  let counter = 1;
  doc_records.forEach((doc) => {
    doc.s_no = counter;
    worksheet.addRow(doc); // Add data in worksheet
    counter++;
  });

  // Making first line in excel bold
  worksheet.getRow(1).eachCell((cell) => {
    cell.font = { bold: true };
  });

  try {
    const data = await workbook.xlsx
      .writeFile(`${path}/zoho-doc-${timestamp}.xlsx`)
      .then(() => {
        return {
          status: "success",
          message: "file successfully downloaded",
          path: `${path}/zoho-doc-${timestamp}.xlsx`,
        };
      });
    return data;
  } catch (err) {
    console.log("error", err);
    return {
      status: "error",
      message: "Something went wrong",
    };
  }
  console.log("Export Excel Data function completed");
};

const port = process.env.PORT || 3002;

// Starting the server
app.listen(process.env.PORT, () => {
  console.log(`listening on port ${port}`);
});
