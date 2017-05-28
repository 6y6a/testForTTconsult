'use strict';

var gulp           = require('gulp');
var del            = require('del');
var sass           = require('gulp-sass');
var concat         = require('gulp-concat');
var cleanCss       = require('gulp-clean-css');
var imagemin       = require('gulp-imagemin');
var uglify         = require('gulp-uglify');
var sourcemap      = require('gulp-sourcemaps');
var autoprefixer   = require('gulp-autoprefixer');
var browserSync    = require('browser-sync');


// Make all needed scss -> css
gulp.task('make:scss',  function(){
    return gulp.src('src/scss/main.scss')
      .pipe(sourcemap.init())
      .pipe(sass().on('error', sass.logError))
      .pipe(autoprefixer({browser: ['last 2 versions', 'ie11']}))
      .pipe(sourcemap.write())
      .pipe(gulp.dest('src/css'))
      .pipe(browserSync.stream());
});


// Start browserSync as a server
gulp.task('server', ['make:scss'], function(){

    browserSync({
        server: {
            baseDir: 'src'
        },
        browser: 'chrome'
    });

    gulp.watch('src/scss/main.scss', ['make:scss']);
    gulp.watch('src/*.html', browserSync.reload);
    gulp.watch('src/js/**/*.js', browserSync.reload);
});

// Clean dist directory
gulp.task('clean', function(){
    del.sync('dist');
});

// Make production version
gulp.task('build', ['clean', 'make:scss'], function(){
    var buildCss = gulp.src('src/css/**/*.css')
        .pipe(concat('style.css'))
        .pipe(cleanCss())
        .pipe(gulp.dest('dist/css'));

    var buildFonts = gulp.src('src/fonts/**/*')
        .pipe(gulp.dest('dist/fonts'));

    var buildImage = gulp.src('src/img/**/*')
        .pipe(imagemin({
            interlaced: true,
            progressive: true,
            svgoPlugins: [{removeViewBox: false}]
        }))
        .pipe(gulp.dest('dist/img'));

    var buildJS = gulp.src('src/js/**/*.js')
        .pipe(concat('scripts.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'));

    var buildHtml = gulp.src('src/*.html')
        .pipe(gulp.dest('dist'));
});