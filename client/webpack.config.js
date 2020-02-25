'use strict';

module.exports = {
  mode: 'development',
  entry: {
    app: `${__dirname}/app`
  },
  optimization: {
    minimize: false
  },
  target: 'web',
  output: {
    path: `${__dirname}/bin`,
    filename: '[name].min.js'
  }
};