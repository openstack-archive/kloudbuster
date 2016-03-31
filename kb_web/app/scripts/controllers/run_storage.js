//Copyright 2016 Cisco Systems, Inc. All rights reserved.
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
 * Created by xiyu3 on 2/22/16.
 */

'use strict';

angular.module('kbWebApp')
  .controller('RunStorageCtrl', function ($scope, $timeout, $location, $http, $q, showAlert, ngTableParams, kbCookie, kbHttp, storageMode, color, locationChange) {
    this.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];


    if(kbCookie.getSessionID()==="") $location.path('/Login');
    else kbCookie.checkMode('storage');
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


    $scope.oneAtATime = false;
    $scope.status1 = {
      isFirstOpen: true,
      isFirstDisabled: false
    };
    $scope.status2 = {
      isFirstOpen: true,
      isFirstDisabled: false
    };
    $scope.status1.open = true;
    $scope.status2.open = true;


    $scope.sessionID=kbCookie.getSessionID();
    $scope.status=kbCookie.getStatus();
    //$scope.config=kbCookie.getConfig();



    //$scope.credentials=kbCookie.getCredentials();

    $scope.getRunConfig = function() {
      kbHttp.getMethod("/config/running_config/" + $scope.sessionID)
        .then(
        function(response) {  //  .resolve
          $scope.config = response.data;
          kbCookie.setConfig(response.data);

          $scope.current_mode_name = $scope.config.client.storage_tool_configs[0]['mode'];
          $scope.current_mode_description = $scope.config.client.storage_tool_configs[0]['description'];
          $scope.getCurrentMode($scope.current_mode_name,'read');

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

    $scope.setConfig = function(ifRun) {
      var deferred = $q.defer();

      if($scope.status==="READY") {
        $scope.config.server.number_tenants = 1;
        $scope.config.server.routers_per_tenant = 1;
        $scope.config.server.networks_per_router = 1;
        $scope.config.server.secgroups_per_network = 1;

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
          $("#client_progression_vm_start").removeAttr("disabled");


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
          $("#client_progression_vm_start").attr("disabled", "disabled");

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
              //$scope.server_vm_count = 0;
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
              //$scope.server_vm_count = response.data.server_vm_count;
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
              //$scope.server_vm_count = $scope.client_vm_count;
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
              //$scope.server_vm_count = $scope.client_vm_count;
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
              //$scope.server_vm_count = $scope.client_vm_count;
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
              //$scope.server_vm_count = $scope.client_vm_count;
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

    //--------------result--------------
    //$scope.modes = [
    //  {title: "Rand Read", icon: "", id: "randread", init: "",y_axis:"IOPs/VM",y_label:"RATE IOPs Per VM"},
    //  {title: "Rand Write", icon: "", id: "randwrite", init: "",y_axis:"IOPs/VM",y_label:"RATE IOPs Per VM"},
    //  {title: "Seq Read", icon: "", id: "read", init: "",y_axis: "BW/VM(KB/s)",y_label:"RATE BW Per VM"},
    //  {title: "Seq Write", icon: "", id: "write", init: "",y_axis: "BW/VM(KB/s)",y_label:"RATE BW Per VM"}
    //];
    //
    //$scope.current_mode = $scope.modes[0];
    //var content = "";
    ////draw_chart($scope, ngTableParams, content);
    //
    //$scope.handleEvent = function(event, index) {
    //  $scope.current_index = index;
    //  $scope.current_mode = $scope.modes[index];
    //  $scope.refreshChart();
    //  if (storageMode.getResult().length>0)
    //    $scope.draw(storageMode.getResult());
    //};

    //--------------result--------------
    $scope.modes = {
      "randread": {
        name:"randread",
        title: "Rand Read",
        group: ["rand", "read"],
        y_axis: "IOPs/VM",
        y_label: "RATE IOPs Per VM"
      },
      "randwrite": {
        name:"randwrite",
        title: "Rand Write",
        group: ["rand", "write"],
        y_axis: "IOPs/VM",
        y_label: "RATE IOPs Per VM"
      },
      "read": {
        name:"read",
        title: "Seq Read",
        group: ["seq", "read"],
        y_axis: "BW/VM(KB/s)",
        y_label: "RATE BW Per VM"
      },
      "write": {
        name:"write",
        title: "Seq Write",
        group: ["seq", "write"],
        y_axis: "BW/VM(KB/s)",
        y_label: "RATE BW Per VM"
      },
      "randrw": {
        name:"randrw",
        title: "Rand Read/Write",
        span:"caret",
        group: ["rand", "mix"],
        y_axis: "IOPs/VM",
        y_label: "RATE IOPs Per VM"
      },
      "rw": {
        name:"rw",
        title: "Seq Read/Write",
        span:"caret",
        group: ["seq", "mix"],
        y_axis: "BW/VM(KB/s)",
        y_label: "RATE BW Per VM"
      }
    };

    //$scope.current_mode_name = "randread";
    //$scope.current_mode_name = $scope.config.client.storage_tool_configs[0]['mode'];
    //$scope.current_mode = $scope.modes[$scope.current_mode_name];

    //var content = "";
    //draw_chart($scope, ngTableParams, content);

    $scope.current_index = 0;

    $scope.getCurrentMode = function(modeName, formix, readpct){
      if (modeName == 'rw'){
        if(formix == '') formix='read';
        $scope.current_mode = $scope.modes[formix];
        if (formix=='read') $scope.current_title = '- ' +readpct +'% Read';
        else $scope.current_title = '- ' +(100-readpct) +'% Write';
      }
      else if (modeName == 'randrw'){
        if(formix == '') formix='read';
        $scope.current_mode = $scope.modes['rand'+formix];
        if (formix=='read') $scope.current_title = '- ' +readpct +'% Read';
        else $scope.current_title = '- ' +(100-readpct) +'% Write';
      }
      else{
        $scope.current_mode = $scope.modes[$scope.current_mode_name];
        $scope.current_title = '';
      }

    };

    if($scope.config=kbCookie.getConfig())
    {
      $scope.current_mode_name = $scope.config.client.storage_tool_configs[0]['mode'];
      $scope.current_mode_description = $scope.config.client.storage_tool_configs[0]['description'];
      $scope.getCurrentMode($scope.current_mode_name,'read');
    }

    $scope.handleEvent = function(event, index, formix) {
      $scope.current_index = index;
      $scope.current_mode_name = $scope.config.client.storage_tool_configs[index]['mode'];
      $scope.current_mode_description=$scope.config.client.storage_tool_configs[index]['description'];

      $scope.getCurrentMode($scope.current_mode_name, formix,
        $scope.config.client.storage_tool_configs[index]['rwmixread']);

      $scope.refreshChart();

      if (storageMode.getResult().length>0)
        $scope.draw(storageMode.getResult());
    };

    //---------------------------table---------------------------
    $scope.tabledata =[];
    $scope.cols = [
      {
        field: "seq", title: "SEQ", sortable: "seq", show: true
      },
      {
        field: "mode", title: "Mode", sortable: "mode", show: true
      },
      {
        field: "total_client_vms", title: "Client VMs", sortable: "total_client_vms", show: true
      },
      {
        field: "block_size", title: "Block Size", sortable: "block_size", show: true
      },
      {
        field: "iodepth", title: "IO Depth", sortable: "iodepth", show: true
      },
      {
        field: "rate_iops", title: "Requested IOPS", sortable: "rate_iops", show: true
      },
      {
        field: "read_iops", title: "Read IOPS", sortable: "read_iops", show: true
      },
      {
        field: "write_iops", title: "Write IOPS", sortable: "write_iops", show: true
      },
      {
        field: "rate", title: "Requested BW", sortable: "rate", show: true
      },
      {
        field: "read_bw", title: "Read BW", sortable: "read_bw", show: true
      },
      {
        field: "write_bw", title: "Write BW", sortable: "write_bw", show: true
      }];
    $scope.tableParams = new ngTableParams({sorting: {name: "asc"}, "count": 10}, {
      counts: [],
      data: $scope.tabledata
    });

    //---------------------------chart---------------------------
    $scope.options = {
      series: [
        {y: 'IOPS', color: '#F44336', type: 'column', striped: true, label:"RATE IOPS/BW PER VM"
          //, label: $scope.current_mode["y_label"]
        },
        {
          y: 'requested_rate',
          color: '#696969',
          drawDots: false,
          thickness: '1px',
          label: 'Requested Rate',
          lineMode: "dashed"
        },
        {
          y: 'latency1',
          axis: 'y2',
          color: '#673AB7',
          drawDots: true,
          dotSize: 4,
          thickness: '3px',
          label: 'Latency(ms)--90%'
        },
        {
          y: 'latency2',
          axis: 'y2',
          color: '#03A9F4',
          drawDots: true,
          dotSize: 4,
          thickness: '3px',
          label: 'Latency(ms)--99%'
        },
        {
          y: 'latency3',
          axis: 'y2',
          color: '#E91E63',
          drawDots: true,
          dotSize: 4,
          thickness: '3px',
          label: 'Latency(ms)--99.9%'
        }
      ],
      axes: {
        x: {key: 'x', type: 'linear', ticks: $scope.xaxisList, ticksFormatter:  function(x) {
          if($.inArray(x, $scope.xaxisList)!=-1) {
            if (x == 0) return "1";
            else return x;
          }
          else return "";
        }},
        y: {
          type: 'linear',
          ticksFormat: 'd',
          innerTicks: true,
          //max: max * 1.0005,
          min: 0
        },
        y2: {
          type: 'log',
          ticksFormat: 'd',
          innerTicks: false,
          grid: true
          //min: get_min_hist($scope.results) / 1000
        }
      },
      tooltip: {
        mode: 'scrubber', formatter: function (x, y, series) {
          return series.label + ":" + y;
        }
      },
      tension: 0.8,
      lineMode: "cardinal",
      columnsHGap: 45
    };


    //---------------------------init---------------------------
    $scope.initChart = function() {
      $scope.data = [];
      //$scope.options.series = [{}];
      $scope.isDely = false;

      $scope.tabledata.length = 0;
      $scope.tableParams.reload();

      $scope.isDely = false;
      countRep = 0;
      color.reset();
      storageMode.setResult([]);
    };
    var countRep = 0;
    $scope.initChart();

    $scope.refreshChart = function() {
      $scope.data = [];
      //$scope.options.series = [{}];
      $scope.isDely = false;

      $scope.tabledata.length = 0;
      $scope.tableParams.reload();
      color.reset();
    };


    $scope.getReport = function(){
      kbHttp.getMethod2("/kloudbuster/report/"+$scope.sessionID+"?final=true")
        .then(
        function(response) {  //  .resolve
          //response.data=
          //response.data = JSON.parse(response.data);
          //console.log(response.data);
          if(response.data["kb_result"].length>0 && countRep < response.data["kb_result"].length) {
            console.log("get report totally:"+response.data["kb_result"].length);
            countRep = response.data["kb_result"].length;

            storageMode.setResult(response.data);

            $scope.refreshChart();
            $scope.draw(response.data);
          }
        },
        function(response) {  //  .reject
          console.log("get report error:");
          console.log(response);
        }
      );

    };

    $scope.draw = function(results){
      $scope.results = results["kb_result"];
      var countRep = $scope.results.length;
      var countRep2 = $scope.results[0].length;
      var mode = $scope.current_mode['name'];

      var max;
      $scope.xaxisList = [];
      for (var i = 0; i < countRep; i++) {
        for (var k = 0; k < countRep2; k++) {
          $scope.perrow = $scope.results[i][k];
          if ($scope.perrow["mode"] == $scope.current_mode_name && $scope.perrow["description"] == $scope.current_mode_description) {

            if($scope.perrow.total_client_vms == 1 && countRep!=1) $scope.xaxis = 0;
            else $scope.xaxis = $scope.perrow.total_client_vms;
            $scope.xaxisList.push($scope.xaxis);
            //----chart data----
            if (mode == "randread") {
              $scope.data.push({
                x: $scope.xaxis,
                "IOPS": $scope.perrow.read_iops / $scope.perrow.total_client_vms,
                "latency1": $scope.perrow.read_hist[2][1] / 1000,
                "latency2": $scope.perrow.read_hist[3][1] / 1000,
                "latency3": $scope.perrow.read_hist[4][1] / 1000,
                "requested_rate": $scope.perrow.rate_iops / $scope.perrow.total_client_vms
              });
              max = $scope.perrow.rate_iops / $scope.perrow.total_client_vms;
            }
            if (mode == "randwrite") {
              $scope.data.push({
                x: $scope.xaxis,
                "IOPS": $scope.perrow.write_iops / $scope.perrow.total_client_vms,
                "latency1": $scope.perrow.write_hist[2][1] / 1000,
                "latency2": $scope.perrow.write_hist[3][1] / 1000,
                "latency3": $scope.perrow.write_hist[4][1] / 1000,
                "requested_rate": $scope.perrow.rate_iops / $scope.perrow.total_client_vms
              });
              max = $scope.perrow.rate_iops / $scope.perrow.total_client_vms;

            }
            if (mode == "read") {
              $scope.data.push({
                x: $scope.xaxis,
                "IOPS": $scope.perrow.read_bw / $scope.perrow.total_client_vms,
                "latency1": $scope.perrow.read_hist[2][1] / 1000,
                "latency2": $scope.perrow.read_hist[3][1] / 1000,
                "latency3": $scope.perrow.read_hist[4][1] / 1000,
                "requested_rate": $scope.perrow.rate / $scope.perrow.total_client_vms
              });
              max = $scope.perrow.rate / $scope.perrow.total_client_vms;

            }
            if (mode == "write") {
              $scope.data.push({
                x: $scope.xaxis,
                "IOPS": $scope.perrow.write_bw / $scope.perrow.total_client_vms,
                "latency1": $scope.perrow.write_hist[2][1] / 1000,
                "latency2": $scope.perrow.write_hist[3][1] / 1000,
                "latency3": $scope.perrow.write_hist[4][1] / 1000,
                "requested_rate": $scope.perrow.rate / $scope.perrow.total_client_vms
              });
              max = $scope.perrow.rate / $scope.perrow.total_client_vms;
            }
            //-------table data-------
            var pickColor = color.getColor();
            var chName = "mode-" + $scope.perrow.mode + "_VM-" + $scope.perrow.total_client_vms;
            $scope.pushTableData(chName, $scope.perrow, pickColor)

          }
        }
      }
      $scope.options.axes.y["max"]=max * 1.0005;
      $scope.options.axes.y2["min"]=get_min_hist($scope.results) / 1000;
      $scope.options.series[0]["label"]= $scope.current_mode["y_label"];
    };

    function get_min_hist(results) {
      var min = Number.POSITIVE_INFINITY;
      results.forEach(function (rr) {
        rr.forEach(function (d) {
          if ('write_hist' in d) {
            min = Math.min(min, d.write_hist[0][1]);
          }
          if ('read_hist' in d) {
            min = Math.min(min, d.read_hist[0][1]);
          }
        });
      });
      return min;
    }


    $scope.pushChartData = function(chName,chData,pickColor){
      //console.log("chart date"+ chName);

      if ($scope.isDely === false) {
        $scope.options.series.shift();
        $scope.isDely = true;
      }
      $scope.options.series.push({
        y: chName,
        label: chName,
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

    $scope.pushTableData = function (taName, taData, pickColor) {
      $scope.tabledata.push({
        "seq": taName,
        "mode": taData.mode,
        "total_client_vms": taData.total_client_vms,
        "block_size": taData.block_size,
        "iodepth": taData.iodepth,
        "rate_iops": taData.rate_iops,
        "read_bw": taData.read_bw,
        "write_bw": taData.write_bw,
        "read_iops": taData.read_iops,
        "write_iops": taData.write_iops,
        "rate": taData.rate,
        "color": pickColor
      });
      $scope.tableParams.reload()
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

    $scope.saveResult = function(){
      var date = new Date();
      var m = to2(date.getMonth()+1);//month (0-11,0 = Jan., remember to add 1)
      var d = to2(date.getDate());//day(1-31)
      var h = to2(date.getHours());//hour(0-23)
      var min = to2(date.getMinutes());//minute(0-59)
      var filename = ""+m+d+h+min+".html";
      //console.log(filename);
      var saveData = storageMode.getResult();
      //console.log(saveData);
      if(saveData!="")
      {
        var myresult = '<!--Copyright 2016 Cisco Systems, Inc. All rights reserved.--> <!--Licensed under the Apache License, Version 2.0 (the "License"); you may--> <!--not use this file except in compliance with the License. You may obtain--> <!--a copy of the License at--> <!--http://www.apache.org/licenses/LICENSE-2.0--> <!--Unless required by applicable law or agreed to in writing, software--> <!--distributed under the License is distributed on an "AS IS" BASIS, WITHOUT--> <!--WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the--> <!--License for the specific language governing permissions and limitations--> <!--under the License.--> <!DOCTYPE html> <html lang="en-US" ng-app="app"> <head> <meta charset="utf-8"> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <meta name="viewport" content="width=device-width, initial-scale=1"> <title>KloudBuster Report</title> <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.4.2/angular.min.js"></script> <script src="https://d3js.org/d3.v3.min.js"></script> <!--<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/line-chart/2.0.3/LineChart.min.css">--> <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/ng-table/0.8.3/ng-table.min.css"> <script src="https://cdnjs.cloudflare.com/ajax/libs/ng-table/0.8.3/ng-table.min.js"></script> <link rel="stylesheet" href="https://bootswatch.com/flatly/bootstrap.min.css"> <script src="https://code.jquery.com/jquery-2.2.0.min.js"></script> <script src="https://cdnjs.cloudflare.com/ajax/libs/line-chart/1.1.12/line-chart.min.js"></script> <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script> </head> <body ng-controller="MainCtrl"> <nav class="navbar navbar-default"> <div class="container-fluid"> <a class="navbar-brand" ng-href="#/" style="font-family: Arial"> <span style="color:#DF314D">K</span>loudBuster </a> <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1"> <ul class="nav navbar-nav" ng-init="tab=0"> <li ng-class="{active:tab==0}" ng-click="tab=0"> <a><span class="glyphicon" aria-hidden="true" ></span>Report</a> </li> <li ng-class="{active:tab==1}" ng-click="tab=1" ng-show="config == true"> <a><span class="glyphicon" aria-hidden="true" ></span>Configuration</a> </li> </ul> <!--<ul class="nav navbar-nav navbar-right">--> <!--<li><a href="#"></a></li>--> <!--</ul>--> </div> </div> </nav> <div class="container" ng-show="tab == 0"> <h3>KloudBuster Storage Testing Report</h3> <ul class="nav nav-tabs"> <li ng-repeat="title in titleList" ng-class="{active: current_index==$index}" ng-click="handleEvent($event, $index,\'\')"> <a data-toggle="tab" aria-expanded="true"> {{title["description"]}} <span class="{{modes[title[\'mode\']][\'span\']}}"></span> </a> </li> </ul> <ul class="nav nav-tabs" style="margin-top: 5px" ng-style="{height:current_mode_name ==\'rw\' || current_mode_name ==\'randrw\'?\'\':0, width:current_mode_name ==\'rw\' || current_mode_name ==\'randrw\'?\'30%\':0}"> <li ng-show="current_mode_name ==\'rw\' || current_mode_name ==\'randrw\'" ng-class="{active:current_mode[\'name\']==\'read\' || current_mode[\'name\']==\'randread\'}"> <a ng-click="handleEvent($event, current_index,\'read\')">Read</a> </li> <li ng-show="current_mode_name ==\'rw\' || current_mode_name ==\'randrw\'" ng-class="{active:current_mode[\'name\']==\'write\' || current_mode[\'name\']==\'randwrite\'}"> <a ng-click="handleEvent($event, current_index,\'write\')">Write</a> </li> </ul> <h4 style="text-align: center"> {{current_mode_description}}</h4> <h5 style="text-align: center">{{modes[current_mode_name]["title"]}} {{current_title}} ({{storage_target[from_outside.storage_target]}})</h5> <div class="my-chart" style="height: 550px;margin-bottom: 5%"> <h6 style="margin-bottom:0"><span>{{current_mode["y_axis"]}}</span><span style="float:right">Latency(ms)</span></h6> <linechart data="data" options="options"></linechart> </div> <table ng-table="tableParams" class="table table-responsive table-condensed table-bordered table-striped"> <tr ng-repeat="row in tableParams.data" style="text-align:center;"> <td title="cols[2].title" data-sortable="cols[2].field">{{row.total_client_vms}}</td> <td title="cols[3].title" data-sortable="cols[3].field">{{row.block_size}}b</td> <td title="cols[4].title" data-sortable="cols[4].field">{{row.iodepth}}</td> <td title="cols[5].title" data-sortable="cols[5].field" ng-if="current_mode.group[0] == \'rand\'"> {{row.rate_iops}} </td> <td title="cols[6].title" data-sortable="cols[6].field" ng-if="current_mode.group[1] == \'read\'"> {{row.read_iops}} </td> <td title="cols[7].title" data-sortable="cols[7].field" ng-if="current_mode.group[1] == \'write\'"> {{row.write_iops}} </td> <td title="cols[8].title" data-sortable="cols[8].field" ng-if="current_mode.group[0] == \'seq\'"> {{row.rate}} KB/s </td> <td title="cols[9].title" data-sortable="cols[9].field" ng-if="current_mode.group[1] == \'read\'"> {{row.read_bw}} KB/s </td> <td title="cols[10].title" data-sortable="cols[10].field" ng-if="current_mode.group[1] == \'write\'"> {{row.write_bw}} KB/s </td> </tr> </table> </div> <div class="container" ng-show="tab == 1"> <h3>KloudBuster HTTP Testing Configuration</h3> <div class="panel panel-default"> <div class="panel-body" style="word-wrap:break-word"> <textarea style="width: 100%;height: 900px" disabled> {{from_outside_config}}</textarea> </div> </div> </div> <footer style="text-align: center;"> <hr style="margin:2px"/> <h6 style="color:gray">{{from_outside["time"]}} - KloudBuster {{from_outside["version"]}}</h6> </footer> <script type="text/javascript"> var num = -1; var colorList = ["#F44336", "#673AB7", "#03A9F4", "#4CAF50", "#FFEB3B", "#BF360C", "#795548", "#E91E63", "#3F51B5", "#00BCD4", "#CDDC39", "#FF9800", "#9E9E9E", "#9C27B0", "#009688"]; var length = colorList.length; function get_color() { num = (num + 1) % length; return colorList[num]; } var modes = { "randread": { name:"randread", title: "Rand Read", group: ["rand", "read"], y_axis: "IOPs/VM", y_label: "RATE IOPs Per VM" }, "randwrite": { name:"randwrite", title: "Rand Write", group: ["rand", "write"], y_axis: "IOPs/VM", y_label: "RATE IOPs Per VM" }, "read": { name:"read", title: "Seq Read", group: ["seq", "read"], y_axis: "BW/VM(KB/s)", y_label: "RATE BW Per VM" }, "write": { name:"write", title: "Seq Write", group: ["seq", "write"], y_axis: "BW/VM(KB/s)", y_label: "RATE BW Per VM" }, "randrw": { name:"randrw", title: "Rand Read/Write", span:"caret", group: ["rand", "mix"], y_axis: "IOPs/VM", y_label: "RATE IOPs Per VM" }, "rw": { name:"rw", title: "Seq Read/Write", span:"caret", group: ["seq", "mix"], y_axis: "BW/VM(KB/s)", y_label: "RATE BW Per VM" } }; var storage_target = {"volume":"Cinder Volume","ephemeral":"Ephemeral Disk"}; angular.module("app", ["n3-line-chart", "ngTable"]).controller("MainCtrl", function ($scope, ngTableParams) { $scope.current_index = 0; $scope.modes = modes; $scope.storage_target = storage_target; if($scope.config = true) $scope.from_outside_config = JSON.stringify('+JSON.stringify(kbCookie.getConfig())+', null, "\t"); $scope.from_outside = '+JSON.stringify(saveData)+'; content = $scope.from_outside["kb_result"]; $scope.titleList = []; get_title($scope,content); draw_chart($scope, ngTableParams, content); $scope.handleEvent = function(event, index, formix) { $scope.current_index = index; $scope.current_mode_name = $scope.titleList[index]["mode"]; $scope.current_mode_description = $scope.titleList[index]["description"]; getCurrentMode($scope, $scope.current_mode_name, formix, content[0][index]["rwmixread"]); draw_chart($scope, ngTableParams, content); }; }); function get_title($scope, content){ for( var item in content[0]) { $scope.titleList.push({"mode": content[0][item]["mode"], "description": content[0][item]["description"]}); } $scope.current_mode_name = $scope.titleList[0]["mode"]; $scope.current_mode_description = $scope.titleList[0]["description"]; $scope.current_mode = $scope.modes[$scope.current_mode_name]; getCurrentMode($scope, $scope.current_mode_name, "",content[0][0]["rwmixread"]); } function getCurrentMode($scope, modeName, formix, readpct){ if (modeName == "rw"){ if(formix == "") formix="read"; $scope.current_mode = $scope.modes[formix]; if (formix=="read") $scope.current_title = "- " +readpct +"% Read"; else $scope.current_title = "- " +(100-readpct) +"% Write"; } else if (modeName == "randrw"){ if(formix == "") formix="read"; $scope.current_mode = $scope.modes["rand"+formix]; if (formix=="read") $scope.current_title = "- " +readpct +"% Read"; else $scope.current_title = "- " +(100-readpct) +"% Write"; } else{ $scope.current_mode = $scope.modes[$scope.current_mode_name]; $scope.current_title = ""; } } function get_min_hist(results) { var min = Number.POSITIVE_INFINITY; results.forEach(function (rr) { rr.forEach(function (d) { if ("write_hist" in d) { min = Math.min(min, d.write_hist[0][1]); } if ("read_hist" in d) { min = Math.min(min, d.read_hist[0][1]); } }); }); return min; } function draw_chart($scope, ngTableParams, results) { $scope.results = results; var countRep = $scope.results.length; var countRep2 = $scope.results[0].length; var mode = $scope.current_mode["name"]; $scope.tabledata = []; $scope.cols = [ { field: "seq", title: "SEQ", sortable: "seq", show: true }, { field: "mode", title: "Mode", sortable: "mode", show: true }, { field: "total_client_vms", title: "Client VMs", sortable: "total_client_vms", show: true }, { field: "block_size", title: "Block Size", sortable: "block_size", show: true }, { field: "iodepth", title: "IO Depth", sortable: "iodepth", show: true }, { field: "rate_iops", title: "Requested IOPS", sortable: "rate_iops", show: true }, { field: "read_iops", title: "Read IOPS", sortable: "read_iops", show: true }, { field: "write_iops", title: "Write IOPS", sortable: "write_iops", show: true }, { field: "rate", title: "Requested BW", sortable: "rate", show: true }, { field: "read_bw", title: "Read BW", sortable: "read_bw", show: true }, { field: "write_bw", title: "Write BW", sortable: "write_bw", show: true }]; $scope.tableParams = new ngTableParams({sorting: {name: "asc"}, "count": 10}, { counts: [], data: $scope.tabledata }); $scope.pushTableData = function (taName, taData, pickColor) { $scope.tabledata.push({ "seq": taName, "mode": taData.mode, "total_client_vms": taData.total_client_vms, "block_size": taData.block_size, "iodepth": taData.iodepth, "rate_iops": taData.rate_iops, "read_bw": taData.read_bw, "write_bw": taData.write_bw, "read_iops": taData.read_iops, "write_iops": taData.write_iops, "rate": taData.rate, "color": pickColor }); $scope.tableParams.reload() }; var max; $scope.xaxisList = []; $scope.data = []; for (var i = 0; i < countRep; i++) { for (var k = 0; k < countRep2; k++) { $scope.perrow = $scope.results[i][k]; if ($scope.perrow["mode"] == $scope.current_mode_name && $scope.perrow["description"] == $scope.current_mode_description) { if($scope.perrow.total_client_vms == 1 && countRep!=1) $scope.xaxis = 0; else $scope.xaxis = $scope.perrow.total_client_vms; $scope.xaxisList.push($scope.xaxis); if (mode == "randread") { $scope.data.push({ x: $scope.xaxis, "IOPS": $scope.perrow.read_iops / $scope.perrow.total_client_vms, "latency1": $scope.perrow.read_hist[2][1] / 1000, "latency2": $scope.perrow.read_hist[3][1] / 1000, "latency3": $scope.perrow.read_hist[4][1] / 1000, "requested_rate": $scope.perrow.rate_iops / $scope.perrow.total_client_vms }); max = $scope.perrow.rate_iops / $scope.perrow.total_client_vms; } if (mode == "randwrite") { $scope.data.push({ x: $scope.xaxis, "IOPS": $scope.perrow.write_iops / $scope.perrow.total_client_vms, "latency1": $scope.perrow.write_hist[2][1] / 1000, "latency2": $scope.perrow.write_hist[3][1] / 1000, "latency3": $scope.perrow.write_hist[4][1] / 1000, "requested_rate": $scope.perrow.rate_iops / $scope.perrow.total_client_vms }); max = $scope.perrow.rate_iops / $scope.perrow.total_client_vms; } if (mode == "read") { $scope.data.push({ x: $scope.xaxis, "IOPS": $scope.perrow.read_bw / $scope.perrow.total_client_vms, "latency1": $scope.perrow.read_hist[2][1] / 1000, "latency2": $scope.perrow.read_hist[3][1] / 1000, "latency3": $scope.perrow.read_hist[4][1] / 1000, "requested_rate": $scope.perrow.rate / $scope.perrow.total_client_vms }); max = $scope.perrow.rate / $scope.perrow.total_client_vms; } if (mode == "write") { $scope.data.push({ x: $scope.xaxis, "IOPS": $scope.perrow.write_bw / $scope.perrow.total_client_vms, "latency1": $scope.perrow.write_hist[2][1] / 1000, "latency2": $scope.perrow.write_hist[3][1] / 1000, "latency3": $scope.perrow.write_hist[4][1] / 1000, "requested_rate": $scope.perrow.rate / $scope.perrow.total_client_vms }); max = $scope.perrow.rate / $scope.perrow.total_client_vms; } var pickColor = get_color(); var chName = "mode-" + $scope.perrow.mode + "_VM-" + $scope.perrow.total_client_vms; $scope.pushTableData(chName, $scope.perrow, pickColor) } } } $scope.options = { series: [ {y: "IOPS", color: "#F44336", type: "column", striped: true, label: $scope.current_mode["y_label"]}, { y: "requested_rate", color: "#696969", drawDots: false, thickness: "1px", label: "Requested Rate", lineMode: "dashed" }, { y: "latency1", axis: "y2", color: "#673AB7", drawDots: true, dotSize: 4, thickness: "3px", label: "Latency(ms)--90%" }, { y: "latency2", axis: "y2", color: "#03A9F4", drawDots: true, dotSize: 4, thickness: "3px", label: "Latency(ms)--99%" }, { y: "latency3", axis: "y2", color: "#E91E63", drawDots: true, dotSize: 4, thickness: "3px", label: "Latency(ms)--99.9%" } ], axes: { x: {key: "x", type: "linear", ticks: $scope.xaxisList, ticksFormatter: function(x) { if($.inArray(x, $scope.xaxisList)!=-1) { if (x == 0) return "1"; else return x; } else return ""; }}, y: {type: "linear", ticksFormat: "d", innerTicks: true, max: max * 1.0005, min: 0}, y2: { type: "log", ticksFormat: "d", innerTicks: false, grid: true, min: get_min_hist($scope.results) / 1000 } }, tooltip: { mode: "scrubber", formatter: function (x, y, series) { return series.label + ":" + y; } }, tension: 0.8, lineMode: "cardinal", columnsHGap: 45 }; } </script> </body> </html> ';

        downloadFile(filename, myresult);

      }
      else showAlert.showAlert("No result to save!");
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
  .service('storageMode', function() {
    var self = this;

    var result=[];
    this.getResult = function(){
      return result;
    };
    this.setResult = function(res){
      result = res;
      return result;
    };


  });

