'use strict';

/**
 * @ngdoc function
 * @name kbWebApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the kbWebApp
 */
angular.module('kbWebApp')
  .controller('MainCtrl', function ($scope,$http,$location,kbHttp,kbCookie) {
    this.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
    //---------------------------------get version---------------------------------
    kbHttp.getMethod("/kloudbuster/version")
      .then(
      function(response) {  // .resolve
        $scope.version =response.data;
      },
      function(response) {  // .reject
        console.log("get version error:");
        console.log(response);
      }
    );
  });
