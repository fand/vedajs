const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, 'src/index.js'),
  output: {
    path: path.resolve(__dirname, 'public'),
    filename: 'bundle.js',
  },
  module: {
    loaders: [{
      test: /\.js?$/,
      loader: 'babel-loader',
      options: {
        "presets": ['babel-preset-flow', 'babel-preset-es2017', 'babel-preset-stage-2'].map(require.resolve),
      },
    }],
  },
  devServer: {
    contentBase: path.join(__dirname, 'public'),
  },
};
