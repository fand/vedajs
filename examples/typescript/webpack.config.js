const webpack = require("webpack");
const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, 'index.ts'),
  output: {
    path: __dirname,
    filename: 'bundle.js',
  },
  module: {
    loaders: [{ test: /\.ts?$/, loader: 'ts-loader' }],
  },
  devServer: {
    contentBase: __dirname,
  },
};
