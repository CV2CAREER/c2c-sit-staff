const moduleAlias = require('module-alias');
const path = require('path');

moduleAlias.addAliases({
  '@': path.join(__dirname, 'build'),
  '@/models': path.join(__dirname, 'build', 'models'),
  '@/controllers': path.join(__dirname, 'build', 'controllers'),
  '@/services': path.join(__dirname, 'build', 'services'),
  '@/routes': path.join(__dirname, 'build', 'routes'),
  '@/utils': path.join(__dirname, 'build', 'utils'),
  '@/database': path.join(__dirname, 'build', 'database')
});
