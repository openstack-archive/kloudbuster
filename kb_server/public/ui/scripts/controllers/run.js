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

angular.module("kbWebApp").controller("RunCtrl", function($scope, $timeout, $location, $http, $q, showAlert, ngTableParams, kbCookie, kbHttp, interactiveMode, color, locationChange) {
    function downloadFile(fileName, content) {
        var aLink = document.createElement("a"), blob = new Blob([ content ]), evt = document.createEvent("HTMLEvents");
        evt.initEvent("click", !1, !1), aLink.download = fileName, aLink.href = URL.createObjectURL(blob), 
        aLink.dispatchEvent(evt);
    }
    function to2(num) {
        return 10 > num ? "0" + num : 99 > num ? "" + num : -1;
    }
    this.awesomeThings = [ "HTML5 Boilerplate", "AngularJS", "Karma" ], "" === kbCookie.getSessionID() ? $location.path("/Login") : kbCookie.checkMode("http"), 
    $(window).on("hashchange", locationChange.change()), $("[data-toggle='.container']").click(function() {
        var toggle_el = $(this).data("toggle");
        $(toggle_el).toggleClass("open-sidebar"), $("#littleglyph").toggleClass("glyphicon-triangle-right"), 
        $("#littleglyph").toggleClass("glyphicon-triangle-left");
    }), $(".swipe-area").swipe({
        swipeStatus: function(event, phase, direction, distance, duration, fingers) {
            return "move" == phase && "right" == direction ? ($(".container").addClass("open-sidebar"), 
            !1) : "move" == phase && "left" == direction ? ($(".container").removeClass("open-sidebar"), 
            !1) : void 0;
        }
    }), $scope.oneAtATime = !0, $scope.status1 = {
        isFirstOpen: !0,
        isFirstDisabled: !1
    }, $scope.status2 = {
        isFirstOpen: !0,
        isFirstDisabled: !1
    }, $scope.status3 = {
        isFirstOpen: !0,
        isFirstDisabled: !1
    }, $scope.status1.open = !1, $scope.status2.open = !0, $scope.status3.open = !1, 
    $scope.alerts = [], $scope.closeAlert = function(index) {
        $scope.alerts.splice(index, 1);
    }, $scope.sessionID = kbCookie.getSessionID(), $scope.status = kbCookie.getStatus(), 
    $scope.config = kbCookie.getConfig(), $scope.getRunConfig = function() {
        kbHttp.getMethod("/config/running_config/" + $scope.sessionID).then(function(response) {
            $scope.config = response.data, kbCookie.setConfig(response.data), console.log("get & save config");
        }, function(response) {
            console.log("get running config error:"), console.log(response);
        });
    }, $scope.sessionID && !$scope.config && $scope.getRunConfig(), $scope.setConfig = function(ifRun) {
        var deferred = $q.defer();
        return "READY" === $scope.status ? (kbCookie.setConfig($scope.config), $scope.chaCon = {
            kb_cfg: {}
        }, $scope.chaCon.kb_cfg = kbCookie.getConfig(), kbHttp.putMethod("/config/running_config/" + $scope.sessionID, $scope.chaCon).then(function(response) {
            console.log("change running config"), deferred.resolve(1);
        }, function(response) {
            deferred.reject(0), 1 != ifRun && (400 == response.status ? showAlert.showAlert("Error while parsing configurations! Please check your inputs!") : 403 == response.status ? showAlert.showAlert("Cannot update configuration if KloudBuster is busy or in error state") : -1 == response.status && showAlert.showAlert("Error while connecting kloudbuster server!"));
        })) : "STAGED" === $scope.status ? ($scope.config.client.http_tool_configs.report_interval = 0, 
        kbCookie.setConfig($scope.config), $scope.chaCon = {
            kb_cfg: {
                client: {
                    http_tool_configs: {
                        duration: $scope.config.client.http_tool_configs.duration,
                        rate_limit: $scope.config.client.http_tool_configs.rate_limit,
                        connections: $scope.config.client.http_tool_configs.connections,
                        report_interval: 0
                    }
                }
            }
        }, kbHttp.putMethod("/config/running_config/" + $scope.sessionID, $scope.chaCon).then(function(response) {
            console.log("change running config"), deferred.resolve(1);
        }, function(response) {
            deferred.reject(0), 1 != ifRun && (400 == response.status ? showAlert.showAlert("Error while parsing configurations! Please check your inputs!") : 403 == response.status ? showAlert.showAlert("Cannot update configuration if KloudBuster is busy or in error state") : -1 == response.status && showAlert.showAlert("Error while connecting kloudbuster server!"));
        })) : (console.log("config not allow to change now!"), deferred.reject(0)), deferred.promise;
    };
    var disabledStagingConfig = !1, disabledRunningConfig = !1;
    $scope.disableConfig = function(disableId) {
        $("#" + disableId).find("input").each(function() {
            $(this).attr("disabled", "disabled");
        });
    }, $scope.enableConfig = function(enableId) {
        $("#" + enableId).find("input").each(function() {
            $(this).removeAttr("disabled");
        });
    }, $scope.configStatus = function() {
        "READY" === $scope.status ? (disabledStagingConfig === !0 && (disabledStagingConfig = !1, 
        $scope.enableConfig("stagingConfig"), $scope.enableConfig("stagingConfig1"), $("#client_progression_enabled").removeAttr("disabled")), 
        disabledRunningConfig === !0 && (disabledRunningConfig = !1, $scope.enableConfig("runningConfig"))) : "STAGED" === $scope.status ? (disabledStagingConfig === !1 && (disabledStagingConfig = !0, 
        $scope.disableConfig("stagingConfig"), $scope.disableConfig("stagingConfig1"), $("#client_progression_enabled").attr("disabled", "disabled")), 
        disabledRunningConfig === !0 && (disabledRunningConfig = !1, $scope.enableConfig("runningConfig"))) : (disabledStagingConfig === !1 && (disabledStagingConfig = !0, 
        $scope.disableConfig("stagingConfig"), $scope.disableConfig("stagingConfig1"), $("md-checkbox").attr("disabled", "disabled")), 
        disabledRunningConfig === !1 && (disabledRunningConfig = !0, $scope.disableConfig("runningConfig")));
    };
    var pointNumber = 0;
    $scope.pointNum = function() {
        var point = ".";
        pointNumber = (pointNumber + 1) % 6;
        for (var x = 0; pointNumber > x; x++) point += " .";
        return point;
    }, $scope.runButton = "Run Test", $scope.runStatus = !0, $scope.setStatus = !1, 
    $scope.stageButton = "Stage", $scope.setUnstage = !0, $scope.client_vm_count = 0, 
    $scope.server_vm_count = 0, $scope.statusButton = "btn-default", $scope.checkStatus = function() {
        $scope.sessionID ? kbHttp.getMethod2("/kloudbuster/status/" + $scope.sessionID).then(function(response) {
            $scope.status = response.data.status, kbCookie.setStatus($scope.status), $scope.configStatus(), 
            "READY" === $scope.status ? ($scope.runButton = "Run Test", $scope.runStatus = !0, 
            $scope.setStatus = !1, $scope.stageButton = "Stage", $scope.setUnstage = !1, $scope.client_vm_count = 0, 
            $scope.server_vm_count = 0, $(".loading").addClass("pause"), $scope.statusButton = "btn-success", 
            $scope.info = "") : "STAGING" === $scope.status ? ($scope.runButton = "Run Test", 
            $scope.runStatus = !0, $scope.setStatus = !0, $scope.stageButton = "Stage", $scope.setUnstage = !0, 
            $scope.client_vm_count = response.data.client_vm_count, $scope.server_vm_count = response.data.server_vm_count, 
            $(".loading").removeClass("pause"), $scope.statusButton = "btn-info", $scope.info = "KloudBuster is Creating VM(s)" + $scope.pointNum()) : "STAGED" === $scope.status ? ($scope.runButton = "Run Test", 
            $scope.runStatus = !1, $scope.setStatus = !1, $scope.stageButton = "Unstage", $scope.setUnstage = !1, 
            $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants, 
            $scope.server_vm_count = $scope.client_vm_count, $scope.getReport(), $(".loading").addClass("pause"), 
            $scope.statusButton = "btn-success", $scope.info = "") : "RUNNING" === $scope.status ? ($scope.runButton = "Stop Test", 
            $scope.runStatus = !1, $scope.setStatus = !0, $scope.stageButton = "Unstage", $scope.setUnstage = !0, 
            $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants, 
            $scope.server_vm_count = $scope.client_vm_count, $scope.config.client.progression.enabled === !0 && $scope.getReport(), 
            $(".loading").removeClass("pause"), $scope.statusButton = "btn-info", $scope.info = "KloudBuster is Running" + $scope.pointNum()) : "ERROR" === $scope.status ? ($scope.runButton = "Run Test", 
            $scope.runStatus = !0, $scope.setStatus = !0, $scope.stageButton = "Unstage", $scope.setUnstage = !1, 
            $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants, 
            $scope.server_vm_count = $scope.client_vm_count, $(".loading").addClass("pause"), 
            $scope.statusButton = "btn-danger", $scope.info = "") : "CLEANING" !== $scope.status && "STOPPING" !== $scope.status || ($scope.runButton = "Run Test", 
            $scope.runStatus = !0, $scope.setStatus = !0, $scope.stageButton = "Unstage", $scope.setUnstage = !0, 
            $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants, 
            $scope.server_vm_count = $scope.client_vm_count, $(".loading").removeClass("pause"), 
            $scope.statusButton = "btn-info", $scope.info = "Please Wait" + $scope.pointNum());
        }, function(response) {
            console.log("get status error:"), console.log(response);
        }) : ($scope.status = "NO SESSION ID", kbCookie.setStatus(""));
    }, $scope.checkStatus(), $scope.setStage = function() {
        kbHttp.postMethod("/kloudbuster/stage/" + $scope.sessionID).then(function(response) {}, function(response) {
            console.log("set stage error:"), console.log(response), showAlert.showAlert("Unable to stage resources!");
        });
    }, $scope.CleanUp = function() {
        $scope.initChart(), !$scope.sessionID || "ERROR" !== $scope.status && "STAGED" !== $scope.status ? console.log("Cannot cleanup!") : kbHttp.postMethod("/kloudbuster/cleanup/" + $scope.sessionID).then(function(response) {
            $scope.checkStatus();
        }, function(response) {
            console.log("clean error:"), console.log(response);
        });
    }, $scope.stage = function() {
        if ("ERROR" === $scope.status || "STAGED" === $scope.status) $scope.CleanUp(); else if ("READY" === $scope.status) {
            var promise = $scope.setConfig(1);
            promise.then(function() {
                $scope.setStage();
            });
        }
    }, $scope.runKb = function() {
        kbHttp.postMethod("/kloudbuster/run_test/" + $scope.sessionID).then(function(response) {}, function(response) {
            console.log("running error:"), console.log(response), showAlert.showAlert("Unable to start test!");
        });
    }, $scope.stopKb = function() {
        kbHttp.postMethod("/kloudbuster/stop_test/" + $scope.sessionID).then(function(response) {}, function(response) {
            console.log("stop error:"), console.log(response), showAlert.showAlert("Unable to stop test!");
        });
    }, $scope.scaleTest = function() {
        if ("RUNNING" === $scope.status) $scope.stopKb(); else if ("STAGED" === $scope.status) {
            var promise = $scope.setConfig(1);
            promise.then(function() {
                $scope.initChart(), $scope.runKb();
            });
        }
    }, $scope.tabledata = [], $scope.cols = [ {
        field: "seq",
        title: "SEQ",
        sortable: "seq",
        show: !0
    }, {
        field: "connection",
        title: "Connection",
        sortable: "connection",
        show: !0
    }, {
        field: "server_vms",
        title: "Server VMs",
        sortable: "server_vms",
        show: !0
    }, {
        field: "requests",
        title: "Requests",
        sortable: "requests",
        show: !0
    }, {
        field: "sock_err",
        title: "Error",
        sortable: "sock_err",
        show: !0
    }, {
        field: "rps",
        title: "RPS measured",
        sortable: "rps",
        show: !0
    }, {
        field: "rate_limit",
        title: "RPS requested",
        sortable: "rate_limit",
        show: !0
    }, {
        field: "throughput",
        title: "Throughput",
        sortable: "throughput",
        show: !0
    }, {
        field: "action",
        title: "Action",
        sortable: "action",
        show: !0
    } ], $scope.tableParams = new ngTableParams({
        sorting: {
            name: "asc"
        },
        count: 10
    }, {
        counts: [],
        data: $scope.tabledata
    }), $scope.options = {
        axes: {
            x: {
                key: "x",
                type: "linear",
                ticksFormatter: function(x) {
                    return 0 === x ? "50%" : 10 === x ? "75%" : 20 === x ? "90%" : 30 === x ? "99%" : 40 === x ? "99.9%" : 50 === x ? "99.99%" : 60 === x ? "99.999%" : void 0;
                }
            },
            y: {
                type: "log",
                ticksFormat: "d",
                innerTicks: !0,
                grid: !0
            }
        },
        tooltip: {
            mode: "scrubber",
            formatter: function(x, y, series) {
                return series.label + ":" + y;
            }
        },
        tension: .8,
        lineMode: "cardinal",
        series: [ {} ]
    }, $scope.initChart = function() {
        $scope.data = [ {
            x: 0
        }, {
            x: 10
        }, {
            x: 20
        }, {
            x: 30
        }, {
            x: 40
        }, {
            x: 50
        }, {
            x: 60
        } ], $scope.options.series = [ {} ], $scope.isDely = !1, $scope.tabledata.length = 0, 
        $scope.tableParams.reload(), $scope.isDely = !1, countRep = 0, color.reset();
    };
    var countRep = 0;
    $scope.initChart(), $scope.refreshChart = function() {
        $scope.data = [ {
            x: 0
        }, {
            x: 10
        }, {
            x: 20
        }, {
            x: 30
        }, {
            x: 40
        }, {
            x: 50
        }, {
            x: 60
        } ], $scope.options.series = [ {} ], $scope.isDely = !1, $scope.tabledata.length = 0, 
        $scope.tableParams.reload(), color.reset();
    }, $scope.getReport = function() {
        kbHttp.getMethod2("/kloudbuster/report/" + $scope.sessionID + "?final=true").then(function(response) {
            if (console.log("get report totally:" + response.data.kb_result.length), response.data.kb_result.length > 0 && countRep < response.data.kb_result.length) {
                countRep = response.data.kb_result.length, $scope.refreshChart(), interactiveMode.setResult(response.data);
                for (var i = 0; countRep > i; i++) {
                    $scope.result = response.data.kb_result[i];
                    var pickColor = color.getColor();
                    $scope.config.client.progression.enabled ? (console.log("show report" + $scope.name), 
                    $scope.pushChartData("Connection-" + $scope.result.total_connections, $scope.result, pickColor), 
                    $scope.pushTableData("Connection-" + $scope.result.total_connections, $scope.result, pickColor)) : (console.log("show report" + $scope.name), 
                    $scope.pushChartData("Final", $scope.result, pickColor), $scope.pushTableData("Final", $scope.result, pickColor));
                }
            }
        }, function(response) {
            console.log("get report error:"), console.log(response);
        });
    }, $scope.pushChartData = function(chName, chData, pickColor) {
        $scope.isDely === !1 && ($scope.options.series.shift(), $scope.isDely = !0), $scope.options.series.push({
            y: chName,
            label: chName,
            color: pickColor,
            dotSize: "3",
            thickness: "2px"
        });
        for (var i = 0; 7 > i; i++) $scope.data[i][chName] = chData.latency_stats[i][1] / 1e3;
    }, $scope.pushTableData = function(taName, taData, pickColor) {
        var temThrou = 8 * taData.http_throughput_kbytes / 1e6;
        $scope.tabledata.push({
            seq: taName,
            connection: taData.total_connections,
            server_vms: taData.total_server_vms,
            requests: taData.http_total_req,
            sock_err: taData.http_sock_err + taData.http_sock_timeout,
            rps: taData.http_rps,
            rate_limit: taData.http_rate_limit,
            throughput: temThrou.toFixed(2),
            description: taData.description,
            color: pickColor
        }), $("<style>md-checkbox.md-checked." + taName + " .md-icon {background-color: " + pickColor + ";</style>").appendTo("head"), 
        $scope.tableParams.reload();
    }, $scope.saveResult = function() {
        var date = new Date(), m = to2(date.getMonth() + 1), d = to2(date.getDate()), h = to2(date.getHours()), min = to2(date.getMinutes()), filename = "" + m + d + h + min + ".html", saveData = interactiveMode.getResult();
        if ("" != saveData) {
            var myresult = '<!--Copyright 2016 Cisco Systems, Inc. All rights reserved.--> <!--Licensed under the Apache License, Version 2.0 (the "License"); you may--> <!--not use this file except in compliance with the License. You may obtain--> <!--a copy of the License at--> <!--http://www.apache.org/licenses/LICENSE-2.0--> <!--Unless required by applicable law or agreed to in writing, software--> <!--distributed under the License is distributed on an "AS IS" BASIS, WITHOUT--> <!--WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the--> <!--License for the specific language governing permissions and limitations--> <!--under the License.--> <!DOCTYPE html> <html lang="en-US" ng-app="app"> <head> <meta charset="utf-8"> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <meta name="viewport" content="width=device-width, initial-scale=1"> <title>KloudBuster Report</title> <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.4.2/angular.min.js"></script> <script src="https://d3js.org/d3.v3.min.js"></script> <script src="https://cdnjs.cloudflare.com/ajax/libs/line-chart/2.0.3/LineChart.min.js"></script> <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/line-chart/2.0.3/LineChart.min.css"> <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/ng-table/0.8.3/ng-table.min.css"> <script src="https://cdnjs.cloudflare.com/ajax/libs/ng-table/0.8.3/ng-table.min.js"></script> <link rel="stylesheet" href="https://bootswatch.com/flatly/bootstrap.min.css"> <script src="https://code.jquery.com/jquery-2.2.0.min.js"></script> <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script> <style rel="stylesheet"> .hidden { display: inline !important; } .label { padding: 0; font-size: 110%; font-weight: normal; line-height: 16; color: #000000; text-align: center; } </style> </head> <body ng-controller="MainCtrl"> <nav class="navbar navbar-default"> <div class="container-fluid"> <a class="navbar-brand" style="font-family: Arial"> <span style="color:#DF314D">K</span>loudBuster </a> <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1"> <ul class="nav navbar-nav" ng-init="tab=0"> <li ng-class="{active:tab==0}" ng-click="tab=0"> <a><span class="glyphicon" aria-hidden="true" ></span>Report</a> </li> <li ng-class="{active:tab==1}" ng-click="tab=1" ng-show="config == true"> <a><span class="glyphicon" aria-hidden="true" ></span>Configuration</a> </li> </ul> <!--<ul class="nav navbar-nav navbar-right">--> <!--<li><a href="#"></a></li>--> <!--</ul>--> </div> </div> </nav> <div class="container" ng-show="tab == 0"> <h3>KloudBuster HTTP Test Report</h3> <h6 style="margin-bottom:0"><span style="float:left">Latency(ms)</span></h6> <div class="my-chart" style="height: 400px;margin-bottom: 10%"> <linechart data="data" options="options"></linechart> </div> <table ng-table="tableParams" class="table table-responsive table-condensed table-bordered table-striped"> <tr ng-repeat="row in tableParams.data" style="text-align:center;"> <td title="cols[0].title" ng-if="cols[0].show" style="margin:0 auto;padding:0;"> <button class="btn btn-default btn-xs {{row.seq}}" ng-click="" style="height: 22px;width: 24px;"></button> </td> <td title="cols[1].title" data-sortable="cols[1].field" ng-if="cols[1].show">{{row.connection}}</td> <td title="cols[2].title" data-sortable="cols[2].field" ng-if="cols[2].show">{{row.server_vms}}</td> <td title="cols[3].title" data-sortable="cols[3].field" ng-if="cols[3].show">{{row.requests}}</td> <td title="cols[4].title" data-sortable="cols[4].field" ng-if="cols[4].show">{{row.sock_err}}</td> <td title="cols[5].title" data-sortable="cols[5].field" ng-if="cols[5].show">{{row.rps}}</td> <td title="cols[6].title" data-sortable="cols[6].field" ng-if="cols[6].show">{{row.rate_limit}}</td> <td title="cols[7].title" data-sortable="cols[7].field" ng-if="cols[7].show">{{row.throughput}} Gbps</td> </tr> </table> </div> <div class="container" ng-show="tab == 1"> <h3>KloudBuster HTTP Test Configuration</h3> <div class="panel panel-default"> <div class="panel-body" style="word-wrap:break-word"> <textarea style="font-family:Courier New, Monospace;width: 100%;height: 900px" disabled> {{from_outside_config}}</textarea> </div> </div> </div> <footer style="text-align: center;"> <hr style="margin:2px"/> <h6 style="color:gray">{{from_outside["time"]}} - KloudBuster {{from_outside["version"]}}</h6> </footer> <script type="text/javascript"> angular.module("app", ["n3-line-chart", "ngTable"]).controller("MainCtrl", function ($scope, color, ngTableParams) { if($scope.config = true) $scope.from_outside_config = JSON.stringify(' + JSON.stringify(kbCookie.getConfig()) + ', null, "	"); $scope.from_outside = ' + JSON.stringify(saveData) + '; $scope.result = $scope.from_outside["kb_result"]; var countRep = $scope.result.length; $scope.data = {dataset0: [{x: 0}, {x: 10}, {x: 20}, {x: 30}, {x: 40}, {x: 50}, {x: 60}]}; $scope.options = { series: [], axes: { x: { key: "x", type: "linear", tickFormat: function (value) { if (value === 0) { return "50%" } else if (value === 10) { return "75%" } else if (value === 20) { return "90%" } else if (value === 30) { return "99%" } else if (value === 40) { return "99.9%" } else if (value === 50) { return "99.99%" } else if (value === 60) { return "99.999%" } } }, y: { type: "log", ticksFormat: "d", ticks: 10, tickFormat: function (value, index) { return value } } }, margin: {top: 20, right: 30, bottom: 20, left: 30}, grid: {x: false, y: true} }; $scope.tabledata = []; $scope.cols = [{field: "seq", title: "SEQ", sortable: "seq", show: true}, { field: "connection", title: "Connection", sortable: "connection", show: true }, {field: "server_vms", title: "Server VMs", sortable: "server_vms", show: true}, { field: "requests", title: "Requests", sortable: "requests", show: true }, {field: "sock_err", title: "Error", sortable: "sock_err", show: true}, { field: "rps", title: "RPS measured", sortable: "rps", show: true }, {field: "rate_limit", title: "RPS requested", sortable: "rate_limit", show: true}, { field: "throughput", title: "Throughput", sortable: "throughput", show: true },]; $scope.tableParams = new ngTableParams({sorting: {name: "asc"}, "count": 10}, { counts: [], data: $scope.tabledata }); $scope.pushTableData = function (taName, taData, pickColor) { var temThrou = (taData.http_throughput_kbytes * 8) / (1000 * 1000); $scope.tabledata.push({ "seq": taName, "connection": taData.total_connections, "server_vms": taData.total_server_vms, "requests": taData.http_total_req, "sock_err": taData.http_sock_err + taData.http_sock_timeout, "rps": taData.http_rps, "rate_limit": taData.http_rate_limit, "throughput": temThrou.toFixed(2), "description": taData.description, "color": pickColor }); $("<style>button." + taName + " {background-color: " + pickColor + ";</style>").appendTo("head"); $scope.tableParams.reload() }; for (var i = 0; i < countRep; i++) { $scope.perrow = $scope.result[i]; var pickColor = color.getColor(); if (1) { chName = "Connection-" + $scope.perrow.total_connections; $scope.options.series.push({ label: chName, color: pickColor, dotSize: "3", thickness: "2px", axis: "y", dataset: "dataset0", key: chName, type: ["line", "dot"], id: chName, interpolation: {mode: "cardinal", tension: 0.8} }); for (var j = 0; j < 7; j++) { $scope.data.dataset0[j][chName] = $scope.perrow.latency_stats[j][1] / 1000 } $scope.pushTableData("Connection-" + $scope.perrow.total_connections, $scope.perrow, pickColor) } } }).service("color", function () { var self = this; var num = -1; var colorList = ["#F44336", "#673AB7", "#03A9F4", "#4CAF50", "#FFEB3B", "#BF360C", "#795548", "#E91E63", "#3F51B5", "#00BCD4", "#CDDC39", "#FF9800", "#9E9E9E", "#9C27B0", "#009688"]; var length = colorList.length; this.getColor = function () { num = (num + 1) % length; return colorList[num] }; this.reset = function () { num = -1 } }); </script> </body> </html> ';
            downloadFile(filename, myresult);
        } else showAlert.showAlert("No result to save!");
    }, setInterval(function() {
        $scope.checkStatus();
    }, 1e3), $(function() {
        $('[data-toggle="tooltip"]').tooltip();
    });
}).service("interactiveMode", function() {
    var result = [];
    this.getResult = function() {
        return result;
    }, this.setResult = function(res) {
        return result = res;
    };
}).service("color", function() {
    var num = -1, colorList = [ "#F44336", "#673AB7", "#03A9F4", "#4CAF50", "#FFEB3B", "#BF360C", "#795548", "#E91E63", "#3F51B5", "#00BCD4", "#CDDC39", "#FF9800", "#9E9E9E", "#9C27B0", "#009688" ], length = colorList.length;
    this.getColor = function() {
        return num = (num + 1) % length, colorList[num];
    }, this.reset = function() {
        num = -1;
    };
}).directive("convertToNumber", function() {
    return {
        require: "ngModel",
        link: function(scope, element, attrs, ngModel) {
            ngModel.$parsers.push(function(val) {
                return parseFloat(val);
            }), ngModel.$formatters.push(function(val) {
                return "" + val;
            });
        }
    };
});