//Copyright 2015 Cisco Systems, Inc. All rights reserved.
//
//  Licensed under the Apache License, Version 2.0 (the "License"); you may
//not use this file except in compliance with the License. You may obtain
//a copy of the License at
//
//http://www.apache.org/licenses/LICENSE-2.0
//
//  Unless required by applicable law or agreed to in writing, software
//distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
//WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
//License for the specific language governing permissions and limitations
//under the License.

/**
 * Created by xiyu3 on 9/8/15.
 */

'use strict';


angular.module('kbWebApp')
  .controller('LogCtrl', function ($scope, $compile, $http, $location, kbHttp, kbCookie, locationChange) {
    this.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];

    if(kbCookie.getSessionID()==="") $location.path('/Login');
    //---------------------------------top navigation bar---------------------------------
    $(window).on('hashchange', locationChange.change());

    String.prototype.replaceAll = function(s1,s2){
      return this.replace(new RegExp(s1,"gm"),s2);
    };

    $scope.sessionID=kbCookie.getSessionID();
    $scope.status=kbCookie.getStatus();

    $scope.logs="";
    //kbCookie.getLogOffset();

    $scope.logOffset=0;

    $scope.delLog = function() {
      kbCookie.setLogOffset($scope.logOffset);
      $("#cc").empty();

      $scope.getLog();
    };


    //---------------------------------get LOG---------------------------------
    $scope.getLog = function() {
      if ($scope.sessionID) {

        kbHttp.getMethod("/kloudbuster/log/" + $scope.sessionID + "?offset="+ kbCookie.getLogOffset())
          .then(
          function (response) {  // .resolve
            //console.log(response);

            response.data = response.data.substring(1,response.data.length-1);
            //console.log(response.data);

            $scope.logOffset=kbCookie.getLogOffset() + response.data.length -1;
            //$scope.logOffset=1529;
            //console.log(response.data.length, kbCookie.getLogOffset(),$scope.logOffset);

            $scope.logs = response.data.split("\\n");

            $("#cc").empty();

            for(var row in $scope.logs)
            {
              $scope.logs[row]=$scope.logs[row].replace(/ /g, "&nbsp;");
              $("#cc").append($scope.logs[row]+"<br/>");
              //console.log($scope.logs[row]);
            }

            //$scope.logs[0]= $scope.logs[0].replace(/"/,"");
            //$scope.logs.pop();
          },
          function (response) {  // .reject
            console.log("get Log error:");
            console.log(response);
          }
        );
      }
      else{ console.log("not connected "+ $scope.status +","+ $scope.sessionID)}
    };
    $scope.getLog();
  });
