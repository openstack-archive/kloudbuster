'use strict';

/**
 * @ngdoc function
 * @name kbWebApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the kbWebApp
 */
angular.module('kbWebApp')
  .controller('AboutCtrl', function ($scope,$http,$location,kbHttp,kbCookie) {
    this.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
    //---------------------------------get version---------------------------------
    kbHttp.getMethod("/kloudbuster/version")
      .then(
      function(response) {  //  .resolve
        $scope.version =response.data;
      },
      function(response) {  //  .reject
        console.log("get version error:");
        console.log(response);
      }
    );

  })
  .service('kbHttp', function($http,$q) {
    var backendUrl = "http://127.0.0.1:8080/api";

    this.getMethod = function(url) {
      var deferred = $q.defer(); // declaration
      $http.get(backendUrl + url)
        .then(function (data) {
          deferred.resolve(data);  // success
        },
        function (data) {
          deferred.reject(data);   //error
        });
      return deferred.promise;   // return promise(API)
    };

    this.getMethod2 = function(url) {//not show the processing bar
      var deferred = $q.defer();
      $http.get(backendUrl + url,{
        ignoreLoadingBar: true
      })
        .then(function (data) {
          deferred.resolve(data);
        },
        function (data) {
          deferred.reject(data);
        });
      return deferred.promise;
    };

    this.putMethod = function(url, arg) {
      var deferred = $q.defer(); // 声明延后执行，表示要去监控后面的执行
      $http.defaults.headers.put['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
      $http.put(backendUrl + url, "arg=" +  encodeURIComponent(JSON.stringify(arg)))
        .then(function (data) {
          deferred.resolve(data);  // 声明执行成功，即http请求数据成功，可以返回数据了
        },
        function (data) {
          deferred.reject(data);   // 声明执行失败，即服务器返回错误
        });
      return deferred.promise;   // 返回承诺，这里并不是最终数据，而是访问最终数据的API
    };

    this.postMethod = function(url, arg) {
      var deferred = $q.defer(); // 声明延后执行，表示要去监控后面的执行
      if(arg) {
        $http.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
        $http.post(backendUrl + url, "arg=" + encodeURIComponent(JSON.stringify(arg)))
          .then(function (data) {
            deferred.resolve(data);  // 声明执行成功，即http请求数据成功，可以返回数据了
          },
          function (data) {
            deferred.reject(data);   // 声明执行失败，即服务器返回错误
          });
        return deferred.promise;   // 返回承诺，这里并不是最终数据，而是访问最终数据的API
      }
      else
      {
        $http.post(backendUrl + url)
          .then(function (data) {
            deferred.resolve(data);  // 声明执行成功，即http请求数据成功，可以返回数据了
          },
          function (data) {
            deferred.reject(data);   // 声明执行失败，即服务器返回错误
          });
        return deferred.promise;   // 返回承诺，这里并不是最终数据，而是访问最终数据的API

      }
    };

    this.delMethod = function(url) {
      var deferred = $q.defer(); // 声明延后执行，表示要去监控后面的执行
      $http.delete(backendUrl + url)
        .then(function (data) {
          deferred.resolve(data);  // 声明执行成功，即http请求数据成功，可以返回数据了
        },
        function (data) {
          deferred.reject(data);   // 声明执行失败，即服务器返回错误
        });
      return deferred.promise;   // 返回承诺，这里并不是最终数据，而是访问最终数据的API
    };


  })
  .service('kbCookie', function() {
    //var self = this;
    this.init = function(){
      sessionID = "";
      status = "";
      config = "";
      credentials = "";
      topology = "";
      logOffset = 0;
      isOneCloud="";
      topology = "";
      logOffset = 0;
    };

    var sessionID = "";
    this.getSessionID = function(){
      return sessionID;
    };
    this.setSessionID = function(session){
      sessionID = session;
      return sessionID;
    };

    var status = "";
    this.getStatus = function(){
      return status;
    };
    this.setStatus = function(sta){
      status = sta;
      return status;
    };

    var config = "";
    this.getConfig = function(){
      return config;
    };
    this.setConfig = function(con){
      config = con;
      return config;
    };

    var credentials = "";
    this.getCredentials = function(){
      return credentials;
    };
    this.setCredentials = function(cred){
      credentials = cred;
      return credentials;
    };

    var isOneCloud = "";
    this.getIsOneCloud = function(){
      return isOneCloud;
    };
    this.setIsOneCloud = function(one){
      isOneCloud = one;
      return isOneCloud;
    };

    var topology = "";
    this.getTopology = function(){
      return topology;
    };
    this.setTopology = function(top){
      topology = top;
      return topology;
    };

    var logOffset = 0;
    this.getLogOffset = function(){
      return logOffset;
    };
    this.setLogOffset = function(offset){
      logOffset = offset;
      return logOffset;
    };

  });

