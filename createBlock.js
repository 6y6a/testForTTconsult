'use strict';
// Подключаемые модули
var mkdir = require('mkdirp');
var fs = require('fs');


// Создаем блоки и записываем их в style.scss
// Использование: node createBlock.js [имя блока] [доп. расширения через пробел]

var blockName = process.argv[2];          // получим имя блока
var defaultExtensions = ['html', 'scss']; // расширения по умолчанию
var extensions = uniqueArray(defaultExtensions.concat(process.argv.slice(3)));  // добавим введенные при вызове расширения (если есть)

if (blockName) {

  // Директория в которой все хранится
  var dirPath = './src/blocks/' + blockName + '/';

  // Создание всех файлов
  mkdir(dirPath, function (error) {

    if(error) {
      console.error('Error: Не можем создать директорию')
    }
    else {
      console.log('Info: Создана директория ' + dirPath);

      // Читаем файл с подключенными стилями
      var mainStyleScss = fs.readFileSync('./src/scss/main.scss', 'utf8');

      // Делаем массив и фильтруем, удаляя коментарии
      var clearStyleSсss = mainStyleScss.split('\n').filter(function (str) {
        return (/^(\s*)@import/.test(str))
      });

      extensions.forEach(function (ext) {

        var filePath = dirPath + blockName + '.' + ext; // полный путь к создаваемому файлу
        var fileContent = '';                           // будущий контент файла
        var styleImport = '';                           // стили в main.scss

        switch (ext) {
          case 'html': {
            fileContent = '<div class="' + blockName + '">content</div>';
            break;
          }
          case 'js': {
            fileContent = '(function(){\n// Мой код\n}());\n';
            break;
          }
          case 'scss': {
            styleImport = '@import \'./src/blocks/' + blockName + '/' + blockName + '.scss\';';
            fileContent = '@import \'../../scss/basic/variables\';\n' ;

            // Создаем регулярку с импортом
            var reg = new RegExp(styleImport, '');

            // Если в стилях main.scss нет записи про блок, допишем его
            if (!reg.test(clearStyleSсss.join(' '))) {

              fs.open('./src/scss/main.scss', 'a', function (err, fileHandle) {
                if (!err) {
                  fs.write(fileHandle, styleImport + '\n', null, 'utf8', function (err, written) {
                    if (!err) {
                      console.log('Info: В стили ./src/scss/main.scss записано: ' + styleImport);
                    } else {
                      console.error('Error: Отказ записи в ./src/scss/main.scss: ' + err);
                    }
                  });
                } else {
                  console.error('Error: Файл не открылся .src/scss/main.scss: ' + err);
                }
              });
            }
            else {
              console.log('Info: Импорт уже есть в ./src/scss/main.scss');
            }
          }
        }

        // Создаем файл, если он еще не существует
        if (fileExist(filePath) === false) {
          fs.writeFile(filePath, fileContent, function (err) {
            if (err) {
              return console.error('Error: Файл НЕ создан: ' + err);
            }
            console.log('Info: Файл создан: ' + filePath);
          });
        } else {
          console.log('Info: Файл уже существует: ' + filePath);
        }
      })
    }
  })
}
else {
  console.error('Error: Не указан имя блока');
}


// Оставить в массиве только уникальные значения (убрать повторы)
function uniqueArray(arr) {
  var objectTemp = {};
  for (var i = 0; i < arr.length; i++) {
    var str = arr[i];
    objectTemp[str] = true;
  }
  return Object.keys(objectTemp);
}

// Проверка существования файла
function fileExist(path) {
  try {
    fs.statSync(path);
  } catch (err) {
    return !(err && err.code === 'ENOENT');
  }
}

