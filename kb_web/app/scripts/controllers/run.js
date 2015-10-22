/**
 * Created by xiyu3 on 9/8/15.
 */
'use strict';

angular.module('kbWebApp')
  .controller('RunCtrl', function ($scope, $timeout, $location, $http, $q, ngTableParams, kbCookie, kbHttp, interactiveMode, color) {
    this.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];


    if(kbCookie.getSessionID()==="") $location.path('/Login');


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

    $scope.setConfig = function() {
      var deferred = $q.defer();

      if($scope.status==="READY") {
        kbCookie.setConfig($scope.config);
        $scope.chaCon = {"kb_cfg": {}};
        $scope.chaCon.kb_cfg = kbCookie.getConfig();
        console.log($scope.chaCon);
        kbHttp.putMethod("/config/running_config/" + $scope.sessionID, $scope.chaCon)
          .then(
          function (response) {  //  .resolve
            console.log("change running config");
            deferred.resolve(1);
          },
          function (response) {  //  .reject
            console.log("change running config error:");
            console.log(response);
            deferred.reject(0);
          }
        );
      }
      else if($scope.status==="STAGED"){
        $scope.config.client.http_tool_configs.report_interval=0;//!!
        kbCookie.setConfig($scope.config);
        $scope.chaCon = {"kb_cfg": {"client":{"http_tool_configs":{"duration":$scope.config.client.http_tool_configs.duration,"rate_limit":$scope.config.client.http_tool_configs.rate_limit,"connections":$scope.config.client.http_tool_configs.connections,"report_interval":0}}}};
        console.log($scope.chaCon);

        kbHttp.putMethod("/config/running_config/" + $scope.sessionID, $scope.chaCon)
          .then(
          function (response) {  //  .resolve
            console.log("change running config");
            deferred.resolve(1);
          },
          function (response) {  //  .reject
            console.log("change running config error:");
            console.log(response);
            deferred.reject(0);
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

    $scope.setUnstage = true;//if Unstage Button disabled

    $scope.client_vm_count = 0;
    $scope.server_vm_count = 0;

    $scope.checkStatus = function(){
      if($scope.sessionID) {
        kbHttp.getMethod2("/kloudbuster/status/" + $scope.sessionID)
          .then(
          function (response) {  //  .resolve
            $scope.status = response.data.status;
            kbCookie.setStatus($scope.status);
            $scope.configStatus();

            if ($scope.status === "READY") {
              $scope.runButton = "Create VMs";
              $scope.runStatus = false;//show button
              $scope.setStatus = false;//show button
              $scope.setUnstage = true;//disable button
              $scope.client_vm_count = 0;
              $scope.server_vm_count = 0;
              $(".loading").addClass("pause");
              $scope.info="";
            }
            else if ($scope.status === "STAGING") {
              $scope.runButton = "Run Test";
              $scope.runStatus = true;
              $scope.setStatus = true;
              $scope.setUnstage = true;
              $scope.client_vm_count = response.data.client_vm_count;
              $scope.server_vm_count = response.data.server_vm_count;
              $(".loading").removeClass("pause");
              $scope.info="KloudBuster is Creating VM(s)"+$scope.pointNum();

            }
            else if ($scope.status === "STAGED") {
              $scope.runButton = "Run Test";
              $scope.runStatus = false;
              $scope.setStatus = false;
              $scope.setUnstage = false;
              $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants;
              $scope.server_vm_count = $scope.client_vm_count;
              $scope.getReport();
              $(".loading").addClass("pause");
              $scope.info="";

            }
            else if ($scope.status === "RUNNING") {
              $scope.runButton = "Stop Test";
              $scope.runStatus = false;
              $scope.setStatus = true;
              $scope.setUnstage = true;
              $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants;
              $scope.server_vm_count = $scope.client_vm_count;
              if($scope.config.client.progression.enabled === true) $scope.getReport();
              $(".loading").removeClass("pause");
              $scope.info="KloudBuster is Running"+$scope.pointNum();

            }
            else if ($scope.status === "ERROR") {
              $scope.runButton = "Run Test";
              $scope.runStatus = true;
              $scope.setStatus = true;
              $scope.setUnstage = false;
              $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants;
              $scope.server_vm_count = $scope.client_vm_count;
              $(".loading").addClass("pause");
              $scope.info="";

            }
            else if($scope.status === "CLEANING" || $scope.status === "STOPPING")
            {
              $scope.runButton = "Run Test";
              $scope.runStatus = true;
              $scope.setStatus = true;
              $scope.setUnstage = true;
              $scope.client_vm_count = $scope.config.server.routers_per_tenant * $scope.config.server.networks_per_router * $scope.config.server.vms_per_network * $scope.config.server.number_tenants;
              $scope.server_vm_count = $scope.client_vm_count;
              $(".loading").removeClass("pause");
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
            $scope.checkStatus();
          },
          function(response) {  //  .reject
            console.log("set stage error:");
            console.log(response);
          }
        );
    };

    $scope.runKb = function(){
        kbHttp.postMethod("/kloudbuster/run_test/" + $scope.sessionID)
          .then(
          function(response) {  //  .resolve
            $scope.checkStatus();
          },
          function(response) {  //  .reject
            console.log("running error:");
            console.log(response);
          }
        );
    };

    $scope.stopKb = function(){
      kbHttp.postMethod("/kloudbuster/stop_test/" + $scope.sessionID)
        .then(
        function(response) {  //  .resolve
          $scope.checkStatus();
        },
        function(response) {  //  .reject
          console.log("stop error:");
          console.log(response);
        }
      );
    };



    $scope.scaleTest = function(){
      if($scope.status==="RUNNING"){
        //$scope.initChart();
        $scope.stopKb();
      }
      else {
        var promise = $scope.setConfig();
        promise.then(function () {
          if ($scope.status === "READY") {
            $scope.setStage();
          }
          else if ($scope.status === "STAGED") {
            $scope.initChart();
            $scope.runKb();
          }
          else {
          }
        });
      }
    };


    $scope.CleanUp = function(){
      $scope.initChart();
      if($scope.sessionID) {
        kbHttp.postMethod("/kloudbuster/cleanup/" + $scope.sessionID)
          .then(
          function(response) {  //  .resolve
            $scope.checkStatus();
            console.log("clean up successfully");
          },
          function(response) {  //  .reject
            console.log("clean error:");
            console.log(response);
          }
        );
      }
      else{
        console.log("no sessionID");
      }
    };


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
          console.log(response.data);
          if(response.data.length>0 && countRep < response.data.length) {
            countRep = response.data.length;

            $scope.refreshChart();
            console.log($scope.data);

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
      console.log("chart date"+ chName);

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
      console.log("table date:"+ taName);
      var temThrou = (taData.http_throughput_kbytes  * 8) / (1000 * 1000);
      $scope.tabledata.push(
        {"seq":taName, "connection": taData.total_connections, "server_vms": taData.total_server_vms, "requests": taData.http_total_req, "sock_err": taData.http_sock_err+taData.http_sock_timeout,  "rps": taData.http_rps, "rate_limit": taData.http_rate_limit, "throughput": temThrou.toFixed(2), "description":taData.description,"color":pickColor}
      );

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
    $scope.saveResult = function(index){
      var date = new Date();
      var m = date.getMonth()+1;//month (0-11,0 = Jan., remember to add 1)
      var d = date.getDate();//day(1-31)
      var h = date.getHours();//hour(0-23)
      var min = date.getMinutes();//minute(0-59)
      var filename = m+d+h+min+index+".json";
      //console.log(filename);
      var saveData = interactiveMode.getResult();
      if(saveData[index]!="")
        downloadFile(filename, JSON.stringify(saveData[index]));
      else console.log("no file to save");
    };






    setInterval(function(){
      $scope.checkStatus();
    },2000);



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
