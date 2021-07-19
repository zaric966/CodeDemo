/**
 * Metro configuration for React Native
 * https://github.com/facebook/react-native
 *
 * @format
 */

 const { getDefaultConfig } = require('metro-config');

 module.exports = (async () => {
   const {
     resolver: { sourceExts },
     resolver,
   } = await getDefaultConfig();
   return {
     transformer: {
       getTransformOptions: async () => ({
         transform: {
           experimentalImportSupport: false,
           inlineRequires: false,
         },
       }),
     },
     resolver: {
       ...resolver,
       sourceExts: [...sourceExts, 'jsx'],
     },
   };
 })();
