var gulp = require('gulp');
var concat = require('gulp-concat');
var concat_util = require('gulp-concat-util');

gulp.task('html', function() {
    gulp.src(['./src/templates/**/*.htm'])
        .pipe(concat('templates.htm'))
        .pipe(concat_util.header('<div>\n'))
        .pipe(concat_util.footer('\n</div>'))
        .pipe(gulp.dest('./dist/html/'))
});

gulp.task('default', function() {
    gulp.run('html');

    gulp.watch('./src/templates/**/*.htm', function() {
        gulp.run('html');
    })
});