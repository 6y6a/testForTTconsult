'use strict';

var gulp           = require('gulp');
var gulpIf         = require('gulp-if');
var debug          = require('gulp-debug');
var del            = require('del');
var pngquant       = require('imagemin-pngquant');
var notify         = require('gulp-notify');
var postcss        = require('gulp-postcss');
var sass           = require('gulp-sass');
var concat         = require('gulp-concat');
var cleanCss       = require('gulp-clean-css');
var imagemin       = require('gulp-imagemin');
var uglify         = require('gulp-uglify');
var spritesmith    = require('gulp.spritesmith');
var sourcemap      = require('gulp-sourcemaps');
var newer          = require('gulp-newer');
var autoprefixer   = require('autoprefixer');
var browserSync    = require('browser-sync');
var fs             = require('fs');
var rename         = require('gulp-rename');
var size           = require('gulp-size');
var gulpSequence   = require('gulp-sequence');
var ghPages        = require('gulp-gh-pages');


// Запуск `NODE_ENV=production npm start [задача]` приведет к сборке без sourcemaps
const isDev = !process.env.NODE_ENV || process.env.NODE_ENV == 'dev';

// Файлы компилируемых компонентов
var blocks = getComponentsFiles();


// Компиляция SCSS
gulp.task('make:scss', function () {
    console.log('---------- Компиляция SCSS');
    return gulp.src('./src/scss/main.scss')
      .pipe(gulpIf(isDev, sourcemap.init()))
      .pipe(debug({title: "SCSS:"}))
      .pipe(sass())
      .on('error', notify.onError(function(err){
          return {
              title: 'Ошибка при компиляции стилей',
              message: err.message
          }
      }))
      .pipe(postcss([
          autoprefixer({browsers: ['last 2 version', 'ie 9-11']})
      ]))
      .pipe(gulpIf(!isDev, cleanCss()))
      .pipe(rename('style.min.css'))
      .pipe(debug({title: "RENAME:"}))
      .pipe(gulpIf(isDev, sourcemap.write()))
      .pipe(size({
          title: 'Размер',
          showFiles: true,
          showTotal: false
      }))
      .pipe(gulp.dest('./build/css'))
      .pipe(browserSync.stream());
});

// Копирование добавочных CSS, которые хочется иметь отдельными файлами
gulp.task('copy:css', function(callback) {
    if(blocks.additionalCss.length > 0) {
        console.log('---------- Копирование CSS');
        return gulp.src(blocks.additionalCss)
          .pipe(postcss([
              autoprefixer({browsers: ['last 2 version', 'ie 9-11']})
          ]))
          .pipe(cleanCss())
          .pipe(gulp.dest('./build/css'));
    }
    else {
        console.log('---------- Копирование CSS: нет дополнительного CSS');
        callback();
    }
});

// Копирование и оптимизация изображений
gulp.task('img', function () {
    console.log('---------- Копирование и оптимизация картинок');
    return gulp.src(blocks.img)
      .pipe(newer('./build/img'))  // оставить в потоке только изменившиеся файлы
      .pipe(imagemin({
          progressive: true,
          svgoPlugins: [{removeViewBox: false}],
          use: [pngquant()]
      }))
      .pipe(gulp.dest('./build/img'));
});


// Сборка PNG-спрайта для блока sprite-png
gulp.task('png', function (callback) {
    var spritePath = './src/blocks/sprite-png/png/';
    if(fileExist(spritePath) !== false) {
        console.log('---------- Сборка PNG спрайта');
        var sprite = gulp.src(spritePath + '*.png')
          .pipe(imagemin({
              use: [pngquant()]
          }))
          .pipe(spritesmith({
              imgName: 'sprite-png.png',
              cssName: 'sprite-png.css',
              padding: 5,
              cssOpts: {
                  cssSelector: function(sprite) { return '.sprite-png--' + sprite.name}}
          }));

        var img = sprite.img
          .pipe(gulp.dest('./src/blocks/sprite-png/img'))
          .pipe(size({
              title: 'Размер',
              showFiles: true,
              showTotal: false
          }));

        var scss = sprite.css
          .pipe(rename('sprite-png.scss'))
          .pipe(gulp.dest('./src/blocks/sprite-png'))
          .pipe(size({
              title: 'Размер',
              showFiles: true,
              showTotal: false
          }));
        return merge(img, scss);
    }
    else {
        console.log('---------- Сборка PNG спрайта: нет папки с картинками');
        callback();
    }
});

// Конкатенация и углификация Javascript
gulp.task('js', function (callback) {
    if(blocks.js.length > 0){
        console.log('---------- Обработка JS');
        return gulp.src(blocks.js)
          .pipe(gulpIf(isDev, sourcemap.init()))
          .pipe(concat('script.min.js'))
          .pipe(gulpIf(!isDev, uglify()))
          .on('error', notify.onError(function(err){
              return {
                  title: 'Ошибка при сжатии JS',
                  message: err.message
              }
          }))
          .pipe(gulpIf(isDev, sourcemap.write('.')))
          .pipe(size({
              title: 'Размер',
              showFiles: true,
              showTotal: false
          }))
          .pipe(gulp.dest('./build/js'));
    }
    else {
        console.log('---------- Обработка JS: в сборке нет JS-файлов');
        callback();
    }
});

