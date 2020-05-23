module.exports = {
  rollup(config, options) {
    // options.env can be 'development' or 'production'
    if (options.env === 'production') {
      // redirect prod build to nowhere
      config.output.file = `${__dirname}/dist/delete_me/file.js`
    } else {
      // config.input can be 'src/proxy.ts' or 'src/index.js' **as per package build scripts**
      if (config.input === 'src/proxy.ts') {
        config.output.file = `${__dirname}/dist/proxy.js`
      } else {
        // overwrite tsdx default entry file
        config.output.file = `${__dirname}/dist/index.js`
      }
    }
    return config
  },
}
