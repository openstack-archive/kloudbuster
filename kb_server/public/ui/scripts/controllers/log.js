/*
Copyright 2016 Cisco Systems, Inc. All rights reserved.

Licensed under the Apache License, Version 2.0 (the "License"); 
you may not use this file except in compliance with the License. 
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, 
software distributed under the License is distributed on an "AS IS"
 BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express 
or implied. See the License for the specific language governing 
permissions and limitations under the License.
*/

"use strict";

angular.module("kbWebApp").controller("LogCtrl", function($scope, $compile, $http, $location, kbHttp, kbCookie, locationChange) {
    this.awesomeThings = [ "HTML5 Boilerplate", "AngularJS", "Karma" ], "" === kbCookie.getSessionID() && $location.path("/Login"), 
    $(window).on("hashchange", locationChange.change()), String.prototype.replaceAll = function(s1, s2) {
        return this.replace(new RegExp(s1, "gm"), s2);
    }, $scope.sessionID = kbCookie.getSessionID(), $scope.status = kbCookie.getStatus(), 
    $scope.logs = "", $scope.logNum = kbCookie.getLogNum(), $scope.logOffset = 0, $scope.delLog = function() {
        kbCookie.setLogOffset($scope.logOffset), $("#cc").empty(), $scope.getLog();
    }, $scope.getLog = function() {
        $scope.sessionID ? (kbCookie.setLogNum($scope.logNum), kbHttp.getMethod("/kloudbuster/log/" + $scope.sessionID + "?offset=" + kbCookie.getLogOffset()).then(function(response) {
            response.data = response.data.substring(1, response.data.length - 1), $scope.logOffset = kbCookie.getLogOffset() + response.data.replace(/\\n/g, "a").length, 
            $scope.logs = response.data.split("\\n"), $("#cc").empty();
            var skipNum;
            skipNum = 0 == kbCookie.getLogNum() ? 0 : $scope.logs.length - kbCookie.getLogNum();
            for (var row in $scope.logs) skipNum > 0 ? skipNum-- : ($scope.logs[row] = $scope.logs[row].replace(/ /g, "&nbsp;"), 
            $("#cc").append($scope.logs[row] + "<br/>"));
        }, function(response) {
            console.log("get Log error:"), console.log(response);
        })) : console.log("not connected " + $scope.status + "," + $scope.sessionID);
    }, $scope.getLog();
});