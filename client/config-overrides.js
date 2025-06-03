module.exports = function override(config, env) {
  // Изменяем devtool для development режима
  if (env === 'development') {
    config.devtool = 'cheap-module-source-map';
  }
  return config;
}; 