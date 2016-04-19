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

angular.module("kbWebApp").controller("LoginCtrl", function($scope, $http, $location, showAlert, $q, kbHttp, kbCookie, locationChange) {
    function readFile(evt) {
        var files = evt.target.files, file = files[0], reader = new FileReader();
        reader.onload = function() {
            test_rc = this.result;
        }, reader.readAsText(file);
    }
    function readFile2(evt) {
        var files = evt.target.files, file = files[0], reader = new FileReader();
        reader.onload = function() {
            test_rc2 = this.result;
        }, reader.readAsText(file);
    }
    if (this.awesomeThings = [ "HTML5 Boilerplate", "AngularJS", "Karma" ], kbCookie.checkMode("login"), 
    $(window).on("hashchange", locationChange.change()), function(e, t, n) {
        var r = e.querySelectorAll("html")[0];
        r.className = r.className.replace(/(^|\s)no-js(\s|$)/, "$1js$2");
    }(document, window, 0), function(document, window, index) {
        var inputs = document.querySelectorAll(".inputfile");
        Array.prototype.forEach.call(inputs, function(input) {
            var label = input.nextElementSibling, labelVal = label.innerHTML;
            input.addEventListener("change", function(e) {
                var fileName = "";
                fileName = e.target.value.split("\\").pop(), fileName ? label.querySelector("span").innerHTML = fileName : label.innerHTML = labelVal;
            }), input.addEventListener("focus", function() {
                input.classList.add("has-focus");
            }), input.addEventListener("blur", function() {
                input.classList.remove("has-focus");
            });
        });
    }(document, window, 0), $scope.deleteSession = function() {
        kbHttp.delMethod("/config/running_config/" + $scope.sessionID).then(function(response) {
            console.log("del sessionID");
        }, function(response) {});
    }, $scope.CleanUp = function() {
        var deferred = $q.defer();
        return "READY" != kbCookie.getStatus() && "CLEANING" != kbCookie.getStatus() ? (kbHttp.postMethod("/kloudbuster/cleanup/" + $scope.sessionID).then(function(response) {
            console.log("clean up successfully");
        }, function(response) {}), deferred.resolve(1)) : deferred.resolve(1), deferred.promise;
    }, "" != kbCookie.getSessionID()) {
        $scope.sessionID = kbCookie.getSessionID();
        var promise = $scope.CleanUp();
        promise.then(function() {
            $scope.deleteSession(), kbCookie.init();
        });
    }
    $scope.samecloud = !0, $scope.clouds = function() {
        $scope.samecloud === !0 ? ($("#inputPassword2").attr("disabled", !0), $("#file2").attr("disabled", !0), 
        $("#rcfile2").attr("disabled", !0)) : ($("#inputPassword2").attr("disabled", !1), 
        $("#file2").attr("disabled", !1), $("#rcfile2").attr("disabled", !1));
    };
    var test_rc;
    document.getElementById("file1").addEventListener("change", readFile, !1);
    var test_rc2;
    document.getElementById("file2").addEventListener("change", readFile2, !1), $("#inputPassword1").keydown(function(e) {
        var curKey = e.which;
        13 == curKey && $scope.setConfig();
    }), $("#inputPassword2").keydown(function(e) {
        var curKey = e.which;
        13 == curKey && $scope.setConfig();
    }), $scope.setConfig = function() {
        "storage" == $scope.mode ? (kbCookie.setIsOneCloud(!0), $scope.credentials = {
            "tested-passwd": $scope.inputPassword1,
            "tested-rc": test_rc
        }, $scope.storage_mode = !0) : ($scope.storage_mode = !1, $scope.samecloud === !0 ? (kbCookie.setIsOneCloud(!0), 
        $scope.credentials = {
            "tested-passwd": $scope.inputPassword1,
            "tested-rc": test_rc
        }) : (kbCookie.setIsOneCloud(!1), $scope.credentials = {
            "tested-passwd": $scope.inputPassword1,
            "tested-rc": test_rc,
            "testing-passwd": inputPassword2,
            "testing-rc": test_rc2
        })), $scope.runCon = {
            credentials: {},
            kb_cfg: "",
            storage_mode: $scope.storage_mode
        }, $scope.runCon.credentials = $scope.credentials, kbCookie.setCredentials($scope.credentials), 
        kbCookie.setMode($scope.mode), kbHttp.postMethod("/config/running_config", $scope.runCon).then(function(response) {
            kbCookie.setSessionID(response.data), $scope.sessionID = kbCookie.getSessionID(), 
            console.log("set config & get sesID:" + $scope.sessionID), "storage" == $scope.mode ? $location.path("/StorageMode") : $location.path("/InteractiveMode");
        }, function(response) {
            400 == response.status ? showAlert.showAlert("Error while parsing configurations! Please check your inputs!") : -1 == response.status && showAlert.showAlert("Error while connecting kloudbuster server!");
        });
    };
});