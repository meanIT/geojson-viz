'use strict';

const express = require('express');

const app = express();
app.use(express.static('./client'));

app.listen(3000);

if (process.env.NODE_ENV === 'development') {
  const webpack = require('webpack');

  const compiler = webpack(require('./client/webpack.config.js'));

  compiler.watch({}, err => {
    console.log(`Webpack build finished with error: ${err}`);
  });
}