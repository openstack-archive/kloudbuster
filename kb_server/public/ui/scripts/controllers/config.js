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

angular.module("kbWebApp").controller("ConfigCtrl", function($scope, $http, $location, showAlert, kbHttp, kbCookie, locationChange) {
    function init() {
        $scope.selectedA = [], $scope.selectedB = [], $scope.selectedC = [], userData = [], 
        $scope.listA = [], $scope.listB = [], $scope.listC = [], $scope.toggle = !1;
    }
    function arrayObjectIndexOf(myArray, searchTerm, property) {
        for (var i = 0, len = myArray.length; len > i; i++) if (myArray[i][property] === searchTerm) return i;
        return -1;
    }
    function arrayObjectIndexOf2(myArray, searchTerm) {
        for (var i = 0, len = myArray.length; len > i; i++) if (myArray[i] === searchTerm) return i;
        return -1;
    }
    function reset() {
        $scope.selectedA = [], $scope.selectedB = [], $scope.selectedC = [], $scope.toggle = !1;
    }
    function downloadFile(fileName, content) {
        var aLink = document.createElement("a"), blob = new Blob([ content ]), evt = document.createEvent("HTMLEvents");
        evt.initEvent("click", !1, !1), aLink.download = fileName, aLink.href = URL.createObjectURL(blob), 
        aLink.dispatchEvent(evt);
    }
    function to2(num) {
        return 10 > num ? "0" + num : 99 > num ? "" + num : -1;
    }
    this.awesomeThings = [ "HTML5 Boilerplate", "AngularJS", "Karma" ], "" === kbCookie.getSessionID() ? $location.path("/Login") : kbCookie.checkMode("http"), 
    $(window).on("hashchange", locationChange.change()), $scope.sessionID = kbCookie.getSessionID(), 
    $scope.status = kbCookie.getStatus(), $scope.dashstatus1 = "active", $scope.dashstatus1vis = !0, 
    $scope.dashstatus2 = "", $scope.dashstatus2vis = !1, $scope.dashstatus3 = "", $scope.dashstatus3vis = !1, 
    $scope.setDashStatus = function(dashNum) {
        1 === dashNum ? ($scope.dashstatus2 = "", $scope.dashstatus2vis = !1, $scope.dashstatus3 = "", 
        $scope.dashstatus3vis = !1, $scope.dashstatus1 = "active", $scope.dashstatus1vis = !0) : 2 === dashNum ? ($scope.dashstatus1 = "", 
        $scope.dashstatus1vis = !1, $scope.dashstatus3 = "", $scope.dashstatus3vis = !1, 
        $scope.dashstatus2 = "active", $scope.dashstatus2vis = !0) : 3 === dashNum && ($scope.dashstatus1 = "", 
        $scope.dashstatus1vis = !1, $scope.dashstatus2 = "", $scope.dashstatus2vis = !1, 
        $scope.dashstatus3 = "active", $scope.dashstatus3vis = !0);
    };
    var userData;
    $scope.setUserData = function(top) {
        var x, count = 1;
        for (x in top) userData.push({
            id: count++,
            firstName: top[x]
        });
        $scope.listA = userData.slice(0, userData.length), $scope.items = userData;
    }, init(), $scope.aToB = function() {
        for (var i in $scope.selectedA) {
            var moveId = arrayObjectIndexOf($scope.items, $scope.selectedA[i], "id");
            $scope.listB.push($scope.items[moveId]);
            var delId = arrayObjectIndexOf($scope.listA, $scope.selectedA[i], "id");
            $scope.listA.splice(delId, 1);
        }
        reset();
    }, $scope.aToC = function() {
        for (var i in $scope.selectedA) {
            var moveId = arrayObjectIndexOf($scope.items, $scope.selectedA[i], "id");
            $scope.listC.push($scope.items[moveId]);
            var delId = arrayObjectIndexOf($scope.listA, $scope.selectedA[i], "id");
            $scope.listA.splice(delId, 1);
        }
        reset();
    }, $scope.bToA = function() {
        for (var i in $scope.selectedB) {
            var moveId = arrayObjectIndexOf($scope.items, $scope.selectedB[i], "id");
            $scope.listA.push($scope.items[moveId]);
            var delId = arrayObjectIndexOf($scope.listB, $scope.selectedB[i], "id");
            $scope.listB.splice(delId, 1);
        }
        reset();
    }, $scope.cToA = function() {
        for (var i in $scope.selectedC) {
            var moveId = arrayObjectIndexOf($scope.items, $scope.selectedC[i], "id");
            $scope.listA.push($scope.items[moveId]);
            var delId = arrayObjectIndexOf($scope.listC, $scope.selectedC[i], "id");
            $scope.listC.splice(delId, 1);
        }
        reset();
    }, $scope.toggleA = function() {
        if ($scope.selectedA.length > 0) reset(); else for (var i in $scope.listA) $scope.selectedB = [], 
        $scope.selectedC = [], $scope.selectedA.push($scope.listA[i].id);
    }, $scope.toggleB = function() {
        if ($scope.selectedB.length > 0) reset(); else for (var i in $scope.listB) $scope.selectedA = [], 
        $scope.selectedC = [], $scope.selectedB.push($scope.listB[i].id);
    }, $scope.toggleC = function() {
        if ($scope.selectedC.length > 0) reset(); else for (var i in $scope.listC) $scope.selectedA = [], 
        $scope.selectedB = [], $scope.selectedC.push($scope.listC[i].id);
    }, $scope.selectA = function(i) {
        var delId = arrayObjectIndexOf2($scope.selectedA, i);
        -1 === delId ? $scope.selectedA.push(i) : $scope.selectedA.splice(delId, 1);
    }, $scope.selectB = function(i) {
        var delId = arrayObjectIndexOf2($scope.selectedB, i);
        -1 === delId ? $scope.selectedB.push(i) : $scope.selectedB.splice(delId, 1);
    }, $scope.selectC = function(i) {
        var delId = arrayObjectIndexOf2($scope.selectedC, i);
        -1 === delId ? $scope.selectedC.push(i) : $scope.selectedC.splice(delId, 1);
    }, $scope.checkStatus = function() {
        $scope.sessionID ? kbHttp.getMethod2("/kloudbuster/status/" + $scope.sessionID).then(function(response) {
            $scope.status = response.data.status, kbCookie.setStatus($scope.status), $scope.configStatus();
        }, function(response) {
            console.log("status error");
        }) : ($scope.status = "NO SESSION ID", kbCookie.setStatus(""));
    }, $scope.checkStatus();
    var disabledStagingConfig = !1;
    $scope.disableConfig = function(disableId) {
        $("#" + disableId).find("input,button").each(function() {
            $(this).attr("disabled", "disabled");
        });
    }, $scope.enableConfig = function(enableId) {
        $("#" + enableId).find("input,button").each(function() {
            $(this).removeAttr("disabled");
        });
    }, $scope.configStatus = function() {
        "READY" === $scope.status ? disabledStagingConfig === !0 && (disabledStagingConfig = !1, 
        $scope.enableConfig("stagingConfig2"), $scope.enableConfig("getButton"), $("md-radio-button").removeAttr("disabled")) : disabledStagingConfig === !1 && (disabledStagingConfig = !0, 
        $scope.disableConfig("stagingConfig2"), $scope.disableConfig("getButton"), $("md-radio-button").attr("disabled", "disabled")), 
        kbCookie.getIsOneCloud() === !1 && $scope.disableConfig("topology");
    }, $scope.getTopology = function() {
        kbHttp.getMethod("/config/hypervisor_list/" + $scope.sessionID).then(function(response) {
            $scope.setUserData(response.data.server);
        }, function(response) {
            console.log("get hypervisor list error:"), console.log(response);
        });
    }, $scope.getDefaultConfig = function() {
        kbHttp.getMethod("/config/default_config").then(function(response) {
            kbCookie.setConfig(response.data), $scope.config = response.data, 0 == $scope.config.server.flavor.disk ? $scope.choose_disk_size1 = 0 : $scope.choose_disk_size1 = 1, 
            0 == $scope.config.client.flavor.disk ? $scope.choose_disk_size2 = 0 : $scope.choose_disk_size2 = 1, 
            console.log("get & save default config");
        }, function(response) {
            showAlert.showAlert("Cannot get the Default Configuration!");
        }), $scope.getTopology(), kbCookie.setTopology(""), $scope.availability_zone = 1, 
        userData = [], init();
    }, $scope.getRunConfig = function() {
        $scope.availability_zone = 1, kbHttp.getMethod("/config/running_config/" + $scope.sessionID).then(function(response) {
            kbCookie.setConfig(response.data), $scope.config = response.data, 0 == $scope.config.server.flavor.disk ? $scope.choose_disk_size1 = 0 : $scope.choose_disk_size1 = 1, 
            0 == $scope.config.client.flavor.disk ? $scope.choose_disk_size2 = 0 : $scope.choose_disk_size2 = 1, 
            (null != $scope.config.server.availability_zone && "" != $scope.config.server.availability_zone || null != $scope.config.client.availability_zone && "" != $scope.client.server.availability_zone) && ($scope.availability_zone = 2), 
            console.log("get & save running config");
        }, function(response) {
            console.log("get running config error:"), console.log(response);
        }), kbHttp.getMethod("/config/az_list/" + $scope.sessionID).then(function(response) {
            kbCookie.getIsOneCloud() === !1 ? ($scope.serversides = response.data.server, $scope.clientsides = response.data.client) : ($scope.serversides = response.data.server, 
            $scope.clientsides = response.data.server);
        }, function(response) {
            console.log("get AZ list error:"), console.log(response);
        }), init(), $scope.getTopology(), kbHttp.getMethod("/config/topology_config/" + $scope.sessionID).then(function(response) {
            if ("null" != response.data && (0 != response.data.servers_rack.length || 0 != response.data.clients_rack.length)) {
                $scope.availability_zone = 3, $scope.topology = {
                    servers_rack: response.data.servers_rack,
                    clients_rack: response.data.clients_rack
                }, kbCookie.setTopology($scope.topology), console.log(response.data);
                for (var i in $scope.topology.servers_rack) {
                    var moveId = arrayObjectIndexOf($scope.items, $scope.topology.servers_rack[i], "firstName");
                    $scope.listC.push($scope.items[moveId]);
                    var delId = arrayObjectIndexOf($scope.listA, $scope.topology.servers_rack[i], "firstName");
                    $scope.listA.splice(delId, 1);
                }
                for (var i in $scope.topology.clients_rack) {
                    var moveId = arrayObjectIndexOf($scope.items, $scope.topology.clients_rack[i], "firstName");
                    $scope.listB.push($scope.items[moveId]);
                    var delId = arrayObjectIndexOf($scope.listA, $scope.topology.clients_rack[i], "firstName");
                    $scope.listA.splice(delId, 1);
                }
            }
            console.log("get & save topology config");
        }, function(response) {
            console.log("get topology config error:"), console.log(response);
        });
    }, $scope.getRunConfig(), $scope.changeConfig = function() {
        if ("READY" === $scope.status || "" === $scope.status) if (1 == $scope.server.$valid && 1 == $scope.general.$valid && 1 == $scope.client.$valid) {
            if (kbCookie.setConfig($scope.config), 3 == $scope.availability_zone) {
                $scope.topology = {
                    servers_rack: [],
                    clients_rack: []
                };
                for (var t in $scope.listC) $scope.topology.servers_rack.push($scope.listC[t].firstName);
                for (var t in $scope.listB) $scope.topology.clients_rack.push($scope.listB[t].firstName);
                kbCookie.setTopology($scope.topology);
            } else kbCookie.setTopology({
                servers_rack: "",
                clients_rack: ""
            });
            $scope.chaCon = {
                kb_cfg: {},
                topo_cfg: {}
            }, $scope.chaCon.kb_cfg = kbCookie.getConfig(), $scope.chaCon.topo_cfg = kbCookie.getTopology(), 
            console.log($scope.chaCon), kbHttp.putMethod("/config/running_config/" + $scope.sessionID, $scope.chaCon).then(function(response) {
                console.log("change running config");
            }, function(response) {
                showAlert.showAlert("Failed to update configuration!");
            });
        } else showAlert.showAlert("Please check your inputs!"); else showAlert.showAlert("Configuration cannot be changed now!");
    }, $scope.changeTopology = function() {
        1 == $scope.availability_zone ? ($scope.config.server.availability_zone = "", $scope.config.client.availability_zone = "", 
        $scope.topology = {}, kbCookie.setTopology({
            servers_rack: "",
            clients_rack: ""
        }), init(), $scope.getTopology()) : 2 == $scope.availability_zone ? ($scope.topology = {}, 
        kbCookie.setTopology({
            servers_rack: "",
            clients_rack: ""
        }), init(), $scope.getTopology()) : 3 == $scope.availability_zone && ($scope.config.server.availability_zone = "", 
        $scope.config.client.availability_zone = "");
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