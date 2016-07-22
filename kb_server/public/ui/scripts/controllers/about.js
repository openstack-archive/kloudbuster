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

angular.module("kbWebApp").controller("AboutCtrl", function($scope, $http, $location, kbHttp, kbCookie, locationChange) {
    this.awesomeThings = [ "HTML5 Boilerplate", "AngularJS", "Karma" ], $(window).on("hashchange", locationChange.change()), 
    kbHttp.getMethod("/kloudbuster/version").then(function(response) {
        $scope.version = response.data;
    }, function(response) {
        console.log("get version error:"), console.log(response);
    });
}).service("locationChange", function() {
    function activeNav(toShow) {
        $("#" + toShow).addClass("active");
    }
    function removeAllNav() {
        $("#scaletestnav").removeClass("active"), $("#interactivenav").removeClass("active"), 
        $("#monitoringnav").removeClass("active"), $("#confignav").removeClass("active"), 
        $("#lognav").removeClass("active"), $("#loginnav").removeClass("active"), $("#aboutnav").removeClass("active"), 
        $("#storageconfignav").removeClass("active"), $("#storagemodenav").removeClass("active");
    }
    var loc;
    this.change = function() {
        switch (loc = $(location).attr("hash"), removeAllNav(), $("#scaletestname").text("Scale/Performance"), 
        $("#loginname").text("Log Out"), loc) {
          case "#/InteractiveMode":
            activeNav("scaletestnav"), activeNav("interactivenav"), $("#scaletestname").text("Interactive Mode");
            break;

          case "#/MonitoringMode":
            activeNav("scaletestnav"), activeNav("monitoringnav"), $("#scaletestname").text("Monitoring Mode");
            break;

          case "#/Config":
            activeNav("confignav");
            break;

          case "#/Log":
            activeNav("lognav");
            break;

          case "#/Login":
            activeNav("loginnav"), $("#loginname").text("Log In");
            break;

          case "#/About":
            activeNav("aboutnav");
            break;

          case "#/StorageConfig":
            activeNav("storageconfignav");
            break;

          case "#/StorageMode":
            activeNav("storagemodenav");
        }
    };
}).service("kbHttp", function($http, $q) {
    var backendUrl = $(location).attr("protocol") + "//" + $(location).attr("host") + "/api";
    this.getMethod = function(url) {
        var deferred = $q.defer();
        return $http.get(backendUrl + url).then(function(data) {
            deferred.resolve(data);
        }, function(data) {
            deferred.reject(data);
        }), deferred.promise;
    }, this.getMethod2 = function(url) {
        var deferred = $q.defer();
        return $http.get(backendUrl + url, {
            ignoreLoadingBar: !0
        }).then(function(data) {
            deferred.resolve(data);
        }, function(data) {
            deferred.reject(data);
        }), deferred.promise;
    }, this.putMethod = function(url, arg) {
        var deferred = $q.defer();
        return $http.defaults.headers.put["Content-Type"] = "application/x-www-form-urlencoded;charset=utf-8", 
        $http.put(backendUrl + url, "arg=" + encodeURIComponent(angular.toJson(arg))).then(function(data) {
            deferred.resolve(data);
        }, function(data) {
            deferred.reject(data);
        }), deferred.promise;
    }, this.postMethod = function(url, arg) {
        var deferred = $q.defer();
        return arg ? ($http.defaults.headers.post["Content-Type"] = "application/x-www-form-urlencoded;charset=utf-8", 
        $http.post(backendUrl + url, "arg=" + encodeURIComponent(angular.toJson(arg))).then(function(data) {
            deferred.resolve(data);
        }, function(data) {
            deferred.reject(data);
        }), deferred.promise) : ($http.post(backendUrl + url).then(function(data) {
            deferred.resolve(data);
        }, function(data) {
            deferred.reject(data);
        }), deferred.promise);
    }, this.delMethod = function(url) {
        var deferred = $q.defer();
        return $http["delete"](backendUrl + url).then(function(data) {
            deferred.resolve(data);
        }, function(data) {
            deferred.reject(data);
        }), deferred.promise;
    };
}).service("kbCookie", function($location) {
    this.init = function() {
        sessionID = "", status = "", config = "", credentials = "", topology = "", logOffset = 0, 
        isOneCloud = "", topology = "", logOffset = 0, logNum = 0, mode = "";
    };
    var sessionID = "";
    this.getSessionID = function() {
        return sessionID;
    }, this.setSessionID = function(session) {
        return sessionID = session;
    };
    var mode = "";
    this.getMode = function() {
        return mode;
    }, this.setMode = function(sto) {
        return mode = sto;
    }, this.checkMode = function(thisPage) {
        "login" == thisPage ? ($(".forHttp").hide(), $(".forStorage").show()) : "storage" == mode ? ($(".forHttp").hide(), 
        $(".forStorage").show(), mode != thisPage && $location.path("/StorageMode")) : "http" == mode ? ($(".forStorage").hide(), 
        $(".forHttp").show(), mode != thisPage && $location.path("/InteractiveMode")) : $location.path("/Login");
    };
    var status = "";
    this.getStatus = function() {
        return status;
    }, this.setStatus = function(sta) {
        return status = sta;
    };
    var config = "";
    this.getConfig = function() {
        return config;
    }, this.setConfig = function(con) {
        return config = con;
    };
    var credentials = "";
    this.getCredentials = function() {
        return credentials;
    }, this.setCredentials = function(cred) {
        return credentials = cred;
    };
    var isOneCloud = "";
    this.getIsOneCloud = function() {
        return isOneCloud;
    }, this.setIsOneCloud = function(one) {
        return isOneCloud = one;
    };
    var topology = "";
    this.getTopology = function() {
        return topology;
    }, this.setTopology = function(top) {
        return topology = top;
    };
    var logOffset = 0;
    this.getLogOffset = function() {
        return logOffset;
    }, this.setLogOffset = function(offset) {
        return logOffset = offset;
    };
    var logNum = 0;
    this.getLogNum = function() {
        return logNum;
    }, this.setLogNum = function(lognumber) {
        return logNum = lognumber;
    };
}).service("showAlert", function($mdDialog, $q) {
    this.showAlert = function(words, ev) {
        var alert = $mdDialog.alert({
            title: "Attention",
            content: words,
            ok: "Close"
        });
        $mdDialog.show(alert)["finally"](function() {
            alert = void 0;
        });
    }, this.showPrompt = function($scope, $event) {
        var deferred = $q.defer(), parentEl = angular.element(document.body);
        return $mdDialog.show({
            parent: parentEl,
            targetEvent: $event,
            template: '<md-dialog aria-label="List dialog">  <md-dialog-content class="md-dialog-content" role="document" tabIndex="-1">    <h2 class="md-title">Configuration Import</h2>    <div class="md-dialog-content-body">      <p>Paste Json Format Configuration Below:</p>    </div>    <md-input-container md-no-float class="md-prompt-input-container">      <textarea ng-model="dialog.result" md-maxlength="" rows="5" md-select-on-focus="" placeholder="..."></textarea>    </md-input-container>  </md-dialog-content>  <md-dialog-actions">    <md-button ng-click="cancel()" class="md-primary">      Cancel    </md-button>    <md-button ng-click="answer()" class="md-primary" style="float:right;">      Submit    </md-button>  </md-dialog-actions></md-dialog>',
            controller: function($scope, $mdDialog, kbCookie) {
                $scope.cancel = function() {
                    $mdDialog.cancel(), deferred.reject();
                }, $scope.answer = function() {
                    kbCookie.setConfig(angular.fromJson($scope.dialog.result)), $mdDialog.hide(), deferred.resolve();
                };
            }
        }), deferred.promise;
    };
});