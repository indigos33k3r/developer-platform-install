'use strict';

var https = require('https');
var fs = require('fs');
var qs = require('querystring');
var pem = require('pem');
var path = require('path');
var loadMetadata = require('../browser/services/metadata');
var requirements = loadMetadata(require('../requirements'), process.platform);

var PORT = 443;

function handleRequest(req, res) {
  console.log(`Requested URL: ${req.url}`);
  if(req.method === 'POST') {

    var data = '';

    req.on('data', function(chunk) {
      data += chunk;
    });

    req.on('end', function() {
      var parseData = qs.parse(data);
      var prettyData = JSON.stringify(parseData, null, 2);
      console.log('Post request with:\n' + prettyData);
      res.end(prettyData);
    });

  } else if(req.method === 'GET') {
    let url = req.url;
    if (url.endsWith('/download-manager/rest/tc-accepted?downloadURL=/file/cdk-2.1.0.zip')) {
      res.end('true');
    } else if(url.endsWith('/favicon.ico')) {
      // not required
    } else {
      console.log('Request to download manager');
      for (let prop in requirements) {
        let requirement = requirements[prop];
        if(requirement.dmUrl && requirement.dmUrl.endsWith(url)
          || requirement.url && requirement.url.endsWith(url) ) {
          console.log('Issuing redirect ' + 'https://' + req.headers['host'] + '/' + requirement.fileName);
          res.writeHead(302, { 'Location': 'https://' + req.headers['host'] + '/requirements-cache/' + requirement.fileName });
          res.end();
          return;
        } else if(requirement.file) {
          let files = Object.keys(requirement.file).map(file=>{
            return requirement.file[file];
          });
          console.log(files);
          for (let file of files) {
            if(file.dmUrl && file.dmUrl.endsWith(url)
              || file.url && file.url.endsWith(url) ) {
                console.log('Issuing redirect ' + 'https://' + req.headers['host'] + '/' + file.fileName);
                res.writeHead(302, { 'Location': 'https://' + req.headers['host'] + '/requirements-cache/' + file.fileName });
                res.end();
                return;
              }
          }
        }
      }
      url = url.substring(1);
      console.log(`Sending file ${url}`);

      let filePath = path.join(__dirname, '..', url);
      var readStream = fs.createReadStream(filePath);
      res.writeHead(200, {
        'Content-Type': 'application/x-msdownload',
        'Content-length': fs.statSync(filePath).size});
      readStream.pipe(res);
    }
  }
}

pem.createCertificate({days:5, selfSigned:true}, function(err, keys) {
  if(err) {
    console.log(err);
    return;
  }
  var options = {
    key: keys.serviceKey,
    cert: keys.certificate
  };

  //Create a server
  var server = https.createServer(options, handleRequest);

  //Start server
  server.listen(PORT, function() {
    console.log('Server listening on: https://localhost:' + PORT);
  });
});
