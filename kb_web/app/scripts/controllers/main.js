// Copyright 2015 Cisco Systems, Inc.  All rights reserved.
//
//    Licensed under the Apache License, Version 2.0 (the "License"); you may
//    not use this file except in compliance with the License. You may obtain
//    a copy of the License at
//
//         http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
//    WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
//    License for the specific language governing permissions and limitations
//    under the License.
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
