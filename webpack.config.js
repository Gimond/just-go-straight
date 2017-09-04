'use strict';

var webpack = require('webpack');
var path = require('path');
var HtmlPlugin = require('html-webpack-plugin');

var env = 'production';
var isProduction = env === 'production';

var plugins = [
  new webpack.DefinePlugin({
    'PRODUCTION': isProduction
  }),
  new HtmlPlugin({
    title: 'Just Go Straight',
    template: 'src/index.ejs'
  })
];

if (isProduction) {
  plugins = plugins.concat([
    // new webpack.optimize.OccurenceOrderPlugin(),
    // new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin()
    // new webpack.NoErrorsPlugin()
  ]);
}

module.exports = {
  // devtool: 'eval',

  entry: {
    app: './src/main'
  },

  output: {
    path: path.join(__dirname, 'build'),
    filename: 'b.js'
  },

  plugins: plugins,

  resolve: {
    extensions: ['', '.js', 'json']
  }
};
