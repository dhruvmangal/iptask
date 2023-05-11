const express = require('express');
const app = express();
const cors = require('cors');
const useragent = require('express-useragent');
const geoip = require('geoip-lite');
const axios = require('axios');
const ip = require('ip-address').Address6;

let PORT = 3000;

app.use(useragent.express());

app.use(express.json());

app.use(cors());
app.options('*', cors());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
    'Access-Control-Allow-Headers',
    'Origin, X-Requested-With, Content-Type, Accept'
  );
  next();
});

const saveIPURL = (authToken, requestBody) => {
  const saveAPIURL = 'https://creator.zoho.com/api/v2/hiteshi/leave-management/form/Email_tracing_data';

  return axios
    .post(
      saveAPIURL, 
      requestBody, 
      {
        headers: { 
          Authorization: authToken 
        },
      }
    );
}

const generateToken = () => {
  const generateTokenAPIURL = 'https://accounts.zoho.com/oauth/v2/token?grant_type=refresh_token&refresh_token=1000.6f411dbe7b8abf283b8be3aff2447417.61c51fedec569a97f96e76d26dfdfeed&client_id=1000.CQMP5L4Y9QTAUHCMN01XY0FLKKGG0L&redirect_uri=https%253A%252F%252Fwww.zylker.com%252Fcallback&client_secret=d7f1b77464708b44e7cf32d93d142e3f9ac47c2433';
  // console.log('in generateToken');
  return axios.post(generateTokenAPIURL);
}

app.get('/ip', async (req, res) => {
  // console.log('in ip route req');
  // console.log(req.connection.remoteAddress);
  let myIp = (new ip(req.ip)).inspectTeredo().client4;
  // console.log('debug in IP');
  // console.log((new ip(req.ip)).inspectTeredo());
  try {
    
    var geo = geoip.lookup('103.204.52.50');
    // console.log('printing geo');
    // console.log(geo);
    // console.log(myIp);
    let rawData = {
      reqIP: req.useragent,
      ipLocation: geo || "",
      currentDate: new Date().toLocaleString(),
    };

    let requestBody = {
      data: {
        IP_address: '103.204.52.50',
        Country: geo.country ? geo.country : "",
        Date_Time: new Date().toLocaleString(),
        Row_Data: `[data:${rawData}]`,
      },
    };

    generateToken().then(data => {
      console.log('mail open');
      console.log('print data');
      console.log(data.data.access_token);
      saveIPURL(`Zoho-oauthtoken ${data.data.access_token}`, requestBody).then(response => {
        return res.status(200).json(response.data);
      });
    });

  } catch (error) {
    console.log('in catch');
    console.log(error);
    return res.status(500).json(error);
  }
});

app.listen(PORT, () => {
  console.log(`Server running on PORT ${PORT}`);
});
