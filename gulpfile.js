'use strict';

var gulp           = require('gulp');
var del            = require('del');
var less           = require('gulp-less');
var concat         = require('gulp-concat');
var cleanCss       = require('gulp-clean-css');
var imagemin       = require('gulp-imagemin');
var uglify         = require('gulp-uglify');
var sourcemap      = require('gulp-sourcemaps');
var autoprefixer   = require('gulp-autoprefixer');
var browserSync    = require('browser-sync');
var mainBowerFiles = require('main-bower-files');

// Move changed less theme into libs
gulp.task('make:bootstrap-theme', function(){
    return gulp.src('src/less/bootstrap-theme/**/*.less')
        .pipe(gulp.dest('src/libs/bootstrap/less'))
});

// Make all needed less -> css
gulp.task('make:less', ['make:bootstrap-theme'], function(){
    return gulp.src(Array.prototype.concat(mainBowerFiles('**/*.less'), ['src/less/**/main.less']))
        .pipe(sourcemap.init())
        .pipe(less())
        .pipe(autoprefixer({browser: ['last 25 versions', 'ie9']}))
        .pipe(sourcemap.write())
        .pipe(gulp.dest('src/css'))
        .pipe(browserSync.stream());
});

// Move all needed js to src/js
gulp.task('make:js', function(){
   return gulp.src(mainBowerFiles('**/*.js'))
       .pipe(gulp.dest('src/js'));
});

// Start browserSync as a server
gulp.task('server', ['make:less', 'make:js'], function(){

    browserSync({
        server: {
            baseDir: 'src'
        },
        browser: 'chrome'
    });

    gulp.watch('src/less/**/*.less', ['make:less']);
    gulp.watch('src/*.html', browserSync.reload);
    gulp.watch('src/js/**/*.js', browserSync.reload);
});

// Clean dist directory
gulp.task('clean', function(){
    del.sync('dist');
});

// Make production version
gulp.task('build', ['clean', 'make:less', 'make:js'], function(){
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
        .pipe(concat('modules.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('dist/js'));

    var buildHtml = gulp.src('src/*.html')
        .pipe(gulp.dest('dist'));
});