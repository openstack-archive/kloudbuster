//Copyright 2015 Cisco Systems, Inc. All rights reserved.
//
//Licensed under the Apache License, Version 2.0 (the "License"); you may
//not use this file except in compliance with the License. You may obtain
//a copy of the License at
//
//http://www.apache.org/licenses/LICENSE-2.0
//
//Unless required by applicable law or agreed to in writing, software
//distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
//WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
//License for the specific language governing permissions and limitations
//under the License.

'use strict';

/**
 * @ngdoc function
 * @name kbWebApp.controller:AboutCtrl
 * @description
 * # AboutCtrl
 * Controller of the kbWebApp
 */
angular.module('kbWebApp')
  .controller('AboutCtrl', function ($scope, $http, $location, kbHttp, kbCookie, locationChange) {
    this.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];


    //---------------------------------top navigation bar---------------------------------
    $(window).on('hashchange', locationChange.change());


    //---------------------------------get version---------------------------------
    kbHttp.getMethod("/kloudbuster/version")
      .then(
      function (response) {  //  .resolve
        $scope.version = response.data;
      },
      function (response) {  //  .reject
        console.log("get version error:");
        console.log(response);
      }
    );

  })
  .service('locationChange', function () {
    var loc;
    this.change = function () {
      loc = $(location).attr('hash');

      removeAllNav();
      $("#scaletestname").text('Scale/Performance');
      $("#loginname").text('Log Out');

      switch (loc) {
        case "#/InteractiveMode":
          //alert("scaletest");
          activeNav("scaletestnav");
          activeNav("interactivenav");
          $("#scaletestname").text('Interactive Mode');
          break;
        case "#/MonitoringMode":
          //alert("interval");
          activeNav("scaletestnav");
          activeNav("monitoringnav");
          $("#scaletestname").text('Monitoring Mode');
          break;
        case "#/Config":
          //alert("config");
          activeNav("confignav");

          break;
        case "#/Log":
          //alert("log");
          activeNav("lognav");

          break;
        case "#/Login":
          //alert("login");
          activeNav("loginnav");
          $("#loginname").text('Log In');
          break;
        case "#/About":
          //alert("about");
          activeNav("aboutnav");
          break;
        default:
          break;
      }
    };

    function activeNav(toShow) {
      $("#" + toShow).addClass("active");
    }
    function removeAllNav() {
      $("#" + "scaletestnav").removeClass("active");
      $("#" + "interactivenav").removeClass("active");
      $("#" + "monitoringnav").removeClass("active");
      $("#" + "confignav").removeClass("active");
      $("#" + "lognav").removeClass("active");
      $("#" + "loginnav").removeClass("active");
      $("#" + "aboutnav").removeClass("active");
    }

  })
  .service('kbHttp', function ($http, $q) {
    var backendUrl = $(location).attr('protocol') +"//" + $(location).attr('host') + "/api";
    //var backendUrl = "http://127.0.0.1:8080/api";

    this.getMethod = function (url) {
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

    this.getMethod2 = function (url) {//not show the processing bar
      var deferred = $q.defer();
      $http.get(backendUrl + url, {
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

    this.putMethod = function (url, arg) {
      var deferred = $q.defer(); // declaration
      $http.defaults.headers.put['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
      $http.put(backendUrl + url, "arg=" + encodeURIComponent(JSON.stringify(arg)))
        .then(function (data) {
          deferred.resolve(data);  // success
        },
        function (data) {
          deferred.reject(data);   // error
        });
      return deferred.promise;   // return promise(API)
    };

    this.postMethod = function (url, arg) {
      var deferred = $q.defer(); // declaration
      if (arg) {
        $http.defaults.headers.post['Content-Type'] = 'application/x-www-form-urlencoded;charset=utf-8';
        $http.post(backendUrl + url, "arg=" + encodeURIComponent(JSON.stringify(arg)))
          .then(function (data) {
            deferred.resolve(data);  // success
          },
          function (data) {
            deferred.reject(data);   // error
          });
        return deferred.promise;   // return promise(API)
      }
      else {
        $http.post(backendUrl + url)
          .then(function (data) {
            deferred.resolve(data);  // success
          },
          function (data) {
            deferred.reject(data);   // error
          });
        return deferred.promise;   // return promise(API)

      }
    };

    this.delMethod = function (url) {
      var deferred = $q.defer(); // declaration
      $http.delete(backendUrl + url)
        .then(function (data) {
          deferred.resolve(data);  // success
        },
        function (data) {
          deferred.reject(data);   // error
        });
      return deferred.promise;   // return promise(API)
    };


  })
  .service('kbCookie', function () {
    //var self = this;
    this.init = function () {
      sessionID = "";
      status = "";
      config = "";
      credentials = "";
      topology = "";
      logOffset = 0;
      isOneCloud = "";
      topology = "";
      logOffset = 0;
      logNum=0;
    };

    var sessionID = "";

    this.getSessionID = function () {
      return sessionID;
    };
    this.setSessionID = function (session) {
      sessionID = session;
      return sessionID;
    };

    var status = "";
    this.getStatus = function () {
      return status;
    };
    this.setStatus = function (sta) {
      status = sta;
      return status;
    };

    var config = "";
    this.getConfig = function () {
      return config;
    };
    this.setConfig = function (con) {
      config = con;
      return config;
    };

    var credentials = "";
    this.getCredentials = function () {
      return credentials;
    };
    this.setCredentials = function (cred) {
      credentials = cred;
      return credentials;
    };

    var isOneCloud = "";
    this.getIsOneCloud = function () {
      return isOneCloud;
    };
    this.setIsOneCloud = function (one) {
      isOneCloud = one;
      return isOneCloud;
    };

    var topology = "";
    this.getTopology = function () {
      return topology;
    };
    this.setTopology = function (top) {
      topology = top;
      return topology;
    };

    var logOffset = 0;
    this.getLogOffset = function () {
      return logOffset;
    };
    this.setLogOffset = function (offset) {
      logOffset = offset;
      return logOffset;
    };

    var logNum = 0;
    this.getLogNum = function () {
      return logNum;
    };
    this.setLogNum = function (lognumber) {
      logNum = lognumber;
      return logNum;
    };

  })
  .service('showAlert', function($mdDialog) {
    this.showAlert = function (words, ev) {
      var alert = $mdDialog.alert({
        title: 'Attention',
        content: words,
        ok: 'Close'
      });
      $mdDialog
        .show(alert)
        .finally(function () {
          alert = undefined;
        });
    };

  });