// Сборка HTML
gulp.task('html', function() {
    console.log('----------Cборка HTML');
    return gulp.src('./src/*.html')
      .pipe(gulp.dest('./build/'));
});


// Очистка папки сборки
gulp.task('clean', function () {
    console.log('---------- Очистка папки сборки');
    return del([
         './build/**'
    ]);
});


// Сборка всего
gulp.task('build', gulpSequence('clean', ['make:scss', 'copy:css', 'img', 'js', 'html']));


// Локальный сервер, слежение
gulp.task('server', ['build'], function() {
    browserSync.init({
        server: './build',
        port: 3000,
        browser: 'chrome',
        startPath: 'index.html'
    });
    gulp.watch( './src/*.html',
      function (event) {
          gulpSequence('html',  browserSync.reload)(function (err) {
              if (err) console.log(err)
          })
      });
    gulp.watch(blocks.scss, function (event) {
      gulpSequence('make:scss',  browserSync.reload)(function (err) {
        if (err) console.log(err)
      })
    });
    gulp.watch(blocks.img, function (event) {
      gulpSequence('img',  browserSync.reload)(function (err) {
        if (err) console.log(err)
      })
    });
    gulp.watch(blocks.js, function (event) {
      gulpSequence('js',  browserSync.reload)(function (err) {
        if (err) console.log(err)
      })
    });
});


// Отправка в GH pages (ветку gh-pages репозитория)
gulp.task('deploy', function() {
  console.log('---------- Публикация ./build/ на GH pages');
  return gulp.src('./build/**/*')
    .pipe(ghPages());
});


// Задача по умолчанию
gulp.task('default', ['server']);


// Определение собираемых компонентов
function getComponentsFiles() {
    // Создаем объект для служебных данных
    var сomponentsFilesList = {
        scss: [],          // тут будут SCSS-файлы в том же порядке, в котором они подключены
        js: [],            // тут будут JS-файлы в том же порядке, в котором подключены SCSS-файлы
        img: [],           // тут будет массив из «путь_до_блока/img/*.{jpg,jpeg,gif,png,svg}» для всех импортируемых блоков
        additionalCss: []  // тут будет дополнительный Css
    };

    // Читаем файл с подключенными стилями
    var mainStyleScss = fs.readFileSync('./src/scss/main.scss', 'utf8');

    // Делаем массив и фильтруем, удаляя коментарии
    var clearStyleSсss = mainStyleScss.split('\n').filter(function (str) {
        return (/^(\s*)@import/.test(str))
    });


    clearStyleSсss.forEach(function(item) {
        // Попробуем вычленить блок из строки импорта
        var componentData = /\/blocks\/(.+?)(\/)(.+?)(?=.(scss|css))/g.exec(item);

        if (componentData !== null && componentData[3]) {
            // Название блока (название папки)
            var blockFolder = componentData[1];

            // Папка блока
            var blockDir = './src/blocks/' + blockFolder;

            // Имя подключаемого файла без расширения
            var blockFile = componentData[3];

            // Имя JS-файла, который нужно взять в сборку, если он существует
            var jsFile = blockDir + '/' + blockFile + '.js';

            // Папка с картинками, которую нужно взять в обработку, если она существует
            var imagesDir = blockDir + '/img';

            // Добавляем в массив с результатом SCSS-файл
            сomponentsFilesList.scss.push('./src' + componentData[0] + '.' + componentData[4]);

            // Если существует JS-файл — добавляем его в массив с результатом
            if(fileExistAndHasContent(jsFile)) {
                сomponentsFilesList.js.push(jsFile);
            }
            // Если есть папка с изображениями, добавляем её в массив с результатом
            if(fileExist(imagesDir) !== false) {
                сomponentsFilesList.img.push(imagesDir + '/*.{jpg,jpeg,gif,png,svg}');
            }
        }
    });

    // Добавим глобальныe SCSS-файлы в массив с обрабатываемыми SCSS-файлами
    сomponentsFilesList.scss.push('./src/scss/**/*.scss');

    // Добавим глобальные JS-библиотеки
    сomponentsFilesList.js.unshift('./src/js/*.js');

    // Добавим глобальные CSS-файлы
    сomponentsFilesList.additionalCss.push('./src/css/**/*.css');

    // Добавим глобальные изображения
    сomponentsFilesList.img.unshift('./src/img/*.{jpg,jpeg,gif,png,svg}');
    сomponentsFilesList.img = uniqueArray(сomponentsFilesList.img);

    return сomponentsFilesList;
}


// Проверка существования файла и его размера (размер менее 2байт == файла нет)
function fileExistAndHasContent(path) {
    const fs = require('fs');
    try {
        fs.statSync(path);
        if(fs.statSync(path).size > 1) return true;
        else return false;
    } catch(err) {
        return !(err && err.code === 'ENOENT');
    }
}

// Проверка существования файла
function fileExist(path) {
    const fs = require('fs');
    try {
        fs.statSync(path);
    } catch(err) {
        return !(err && err.code === 'ENOENT');
    }
}

// Оставить в массиве только уникальные значения (убрать повторы)
function uniqueArray(arr) {
    var objectTemp = {};
    for (var i = 0; i < arr.length; i++) {
        var str = arr[i];
        objectTemp[str] = true; // запомнить строку в виде свойства объекта
    }
    return Object.keys(objectTemp);
}