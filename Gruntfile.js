'use strict';

module.exports = function (grunt) {
  require('load-grunt-tasks')(grunt);

  require('time-grunt')(grunt);

  grunt.initConfig({
    jshint: {
      options: {
        reporter: require('jshint-stylish')
      },
      all: ['Gruntfile.js', 'src/**/*.js', 'bin/**/*.js']
    }
  });

  grunt.registerTask('test', [
    'jshint'
  ]);

  grunt.registerTask('default', function() {
    grunt.task.run(['test']);
  });
};