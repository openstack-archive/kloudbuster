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

    $scope.getCurrentMode = function(modeName,formix){
      var tem_mode_name= modeName;

      if (tem_mode_name == 'rw'){
        if(formix == '') formix='read';
        $scope.current_mode_name = 'rw';
        $scope.current_mode = $scope.modes[formix];
      }
      else if (tem_mode_name == 'randrw'){
        if(formix == '') formix='read';
        $scope.current_mode_name = 'randrw';
        $scope.current_mode = $scope.modes['rand'+formix];
      }
      else{
        $scope.current_mode_name = modeName;
        $scope.current_mode = $scope.modes[$scope.current_mode_name];
      }
      return 0;
    };

    if($scope.config=kbCookie.getConfig())
    {
      $scope.current_mode_name = $scope.config.client.storage_tool_configs[0]['mode'];
      $scope.getCurrentMode($scope.current_mode_name,'read');
    }

    $scope.handleEvent = function(event, index, formix) {
      $scope.current_index = index;

      if($scope.getCurrentMode($scope.config.client.storage_tool_configs[index]['mode'],formix)==-1) return;

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
        x: {key: 'x', type: 'linear', ticksFormat:'d'},
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
      columnsHGap: 35
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
          //console.log(response.data);
          if(response.data.length>0 && countRep < response.data.length) {
            console.log("get report totally:"+response.data.length);
            countRep = response.data.length;
//response.data=[[{"read_hist": [[50, 628], [75, 684], [90, 732], [99, 852], [99.9, 1128], [99.99, 2929], [99.999, 2929]], "read_bw": 400, "tool": "fio", "total_client_vms": 1, "read_iops": 100, "rate_iops": 100, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 1, "read_iops": 0, "rate_iops": 100, "write_bw": 400, "block_size": "4k", "iodepth": 4, "write_iops": 100, "write_hist": [[50, 644], [75, 676], [90, 692], [99, 756], [99.9, 1544], [99.99, 8099], [99.999, 8099]], "mode": "randwrite"}, {"read_hist": [[50, 322], [75, 342], [90, 390], [99, 470], [99.9, 5859], [99.99, 6563], [99.999, 6627]], "read_bw": 61435, "tool": "fio", "rate": 61440, "read_iops": 959, "total_client_vms": 1, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 61440, "read_iops": 0, "total_client_vms": 1, "write_bw": 61435, "block_size": "64k", "iodepth": 64, "write_iops": 959, "write_hist": [[50, 282], [75, 298], [90, 334], [99, 414], [99.9, 7203], [99.99, 7331], [99.999, 7331]], "mode": "write"}], [{"read_hist": [[50, 628], [75, 668], [90, 708], [99, 804], [99.9, 5347], [99.99, 750079], [99.999, 750079]], "read_bw": 800, "tool": "fio", "total_client_vms": 2, "read_iops": 200, "rate_iops": 200, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 2, "read_iops": 0, "rate_iops": 200, "write_bw": 800, "block_size": "4k", "iodepth": 4, "write_iops": 200, "write_hist": [[50, 644], [75, 700], [90, 748], [99, 868], [99.9, 1784], [99.99, 52511], [99.999, 52511]], "mode": "randwrite"}, {"read_hist": [[50, 306], [75, 334], [90, 358], [99, 478], [99.9, 6307], [99.99, 7779], [99.999, 20367]], "read_bw": 122870, "tool": "fio", "rate": 122880, "read_iops": 1919, "total_client_vms": 2, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 122880, "read_iops": 0, "total_client_vms": 2, "write_bw": 122870, "block_size": "64k", "iodepth": 64, "write_iops": 1919, "write_hist": [[50, 322], [75, 358], [90, 390], [99, 478], [99.9, 10183], [99.99, 10311], [99.999, 14791]], "mode": "write"}], [{"read_hist": [[50, 628], [75, 684], [90, 732], [99, 820], [99.9, 2257], [99.99, 963071], [99.999, 963071]], "read_bw": 1200, "tool": "fio", "total_client_vms": 3, "read_iops": 300, "rate_iops": 300, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 3, "read_iops": 0, "rate_iops": 300, "write_bw": 1200, "block_size": "4k", "iodepth": 4, "write_iops": 300, "write_hist": [[50, 668], [75, 732], [90, 788], [99, 940], [99.9, 4899], [99.99, 74303], [99.999, 74303]], "mode": "randwrite"}, {"read_hist": [[50, 346], [75, 390], [90, 446], [99, 564], [99.9, 10183], [99.99, 12231], [99.999, 12359]], "read_bw": 184305, "tool": "fio", "rate": 184320, "read_iops": 2879, "total_client_vms": 3, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 184320, "read_iops": 0, "total_client_vms": 3, "write_bw": 184305, "block_size": "64k", "iodepth": 64, "write_iops": 2879, "write_hist": [[50, 314], [75, 374], [90, 426], [99, 12615], [99.9, 19343], [99.99, 21903], [99.999, 391423]], "mode": "write"}], [{"read_hist": [[50, 660], [75, 748], [90, 820], [99, 964], [99.9, 18575], [99.99, 692735], [99.999, 692735]], "read_bw": 1600, "tool": "fio", "total_client_vms": 4, "read_iops": 400, "rate_iops": 400, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 4, "read_iops": 0, "rate_iops": 400, "write_bw": 1596, "block_size": "4k", "iodepth": 4, "write_iops": 399, "write_hist": [[50, 644], [75, 740], [90, 812], [99, 956], [99.9, 21647], [99.99, 54559], [99.999, 55583]], "mode": "randwrite"}, {"read_hist": [[50, 318], [75, 370], [90, 426], [99, 564], [99.9, 12359], [99.99, 14407], [99.999, 14791]], "read_bw": 245740, "tool": "fio", "rate": 245760, "read_iops": 3839, "total_client_vms": 4, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 245760, "read_iops": 0, "total_client_vms": 4, "write_bw": 245740, "block_size": "64k", "iodepth": 64, "write_iops": 3839, "write_hist": [[50, 298], [75, 386], [90, 8775], [99, 28559], [99.9, 41247], [99.99, 1028607], [99.999, 1036799]], "mode": "write"}], [{"read_hist": [[50, 636], [75, 724], [90, 812], [99, 956], [99.9, 2353], [99.99, 963071], [99.999, 963071]], "read_bw": 2000, "tool": "fio", "total_client_vms": 5, "read_iops": 500, "rate_iops": 500, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 5, "read_iops": 0, "rate_iops": 500, "write_bw": 2000, "block_size": "4k", "iodepth": 4, "write_iops": 500, "write_hist": [[50, 652], [75, 748], [90, 836], [99, 996], [99.9, 25999], [99.99, 144511], [99.999, 144511]], "mode": "randwrite"}, {"read_hist": [[50, 374], [75, 418], [90, 458], [99, 548], [99.9, 8099], [99.99, 12231], [99.999, 12359]], "read_bw": 307175, "tool": "fio", "rate": 307200, "read_iops": 4799, "total_client_vms": 5, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 307200, "read_iops": 0, "total_client_vms": 5, "write_bw": 305548, "block_size": "64k", "iodepth": 64, "write_iops": 4774, "write_hist": [[50, 386], [75, 10055], [90, 21135], [99, 47391], [99.9, 602623], [99.99, 1713151], [99.999, 1745919]], "mode": "write"}], [{"read_hist": [[50, 556], [75, 628], [90, 708], [99, 876], [99.9, 3793], [99.99, 954879], [99.999, 963071]], "read_bw": 2400, "tool": "fio", "total_client_vms": 6, "read_iops": 600, "rate_iops": 600, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 6, "read_iops": 0, "rate_iops": 600, "write_bw": 2400, "block_size": "4k", "iodepth": 4, "write_iops": 600, "write_hist": [[50, 628], [75, 724], [90, 812], [99, 972], [99.9, 50463], [99.99, 88639], [99.999, 88639]], "mode": "randwrite"}, {"read_hist": [[50, 354], [75, 442], [90, 478], [99, 4835], [99.9, 19087], [99.99, 203903], [99.999, 212095]], "read_bw": 368610, "tool": "fio", "rate": 368640, "read_iops": 5759, "total_client_vms": 6, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 368640, "read_iops": 0, "total_client_vms": 6, "write_bw": 320727, "block_size": "64k", "iodepth": 64, "write_iops": 5011, "write_hist": [[50, 350], [75, 8099], [90, 22415], [99, 45343], [99.9, 73279], [99.99, 2344959], [99.999, 3196927]], "mode": "write"}], [{"read_hist": [[50, 532], [75, 604], [90, 668], [99, 812], [99.9, 2897], [99.99, 946687], [99.999, 946687]], "read_bw": 2800, "tool": "fio", "total_client_vms": 7, "read_iops": 700, "rate_iops": 700, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 7, "read_iops": 0, "rate_iops": 700, "write_bw": 2800, "block_size": "4k", "iodepth": 4, "write_iops": 700, "write_hist": [[50, 548], [75, 628], [90, 708], [99, 900], [99.9, 70207], [99.99, 86591], [99.999, 87615]], "mode": "randwrite"}, {"read_hist": [[50, 366], [75, 438], [90, 490], [99, 660], [99.9, 20623], [99.99, 25743], [99.999, 26255]], "read_bw": 430045, "tool": "fio", "rate": 430080, "read_iops": 6719, "total_client_vms": 7, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 430080, "read_iops": 0, "total_client_vms": 7, "write_bw": 418985, "block_size": "64k", "iodepth": 64, "write_iops": 6546, "write_hist": [[50, 4579], [75, 23951], [90, 31631], [99, 43807], [99.9, 54047], [99.99, 2705407], [99.999, 2902015]], "mode": "write"}], [{"read_hist": [[50, 596], [75, 684], [90, 772], [99, 940], [99.9, 2993], [99.99, 16783], [99.999, 18575]], "read_bw": 3200, "tool": "fio", "total_client_vms": 8, "read_iops": 800, "rate_iops": 800, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 8, "read_iops": 0, "rate_iops": 800, "write_bw": 3200, "block_size": "4k", "iodepth": 4, "write_iops": 800, "write_hist": [[50, 604], [75, 708], [90, 804], [99, 1004], [99.9, 39711], [99.99, 97855], [99.999, 98879]], "mode": "randwrite"}, {"read_hist": [[50, 414], [75, 474], [90, 524], [99, 732], [99.9, 23951], [99.99, 29839], [99.999, 30607]], "read_bw": 491480, "tool": "fio", "rate": 491520, "read_iops": 7679, "total_client_vms": 8, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 491520, "read_iops": 0, "total_client_vms": 8, "write_bw": 471103, "block_size": "64k", "iodepth": 64, "write_iops": 7361, "write_hist": [[50, 7907], [75, 28559], [90, 34079], [99, 53023], [99.9, 169087], [99.99, 2246655], [99.999, 3491839]], "mode": "write"}], [{"read_hist": [[50, 580], [75, 660], [90, 748], [99, 948], [99.9, 317695], [99.99, 321791], [99.999, 321791]], "read_bw": 3600, "tool": "fio", "total_client_vms": 9, "read_iops": 900, "rate_iops": 900, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 9, "read_iops": 0, "rate_iops": 900, "write_bw": 3600, "block_size": "4k", "iodepth": 4, "write_iops": 900, "write_hist": [[50, 548], [75, 628], [90, 700], [99, 900], [99.9, 70207], [99.99, 138367], [99.999, 138367]], "mode": "randwrite"}, {"read_hist": [[50, 446], [75, 532], [90, 636], [99, 884], [99.9, 21903], [99.99, 28047], [99.999, 29071]], "read_bw": 552915, "tool": "fio", "rate": 552960, "read_iops": 8639, "total_client_vms": 9, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 552960, "read_iops": 0, "total_client_vms": 9, "write_bw": 455255, "block_size": "64k", "iodepth": 64, "write_iops": 7113, "write_hist": [[50, 10055], [75, 30351], [90, 42271], [99, 73279], [99.9, 2639871], [99.99, 4016127], [99.999, 4016127]], "mode": "write"}], [{"read_hist": [[50, 556], [75, 636], [90, 708], [99, 860], [99.9, 2545], [99.99, 9287], [99.999, 23695]], "read_bw": 4000, "tool": "fio", "total_client_vms": 10, "read_iops": 1000, "rate_iops": 1000, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 10, "read_iops": 0, "rate_iops": 1000, "write_bw": 4000, "block_size": "4k", "iodepth": 4, "write_iops": 1000, "write_hist": [[50, 564], [75, 652], [90, 732], [99, 956], [99.9, 102975], [99.99, 132223], [99.999, 132223]], "mode": "randwrite"}, {"read_hist": [[50, 414], [75, 482], [90, 540], [99, 772], [99.9, 28815], [99.99, 35103], [99.999, 36639]], "read_bw": 614350, "tool": "fio", "rate": 614400, "read_iops": 9599, "total_client_vms": 10, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 614400, "read_iops": 0, "total_client_vms": 10, "write_bw": 483520, "block_size": "64k", "iodepth": 64, "write_iops": 7555, "write_hist": [[50, 21647], [75, 35103], [90, 49439], [99, 90687], [99.9, 4493311], [99.99, 7049215], [99.999, 7049215]], "mode": "write"}], [{"read_hist": [[50, 548], [75, 620], [90, 684], [99, 820], [99.9, 3505], [99.99, 19343], [99.999, 19855]], "read_bw": 4400, "tool": "fio", "total_client_vms": 11, "read_iops": 1100, "rate_iops": 1100, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 11, "read_iops": 0, "rate_iops": 1100, "write_bw": 4400, "block_size": "4k", "iodepth": 4, "write_iops": 1100, "write_hist": [[50, 588], [75, 668], [90, 740], [99, 972], [99.9, 95807], [99.99, 156799], [99.999, 158847]], "mode": "randwrite"}, {"read_hist": [[50, 374], [75, 442], [90, 516], [99, 820], [99.9, 25743], [99.99, 31375], [99.999, 33055]], "read_bw": 675785, "tool": "fio", "rate": 675840, "read_iops": 10559, "total_client_vms": 11, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 675840, "read_iops": 0, "total_client_vms": 11, "write_bw": 518233, "block_size": "64k", "iodepth": 64, "write_iops": 8097, "write_hist": [[50, 25231], [75, 41247], [90, 53535], [99, 226431], [99.9, 6721535], [99.99, 6787071], [99.999, 6787071]], "mode": "write"}], [{"read_hist": [[50, 524], [75, 604], [90, 684], [99, 844], [99.9, 3121], [99.99, 17551], [99.999, 18575]], "read_bw": 4800, "tool": "fio", "total_client_vms": 12, "read_iops": 1200, "rate_iops": 1200, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 12, "read_iops": 0, "rate_iops": 1200, "write_bw": 4800, "block_size": "4k", "iodepth": 4, "write_iops": 1200, "write_hist": [[50, 548], [75, 636], [90, 732], [99, 940], [99.9, 102975], [99.99, 164991], [99.999, 164991]], "mode": "randwrite"}, {"read_hist": [[50, 434], [75, 508], [90, 604], [99, 1064], [99.9, 28303], [99.99, 33567], [99.999, 35103]], "read_bw": 737220, "tool": "fio", "rate": 737280, "read_iops": 11519, "total_client_vms": 12, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 737280, "read_iops": 0, "total_client_vms": 12, "write_bw": 539766, "block_size": "64k", "iodepth": 64, "write_iops": 8433, "write_hist": [[50, 28559], [75, 45343], [90, 56095], [99, 428287], [99.9, 6655999], [99.99, 7114751], [99.999, 7114751]], "mode": "write"}], [{"read_hist": [[50, 540], [75, 620], [90, 692], [99, 804], [99.9, 2577], [99.99, 27279], [99.999, 30095]], "read_bw": 5200, "tool": "fio", "total_client_vms": 13, "read_iops": 1300, "rate_iops": 1300, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 13, "read_iops": 0, "rate_iops": 1300, "write_bw": 5200, "block_size": "4k", "iodepth": 4, "write_iops": 1300, "write_hist": [[50, 564], [75, 652], [90, 740], [99, 988], [99.9, 110143], [99.99, 183423], [99.999, 183423]], "mode": "randwrite"}, {"read_hist": [[50, 430], [75, 532], [90, 668], [99, 1464], [99.9, 34079], [99.99, 47391], [99.999, 203903]], "read_bw": 798655, "tool": "fio", "rate": 798720, "read_iops": 12478, "total_client_vms": 13, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 798720, "read_iops": 0, "total_client_vms": 13, "write_bw": 573571, "block_size": "64k", "iodepth": 64, "write_iops": 8962, "write_hist": [[50, 29583], [75, 44319], [90, 62239], [99, 185471], [99.9, 6590463], [99.99, 6918143], [99.999, 6983679]], "mode": "write"}], [{"read_hist": [[50, 524], [75, 596], [90, 660], [99, 796], [99.9, 2065], [99.99, 16263], [99.999, 18831]], "read_bw": 5600, "tool": "fio", "total_client_vms": 14, "read_iops": 1400, "rate_iops": 1400, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 14, "read_iops": 0, "rate_iops": 1400, "write_bw": 5600, "block_size": "4k", "iodepth": 4, "write_iops": 1400, "write_hist": [[50, 588], [75, 676], [90, 756], [99, 996], [99.9, 123455], [99.99, 222335], [99.999, 222335]], "mode": "randwrite"}, {"read_hist": [[50, 406], [75, 502], [90, 652], [99, 8775], [99.9, 45343], [99.99, 53023], [99.999, 53535]], "read_bw": 860090, "tool": "fio", "rate": 860160, "read_iops": 13438, "total_client_vms": 14, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 860160, "read_iops": 0, "total_client_vms": 14, "write_bw": 612708, "block_size": "64k", "iodepth": 64, "write_iops": 9573, "write_hist": [[50, 28303], [75, 47391], [90, 64799], [99, 1319935], [99.9, 6066175], [99.99, 9117695], [99.999, 9117695]], "mode": "write"}], [{"read_hist": [[50, 540], [75, 612], [90, 684], [99, 828], [99.9, 3441], [99.99, 24463], [99.999, 27023]], "read_bw": 6000, "tool": "fio", "total_client_vms": 15, "read_iops": 1500, "rate_iops": 1500, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 15, "read_iops": 0, "rate_iops": 1500, "write_bw": 6000, "block_size": "4k", "iodepth": 4, "write_iops": 1500, "write_hist": [[50, 556], [75, 644], [90, 724], [99, 932], [99.9, 84543], [99.99, 156799], [99.999, 156799]], "mode": "randwrite"}, {"read_hist": [[50, 502], [75, 676], [90, 1016], [99, 21647], [99.9, 44831], [99.99, 51999], [99.999, 53535]], "read_bw": 921525, "tool": "fio", "rate": 921600, "read_iops": 14398, "total_client_vms": 15, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 921600, "read_iops": 0, "total_client_vms": 15, "write_bw": 654105, "block_size": "64k", "iodepth": 64, "write_iops": 10220, "write_hist": [[50, 38687], [75, 57631], [90, 82495], [99, 954879], [99.9, 2803711], [99.99, 3917823], [99.999, 3950591]], "mode": "write"}], [{"read_hist": [[50, 516], [75, 596], [90, 668], [99, 828], [99.9, 4899], [99.99, 938495], [99.999, 946687]], "read_bw": 6400, "tool": "fio", "total_client_vms": 16, "read_iops": 1600, "rate_iops": 1600, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 16, "read_iops": 0, "rate_iops": 1600, "write_bw": 6400, "block_size": "4k", "iodepth": 4, "write_iops": 1600, "write_hist": [[50, 508], [75, 588], [90, 668], [99, 980], [99.9, 101951], [99.99, 158847], [99.999, 160895]], "mode": "randwrite"}, {"read_hist": [[50, 972], [75, 1896], [90, 4387], [99, 17807], [99.9, 44319], [99.99, 50463], [99.999, 205951]], "read_bw": 982149, "tool": "fio", "rate": 983040, "read_iops": 15346, "total_client_vms": 16, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 983040, "read_iops": 0, "total_client_vms": 16, "write_bw": 473000, "block_size": "64k", "iodepth": 64, "write_iops": 7390, "write_hist": [[50, 37663], [75, 63263], [90, 90687], [99, 1352703], [99.9, 6721535], [99.99, 7245823], [99.999, 7245823]], "mode": "write"}], [{"read_hist": [[50, 502], [75, 580], [90, 660], [99, 836], [99.9, 10183], [99.99, 987647], [99.999, 987647]], "read_bw": 6800, "tool": "fio", "total_client_vms": 17, "read_iops": 1700, "rate_iops": 1700, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 17, "read_iops": 0, "rate_iops": 1700, "write_bw": 6800, "block_size": "4k", "iodepth": 4, "write_iops": 1700, "write_hist": [[50, 498], [75, 588], [90, 676], [99, 988], [99.9, 115263], [99.99, 248959], [99.999, 251007]], "mode": "randwrite"}, {"read_hist": [[50, 1176], [75, 2193], [90, 4771], [99, 21135], [99.9, 46367], [99.99, 53535], [99.999, 54559]], "read_bw": 1044371, "tool": "fio", "rate": 1044480, "read_iops": 16318, "total_client_vms": 17, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 1044480, "read_iops": 0, "total_client_vms": 17, "write_bw": 618091, "block_size": "64k", "iodepth": 64, "write_iops": 9657, "write_hist": [[50, 19855], [75, 50463], [90, 77375], [99, 244863], [99.9, 8724479], [99.99, 8724479], [99.999, 8855551]], "mode": "write"}], [{"read_hist": [[50, 508], [75, 580], [90, 652], [99, 804], [99.9, 4017], [99.99, 25487], [99.999, 26255]], "read_bw": 7199, "tool": "fio", "total_client_vms": 18, "read_iops": 1800, "rate_iops": 1800, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 18, "read_iops": 0, "rate_iops": 1800, "write_bw": 7200, "block_size": "4k", "iodepth": 4, "write_iops": 1800, "write_hist": [[50, 516], [75, 612], [90, 700], [99, 956], [99.9, 150655], [99.99, 317695], [99.999, 317695]], "mode": "randwrite"}, {"read_hist": [[50, 4899], [75, 9671], [90, 18063], [99, 54559], [99.9, 73279], [99.99, 87615], [99.999, 100927]], "read_bw": 1105075, "tool": "fio", "rate": 1105920, "read_iops": 17266, "total_client_vms": 18, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 1105920, "read_iops": 0, "total_client_vms": 18, "write_bw": 578810, "block_size": "64k", "iodepth": 64, "write_iops": 9044, "write_hist": [[50, 40735], [75, 63775], [90, 94783], [99, 1663999], [99.9, 8097791], [99.99, 8163327], [99.999, 8163327]], "mode": "write"}], [{"read_hist": [[50, 502], [75, 572], [90, 644], [99, 796], [99.9, 4387], [99.99, 30863], [99.999, 31887]], "read_bw": 7600, "tool": "fio", "total_client_vms": 19, "read_iops": 1900, "rate_iops": 1900, "write_bw": 0, "block_size": "4k", "iodepth": 4, "write_iops": 0, "mode": "randread"}, {"read_bw": 0, "tool": "fio", "total_client_vms": 19, "read_iops": 0, "rate_iops": 1900, "write_bw": 7599, "block_size": "4k", "iodepth": 4, "write_iops": 1900, "write_hist": [[50, 482], [75, 564], [90, 652], [99, 1016], [99.9, 97855], [99.99, 297215], [99.999, 297215]], "mode": "randwrite"}, {"read_hist": [[50, 65055], [75, 67135], [90, 68159], [99, 84543], [99.9, 128575], [99.99, 207999], [99.999, 232575]], "read_bw": 1152909, "tool": "fio", "rate": 1167360, "read_iops": 18014, "total_client_vms": 19, "write_bw": 0, "block_size": "64k", "iodepth": 64, "write_iops": 0, "mode": "read"}, {"read_bw": 0, "tool": "fio", "rate": 1167360, "read_iops": 0, "total_client_vms": 19, "write_bw": 711378, "block_size": "64k", "iodepth": 64, "write_iops": 11115, "write_hist": [[50, 29839], [75, 62751], [90, 92735], [99, 1385471], [99.9, 9641983], [99.99, 10166271], [99.999, 10297343]], "mode": "write"}]];

            storageMode.setResult(response.data);

            $scope.refreshChart();
            //console.log($scope.data);
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
      $scope.results = results;
      var countRep = $scope.results.length;
      var countRep2 = $scope.results[0].length;
      var mode = $scope.current_mode['name'];

      var max;
      for (var i = 0; i < countRep; i++) {
        for (var k = 0; k < countRep2; k++) {
          $scope.perrow = $scope.results[i][k];
          if ($scope.perrow["mode"] == $scope.current_mode_name) {
            //----chart data----
            if (mode == "randread") {
              $scope.data.push({
                x: $scope.perrow.total_client_vms,
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
                x: $scope.perrow.total_client_vms,
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
                x: $scope.perrow.total_client_vms,
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
                x: $scope.perrow.total_client_vms,
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
        var myresult = '<!--Copyright 2016 Cisco Systems, Inc. All rights reserved.--> <!--Licensed under the Apache License, Version 2.0 (the "License"); you may--> <!--not use this file except in compliance with the License. You may obtain--> <!--a copy of the License at--> <!--http://www.apache.org/licenses/LICENSE-2.0--> <!--Unless required by applicable law or agreed to in writing, software--> <!--distributed under the License is distributed on an "AS IS" BASIS, WITHOUT--> <!--WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the--> <!--License for the specific language governing permissions and limitations--> <!--under the License.--> <!DOCTYPE html> <html lang="en-US" ng-app="app"> <head> <meta charset="utf-8"> <meta http-equiv="X-UA-Compatible" content="IE=edge"> <meta name="viewport" content="width=device-width, initial-scale=1"> <title>KloudBuster Report</title> <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.4.2/angular.min.js"></script> <script src="https://d3js.org/d3.v3.min.js"></script> <!--<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/line-chart/2.0.3/LineChart.min.css">--> <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/ng-table/0.8.3/ng-table.min.css"> <script src="https://cdnjs.cloudflare.com/ajax/libs/ng-table/0.8.3/ng-table.min.js"></script> <link rel="stylesheet" href="https://bootswatch.com/flatly/bootstrap.min.css"> <script src="https://code.jquery.com/jquery-2.2.0.min.js"></script> <script src="https://cdnjs.cloudflare.com/ajax/libs/line-chart/1.1.12/line-chart.min.js"></script> <script src="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.6/js/bootstrap.min.js"></script> </head> <body ng-controller="MainCtrl"> <nav class="navbar navbar-default"> <div class="container-fluid"> <div class="navbar-header"> <a class="navbar-brand" href="#">KloudBuster Report</a> </div> <div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1"> <ul class="nav navbar-nav"> <li ng-repeat="mode in modes" ng-class="{active: current_index==$index}" ng-click="handleEvent($event, $index)"> <a href="#"><span class="glyphicon" aria-hidden="true"></span>&nbsp;{{mode.title}}</a> </li> </ul> <ul class="nav navbar-nav navbar-right"> <li><a href="#">'+m+'-'+d + ' ' + h +':'+ min +'</a></li> </ul> </div> </div> </nav> <div class="container"> <h3>{{current_mode["title"]}}</h3> <div class="my-chart" style="height: 550px;margin-bottom: 5%"> <h6 style="margin-bottom:0"><span>{{current_mode["y_axis"]}}</span><span style="float:right">Latency(ms)</span></h6> <linechart data="data" options="options"></linechart> </div> <table ng-table="tableParams" class="table table-responsive table-condensed table-bordered table-striped"> <tr ng-repeat="row in tableParams.data" style="text-align:center;"> <td title="cols[2].title" data-sortable="cols[2].field">{{row.total_client_vms}}</td> <td title="cols[3].title" data-sortable="cols[3].field">{{row.block_size}}b</td> <td title="cols[4].title" data-sortable="cols[4].field">{{row.iodepth}}</td> <td title="cols[5].title" data-sortable="cols[5].field" ng-if="current_index == 0 || current_index ==1">{{row.rate_iops}}</td> <td title="cols[6].title" data-sortable="cols[6].field" ng-if="current_index == 0 || current_index ==2">{{row.read_iops}}</td> <td title="cols[7].title" data-sortable="cols[7].field" ng-if="current_index == 1 || current_index ==3">{{row.write_iops}}</td> <td title="cols[8].title" data-sortable="cols[8].field" ng-if="current_index == 2 || current_index ==3">{{row.rate}} KB/s</td> <td title="cols[9].title" data-sortable="cols[9].field" ng-if="current_index == 0 || current_index ==2">{{row.read_bw}} KB/s</td> <td title="cols[10].title" data-sortable="cols[10].field" ng-if="current_index == 1 || current_index ==3">{{row.write_bw}} KB/s</td> </tr> </table> </div> <script type="text/javascript"> var json_data = "res.json"; var num = -1; var colorList = ["#F44336", "#673AB7", "#03A9F4", "#4CAF50", "#FFEB3B", "#BF360C", "#795548", "#E91E63", "#3F51B5", "#00BCD4", "#CDDC39", "#FF9800", "#9E9E9E", "#9C27B0", "#009688"]; var length = colorList.length; function get_color() { num = (num + 1) % length; return colorList[num]; } var modes = [ {title: "Rand Read", icon: "", id: "randread", init: "",y_axis:"IOPs/VM",y_label:"RATE IOPs Per VM"}, {title: "Rand Write", icon: "", id: "randwrite", init: "",y_axis:"IOPs/VM",y_label:"RATE IOPs Per VM"}, {title: "Seq Read", icon: "", id: "read", init: "",y_axis: "BW/VM(KB/s)",y_label:"RATE BW Per VM"}, {title: "Seq Write", icon: "", id: "write", init: "",y_axis: "BW/VM(KB/s)",y_label:"RATE BW Per VM"} ]; var content; angular.module("app", ["n3-line-chart", "ngTable"]).controller("MainCtrl", function ($scope, ngTableParams) { $scope.current_index = 0; $scope.modes = modes; $scope.current_mode = $scope.modes[0]; content = '+ JSON.stringify(saveData) +'; draw_chart($scope, ngTableParams, content); $scope.handleEvent = function(event, index) { $scope.current_index = index; $scope.current_mode = $scope.modes[index]; draw_chart($scope, ngTableParams, content); }; }); function get_min_hist(results) { var min = Number.POSITIVE_INFINITY; results.forEach(function (rr) { rr.forEach(function (d) { if ("write_hist" in d) { min = Math.min(min, d.write_hist[0][1]); } if ("read_hist" in d) { min = Math.min(min, d.read_hist[0][1]); } }); }); return min; } function draw_chart($scope, ngTableParams, results) { $scope.results = results; var countRep = $scope.results.length; var countRep2 = $scope.results[0].length; var mode = $scope.current_mode["id"]; $scope.tabledata = []; $scope.cols = [ { field: "seq", title: "SEQ", sortable: "seq", show: true }, { field: "mode", title: "Mode", sortable: "mode", show: true }, { field: "total_client_vms", title: "Client VMs", sortable: "total_client_vms", show: true }, { field: "block_size", title: "Block Size", sortable: "block_size", show: true }, { field: "iodepth", title: "IO Depth", sortable: "iodepth", show: true }, { field: "rate_iops", title: "Rate IOPS", sortable: "rate_iops", show: true }, { field: "read_iops", title: "Read IOPS", sortable: "read_iops", show: true }, { field: "write_iops", title: "Write IOPS", sortable: "write_iops", show: true }, { field: "rate", title: "Rate BW", sortable: "rate", show: true }, { field: "read_bw", title: "Read BW", sortable: "read_bw", show: true }, { field: "write_bw", title: "Write BW", sortable: "write_bw", show: true }]; $scope.tableParams = new ngTableParams({sorting: {name: "asc"}, "count": 10}, { counts: [], data: $scope.tabledata }); $scope.pushTableData = function (taName, taData, pickColor) { $scope.tabledata.push({ "seq": taName, "mode": taData.mode, "total_client_vms": taData.total_client_vms, "block_size": taData.block_size, "iodepth": taData.iodepth, "rate_iops": taData.rate_iops, "read_bw": taData.read_bw, "write_bw": taData.write_bw, "read_iops": taData.read_iops, "write_iops": taData.write_iops, "rate": taData.rate, "color": pickColor }); $scope.tableParams.reload() }; var max; $scope.data = []; for (var i = 0; i < countRep; i++) { for (var k = 0; k < countRep2; k++) { $scope.perrow = $scope.results[i][k]; if ($scope.perrow["mode"] == mode) { if (mode == "randread") { $scope.data.push({ x: $scope.perrow.total_client_vms, "IOPS": $scope.perrow.read_iops / $scope.perrow.total_client_vms, "latency1": $scope.perrow.read_hist[2][1] / 1000, "latency2": $scope.perrow.read_hist[3][1] / 1000, "latency3": $scope.perrow.read_hist[4][1] / 1000, "requested_rate": $scope.perrow.rate_iops / $scope.perrow.total_client_vms }); max = $scope.perrow.rate_iops / $scope.perrow.total_client_vms; } if (mode == "randwrite") { $scope.data.push({ x: $scope.perrow.total_client_vms, "IOPS": $scope.perrow.write_iops / $scope.perrow.total_client_vms, "latency1": $scope.perrow.write_hist[2][1] / 1000, "latency2": $scope.perrow.write_hist[3][1] / 1000, "latency3": $scope.perrow.write_hist[4][1] / 1000, "requested_rate": $scope.perrow.rate_iops / $scope.perrow.total_client_vms }); max = $scope.perrow.rate_iops / $scope.perrow.total_client_vms; } if (mode == "read") { $scope.data.push({ x: $scope.perrow.total_client_vms, "IOPS": $scope.perrow.read_bw / $scope.perrow.total_client_vms, "latency1": $scope.perrow.read_hist[2][1] / 1000, "latency2": $scope.perrow.read_hist[3][1] / 1000, "latency3": $scope.perrow.read_hist[4][1] / 1000, "requested_rate": $scope.perrow.rate / $scope.perrow.total_client_vms }); max = $scope.perrow.rate / $scope.perrow.total_client_vms; } if (mode == "write") { $scope.data.push({ x: $scope.perrow.total_client_vms, "IOPS": $scope.perrow.write_bw / $scope.perrow.total_client_vms, "latency1": $scope.perrow.write_hist[2][1] / 1000, "latency2": $scope.perrow.write_hist[3][1] / 1000, "latency3": $scope.perrow.write_hist[4][1] / 1000, "requested_rate": $scope.perrow.rate / $scope.perrow.total_client_vms }); max = $scope.perrow.rate / $scope.perrow.total_client_vms; } var pickColor = get_color(); chName = "mode-" + $scope.perrow.mode + "_VM-" + $scope.perrow.total_client_vms; $scope.pushTableData(chName, $scope.perrow, pickColor) } } } $scope.options = { series: [ {y: "IOPS", color: "#F44336", type: "column", striped: true, label: $scope.current_mode["y_label"]}, { y: "requested_rate", color: "#696969", drawDots: false, thickness: "1px", label: "Requested Rate", lineMode: "dashed" }, { y: "latency1", axis: "y2", color: "#673AB7", drawDots: true, dotSize: 4, thickness: "3px", label: "Latency(ms)--90%" }, { y: "latency2", axis: "y2", color: "#03A9F4", drawDots: true, dotSize: 4, thickness: "3px", label: "Latency(ms)--99%" }, { y: "latency3", axis: "y2", color: "#E91E63", drawDots: true, dotSize: 4, thickness: "3px", label: "Latency(ms)--99.9%" } ], axes: { x: {key: "x", type: "linear", ticksFormat: "d"}, y: {type: "linear", ticksFormat: "d", innerTicks: true, max: max * 1.0005, min: 0}, y2: { type: "log", ticksFormat: "d", innerTicks: false, grid: true, min: get_min_hist($scope.results) / 1000 } }, tooltip: { mode: "scrubber", formatter: function (x, y, series) { return series.label + ":" + y; } }, tension: 0.8, lineMode: "cardinal", columnsHGap: 35 }; } </script> </body> </html>'
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

