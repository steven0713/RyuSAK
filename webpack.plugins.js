const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const webpack = require('webpack');

module.exports = [
  new ForkTsCheckerWebpackPlugin(),
  new webpack.DefinePlugin({
    'process.env.RYUSAK_CDN': `'${process.env.RYUSAK_CDN}'`,
  })
];
