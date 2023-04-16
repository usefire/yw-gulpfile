#!/usr/bin/env node
// 1.传参数
process.argv.push('--cwd')
process.argv.push(process.cwd())
process.argv.push('--gulpfile')
process.argv.push(require.resolve('../lib/index.js')) // ..会取找package.json里的main
// console.log('process: ', process.argv);

// 2.去执行gulp-cli
require('gulp/bin/gulp')
