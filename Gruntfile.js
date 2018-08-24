module.exports = function(grunt) {

  grunt.initConfig({
    responsive_images: {
      dev: {
        options: {
          engine: 'im',
          sizes: [
            {
              width: 800,
              quality: 70
            },
            {
              width: 600,
              quality: 70
            },
            {
              width: 400,
              quality: 70
            },
            {
              width: 300,
              quality: 70
            },

          ]
        },

        files: [{
          expand: true,
          src: ['*.{gif,jpg,png}'],
          cwd: 'images/',
          dest: 'img/'
        }]
      }
    }
  });
  
  grunt.loadNpmTasks('grunt-responsive-images');
  grunt.registerTask('default', ['responsive_images']);

};
