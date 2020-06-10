module.exports = {
  rollup(config, options) {
    // options.env can be 'development' or 'production'
    if (options.env === 'production') {
      // redirect prod build to nowhere
      config.output.file = `${__dirname}/dist/delete_me/file.js`
    } else {
      // config.input can be 'src/http-proxy.ts' or 'src/index.js' **as per package build scripts**
      if (config.input === 'src/http-proxy.ts') {
        config.output.file = `${__dirname}/dist/http-proxy.js`
      } else {
        // overwrite tsdx default entry file
        config.output.file = `${__dirname}/dist/index.js`
      }
    }
    return config
  },
}
