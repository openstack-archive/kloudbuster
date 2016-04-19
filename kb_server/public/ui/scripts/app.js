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

angular.module("kbWebApp", [ "ngAnimate", "ngCookies", "ngResource", "ngRoute", "ngSanitize", "ngTouch", "ngTable", "ngMessages", "ngMaterial", "ui.bootstrap", "angular-loading-bar", "n3-line-chart" ]).config(function($routeProvider) {
    $routeProvider.when("/About", {
        templateUrl: "views/about.html",
        controller: "AboutCtrl",
        controllerAs: "about"
    }).when("/Config", {
        templateUrl: "views/config.html",
        controller: "ConfigCtrl",
        controllerAs: "config"
    }).when("/InteractiveMode", {
        templateUrl: "views/run.html",
        controller: "RunCtrl",
        controllerAs: "run"
    }).when("/MonitoringMode", {
        templateUrl: "views/interval.html",
        controller: "IntervalCtrl",
        controllerAs: "interval"
    }).when("/Log", {
        templateUrl: "views/log.html",
        controller: "LogCtrl",
        controllerAs: "log"
    }).when("/Login", {
        templateUrl: "views/login.html",
        controller: "LoginCtrl",
        controllerAs: "login"
    }).when("/StorageConfig", {
        templateUrl: "views/config_storage.html",
        controller: "StorageConfigCtrl",
        controllerAs: "config_storage"
    }).when("/StorageMode", {
        templateUrl: "views/run_storage.html",
        controller: "RunStorageCtrl",
        controllerAs: "run_storage"
    }).otherwise({
        redirectTo: "/InteractiveMode"
    });
}).config([ "cfpLoadingBarProvider", function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.latencyThreshold = 1;
} ]);