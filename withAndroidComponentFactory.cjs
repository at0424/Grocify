const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidComponentFactory(config) {
  return withAndroidManifest(config, async (config) => {
    let androidManifest = config.modResults;
    const application = androidManifest.manifest.application[0];
    
    // Add the tools namespace if it doesn't exist
    if (!androidManifest.manifest.$['xmlns:tools']) {
      androidManifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
    }

    // Forcefully replace the appComponentFactory
    application.$['tools:replace'] = 'android:appComponentFactory';
    application.$['android:appComponentFactory'] = 'androidx.core.app.CoreComponentFactory';

    return config;
  });
};