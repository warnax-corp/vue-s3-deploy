#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const program = require('commander');
const mime = require('mime');
const { S3 } = require('@aws-sdk/client-s3');

program
  .arguments('<bucket>')
  .action(bucket => {
    if (bucket == null) {
      throw new Error('Must enter a bucket name for deployment');
    }
    const files = filesToDeploy();
    if (files.find(each => each.endsWith('dist/index.html')) == null) {
      throw new Error('Vue deployment must contain index.html file at root of dist');
    }
    const clientConfig = {
      apiVersion: '2006-03-01',
      endpoint: 'https://s3.amazonaws.com',
    };
    const client = new S3(clientConfig);
    Promise.all(
      files.map(file => {
        let ContentType;
        if (file.endsWith('.map')) {
          ContentType = 'binary/octet-stream';
        } else {
          ContentType = mime.getType(file);
        }
        return client
          .putObject({
            ContentType,
            Bucket: bucket,
            Key: file.slice(5),
            Body: fs.readFileSync(file),
          })
          .catch(console.error);
      })
    ).then(completed => {
      if (completed.length !== files.length) {
        throw new Error('Not all files successfully uploaded');
      }
    });
  })
  .parse(process.argv);

function filesToDeploy(dir = 'dist') {
  return fs
    .readdirSync(dir)
    .reduce((files, file) => {
      const name = path.join(dir, file);
      if (name.endsWith('index.html')) indexFileExists = true;
      const isDirectory = fs.statSync(name).isDirectory();
      return isDirectory ? [...files, ...filesToDeploy(name)] : [...files, name];
    }, [])
    .filter(fileName => !fileName.endsWith('DS_Store'));
}
