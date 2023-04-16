// 入口文件
const { src, dest, parallel, series, watch } = require('gulp')
const del = require('del')
const loadPlugins = require('gulp-load-plugins')
const plugins = loadPlugins()

/** 2.自动加载插件 */
const sass = require('gulp-sass')(require('sass'))// 因为新版本不内置sass，这里就手动版吧
// const babel = require("gulp-babel")
// const swig = require("gulp-swig")
// const imagemin = require("gulp-imagemin")
/** 3.启动小服务 */
const browserSync = require('browser-sync')
const bs = browserSync.create()

const cwd = process.cwd() // 定位到宿主的根目录
let config = {
  // 默认配置
  build: {
    src: 'src',
    dist: 'dist',
    temp: 'temp',
    public: 'public',
    paths: {
      styles: 'assets/styles/*.scss',
      scripts: 'assets/scripts/*.js',
      pages: '*.html',
      images: 'assets/images/**',
      fonts: 'src/assets/fonts/**'
    }
  }

}

try {
  const loadConfig = require(`${cwd}/page.config.js`)
  config = Object.assign({}, config, loadConfig)
} catch (e) {
  // 不用处理
  console.log('e: ', e)
}

const clean = () => {
  return del([config.build.dist, config.build.temp])
}

// 可以拼接的方式，也可以直接配置
const style = () => {
  return src(config.build.paths.styles, { base: config.build.src, cwd: config.build.src })
    .pipe(sass({ outputStyle: 'expanded' }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const script = () => {
  return src(config.build.paths.scripts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.babel({ presets: [require('@babel/preset-env')] }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const page = () => {
  return src(config.build.paths.pages, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.swig({ data: config.data, defaults: { cache: false } }))
    .pipe(dest(config.build.temp))
    .pipe(bs.reload({ stream: true }))
}

const image = () => {
  return src(config.build.paths.images, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const font = () => {
  return src(config.build.paths.fonts, { base: config.build.src, cwd: config.build.src })
    .pipe(plugins.imagemin())
    .pipe(dest(config.build.dist))
}

const extra = () => {
  return src('**', { base: config.build.public, cwd: config.build.public })
    .pipe(dest(config.build.dist))
}

const useref = () => {
  return src(config.build.paths.pages, { base: config.build.temp, cwd: config.build.temp })
    .pipe(plugins.useref({ searchPath: [config.build.temp, '.'] }))
  // 读取了html中所有引入的css，js的引入路径文件（包含本地和第三方）
  // 这里读出了html，css，js三种格式文件，需要使用压缩插件gulp-htmlmin,gulp-uglify,gulp-clean-css，使用gulp-if判断文件流类型
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({
      collapseWhitespace: true,
      minifyCSS: true,
      minifyJS: true
    })))
  // .pipe(dest('dist')) //会有读写混乱的问题
    .pipe(dest(config.build.dist))
}

const server = () => {
  watch(config.build.paths.styles, { cwd: config.build.src }, style)
  watch(config.build.paths.scripts, { cwd: config.build.src }, script)
  watch(config.build.paths.pages, { cwd: config.build.src }, page)
  // dev环境，不监听这些文件，因为只涉及到搬运文件和压缩，无编译
  // watch("src/assets/images/**", image)
  // watch("src/assets/fonts/**", font)
  // watch("public/**", extra)
  // 图片字体发生变化刷新浏览器,需要分开写，因为目录不一样
  watch([
    config.build.paths.images,
    config.build.paths.fonts
  ], { cwd: config.build.src }, bs.reload)
  watch(['**'], { cwd: config.build.public }, bs.reload)

  bs.init({
    notify: false,
    port: 4090,
    // files: 'dist/**',//当不使用这个监听方式时，需要在对应的任务的pipe里加上.pipe(bs.reload({ stream: true })),如上的style和js，html
    server: {
      // 开发环境可以匹配"src", "public"下的字体或者图片
      baseDir: [config.build.temp, config.build.src, config.build.public],
      routes: {
        // 优先级最高
        '/node_modules': 'node_modules'
      }
    }
  })
}

const compile = parallel(style, script, page)
// 转义-》搬运和压缩图片和字体-》压缩html、js、css
const build = series(
  clean,
  parallel(
    series(compile, useref),
    image,
    font,
    extra
  ))
// dev环境不做图片和字体等的搬运和压缩，只进行转换(js、scss等)
const develop = series(compile, server)

module.exports = {
  clean,
  build,
  develop
}
