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
  .controller('RunCtrl', function ($scope, $timeout, $location, $http, $q, showAlert, ngTableParams, kbCookie, kbHttp, interactiveMode, color, locationChange) {
    this.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];


    if(kbCookie.getSessionID()==="") $location.path('/Login');
    else kbCookie.checkMode('http');
    //---------------------------------top navigation bar---------------------------------
    $(window).on('hashchange', locationChange.change());


    $("[data-toggle='.container']").click(function() {
      var toggle_el = $(this).data("toggle");
      $(toggle_el).toggleClass("open-sidebar");
      $("#littleglyph").toggleClass("glyphicon-triangle-right");
      $("#littleglyph").toggleClass("glyphicon-triangle-left");

      //$("#content").toggleClass("content-smaller");
    });
    $(".swipe-area").swipe({
      swipeStatus:function(event, phase, direction, distance, duration, fingers)
      {
        if (phase=="move" && direction =="right") {
          $(".container").addClass("open-sidebar");
          return false;
        }
        if (phase=="move" && direction =="left") {
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
    };
    $scope.status3 = {
      isFirstOpen: true,
      isFirstDisabled: false
    };
    $scope.status1.open = false;
    $scope.status2.open = true;
    $scope.status3.open = false;


    $scope.alerts = [];
    $scope.closeAlert = function(index) {
      $scope.alerts.splice(index, 1);
    };

    $scope.sessionID=kbCookie.getSessionID();
    $scope.status=kbCookie.getStatus();
    $scope.config=kbCookie.getConfig();
    //$scope.credentials=kbCookie.getCredentials();

    $scope.getRunConfig = function() {
      kbHttp.getMethod("/config/running_config/" + $scope.sessionID)
        .then(
        function(response) {  //  .resolve
          $scope.config = response.data;
          kbCookie.setConfig(response.data);
          console.log("get & save config");
        },
        function(response) {  //  .reject
          console.log("get running config error:");
          console.log(response);
        }
      );
    };

    if($scope.sessionID && !$scope.config)
    {
      $scope.getRunConfig();
    }

    //if(!$scope.sessionID && !$scope.config)
    //  $scope.alerts.push({ type: 'alert', msg: 'Set Configuration First!' });
    //$scope.alerts.push({type: 'alert', msg: 'No Configuration!'});

    $scope.setConfig = function(ifRun) {
      var deferred = $q.defer();

      if($scope.status==="READY") {
        kbCookie.setConfig($scope.config);
        $scope.chaCon = {"kb_cfg": {}};
        $scope.chaCon.kb_cfg = kbCookie.getConfig();
        //console.log($scope.chaCon);
        kbHttp.putMethod("/config/running_config/" + $scope.sessionID, $scope.chaCon)
          .then(
          function (response) {  //  .resolve
            console.log("change running config");
            deferred.resolve(1);
            if (ifRun != 1) {
              //showAlert.showAlert("Configuration updated successfully!");
            }
          },
          function (response) {  //  .reject
            //console.log("change running config error:");
            //console.log(response);
            deferred.reject(0);
            if (ifRun != 1) {
              if (response.status == 400)
                showAlert.showAlert("Error while parsing configurations! Please check your inputs!");
              else if(response.status == 403)
                showAlert.showAlert("Cannot update configuration if KloudBuster is busy or in error state");
              else if (response.status == -1)
                showAlert.showAlert("Error while connecting kloudbuster server!");
            }
          }
        );
      }
      else if($scope.status==="STAGED"){
        $scope.config.client.http_tool_configs.report_interval=0;//!!
        kbCookie.setConfig($scope.config);
        $scope.chaCon = {"kb_cfg": {"client":{"http_tool_configs":{"duration":$scope.config.client.http_tool_configs.duration,"rate_limit":$scope.config.client.http_tool_configs.rate_limit,"connections":$scope.config.client.http_tool_configs.connections,"report_interval":0}}}};
        //console.log($scope.chaCon);

        kbHttp.putMethod("/config/running_config/" + $scope.sessionID, $scope.chaCon)
          .then(
          function (response) {  //  .resolve
            console.log("change running config");
            deferred.resolve(1);
            if (ifRun != 1) {
              //showAlert.showAlert("Configuration updated successfully!");
            }
          },
          function (response) {  //  .reject
            //console.log("change running config error:");
            //console.log(response);
            deferred.reject(0);
            if (ifRun != 1) {
              if (response.status == 400)
                showAlert.showAlert("Error while parsing configurations! Please check your inputs!");
              else if(response.status == 403)
                showAlert.showAlert("Cannot update configuration if KloudBuster is busy or in error state");
              else if (response.status == -1)
                showAlert.showAlert("Error while connecting kloudbuster server!");
            }
          }
        );
      }
      else{
        console.log("config not allow to change now!");
        deferred.reject(0);
      }
      return deferred.promise;
    };

    var disabledStagingConfig=false;
    var disabledRunningConfig=false;

    $scope.disableConfig = function(disableId){
      $("#"+disableId).find("input").each(function() {//show Config
        $(this).attr("disabled", "disabled");
        //$(this).removeAttr("disabled");
      });
    };

    $scope.enableConfig = function(enableId){
      $("#"+enableId).find("input").each(function() {//disable Config
        //$(this).attr("disabled", "disabled");
        $(this).removeAttr("disabled");
      });
    };


    $scope.configStatus = function(){
      if($scope.status === "READY")//show all config
      {
        if(disabledStagingConfig===true)
        {
          disabledStagingConfig=false;
          $scope.enableConfig("stagingConfig");
          $scope.enableConfig("stagingConfig1");
          $("#client_progression_enabled").removeAttr("disabled");

        }
        if(disabledRunningConfig===true) {
          disabledRunningConfig = false;
          $scope.enableConfig("runningConfig");
        }
      }
      else if($scope.status === "STAGED") //show running config
      {
        if(disabledStagingConfig===false)
        {
          disabledStagingConfig=true;
          $scope.disableConfig("stagingConfig");
          $scope.disableConfig("stagingConfig1");
          $("#client_progression_enabled").attr("disabled", "disabled");

        }
        if(disabledRunningConfig===true) {
          disabledRunningConfig = false;
          $scope.enableConfig("runningConfig");
        }
      }
      else//no config can be modified
      {
        if(disabledStagingConfig===false)
        {
          disabledStagingConfig=true;
          $scope.disableConfig("stagingConfig");
          $scope.disableConfig("stagingConfig1");
          $("md-checkbox").attr("disabled", "disabled");

        }
        if(disabledRunningConfig===false) {
          disabledRunningConfig = true;
          $scope.disableConfig("runningConfig");
        }
      }
    };

    var pointNumber = 0;
    $scope.pointNum = function(){
      var point = ".";
      pointNumber = (pointNumber+1)%6;
      for(var x = 0; x < pointNumber; x++)
      {
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

    $scope.checkStatus = function(){
      if($scope.sessionID) {
        kbHttp.getMethod2("/kloudbuster/status/" + $scope.sessionID)
          .then(
          function (response) {  //  .resolve
            $scope.status = response.data.status;
            kbCookie.setStatus($scope.status);
            $scope.configStatus();

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
              $scope.info="";
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
              $scope.info="KloudBuster is Creating VM(s)"+$scope.pointNum();

            }
            else if ($scope.status === "STAGED") {
              $scope.runButton = "Run Test";
              $scope.runStatus = false;
              $scope.setStatus = false;
              $scope.stageButton = "Unstage";
              $scope.setUnstage = false;
              $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants;
              $scope.server_vm_count = $scope.client_vm_count;
              $scope.getReport();
              $(".loading").addClass("pause");
              $scope.statusButton = "btn-success";
              $scope.info="";

            }
            else if ($scope.status === "RUNNING") {
              $scope.runButton = "Stop Test";
              $scope.runStatus = false;
              $scope.setStatus = true;
              $scope.stageButton = "Unstage";
              $scope.setUnstage = true;
              $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants;
              $scope.server_vm_count = $scope.client_vm_count;
              if($scope.config.client.progression.enabled === true) $scope.getReport();
              $(".loading").removeClass("pause");
              $scope.statusButton = "btn-info";
              $scope.info="KloudBuster is Running"+$scope.pointNum();

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
              $scope.info="";

            }
            else if($scope.status === "CLEANING" || $scope.status === "STOPPING")
            {
              $scope.runButton = "Run Test";
              $scope.runStatus = true;
              $scope.setStatus = true;
              $scope.stageButton = "Unstage";
              $scope.setUnstage = true;
              $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants;
              $scope.server_vm_count = $scope.client_vm_count;
              $(".loading").removeClass("pause");
              $scope.statusButton = "btn-info";
              $scope.info="Please Wait"+$scope.pointNum();
            }
          },
          function (response) {  //  .reject
            console.log("get status error:");
            console.log(response);
          }
        );
      }
      else
      {
        $scope.status = "NO SESSION ID";
        kbCookie.setStatus("");
      }
    };
    $scope.checkStatus();


    $scope.setStage = function(){
        kbHttp.postMethod("/kloudbuster/stage/" + $scope.sessionID)
          .then(
          function(response) {  //  .resolve
            //showAlert.showAlert("Staging all resources to run KloudBuster! Please wait...");
            //$scope.checkStatus();
          },
          function(response) {  //  .reject
            console.log("set stage error:");
            console.log(response);
            showAlert.showAlert("Unable to stage resources!");
          }
        );
    };

    $scope.CleanUp = function(){
      $scope.initChart();
      if($scope.sessionID && ($scope.status==="ERROR"||$scope.status==="STAGED")) {
        kbHttp.postMethod("/kloudbuster/cleanup/" + $scope.sessionID)
          .then(
          function(response) {  //  .resolve
            $scope.checkStatus();
            //showAlert.showAlert("Cleanup KloudBuster!");
          },
          function(response) {  //  .reject
            console.log("clean error:");
            console.log(response);
          }
        );
      }
      else{
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



    $scope.runKb = function(){
        kbHttp.postMethod("/kloudbuster/run_test/" + $scope.sessionID)
          .then(
          function(response) {  //  .resolve
            //showAlert.showAlert("Successfully start to run KloudBuster! Please wait...");
            //$scope.checkStatus();
          },
          function(response) {  //  .reject
            console.log("running error:");
            console.log(response);
            showAlert.showAlert("Unable to start test!");
          }
        );
    };

    $scope.stopKb = function(){
      kbHttp.postMethod("/kloudbuster/stop_test/" + $scope.sessionID)
        .then(
        function(response) {  //  .resolve
          //$scope.checkStatus();
          //showAlert.showAlert("Stoping the KloudBuster tests...");
        },
        function(response) {  //  .reject
          console.log("stop error:");
          console.log(response);
          showAlert.showAlert("Unable to stop test!");
        }
      );
    };

    $scope.scaleTest = function(){
      if($scope.status==="RUNNING"){
        //$scope.initChart();
        $scope.stopKb();
      }
      else if($scope.status==="STAGED"){
        var promise = $scope.setConfig(1);
        promise.then(function () {
            $scope.initChart();
            $scope.runKb();
        });
      }
    };
    //$scope.scaleTest = function(){
    //  if($scope.status==="RUNNING"){
    //    //$scope.initChart();
    //    $scope.stopKb();
    //  }
    //  else if($scope.status==="READY"||$scope.status==="STAGED"){
    //    var promise = $scope.setConfig(1);
    //    promise.then(function () {
    //      if ($scope.status === "READY") {
    //        $scope.setStage();
    //      }
    //      else if ($scope.status === "STAGED") {
    //        $scope.initChart();
    //        $scope.runKb();
    //      }
    //      else {
    //      }
    //    });
    //  }
    //};


    //---------------------------table---------------------------
    $scope.tabledata =[];
    //$scope.tabledata =[
    //  {"seq":"a","connection": 1000, "server_vms": 1, "requests": 14200, "sock_err": 0,  "rps": 473, "rate_limit": 5001, "throughput": 0.1 }
    //  ,{"seq":"b","connection": 1000, "server_vms": 1, "requests": 1200, "sock_err": 0,  "rps": 473, "rate_limit": 5001, "throughput": 0.1 }
    //];
    $scope.cols = [
      { field: "seq", title: "SEQ", sortable:"seq", show: true },
      { field: "connection", title: "Connection", sortable:"connection", show: true },
      { field: "server_vms", title: "Server VMs", sortable:"server_vms", show: true },
      { field: "requests", title: "Requests", sortable:"requests", show: true },
      { field: "sock_err", title: "Error", sortable:"sock_err", show: true },
      { field: "rps", title: "RPS measured", sortable:"rps", show: true },
      { field: "rate_limit", title: "RPS requested", sortable:"rate_limit", show: true },
      { field: "throughput", title: "Throughput", sortable:"throughput", show: true },
      { field: "action", title: "Action", sortable:"action", show: true }
    ];
    $scope.tableParams = new ngTableParams(
      {
        sorting: { name: "asc" },
        "count":10
      },
      {
        counts:[],
        data: $scope.tabledata
      });

    //console.log($scope.tableParams);


    //---------------------------chart---------------------------
    $scope.options = {
      axes: {
        x: {key: 'x', type: 'linear',
          ticksFormatter:  function(x) {
            if (x === 0) {return "50%";}
            else if (x === 10) {return "75%";}
            else if (x === 20) {return "90%";}
            else if (x === 30) {return "99%";}
            else if (x === 40) {return "99.9%";}
            else if (x === 50) {return "99.99%";}
            else if (x === 60) {return "99.999%";}
          }
        },
        y: {type: 'log', ticksFormat: 'd', innerTicks: true,grid: true}
      },
      tooltip: {mode: 'scrubber', formatter: function(x, y, series) {return series.label+":"+y;}},
      tension: 0.8,
      lineMode: "cardinal",
      series: [{}]
    };


    //---------------------------init---------------------------
    $scope.initChart = function() {
      $scope.data = [
        {x: 0},
        {x: 10},
        {x: 20},
        {x: 30},
        {x: 40},
        {x: 50},
        {x: 60}
      ];
      $scope.options.series = [{}];
      $scope.isDely = false;

      $scope.tabledata.length = 0;
      $scope.tableParams.reload();

      $scope.isDely = false;
      countRep = 0;
      color.reset();
    };
    var countRep = 0;
    $scope.initChart();

    $scope.refreshChart = function() {
      $scope.data = [
        {x: 0},
        {x: 10},
        {x: 20},
        {x: 30},
        {x: 40},
        {x: 50},
        {x: 60}
      ];
      $scope.options.series = [{}];
      $scope.isDely = false;

      $scope.tabledata.length = 0;
      $scope.tableParams.reload();
      color.reset();
    };



    $scope.getReport = function(){
      kbHttp.getMethod2("/kloudbuster/report/"+$scope.sessionID+"?final=true")
        .then(
        function(response) {  //  .resolve
          console.log("get report totally:"+response.data.length);
          //console.log(response.data);
          if(response.data.length>0 && countRep < response.data.length) {
            countRep = response.data.length;

            $scope.refreshChart();
            //console.log($scope.data);

            interactiveMode.setResult(response.data);

            for(var i = 0 ; i < countRep; i++)
            {
              $scope.result = response.data[i];
              var pickColor = color.getColor();
              if($scope.config.client.progression.enabled) {
                //$scope.name = $scope.config.client.progression.vm_start + $scope.config.client.progression.vm_step * i;

                console.log("show report" + $scope.name);
                $scope.pushChartData("Connection-"+$scope.result.total_connections, $scope.result, pickColor);
                $scope.pushTableData("Connection-"+$scope.result.total_connections, $scope.result, pickColor);
              }
              else{
                console.log("show report" + $scope.name);
                $scope.pushChartData("Final", $scope.result, pickColor);
                $scope.pushTableData("Final", $scope.result, pickColor);
              }
            }
          }
        },
        function(response) {  //  .reject
          console.log("get report error:");
          console.log(response);
        }
      );
      //  $scope.aa='{"latency_stats": [[50, 1727], [75, 2111], [90, 2447], [99, 3023], [99.9, 3263], [99.99, 3295], [99.999, 3327]], "tool": "wrk2", "http_rps": 499, "http_throughput_kbytes": 16122, "http_sock_timeout": 0, "http_total_req": 5002, "http_sock_err": 0}';
      //$scope.aa = '{    "http_rate_limit": 500,     "http_rps": 473,     "http_sock_err": 0,     "http_sock_timeout": 0,     "http_throughput_kbytes": 15257,     "http_total_req": 14200,     "latency_stats": [        [            50,             1855        ],         [            75,             2655        ],         [            90,             14911        ],         [            99,             18815        ],         [            99.9,             27263        ],         [            99.99,             28159        ],         [            99.999,             28415        ]    ],     "tool": "wrk2",     "total_client_vms": 1,     "total_connections": 1000,     "total_server_vms": 1}';
      //$scope.result=JSON.parse($scope.aa);
    };

    $scope.pushChartData = function(chName,chData,pickColor){
      //console.log("chart date"+ chName);

      if ($scope.isDely === false) {
        $scope.options.series.shift();
        $scope.isDely = true;
      }
      $scope.options.series.push({
        y: chName,
        label: chName,
        //color: '#'+ ('000000' + (Math.random()*0xFFFFFF<<0).toString(16)).slice(-6),
        color: pickColor,
        dotSize: "3",
        thickness: "2px"
      });
      //console.log( $scope.options.series);

      for (var i = 0; i < 7; i++) {
        $scope.data[i][chName] = chData.latency_stats[i][1] / 1000;
        //console.log( $scope.data[i]["chName"]);
      }
    };


    $scope.pushTableData = function(taName,taData,pickColor){
      //console.log("table date:"+ taName);
      var temThrou = (taData.http_throughput_kbytes  * 8) / (1000 * 1000);
      $scope.tabledata.push(
        {"seq":taName, "connection": taData.total_connections, "server_vms": taData.total_server_vms, "requests": taData.http_total_req, "sock_err": taData.http_sock_err+taData.http_sock_timeout,  "rps": taData.http_rps, "rate_limit": taData.http_rate_limit, "throughput": temThrou.toFixed(2), "description":taData.description,"color":pickColor}
      );
      $( "<style>md-checkbox.md-checked."+taName+" .md-icon {background-color: "+pickColor+";</style>" ).appendTo( "head" );

      //console.log($scope.tableParams);
      $scope.tableParams.reload();

    };

    function downloadFile(fileName, content){
      var aLink = document.createElement('a');
      var blob = new Blob([content]);
      var evt = document.createEvent("HTMLEvents");
      evt.initEvent("click", false, false);//initEvent
      aLink.download = fileName;
      aLink.href = URL.createObjectURL(blob);
      aLink.dispatchEvent(evt);
    }
    //$scope.saveResult = function(index){
    //  var date = new Date();
    //  var m = date.getMonth()+1;//month (0-11,0 = Jan., remember to add 1)
    //  var d = date.getDate();//day(1-31)
    //  var h = date.getHours();//hour(0-23)
    //  var min = date.getMinutes();//minute(0-59)
    //  var filename = ""+m+d+h+min+index+".json";
    //  //console.log(filename);
    //  var saveData = interactiveMode.getResult();
    //  //console.log(saveData);
    //  if(saveData[index]!="")
    //    downloadFile(filename, JSON.stringify(saveData[index]));
    //  else console.log("no file to save");
    //};

    $scope.saveResult = function(){
      var date = new Date();
      var m = to2(date.getMonth()+1);//month (0-11,0 = Jan., remember to add 1)
      var d = to2(date.getDate());//day(1-31)
      var h = to2(date.getHours());//hour(0-23)
      var min = to2(date.getMinutes());//minute(0-59)
      var filename = ""+m+d+h+min+".html";
      //console.log(filename);
      var saveData = interactiveMode.getResult();
      //console.log(saveData);
      if(saveData!="")
      {
        var myresult = '<!--Copyright 2015 Cisco Systems, Inc. All rights reserved.--> <!--Licensed under the Apache License, Version 2.0 (the "License"); you may--> <!--not use this file except in compliance with the License. You may obtain--> <!--a copy of the License at--> <!--http://www.apache.org/licenses/LICENSE-2.0--> <!--Unless required by applicable law or agreed to in writing, software--> <!--distributed under the License is distributed on an "AS IS" BASIS, WITHOUT--> <!--WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the--> <!--License for the specific language governing permissions and limitations--> <!--under the License.--> <!DOCTYPE html> <html lang="en-US" ng-app="app"> <head> <meta charset="utf-8"> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <meta name="viewport" content="width=device-width, initial-scale=1"> <title>KloudBuster Report</title> <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.4.2/angular.min.js"></script> <script src="https://d3js.org/d3.v3.min.js"></script> <script src="https://cdnjs.cloudflare.com/ajax/libs/line-chart/2.0.3/LineChart.min.js"></script> <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/line-chart/2.0.3/LineChart.min.css"> <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/ng-table/0.8.3/ng-table.min.css"> <script src="https://cdnjs.cloudflare.com/ajax/libs/ng-table/0.8.3/ng-table.min.js"></script> <link rel="stylesheet" href="https://bootswatch.com/flatly/bootstrap.min.css"> <script src="https://code.jquery.com/jquery-2.2.0.min.js"></script> <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script> <style rel="stylesheet"> .hidden { display: inline !important; } .label { padding: 0; font-size: 110%; font-weight: normal; line-height: 16; color: #000000; text-align: center; } </style> </head> <body ng-controller="MainCtrl"> <nav class="navbar navbar-default"> <div class="container-fluid"> <div class="navbar-header"> <a class="navbar-brand" href="#">KloudBuster Report</a> </div> <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1"> <ul class="nav navbar-nav navbar-right"> <li><a href="#">'+m+'-'+d + ' ' + h +':'+ min +'</a></li> </ul> </div> </div> </nav> <div class="container"> <div class="my-chart" style="height: 400px;margin-bottom: 10%"> <linechart data="data" options="options"></linechart> </div> <table ng-table="tableParams" class="table table-responsive table-condensed table-bordered table-striped"> <tr ng-repeat="row in tableParams.data" style="text-align:center;"> <td title="cols[0].title" ng-if="cols[0].show" style="margin:0 auto;padding:0;"> <button class="btn btn-default btn-xs {{row.seq}}" ng-click="" style="height: 22px;width: 24px;"></button> </td> <td title="cols[1].title" data-sortable="cols[1].field" ng-if="cols[1].show">{{row.connection}}</td> <td title="cols[2].title" data-sortable="cols[2].field" ng-if="cols[2].show">{{row.server_vms}}</td> <td title="cols[3].title" data-sortable="cols[3].field" ng-if="cols[3].show">{{row.requests}}</td> <td title="cols[4].title" data-sortable="cols[4].field" ng-if="cols[4].show">{{row.sock_err}}</td> <td title="cols[5].title" data-sortable="cols[5].field" ng-if="cols[5].show">{{row.rps}}</td> <td title="cols[6].title" data-sortable="cols[6].field" ng-if="cols[6].show">{{row.rate_limit}}</td> <td title="cols[7].title" data-sortable="cols[7].field" ng-if="cols[7].show">{{row.throughput}} Gbps</td> </tr> </table> </div> <script type="text/javascript"> angular.module("app", ["n3-line-chart", "ngTable"]).controller("MainCtrl", function ($scope, color, ngTableParams) { $scope.result = '+ JSON.stringify(saveData) +'; var countRep = $scope.result.length; $scope.data = {dataset0: [{x: 0}, {x: 10}, {x: 20}, {x: 30}, {x: 40}, {x: 50}, {x: 60}]}; $scope.options = { series: [], axes: { x: { key: "x", type: "linear", tickFormat: function (value) { if (value === 0) { return "50%" } else if (value === 10) { return "75%" } else if (value === 20) { return "90%" } else if (value === 30) { return "99%" } else if (value === 40) { return "99.9%" } else if (value === 50) { return "99.99%" } else if (value === 60) { return "99.999%" } } }, y: { type: "log", ticksFormat: "d", ticks: 10, tickFormat: function (value, index) { return value } } }, margin: {top: 20, right: 30, bottom: 20, left: 30}, grid: {x: false, y: true} }; $scope.tabledata = []; $scope.cols = [{field: "seq", title: "SEQ", sortable: "seq", show: true}, { field: "connection", title: "Connection", sortable: "connection", show: true }, {field: "server_vms", title: "Server VMs", sortable: "server_vms", show: true}, { field: "requests", title: "Requests", sortable: "requests", show: true }, {field: "sock_err", title: "Error", sortable: "sock_err", show: true}, { field: "rps", title: "RPS measured", sortable: "rps", show: true }, {field: "rate_limit", title: "RPS requested", sortable: "rate_limit", show: true}, { field: "throughput", title: "Throughput", sortable: "throughput", show: true },]; $scope.tableParams = new ngTableParams({sorting: {name: "asc"}, "count": 10}, { counts: [], data: $scope.tabledata }); $scope.pushTableData = function (taName, taData, pickColor) { var temThrou = (taData.http_throughput_kbytes * 8) / (1000 * 1000); $scope.tabledata.push({ "seq": taName, "connection": taData.total_connections, "server_vms": taData.total_server_vms, "requests": taData.http_total_req, "sock_err": taData.http_sock_err + taData.http_sock_timeout, "rps": taData.http_rps, "rate_limit": taData.http_rate_limit, "throughput": temThrou.toFixed(2), "description": taData.description, "color": pickColor }); $("<style>button." + taName + " {background-color: " + pickColor + ";</style>").appendTo("head"); $scope.tableParams.reload() }; for (var i = 0; i < countRep; i++) { $scope.perrow = $scope.result[i]; var pickColor = color.getColor(); if (1) { chName = "Connection-" + $scope.perrow.total_connections; $scope.options.series.push({ label: chName, color: pickColor, dotSize: "3", thickness: "2px", axis: "y", dataset: "dataset0", key: chName, type: ["line", "dot"], id: chName, interpolation: {mode: "cardinal", tension: 0.8} }); for (var j = 0; j < 7; j++) { $scope.data.dataset0[j][chName] = $scope.perrow.latency_stats[j][1] / 1000 } $scope.pushTableData("Connection-" + $scope.perrow.total_connections, $scope.perrow, pickColor) } } }).service("color", function () { var self = this; var num = -1; var colorList = ["#F44336", "#673AB7", "#03A9F4", "#4CAF50", "#FFEB3B", "#BF360C", "#795548", "#E91E63", "#3F51B5", "#00BCD4", "#CDDC39", "#FF9800", "#9E9E9E", "#9C27B0", "#009688"]; var length = colorList.length; this.getColor = function () { num = (num + 1) % length; return colorList[num] }; this.reset = function () { num = -1 } }); </script> </body> </html>';
        downloadFile(filename, myresult);

      }
      else console.log("no file to save");
    };

    setInterval(function(){
      $scope.checkStatus();
    },1000);// 1 sec

    $(function () {
      $('[data-toggle="tooltip"]').tooltip()
    });

    function to2(num){
      if (num < 10)
        return "0" + num;
      else if (num < 99)
        return "" + num;
      else return -1;
    }

  })
  .service('interactiveMode', function() {
    var self = this;

    var result=[];
    this.getResult = function(){
      return result;
    };
    this.setResult = function(res){
      result = res;
      return result;
    };


  })
  .service('color', function() {
    var self = this;
    var num=-1;
    var colorList=["#F44336","#673AB7","#03A9F4","#4CAF50","#FFEB3B","#BF360C","#795548","#E91E63","#3F51B5","#00BCD4","#CDDC39","#FF9800","#9E9E9E","#9C27B0","#009688"];
    var length = colorList.length;
    this.getColor = function(){
      num = (num+1) % length;
      return colorList[num];
    };
    this.reset = function(){
      num = -1;
    };

  })

  .directive('convertToNumber', function() {
    return {
      require: 'ngModel',
      link: function(scope, element, attrs, ngModel) {
        ngModel.$parsers.push(function(val) {
          return parseFloat(val);
        });
        ngModel.$formatters.push(function(val) {
          return '' + val;
        });
      }
    };
  });

