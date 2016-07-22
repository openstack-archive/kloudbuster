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

angular.module("kbWebApp").controller("StorageConfigCtrl", function($scope, $http, $location, showAlert, kbHttp, kbCookie, locationChange) {
    function downloadFile(fileName, content) {
        var aLink = document.createElement("a"), blob = new Blob([ content ]), evt = document.createEvent("HTMLEvents");
        evt.initEvent("click", !1, !1), aLink.download = fileName, aLink.href = URL.createObjectURL(blob), 
        aLink.dispatchEvent(evt);
    }
    function to2(num) {
        return 10 > num ? "0" + num : 99 > num ? "" + num : -1;
    }
    this.awesomeThings = [ "HTML5 Boilerplate", "AngularJS", "Karma" ], "" === kbCookie.getSessionID() ? $location.path("/Login") : kbCookie.checkMode("storage"), 
    $(window).on("hashchange", locationChange.change()), $scope.sessionID = kbCookie.getSessionID(), 
    $scope.status = kbCookie.getStatus(), $scope.dash1status1 = "active", $scope.dash1status1vis = !0, 
    $scope.dash1status2 = "", $scope.dash1status2vis = !1, $scope.setDash1Status = function(dashNum) {
        1 === dashNum ? ($scope.dash1status2 = "", $scope.dash1status2vis = !1, $scope.dash1status1 = "active", 
        $scope.dash1status1vis = !0) : 2 === dashNum && ($scope.dash1status1 = "", $scope.dash1status1vis = !1, 
        $scope.dash1status2 = "active", $scope.dash1status2vis = !0);
    }, $scope.parseInt = parseInt, $scope.checkStatus = function() {
        $scope.sessionID ? kbHttp.getMethod2("/kloudbuster/status/" + $scope.sessionID).then(function(response) {
            $scope.status = response.data.status, kbCookie.setStatus($scope.status), $scope.configStatus();
        }, function(response) {
            console.log("status error");
        }) : ($scope.status = "NO SESSION ID", kbCookie.setStatus(""));
    };
    var disabledStagingConfig = !1, disabledStagedConfig = !0;
    $scope.disableConfig = function(disableId) {
        $("#" + disableId).find("input,button,a,md-radio-button").each(function() {
            $(this).attr("disabled", "disabled");
        });
    }, $scope.enableConfig = function(enableId) {
        $("#" + enableId).find("input,button,a,md-radio-button").each(function() {
            $(this).removeAttr("disabled");
        });
    }, $scope.configStatus = function() {
        "READY" === $scope.status ? disabledStagingConfig === !0 && (disabledStagingConfig = !1, 
        disabledStagedConfig = !0, $scope.enableConfig("dashboard_general"), $scope.enableConfig("dashboard_server"), 
        $scope.enableConfig("getButton")) : "STAGED" === $scope.status ? disabledStagedConfig === !0 && (disabledStagingConfig = !0, 
        disabledStagedConfig = !1, $scope.disableConfig("dashboard_general"), $scope.enableConfig("dashboard_server"), 
        $scope.enableConfig("getButton")) : disabledStagingConfig !== !1 && disabledStagedConfig !== !1 || (disabledStagingConfig = !0, 
        disabledStagedConfig = !0, $scope.disableConfig("dashboard_general"), $scope.disableConfig("dashboard_server"), 
        $scope.disableConfig("getButton"));
    }, $("#dropdownrandrw").append('<li class="divider"></li>'), $scope.storageMode = {
        randread: {
            name: "Random Read",
            type: "panel-randread",
            para: [ "description", "rate_iops", "block_size", "iodepth", "runtime", "extra_opts" ]
        },
        randwrite: {
            name: "Random Write",
            type: "panel-randwrite",
            para: [ "description", "rate_iops", "block_size", "iodepth", "runtime", "extra_opts" ]
        },
        randrw: {
            name: "Random Read/Write",
            type: "panel-randrw",
            para: [ "description", "rate_iops", "block_size", "iodepth", "rwmixread", "runtime", "extra_opts" ]
        },
        read: {
            name: "Seq Read",
            type: "panel-read",
            para: [ "description", "rate", "block_size", "iodepth", "runtime", "extra_opts" ]
        },
        write: {
            name: "Seq Write",
            type: "panel-write",
            para: [ "description", "rate", "block_size", "iodepth", "runtime", "extra_opts" ]
        },
        rw: {
            name: "Seq Read/Write",
            type: "panel-rw",
            para: [ "description", "rate", "block_size", "iodepth", "rwmixread", "runtime", "extra_opts" ]
        }
    }, $scope.options = {
        description: {
            name: "Description",
            "default": ""
        },
        mode: {
            name: "Mode"
        },
        runtime: {
            name: "Run Time",
            "default": 30
        },
        block_size: {
            name: "Block Size (KB)",
            "default": "4k"
        },
        iodepth: {
            name: "IO Depth",
            "default": 1
        },
        rate_iops: {
            name: "IOPs",
            "default": 100
        },
        rate: {
            name: "BW (MB/s)",
            "default": "60M"
        },
        rwmixread: {
            name: "Read %",
            "default": 70
        },
        extra_opts: {
            name: "Extra Options",
            "default": ""
        }
    }, $scope.switchIndex = function(index, order) {
        var tem = $scope.config.client.storage_tool_configs[index];
        $scope.config.client.storage_tool_configs.splice(index, 1), 1 == order ? $scope.config.client.storage_tool_configs.splice(index - 1, 0, tem) : -1 == order && $scope.config.client.storage_tool_configs.splice(index + 1, 0, tem);
    }, $scope.addMode = function(adding) {
        var newmode = {};
        for (var opt in $scope.storageMode[adding].para) {
            var newOpt = $scope.storageMode[adding].para[opt];
            newmode[newOpt] = $scope.options[newOpt]["default"];
        }
        newmode.mode = adding, $scope.config.client.storage_tool_configs.splice(0, 0, newmode);
    }, $scope.getDefaultConfig = function() {
        kbHttp.getMethod("/config/default_config").then(function(response) {
            kbCookie.setConfig(response.data), $scope.config = response.data, 0 == $scope.config.client.flavor.disk ? $scope.choose_disk_size = 0 : $scope.choose_disk_size = 1, 
            console.log("get & save default config");
        }, function(response) {
            showAlert.showAlert("Cannot get the Default Configuration!");
        });
    }, $scope.getRunConfig = function() {
        kbHttp.getMethod("/config/running_config/" + $scope.sessionID).then(function(response) {
            kbCookie.setConfig(response.data), $scope.config = response.data, 0 == $scope.config.client.flavor.disk ? $scope.choose_disk_size = 0 : $scope.choose_disk_size = 1, 
            $scope.checkStatus(), console.log("get & save running config");
        }, function(response) {
            console.log("get running config error:"), console.log(response);
        });
    }, $scope.getRunConfig(), $scope.changeConfig = function() {
        "READY" === $scope.status || "STAGED" === $scope.status || "" === $scope.status ? 1 == $scope.server.$valid && 1 == $scope.general.$valid ? (kbCookie.setConfig($scope.config), 
        $scope.chaCon = {
            kb_cfg: {},
            topo_cfg: {}
        }, $scope.chaCon.kb_cfg = kbCookie.getConfig(), $scope.chaCon.topo_cfg = kbCookie.getTopology(), 
        $scope.config.server.availability_zone = "", $scope.config.client.availability_zone = "", 
        console.log($scope.chaCon), kbHttp.putMethod("/config/running_config/" + $scope.sessionID, $scope.chaCon).then(function(response) {
            console.log("change running config");
        }, function(response) {
            showAlert.showAlert("Failed to update configuration!");
        })) : showAlert.showAlert("Please check your inputs!") : showAlert.showAlert("Configuration cannot be changed now!");
    }, $scope["import"] = function() {
        showAlert.showPrompt($scope).then(function(response) {
            $scope.config = kbCookie.getConfig(), "READY" !== $scope.status && "STAGED" !== $scope.status && "" !== $scope.status || $scope.changeConfig(), 
            console.log("import config");
        }, function(response) {});
    }, $scope["export"] = function() {
        "READY" !== $scope.status && "STAGED" !== $scope.status && "" !== $scope.status || $scope.changeConfig();
        var date = new Date(), m = to2(date.getMonth() + 1), d = to2(date.getDate()), h = to2(date.getHours()), min = to2(date.getMinutes()), filename = "ConfigFile" + m + d + h + min + ".json", myresult = JSON.stringify(kbCookie.getConfig(), null, "	");
        downloadFile(filename, myresult);
    };
});