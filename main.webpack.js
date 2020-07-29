const path = require('path');
const ThreadsPlugin = require('threads-plugin');

module.exports = function (config) {
  config.resolve.modules = [path.resolve(__dirname, './src'), 'node_modules'];
  config.plugins.unshift(
    new ThreadsPlugin({ target: 'electron-node-worker' })
  );
  return config;
}
