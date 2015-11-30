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
  .controller('IntervalCtrl', function ($scope, $http, kbHttp, $q, $location, showAlert, kbCookie, monitorMode, locationChange) {
    this.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];

    if (kbCookie.getSessionID() === "") $location.path('/Login');
    //---------------------------------top navigation bar---------------------------------
    $(window).on('hashchange', locationChange.change());


    $("[data-toggle='.container']").click(function () {
      var toggle_el1 = $(this).data("toggle");
      $(toggle_el1).toggleClass("open-sidebar");
      $("#littleglyph1").toggleClass("glyphicon-triangle-right");
      $("#littleglyph1").toggleClass("glyphicon-triangle-left");

      //$("#content").toggleClass("content-smaller");
    });
    $(".swipe-area").swipe({
      swipeStatus: function (event, phase, direction, distance, duration, fingers) {
        if (phase == "move" && direction == "right") {
          $(".container").addClass("open-sidebar");
          return false;
        }
        if (phase == "move" && direction == "left") {
          $(".container").removeClass("open-sidebar");
          return false;
        }
      }
    });


    $scope.oneAtATime = true;
    $scope.status1 = {
      isFirstOpen: true,
      isFirstDisabled: false
    };
    $scope.status2 = {
      isFirstOpen: true,
      isFirstDisabled: false
    }
    $scope.status1.open = false;
    $scope.status2.open = true;

    $scope.alerts = [];
    $scope.closeAlert = function (index) {
      $scope.alerts.splice(index, 1);
    };


    $scope.sessionID = kbCookie.getSessionID();
    $scope.status = kbCookie.getStatus();
    $scope.config = kbCookie.getConfig();
    //$scope.credentials=kbCookie.getCredentials();


    $scope.getRunConfig = function () {
      kbHttp.getMethod("/config/running_config/" + $scope.sessionID)
        .then(
        function (response) {  //  .resolve
          $scope.config = response.data;
          kbCookie.setConfig(response.data);
          console.log("get & save config");
        },
        function (response) {  //  .reject
          console.log("get running config error:");
          console.log(response);
        }
      );
    };

    if ($scope.sessionID && !$scope.config) {
      $scope.getRunConfig();
    }


    $scope.setConfig = function (ifRun) {
      var deferred = $q.defer();

      if ($scope.status === "READY") {
        $scope.config.client.progression.enabled = false;//!!
        kbCookie.setConfig($scope.config);
        $scope.chaCon = {"kb_cfg": {}};
        $scope.chaCon.kb_cfg = kbCookie.getConfig();
        //$scope.chaCon.kb_cfg.client.progression.enabled = false;//!!
        //console.log($scope.chaCon);
        kbHttp.putMethod("/config/running_config/" + $scope.sessionID, $scope.chaCon)
          .then(
          function (response) {  //  .resolve
            console.log("change running config");
            deferred.resolve(1);
            if (ifRun != 1) {
              showAlert.showAlert("Configuration updated successfully!");
            }

          },
          function (response) {  //  .reject
            //console.log("change running config error:");
            //console.log(response);
            deferred.reject(0);
            if (ifRun != 1) {
              if (response.status == 400)
                showAlert.showAlert("Error while parsing configurations! Please check your inputs!");
              else if (response.status == 403)
                showAlert.showAlert("Cannot update configuration if KloudBuster is busy or in error state");
              else if (response.status == -1)
                showAlert.showAlert("Error while connecting kloudbuster server!");
            }
          }
        );
      }
      else if ($scope.status === "STAGED") {
        //if ($scope.config.client.progression.enabled === true) {
        //  alert("Can't Run Monitor Test Now! You have chosen Progression Test. Click Unstage Button First!");
        //  deferred.reject(0);
        //  return deferred.promise;
        //}
        //if ($scope.config.client.progression.report_interval === 0) {
        //  alert("Can't Run Monitor Test Now! Report interval must be a number no less than 1.");
        //  deferred.reject(0);
        //  return deferred.promise;
        //}
        kbCookie.setConfig($scope.config);
        $scope.chaCon = {
          "kb_cfg": {
            "client": {
              "http_tool_configs": {
                "duration": $scope.config.client.http_tool_configs.duration,
                "rate_limit": $scope.config.client.http_tool_configs.rate_limit,
                "connections": $scope.config.client.http_tool_configs.connections,
                "report_interval": $scope.config.client.http_tool_configs.report_interval
              }
            }
          }
        };
        console.log($scope.chaCon);

        kbHttp.putMethod("/config/running_config/" + $scope.sessionID, $scope.chaCon)
          .then(
          function (response) {  //  .resolve
            console.log("change running config");
            deferred.resolve(1);
            if (ifRun != 1) {
              showAlert.showAlert("Configuration updated successfully!");
            }
          },
          function (response) {  //  .reject
            //console.log("change running config error:");
            //console.log(response);
            deferred.reject(0);
            if (ifRun != 1) {
              if (response.status == 400)
                showAlert.showAlert("Error while parsing configurations! Please check your inputs!");
              else if (response.status == 403)
                showAlert.showAlert("Cannot update configuration if KloudBuster is busy or in error state");
              else if (response.status == -1)
                showAlert.showAlert("Error while connecting kloudbuster server!");
            }
          }
        );
      }
      else {
        console.log("config not allow to change now!");
        deferred.reject(0);
      }
      return deferred.promise;
    };

    var disabledStagingConfig = false;
    var disabledRunningConfig = false;

    $scope.disableConfig = function (disableId) {
      $("#" + disableId).find("input").each(function () {//show Config
        $(this).attr("disabled", "disabled");
        //$(this).removeAttr("disabled");
      });
    };

    $scope.enableConfig = function (enableId) {
      $("#" + enableId).find("input").each(function () {//disable Config
        //$(this).attr("disabled", "disabled");
        $(this).removeAttr("disabled");
      });

    };

    $scope.configStatus = function () {

      if ($scope.status === "READY")//show all config
      {
        if (disabledStagingConfig === true) {
          disabledStagingConfig = false;
          $scope.enableConfig("stagingConfig");
        }
        if (disabledRunningConfig === true) {
          disabledRunningConfig = false;
          $scope.enableConfig("runningConfig");
        }
      }
      else if ($scope.status === "STAGED") //show running config
      {
        if (disabledStagingConfig === false) {
          disabledStagingConfig = true;
          $scope.disableConfig("stagingConfig");
        }
        if (disabledRunningConfig === true) {
          disabledRunningConfig = false;
          $scope.enableConfig("runningConfig");
        }
      }
      else//no config can be modified
      {
        if (disabledStagingConfig === false) {
          disabledStagingConfig = true;
          $scope.disableConfig("stagingConfig");
        }
        if (disabledRunningConfig === false) {
          disabledRunningConfig = true;
          $scope.disableConfig("runningConfig");
        }
      }
    };


    var pointNumber = 0;
    $scope.pointNum = function () {
      var point = ".";
      pointNumber = (pointNumber + 1) % 6;
      for (var x = 0; x < pointNumber; x++) {
        point = point + " .";
      }
      return point;
    };


    $scope.runButton = "Run Test";
    $scope.runStatus = true;//if run Button disabled

    $scope.setStatus = false;//if settings Button disabled

    $scope.stageButton = "Stage";
    $scope.setUnstage = true;//if Unstage Button disabled

    $scope.client_vm_count = 0;
    $scope.server_vm_count = 0;

    $scope.statusButton = "btn-default";

    $scope.checkStatus = function () {
      if ($scope.sessionID) {
        kbHttp.getMethod2("/kloudbuster/status/" + $scope.sessionID)
          .then(
          function (response) {  //  .resolve
            $scope.status = response.data.status;
            $scope.configStatus();
            kbCookie.setStatus($scope.status);
            if ($scope.status === "READY") {
              $scope.runButton = "Run Test";
              $scope.runStatus = true;//disable button
              $scope.setStatus = false;//show button
              $scope.stageButton = "Stage";
              $scope.setUnstage = false;//show button
              $scope.client_vm_count = 0;
              $scope.server_vm_count = 0;
              $(".loading").addClass("pause");
              $scope.statusButton = "btn-success";
              $scope.info = "";

            }
            else if ($scope.status === "STAGING") {
              $scope.runButton = "Run Test";
              $scope.runStatus = true;
              $scope.setStatus = true;
              $scope.stageButton = "Stage";
              $scope.setUnstage = true;
              $scope.client_vm_count = response.data.client_vm_count;
              $scope.server_vm_count = response.data.server_vm_count;
              $(".loading").removeClass("pause");
              $scope.statusButton = "btn-info";
              $scope.info = "KloudBuster is Creating VM(s)" + $scope.pointNum();

            }
            else if ($scope.status === "STAGED") {
              $scope.runButton = "Run Test";
              $scope.runStatus = false;
              $scope.setStatus = false;
              $scope.stageButton = "Unstage";
              $scope.setUnstage = false;
              $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants;
              $scope.server_vm_count = $scope.client_vm_count;
              $(".loading").addClass("pause");
              $scope.statusButton = "btn-success";
              $scope.info = "";

            }
            else if ($scope.status === "RUNNING") {
              $scope.runButton = "Stop Test";
              $scope.runStatus = false;
              $scope.setStatus = true;
              $scope.stageButton = "Unstage";
              $scope.setUnstage = true;
              $scope.getSeqReport();
              $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants;
              $scope.server_vm_count = $scope.client_vm_count;
              $(".loading").removeClass("pause");
              $scope.statusButton = "btn-info";
              $scope.info = "KloudBuster is Running" + $scope.pointNum();

            }
            else if ($scope.status === "ERROR") {
              $scope.runButton = "Run Test";
              $scope.runStatus = true;
              $scope.setStatus = true;
              $scope.stageButton = "Unstage";
              $scope.setUnstage = false;
              $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants;
              $scope.server_vm_count = $scope.client_vm_count;
              $(".loading").addClass("pause");
              $scope.statusButton = "btn-danger";
              $scope.info = "";

            }
            else if ($scope.status === "CLEANING" || $scope.status === "STOPPING") {
              $scope.runButton = "Run Test";
              $scope.runStatus = true;
              $scope.setStatus = true;
              $scope.stageButton = "Unstage";
              $scope.setUnstage = true;
              $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants;
              $scope.server_vm_count = $scope.client_vm_count;
              $(".loading").removeClass("pause");
              $scope.statusButton = "btn-info";
              $scope.info = "Please Wait" + $scope.pointNum();

            }

          },
          function (response) {  //  .reject
            console.log("get status error:");
            console.log(response);
          }
        );
      }
      else {
        $scope.status = "NO SESSION ID";
      }
    };
    $scope.checkStatus();


    $scope.setStage = function () {
      kbHttp.postMethod("/kloudbuster/stage/" + $scope.sessionID)
        .then(
        function (response) {  //  .resolve
          //$scope.checkStatus();
          showAlert.showAlert("Staging all resources to run KloudBuster! Please wait...");
        },
        function (response) {  //  .reject
          console.log("set stage error:");
          console.log(response);
          showAlert.showAlert("Unable to stage resources!");
        }
      );
    };

    $scope.CleanUp = function () {
      $scope.initChart();
      if ($scope.sessionID && ($scope.status === "ERROR" || $scope.status === "STAGED")) {
        kbHttp.postMethod("/kloudbuster/cleanup/" + $scope.sessionID)
          .then(
          function (response) {  //  .resolve
            $scope.checkStatus();
            showAlert.showAlert("Cleanup KloudBuster!");
          },
          function (response) {  //  .reject
            console.log("clean error:");
            console.log(response);
          }
        );
      }
      else {
        console.log("Cannot cleanup!");
      }
    };

    $scope.stage = function(){
      if($scope.status==="ERROR"||$scope.status==="STAGED"){
        //$scope.initChart();
        $scope.CleanUp();
      }
      else if($scope.status==="READY"){
        var promise = $scope.setConfig(1);
        promise.then(function () {
          $scope.setStage();
        });
      }
    };



    $scope.runKb = function () {
      kbHttp.postMethod("/kloudbuster/run_test/" + $scope.sessionID)
        .then(
        function (response) {  //  .resolve
          //$scope.checkStatus();
          showAlert.showAlert("Successfully start to run KloudBuster! Please wait...");

        },
        function (response) {  //  .reject
          console.log("running error:");
          console.log(response);
          showAlert.showAlert("Unable to start test!");
        }
      );
    };

    $scope.stopKb = function () {
      kbHttp.postMethod("/kloudbuster/stop_test/" + $scope.sessionID)
        .then(
        function (response) {  //  .resolve
          //$scope.checkStatus();
          showAlert.showAlert("Stoping the KloudBuster tests...");
        },
        function (response) {  //  .reject
          console.log("stop error:");
          console.log(response);
          showAlert.showAlert("Unable to stop test!");
        }
      );
    };

    $scope.scaleTest = function () {
      if ($scope.status === "RUNNING") {
        //$scope.initChart();
        $scope.stopKb();
      }
      else {
        var promise = $scope.setConfig(1);
        promise.then(function () {
          if ($scope.status === "STAGED") {
            if ($scope.config.client.progression.enabled === true) {
              showAlert.showAlert("Can't Run Monitor Test Now! You have chosen Progression Test. Clean Up First!");
            }
            else if ($scope.config.client.http_tool_configs.report_interval === 0) {
              showAlert.showAlert("Can't Run Monitor Test Now! Report interval must be a number no less than 1.");
            }
            else {
              $scope.initChart();
              $scope.runKb();
            }
          }
          else {
          }
        });
      }
    };
    //$scope.scaleTest = function () {
    //  if ($scope.status === "RUNNING") {
    //    //$scope.initChart();
    //    $scope.stopKb();
    //  }
    //  else {
    //    var promise = $scope.setConfig(1);
    //    promise.then(function () {
    //      if ($scope.status === "READY") {
    //        $scope.setStage();
    //      }
    //      else if ($scope.status === "STAGED") {
    //        if ($scope.config.client.progression.enabled === true) {
    //          showAlert.showAlert("Can't Run Monitor Test Now! You have chosen Progression Test. Clean Up First!");
    //        }
    //        else if ($scope.config.client.http_tool_configs.report_interval === 0) {
    //          showAlert.showAlert("Can't Run Monitor Test Now! Report interval must be a number no less than 1.");
    //        }
    //        else {
    //          $scope.initChart();
    //          $scope.runKb();
    //        }
    //      }
    //      else {
    //      }
    //    });
    //  }
    //};


//---------------------------chart---------------------------
    $scope.data = [
      {x: new Date()}
    ];
    $scope.isDely = false;
    var count = 0;

    $scope.initChart = function () {
      $scope.data = [
        {x: new Date()}
      ];
      $scope.isDely = false;
      count = 0;
      monitorMode.setResult("");
    };
    //$scope.initChart();

    //$scope.data = [
    //  {
    //    x: new Date(),
    //    val_0: 23,
    //    val_1: 4,
    //    val_2: 16,
    //    val_3: 270,
    //    val_4: 8,
    //    val_5: 97,
    //    val_6: 57
    //  }
    //];

    $scope.options = {
      axes: {
        x: {type: "date"},
        y: {type: 'log', ticksFormat: 'd', innerTicks: true, grid: true}
      },
      series: [
        {y: "val_6", label: "99.999%", type: "area", color: "#2e4174", dotSize: "0", thickness: "2px", visible: false},
        {y: "val_5", label: "99.99%", type: "area", color: "#084594", dotSize: "0", thickness: "2px", visible: false},
        {y: "val_4", label: "99.9%", type: "area", color: "#0074D9", dotSize: "0", thickness: "2px"},
        {y: "val_3", label: "99%", type: "area", color: "#79afe1", dotSize: "0", thickness: "2px"},
        {y: "val_2", label: "90%", type: "area", color: "#9ecae1", dotSize: "0", thickness: "2px"},
        {y: "val_1", label: "75%", type: "area", color: "#c6dbef", dotSize: "0", thickness: "2px", visible: false},
        {y: "val_0", label: "50%", type: "area", color: "#eff3ff", dotSize: "0", thickness: "2px"}
      ],
      tooltip: {
        mode: 'scrubber', formatter: function (x, y, series) {
          return series.label + ":" + y;
        }
      },
      tension: 0.9,
      lineMode: "cardinal"
    };
    $scope.data.forEach(function (row) {
      row.x = new Date(row.x);
    });

    $scope.getSeqReport = function () {

      kbHttp.getMethod2("/kloudbuster/report/" + $scope.sessionID)
        .then(
        function (response) {  //  .resolve
          $scope.result = response.data.report;

          $scope.seq = response.data.seq;

          console.log("get seq report:" + $scope.seq);
          //console.log(response.data);
          if ($scope.seq && $scope.seq > count) {
            count = $scope.seq;

            if ($scope.data.length > 40) $scope.data.shift();

            $scope.pushChartData("SEQ_" + $scope.seq, $scope.result);
          }
          else {
          }
        },
        function (response) {  //  .reject
          console.log("get seq report error:");
          console.log(response);
        }
      );
    };

    $scope.pushChartData = function (chName, chData) {
      //console.log("chart date"+ chName);

      if ($scope.isDely === false) {
        $scope.data.shift();
        $scope.isDely = true;
      }

      $scope.data.push({
        x: new Date(),
        val_0: chData.latency_stats[0][1] / 1000,
        val_1: chData.latency_stats[1][1] / 1000,
        val_2: chData.latency_stats[2][1] / 1000,
        val_3: chData.latency_stats[3][1] / 1000,
        val_4: chData.latency_stats[4][1] / 1000,
        val_5: chData.latency_stats[5][1] / 1000,
        val_6: chData.latency_stats[6][1] / 1000
      });
      monitorMode.setResult($scope.data);
      //console.log($scope.data);
    };


    if (monitorMode.getResult()) {
      $scope.data = monitorMode.getResult();
    }


    //$scope.aaa = '{"report":{"latency_stats":[[50,1800],[75,2255],[90,2607],[99,3135],[99.9,3487],[99.99,3647],[99.999,3647]],"tool":"wrk2","http_rps":519,"http_throughput_kbytes":16752,"http_sock_timeout":0,"http_total_req":2600,"http_sock_err":0},"seq":5}';
    //$scope.pushChartData("SEQ_",JSON.parse($scope.aaa).report);


    function downloadFile(fileName, content) {
      var aLink = document.createElement('a');
      var blob = new Blob([content]);
      var evt = document.createEvent("HTMLEvents");
      evt.initEvent("click", false, false);//initEvent
      aLink.download = fileName;
      aLink.href = URL.createObjectURL(blob);
      aLink.dispatchEvent(evt);
    }

    $scope.saveResult = function () {
      var date = new Date();
      var m = date.getMonth() + 1;//month (0-11,0 = Jan., remember to add 1)
      var d = date.getDate();//day(1-31)
      var h = date.getHours();//hour(0-23)
      var min = date.getMinutes();//minute(0-59)
      var filename = m + d + h + min + ".json";
      console.log(filename);
      if (monitorMode.getResult() != "")
        downloadFile(filename, JSON.stringify(monitorMode.getResult()));
      else console.log("no file to save");
    };


    setInterval(function () {
      $scope.checkStatus();
    }, 900);


  })
  .service('monitorMode', function () {
    //var self = this;

    var result = "";

    this.getResult = function () {
      return result;
    };
    this.setResult = function (res) {
      result = res;
      return result;
    };

  });


