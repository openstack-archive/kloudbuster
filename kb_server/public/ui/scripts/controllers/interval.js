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

angular.module("kbWebApp").controller("IntervalCtrl", function($scope, $http, kbHttp, $q, $location, showAlert, kbCookie, monitorMode, locationChange) {
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
        var toggle_el1 = $(this).data("toggle");
        $(toggle_el1).toggleClass("open-sidebar"), $("#littleglyph1").toggleClass("glyphicon-triangle-right"), 
        $("#littleglyph1").toggleClass("glyphicon-triangle-left");
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
    }, $scope.status1.open = !1, $scope.status2.open = !0, $scope.alerts = [], $scope.closeAlert = function(index) {
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
        if ("READY" === $scope.status) $scope.config.client.progression.enabled = !1, kbCookie.setConfig($scope.config), 
        $scope.chaCon = {
            kb_cfg: {}
        }, $scope.chaCon.kb_cfg = kbCookie.getConfig(), kbHttp.putMethod("/config/running_config/" + $scope.sessionID, $scope.chaCon).then(function(response) {
            console.log("change running config"), deferred.resolve(1), 1 != ifRun && showAlert.showAlert("Configuration updated successfully!");
        }, function(response) {
            deferred.reject(0), 1 != ifRun && (400 == response.status ? showAlert.showAlert("Error while parsing configurations! Please check your inputs!") : 403 == response.status ? showAlert.showAlert("Cannot update configuration if KloudBuster is busy or in error state") : -1 == response.status && showAlert.showAlert("Error while connecting kloudbuster server!"));
        }); else if ("STAGED" === $scope.status) {
            if ($scope.config.client.progression.enabled === !0) return alert("Can't Run Monitor Test Now! You have chosen Progression Test. Click Unstage Button First!"), 
            deferred.reject(0), deferred.promise;
            if (0 === $scope.config.client.progression.report_interval) return alert("Can't Run Monitor Test Now! Report interval must be a number no less than 1."), 
            deferred.reject(0), deferred.promise;
            kbCookie.setConfig($scope.config), $scope.chaCon = {
                kb_cfg: {
                    client: {
                        http_tool_configs: {
                            duration: $scope.config.client.http_tool_configs.duration,
                            rate_limit: $scope.config.client.http_tool_configs.rate_limit,
                            connections: $scope.config.client.http_tool_configs.connections,
                            report_interval: $scope.config.client.http_tool_configs.report_interval
                        }
                    }
                }
            }, console.log($scope.chaCon), kbHttp.putMethod("/config/running_config/" + $scope.sessionID, $scope.chaCon).then(function(response) {
                console.log("change running config"), deferred.resolve(1);
            }, function(response) {
                deferred.reject(0), 1 != ifRun && (400 == response.status ? showAlert.showAlert("Error while parsing configurations! Please check your inputs!") : 403 == response.status ? showAlert.showAlert("Cannot update configuration if KloudBuster is busy or in error state") : -1 == response.status && showAlert.showAlert("Error while connecting kloudbuster server!"));
            });
        } else console.log("config not allow to change now!"), deferred.reject(0);
        return deferred.promise;
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
        $scope.enableConfig("stagingConfig")), disabledRunningConfig === !0 && (disabledRunningConfig = !1, 
        $scope.enableConfig("runningConfig"))) : "STAGED" === $scope.status ? (disabledStagingConfig === !1 && (disabledStagingConfig = !0, 
        $scope.disableConfig("stagingConfig")), disabledRunningConfig === !0 && (disabledRunningConfig = !1, 
        $scope.enableConfig("runningConfig"))) : (disabledStagingConfig === !1 && (disabledStagingConfig = !0, 
        $scope.disableConfig("stagingConfig")), disabledRunningConfig === !1 && (disabledRunningConfig = !0, 
        $scope.disableConfig("runningConfig")));
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
            $scope.status = response.data.status, $scope.configStatus(), kbCookie.setStatus($scope.status), 
            "READY" === $scope.status ? ($scope.runButton = "Run Test", $scope.runStatus = !0, 
            $scope.setStatus = !1, $scope.stageButton = "Stage", $scope.setUnstage = !1, $scope.client_vm_count = 0, 
            $scope.server_vm_count = 0, $(".loading").addClass("pause"), $scope.statusButton = "btn-success", 
            $scope.info = "") : "STAGING" === $scope.status ? ($scope.runButton = "Run Test", 
            $scope.runStatus = !0, $scope.setStatus = !0, $scope.stageButton = "Stage", $scope.setUnstage = !0, 
            $scope.client_vm_count = response.data.client_vm_count, $scope.server_vm_count = response.data.server_vm_count, 
            $(".loading").removeClass("pause"), $scope.statusButton = "btn-info", $scope.info = "KloudBuster is Creating VM(s)" + $scope.pointNum()) : "STAGED" === $scope.status ? ($scope.runButton = "Run Test", 
            $scope.runStatus = !1, $scope.setStatus = !1, $scope.stageButton = "Unstage", $scope.setUnstage = !1, 
            $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants, 
            $scope.server_vm_count = $scope.client_vm_count, $(".loading").addClass("pause"), 
            $scope.statusButton = "btn-success", $scope.info = "") : "RUNNING" === $scope.status ? ($scope.runButton = "Stop Test", 
            $scope.runStatus = !1, $scope.setStatus = !0, $scope.stageButton = "Unstage", $scope.setUnstage = !0, 
            $scope.getSeqReport(), $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants, 
            $scope.server_vm_count = $scope.client_vm_count, $(".loading").removeClass("pause"), 
            $scope.statusButton = "btn-info", $scope.info = "KloudBuster is Running" + $scope.pointNum()) : "ERROR" === $scope.status ? ($scope.runButton = "Run Test", 
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
        }) : $scope.status = "NO SESSION ID";
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
        if ("RUNNING" === $scope.status) $scope.stopKb(); else {
            var promise = $scope.setConfig(1);
            promise.then(function() {
                "STAGED" === $scope.status && ($scope.config.client.progression.enabled === !0 ? showAlert.showAlert("Can't Run Monitor Test Now! You have chosen Progression Test. Clean Up First!") : 0 === $scope.config.client.http_tool_configs.report_interval ? showAlert.showAlert("Can't Run Monitor Test Now! Report interval must be a number no less than 1.") : ($scope.initChart(), 
                $scope.runKb()));
            });
        }
    }, $scope.data = [ {
        x: new Date()
    } ], $scope.isDely = !1;
    var count = 0;
    $scope.initChart = function() {
        $scope.data = [ {
            x: new Date()
        } ], $scope.isDely = !1, count = 0, monitorMode.setResult("");
    }, $scope.options = {
        axes: {
            x: {
                type: "date"
            },
            y: {
                type: "log",
                ticksFormat: "d",
                innerTicks: !0,
                grid: !0
            }
        },
        series: [ {
            y: "val_6",
            label: "99.999%",
            type: "area",
            color: "#2e4174",
            dotSize: "0",
            thickness: "2px",
            visible: !1
        }, {
            y: "val_5",
            label: "99.99%",
            type: "area",
            color: "#084594",
            dotSize: "0",
            thickness: "2px",
            visible: !1
        }, {
            y: "val_4",
            label: "99.9%",
            type: "area",
            color: "#0074D9",
            dotSize: "0",
            thickness: "2px"
        }, {
            y: "val_3",
            label: "99%",
            type: "area",
            color: "#79afe1",
            dotSize: "0",
            thickness: "2px"
        }, {
            y: "val_2",
            label: "90%",
            type: "area",
            color: "#9ecae1",
            dotSize: "0",
            thickness: "2px"
        }, {
            y: "val_1",
            label: "75%",
            type: "area",
            color: "#c6dbef",
            dotSize: "0",
            thickness: "2px",
            visible: !1
        }, {
            y: "val_0",
            label: "50%",
            type: "area",
            color: "#eff3ff",
            dotSize: "0",
            thickness: "2px"
        } ],
        tooltip: {
            mode: "scrubber",
            formatter: function(x, y, series) {
                return series.label + ":" + y;
            }
        },
        tension: .9,
        lineMode: "cardinal"
    }, $scope.data.forEach(function(row) {
        row.x = new Date(row.x);
    }), $scope.getSeqReport = function() {
        kbHttp.getMethod2("/kloudbuster/report/" + $scope.sessionID).then(function(response) {
            $scope.result = response.data.report, $scope.seq = response.data.seq, console.log("get seq report:" + $scope.seq), 
            $scope.seq && $scope.seq > count && (count = $scope.seq, $scope.data.length > 40 && $scope.data.shift(), 
            $scope.pushChartData("SEQ_" + $scope.seq, $scope.result));
        }, function(response) {
            console.log("get seq report error:"), console.log(response);
        });
    }, $scope.pushChartData = function(chName, chData) {
        $scope.isDely === !1 && ($scope.data.shift(), $scope.isDely = !0), $scope.data.push({
            x: new Date(),
            val_0: chData.latency_stats[0][1] / 1e3,
            val_1: chData.latency_stats[1][1] / 1e3,
            val_2: chData.latency_stats[2][1] / 1e3,
            val_3: chData.latency_stats[3][1] / 1e3,
            val_4: chData.latency_stats[4][1] / 1e3,
            val_5: chData.latency_stats[5][1] / 1e3,
            val_6: chData.latency_stats[6][1] / 1e3
        }), monitorMode.setResult($scope.data);
    }, monitorMode.getResult() && ($scope.data = monitorMode.getResult()), $scope.saveResult = function() {
        var date = new Date(), m = to2(date.getMonth() + 1), d = to2(date.getDate()), h = to2(date.getHours()), min = to2(date.getMinutes()), filename = "" + m + d + h + min + ".html";
        if (console.log(filename), console.log(monitorMode.getResult()), "" != monitorMode.getResult()) {
            var myresult = '<!--Copyright 2016 Cisco Systems, Inc. All rights reserved.--> <!--Licensed under the Apache License, Version 2.0 (the "License"); you may--> <!--not use this file except in compliance with the License. You may obtain--> <!--a copy of the License at--> <!--http://www.apache.org/licenses/LICENSE-2.0--> <!--Unless required by applicable law or agreed to in writing, software--> <!--distributed under the License is distributed on an "AS IS" BASIS, WITHOUT--> <!--WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the--> <!--License for the specific language governing permissions and limitations--> <!--under the License.--> <!DOCTYPE html> <html lang="en-US" ng-app="app"> <head> <meta charset="utf-8"> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <meta name="viewport" content="width=device-width, initial-scale=1"> <title> KloudBuster Report </title> <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.4.2/angular.min.js"> </script> <script src="https://d3js.org/d3.v3.min.js"> </script> <script src="https://cdnjs.cloudflare.com/ajax/libs/line-chart/2.0.24/LineChart.min.js"> </script> <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/line-chart/2.0.24/LineChart.min.css"> <link rel="stylesheet" href="https://bootswatch.com/flatly/bootstrap.min.css"> <script src="https://code.jquery.com/jquery-2.2.0.min.js"> </script> <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"> </script> <style rel="stylesheet"> .hidden { display: inline !important; } .label { padding: 0; font-size: 110%; font-weight: normal; line-height: 16; color: #000000; text-align: center; } .chart .area-series { opacity: .9; } </style> </head> <body ng-controller="MainCtrl"> <nav class="navbar navbar-default"> <div class="container-fluid"> <a class="navbar-brand" style="font-family: Arial"> <span style="color:#DF314D">K</span>loudBuster </a> <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1"> <ul class="nav navbar-nav" ng-init="tab=0"> <li ng-class="{active:tab==0}" ng-click="tab=0"> <a><span class="glyphicon" aria-hidden="true" ></span>Report</a> </li> <li ng-class="{active:tab==1}" ng-click="tab=1" ng-show="config == true"> <a><span class="glyphicon" aria-hidden="true" ></span>Configuration</a> </li> </ul> <!--<ul class="nav navbar-nav navbar-right">--> <!--<li><a href="#"></a></li>--> <!--</ul>--> </div> </div> </nav> <div class="container" ng-show="tab == 0"> <h3>KloudBuster HTTP Monitoring Test Report</h3> <h6 style="margin-bottom:0"><span style="float:left">Latency(ms)</span></h6> <div class="my-chart" style="height: 500px;margin-bottom: 5%"> <linechart data="data" options="options"></linechart> </div> </div> <div class="container" ng-show="tab == 1"> <h3>KloudBuster HTTP Monitoring Test Configuration</h3> <div class="panel panel-default"> <div class="panel-body" style="word-wrap:break-word"> <textarea style="font-family:Courier New, Monospace;width: 100%;height: 900px" disabled> {{from_outside_config}}</textarea> </div> </div> </div> <footer style="text-align: center;"> <hr style="margin:2px"/> <h6 style="color:gray">' + m + "-" + d + " " + h + ":" + min + ' - KloudBuster</h6> </footer> <script type="text/javascript"> angular.module("app", ["n3-line-chart"]).controller("MainCtrl", function($scope) { if($scope.config = true) $scope.from_outside_config = JSON.stringify(' + JSON.stringify(kbCookie.getConfig()) + ', null, "	"); $scope.result = ' + JSON.stringify(monitorMode.getResult()) + '; var x; for (x in $scope.result) { $scope.result[x]["x"] = new Date($scope.result[x]["x"]); } $scope.data = { dataset0: $scope.result }; $scope.options = { series: [{ axis: "y", dataset: "dataset0", interpolation: { mode: "cardinal", tension: 0.85 }, key: "val_6", id: "val_6", label: "99.999%", type: ["line", "area"], color: "#222222" }, { axis: "y", dataset: "dataset0", interpolation: { mode: "cardinal", tension: 0.85 }, key: "val_5", id: "val_5", label: "99.99%", type: ["line", "area"], color: "#084594" }, { axis: "y", dataset: "dataset0", interpolation: { mode: "cardinal", tension: 0.85 }, key: "val_4", id: "val_4", label: "99.9%", type: ["line", "area"], color: "#0074D9" }, { axis: "y", dataset: "dataset0", interpolation: { mode: "cardinal", tension: 0.85 }, key: "val_3", id: "val_3", label: "99%", type: ["line", "area"], color: "#79afe1" }, { axis: "y", dataset: "dataset0", interpolation: { mode: "cardinal", tension: 0.85 }, key: "val_2", id: "val_2", label: "90%", type: ["line", "area"], color: "#9ecae1" }, { axis: "y", dataset: "dataset0", interpolation: { mode: "cardinal", tension: 0.85 }, key: "val_1", id: "val_1", label: "75%", type: ["line", "area"], color: "#c6dbef" }, { axis: "y", dataset: "dataset0", interpolation: { mode: "cardinal", tension: 0.85 }, key: "val_0", id: "val_0", label: "50%", type: ["line", "area"], color: "#eff3ff" }], axes: { x: { key: "x", type: "date" }, y: { key: "y", type: "log", min:0, ticksFormat: "d", ticks: 10, tickFormat: function(value, index) { return value; } } }, margin: { top: 20, right: 30, bottom: 20, left: 30 }, grid: { x: false, y: true } }; }); </script> </body> </html>';
            downloadFile(filename, myresult);
        } else showAlert.showAlert("No result to save!");
    }, setInterval(function() {
        $scope.checkStatus();
    }, 900);
}).service("monitorMode", function() {
    var result = "";
    this.getResult = function() {
        return result;
    }, this.setResult = function(res) {
        return result = res;
    };
});