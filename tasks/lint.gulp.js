'use strict';

module.exports = function (gulp, paths) {
    var eslint = require('gulp-eslint'),
        fs = require('fs'),
        xml = require('xmlbuilder'),
        util = require('gulp-util'),
        path = require('path'),
        scsslint = require('gulp-scss-lint'),
        tslint = require('gulp-tslint'),
        htmlLint = require('gulp-htmllint'),
        _ = require('lodash'),
        srcFiles = ['app/**/*.js', 'gulpfile.js', 'tasks/*.js', '!app/patch/**/*', '!app/lib/**/*', '!app/resources/**/*'],
        scssFiles = 'app/**/*.scss',
        tsFiles = 'app/**/*.ts',
        htmlFiles = 'app/**/*.html',
        target = 'target',
        tsReportFilename = path.join(target, 'ts-lint-result.xml'),
        htmlReportFilename = path.join(target, 'html-lint-result.xml'),
        scssReportFilename = path.join(target, 'scss-lint-result.xml'),
        javascriptReportFilename = path.join(target, 'es-lint-result.xml'),
        tsLintReportFile,
        htmlLintReportFile,
        scssLintReportFile,
        htmlReport,
        tsReport,
        scssReport,
        projectRoot = process.cwd(),
        reportIssues = function (filename, issues, report, msgProperty, lineProperty, columnProperty) {
            var fileElement;
            if (issues.length > 0) {
                fileElement = report.ele('file');
                issues.forEach(function (issue) {
                    var msg = _.get(issue, msgProperty),
                        line = _.get(issue, lineProperty),
                        column = _.get(issue, columnProperty);
                    util.log(filename + ": " + util.colors.red(msg) + " line " + line + " col. " + column);
                    fileElement.ele('error', {
                        'message': msg,
                        'line': line,
                        'severity': 'error'
                    });
                });
                fileElement.att('name', filename);
            }
        },
        reportTypeScriptIssues = function (issues, file) {
            reportIssues(file.path, issues, tsReport, 'failure', 'startPosition.line', 'startPosition.position');
        },
        reportHtmlIssues = function (filepath, issues) {
            reportIssues(filepath, issues, htmlReport, 'msg', 'line', 'column');
        },
        reportSassIssues = function (file) {
            reportIssues(file.path, file.scsslint.issues, scssReport, 'reason', 'line', 'column');
        },
        logMissingConfig = function (fileName) {
            util.log(util.colors.yellow('Warning: ') + 'the ' + fileName + ' file is missing, using defaults.');
        };

    gulp.task('lint', ['lint-js', 'lint-ts', 'lint-scss', 'lint-html']);

    function createDir(directoryName) {
        if (!fs.existsSync(directoryName)) {
            fs.mkdirSync(directoryName);
        }
    }

    function removeDir(directoryName) {
        if (fs.existsSync(directoryName)) {
            fs.unlinkSync(directoryName);
        }
    }

    gulp.task('lint-js', function () {
        var out;
        createDir(target);
        out = fs.createWriteStream(javascriptReportFilename);

        return gulp.src(srcFiles)
            .pipe(eslint())
            .pipe(eslint.format())
            .pipe(eslint.format('checkstyle', out))
            .pipe(eslint.failAfterError());
    });

    function getScssLinterConfig() {
        var configFile = path.join(projectRoot, paths.linters.scss),
            config = {
                customReport: reportSassIssues
            };

        if (fs.existsSync(configFile)) {
            config.config = JSON.stringify(configFile);
        } else {
            logMissingConfig(configFile);
        }

        return config;
    }

    gulp.task('lint-scss', function () {
        var stream,
            config = getScssLinterConfig();

        createDir(target);
        removeDir(scssReportFilename);
        scssLintReportFile = fs.createWriteStream(scssReportFilename);
        scssReport = xml.create('checkstyle');
        stream = gulp.src(scssFiles)
            .pipe(scsslint(config));

        stream.on('end', function () {
            scssLintReportFile.write(scssReport.doc().end({pretty: true}));
            scssLintReportFile.end();
        });

        return stream;
    });

    function getTsLinterConfig() {
        var configFile = path.join(projectRoot, paths.linters.ts),
            config = {};

        if (fs.existsSync(configFile)) {
            config.configuration = configFile;
        } else {
            logMissingConfig(configFile);
        }

        return config;
    }

    gulp.task('lint-ts', function () {
        var config = getTsLinterConfig();

        createDir(target);
        removeDir(tsReportFilename);
        tsLintReportFile = fs.createWriteStream(tsReportFilename);
        tsReport = xml.create('checkstyle');

        return gulp.src(tsFiles)
            .on('end', function () {
                tsLintReportFile.write(tsReport.doc().end({pretty: true}));
                tsLintReportFile.end();
            })
            .pipe(tslint(config))
            .pipe(tslint.report(reportTypeScriptIssues, {
                summarizeFailureOutput: true,
                emitError: false
            }));
    });

    function getHtmlLinterConfig() {
        var configFile = path.join(projectRoot, paths.linters.html),
            config = {
                failOnError: false
            };

        if (fs.existsSync(configFile)) {
            config.config = configFile;
        } else {
            logMissingConfig(configFile);
        }

        return config;
    }

    gulp.task('lint-html', function () {
        var config = getHtmlLinterConfig();

        createDir(target);
        removeDir(htmlReportFilename);
        htmlLintReportFile = fs.createWriteStream(htmlReportFilename);
        htmlReport = xml.create('checkstyle');

        return gulp.src(htmlFiles)
            .on('end', function () {
                htmlLintReportFile.write(htmlReport.doc().end({pretty: true}));
                htmlLintReportFile.end();
            })
            .pipe(htmlLint(config, reportHtmlIssues));
    });

    gulp.task('lint-html-index', function () {
        var config = getHtmlLinterConfig();

        return gulp.src(paths.src.index)
            .pipe(htmlLint(config));
    });
};
