const path = require('path');
const ThreadsPlugin = require('threads-plugin');

module.exports = function (config) {
  config.resolve.modules = [path.resolve(__dirname, './src'), 'node_modules'];
  config.plugins.unshift(
    new ThreadsPlugin({ target: 'electron-node-worker' })
  );
  config.module.rules = config.module.rules.map(r => {
    if (r.use.map) {
      r.use = r.use.map(u => {
        if (u.loader === 'ts-loader') {
          console.debug("Original Webpack config for TS:", JSON.stringify(u, undefined, 4));
          u.options.compilerOptions = {
            ...(u.options.compilerOptions || {}),
            module: 'esnext',
          }
          console.info("Modified Webpack config for TS:", JSON.stringify(u, undefined, 4));
        }
        return u;
      })
    }
    return r;
  });
  return config;
}
