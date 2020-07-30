const path = require('path');
const ThreadsPlugin = require('threads-plugin');

module.exports = function (config) {
  config.resolve.modules = [path.resolve(__dirname, './src'), 'node_modules'];

  config.module.rules.unshift({
    test: /\.node$/,
    loader: 'awesome-node-loader',
    options: {
      name: '[name].[ext]',
      useDirname: false,
    },
  });

  config.plugins.unshift(
    new ThreadsPlugin({ target: 'electron-node-worker' })
  );
  return config;
}
