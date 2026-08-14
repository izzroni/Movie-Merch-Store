module.exports = function override(config) {
    // Ignore source map warnings for react-datepicker
    config.module.rules.push({
      test: /\.js$/,
      enforce: "pre",
      include: /node_modules[\\/]react-datepicker/,
      use: [
        {
          loader: "source-map-loader",
          options: {
            filterSourceMappingUrl: (url, resourcePath) => {
              return false; // Skip source map processing for react-datepicker
            },
          },
        },
      ],
    });
  
    // Suppress warnings in the console
    config.ignoreWarnings = config.ignoreWarnings || [];
    config.ignoreWarnings.push({
      module: /node_modules[\\/]react-datepicker/,
      message: /Failed to parse source map/,
    });
  
    return config;
  };