'use strict';

/**
 * @ngdoc overview
 * @name kbWebApp
 * @description
 * # kbWebApp
 *
 * Main module of the application.
 */
angular
  .module('kbWebApp', [
    'ngAnimate',
    'ngCookies',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'ngTable',

    'ui.bootstrap',
    'angular-loading-bar',
    'n3-line-chart'
  ])
  .config(function ($routeProvider) {
    $routeProvider
      //.when('/', {
      //  templateUrl: 'views/main.html',
      //  controller: 'MainCtrl',
      //  controllerAs: 'main'
      //})
      .when('/About', {
        templateUrl: 'views/about.html',
        controller: 'AboutCtrl',
        controllerAs: 'about'
      })
      .when('/Config', {
        templateUrl: 'views/config.html',
        controller: 'ConfigCtrl',
        controllerAs: 'config'
      })
      .when('/ScaleTest', {
        templateUrl: 'views/run.html',
        controller: 'RunCtrl',
        controllerAs: 'run'
      })
      .when('/IntervalReport', {
        templateUrl: 'views/interval.html',
        controller: 'IntervalCtrl',
        controllerAs: 'interval'
      })
      .when('/Log', {
        templateUrl: 'views/log.html',
        controller: 'LogCtrl',
        controllerAs: 'log'
      })
      .when('/Login', {
        templateUrl: 'views/login.html',
        controller: 'LoginCtrl',
        controllerAs: 'login'
      })
      .otherwise({
        redirectTo: '/ScaleTest'
      });
  })
  .config(['cfpLoadingBarProvider', function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.latencyThreshold = 1;
  }]);

