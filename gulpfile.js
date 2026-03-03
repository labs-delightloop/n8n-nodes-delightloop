const { src, dest } = require('gulp');

function buildIcons() {
  return src('nodes/**/*.{png,svg}', { base: 'nodes' }).pipe(dest('dist/nodes'));
}

exports['build:icons'] = buildIcons;
