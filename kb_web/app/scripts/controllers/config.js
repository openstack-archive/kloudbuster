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

'use strict';

/**
 * @ngdoc function
 * @name kbWebApp.controller:AboutCtrl
 * @description
 * # ConfigCtrl
 * Controller of the kbWebApp
 */
angular.module('kbWebApp')
  .controller('ConfigCtrl', function ($scope,$http,$location,kbHttp,kbCookie, locationChange) {
    this.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];

    if(kbCookie.getSessionID()==="") $location.path('/Login');
    //---------------------------------top navigation bar---------------------------------
    $(window).on('hashchange', locationChange.change());

    $scope.sessionID=kbCookie.getSessionID();
    $scope.status=kbCookie.getStatus();

    //------------------------------------------------------
    $scope.dashstatus1="active";
    $scope.dashstatus1vis=true;
    $scope.dashstatus2="";
    $scope.dashstatus2vis=false;
    $scope.dashstatus3="";
    $scope.dashstatus3vis=false;

    $scope.setDashStatus = function(dashNum){
      if(dashNum===1){
        $scope.dashstatus2="";
        $scope.dashstatus2vis=false;
        $scope.dashstatus3="";
        $scope.dashstatus3vis=false;
        $scope.dashstatus1="active";
        $scope.dashstatus1vis=true;
      }
      else if (dashNum===2){
        $scope.dashstatus1="";
        $scope.dashstatus1vis=false;
        $scope.dashstatus3="";
        $scope.dashstatus3vis=false;
        $scope.dashstatus2="active";
        $scope.dashstatus2vis=true;
      }
      else if (dashNum===3){
        $scope.dashstatus1="";
        $scope.dashstatus1vis=false;
        $scope.dashstatus2="";
        $scope.dashstatus2vis=false;
        $scope.dashstatus3="active";
        $scope.dashstatus3vis=true;
      }
    };


    //----------------------------topology------------------------------
    var userData;

    $scope.setUserData = function(top){
      var count = 1;
      var x;
      for(x in top){
        userData.push({"id":count++,"firstName":top[x]});
      }
      $scope.listA = userData.slice(0,userData.length);
      $scope.items = userData;
    };

    // init
    function init()
    {
      $scope.selectedA = [];
      $scope.selectedB = [];
      $scope.selectedC = [];

      userData=[];
      $scope.listA = [];
      $scope.listB = [];
      $scope.listC = [];

      $scope.toggle=false;
    }
    init();

    //$scope.checkedA = false;
    //$scope.checkedB = false;

    function arrayObjectIndexOf(myArray, searchTerm, property) {
      for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === searchTerm) return i;
      }
      return -1;
    }

    function arrayObjectIndexOf2(myArray, searchTerm) {
      for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i] === searchTerm) return i;
      }
      return -1;
    }

    $scope.aToB = function() {
      for (var i in $scope.selectedA) {
        var moveId = arrayObjectIndexOf($scope.items, $scope.selectedA[i], "id");
        $scope.listB.push($scope.items[moveId]);
        var delId = arrayObjectIndexOf($scope.listA, $scope.selectedA[i], "id");
        $scope.listA.splice(delId,1);
      }
      reset();
    };

    $scope.aToC = function() {
      for (var i in $scope.selectedA) {
        var moveId = arrayObjectIndexOf($scope.items, $scope.selectedA[i], "id");
        $scope.listC.push($scope.items[moveId]);
        var delId = arrayObjectIndexOf($scope.listA, $scope.selectedA[i], "id");
        $scope.listA.splice(delId,1);
      }
      reset();
    };

    $scope.bToA = function() {
      for (var i in $scope.selectedB) {
        var moveId = arrayObjectIndexOf($scope.items, $scope.selectedB[i], "id");
        $scope.listA.push($scope.items[moveId]);
        var delId = arrayObjectIndexOf($scope.listB, $scope.selectedB[i], "id");
        $scope.listB.splice(delId,1);
      }
      reset();
    };

    $scope.cToA = function() {
      for (var i in $scope.selectedC) {
        var moveId = arrayObjectIndexOf($scope.items, $scope.selectedC[i], "id");
        $scope.listA.push($scope.items[moveId]);
        var delId = arrayObjectIndexOf($scope.listC, $scope.selectedC[i], "id");
        $scope.listC.splice(delId,1);
      }
      reset();
    };

    function reset(){
      $scope.selectedA=[];
      $scope.selectedB=[];
      $scope.selectedC=[];
      $scope.toggle=false;
    }

    $scope.toggleA = function() {

      if ($scope.selectedA.length>0) {
        reset();
      }
      else {
        for (var i in $scope.listA) {
          $scope.selectedB=[];
          $scope.selectedC=[];
          $scope.selectedA.push($scope.listA[i].id);
        }
      }
    };

    $scope.toggleB = function() {

      if ($scope.selectedB.length>0) {
        reset();
      }
      else {
        for (var i in $scope.listB) {
          $scope.selectedA=[];
          $scope.selectedC=[];
          $scope.selectedB.push($scope.listB[i].id);
        }
      }
    };

    $scope.toggleC = function() {

      if ($scope.selectedC.length>0) {
        reset();
      }
      else {
        for (var i in $scope.listC) {
          $scope.selectedA=[];
          $scope.selectedB=[];
          $scope.selectedC.push($scope.listC[i].id);
        }
      }
    };

    $scope.selectA = function(i) {
      var delId = arrayObjectIndexOf2($scope.selectedA, i);
      //console.log(delId,i);
      if(delId===-1)
        $scope.selectedA.push(i);
      else
        $scope.selectedA.splice(delId,1);
    };

    $scope.selectB = function(i) {
      var delId = arrayObjectIndexOf2($scope.selectedB, i);
      //console.log(delId,i);
      if(delId===-1)
        $scope.selectedB.push(i);
      else
        $scope.selectedB.splice(delId,1);
    };

    $scope.selectC = function(i) {
      var delId = arrayObjectIndexOf2($scope.selectedC, i);
      //console.log(delId,i);
      if(delId===-1)
        $scope.selectedC.push(i);
      else
        $scope.selectedC.splice(delId,1);
    };

    //-----------------------end of topology---------------------


    $scope.checkStatus = function(){
      if($scope.sessionID) {
        kbHttp.getMethod2("/kloudbuster/status/" + $scope.sessionID)
          .then(
          function (response) {  //  .resolve
            $scope.status = response.data.status;
            kbCookie.setStatus($scope.status);
            $scope.configStatus();
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


    var disabledStagingConfig=false;

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
          $scope.enableConfig("stagingConfig2");
          $scope.enableConfig("getButton");

        }
      }
      else//no config can be modified
      {

        if(disabledStagingConfig===false)
        {
          disabledStagingConfig=true;
          $scope.disableConfig("stagingConfig2");
          $scope.disableConfig("getButton");
        }
      }

      if(kbCookie.getIsOneCloud()===false)
      {
        $scope.disableConfig("topology");
      }
    };


    $scope.getTopology = function() {
      kbHttp.getMethod("/config/hypervisor_list/" + $scope.sessionID)
        .then(
        function (response) {  // 调用承诺API获取数据 .resolve
          $scope.setUserData(response.data.server);
          console.log("get hypervisor list");
        },
        function (response) {  // 处理错误 .reject
          console.log("get hypervisor list error:");
          console.log(response);
        }
      )
    };
    //$scope.getTopology();


    $scope.getDefaultConfig = function() {
      kbHttp.getMethod("/config/default_config")
        .then(
        function(response) {  //  .resolve
          kbCookie.setConfig(response.data);
          $scope.config =response.data;
          console.log("get & save default config");
        },
        function(response) {  //  .reject
          console.log("get default config error:");
          console.log(response);
        }
      );
      //$scope.config =JSON.stringify(response);

      $scope.getTopology();
      kbCookie.setTopology("");
      $scope.availability_zone=1;
      userData=[];
      init();
    };

    $scope.getRunConfig = function() {
      $scope.availability_zone=1;

      kbHttp.getMethod("/config/running_config/" + $scope.sessionID)
        .then(
        function (response) {  //  .resolve
          kbCookie.setConfig(response.data);
          $scope.config = response.data;

          if(($scope.config.server.availability_zone!=null && $scope.config.server.availability_zone!="") || ($scope.config.client.availability_zone!=null && $scope.client.server.availability_zone!=""))
          {
            $scope.availability_zone=2;
          }

          console.log("get & save running config");
        },
        function (response) {  //  .reject
          console.log("get running config error:");
          console.log(response);
        }
      );

      init();
      $scope.getTopology();

      kbHttp.getMethod("/config/topology_config/" + $scope.sessionID)
        .then(
        function (response) {  //  .resolve
          //kbCookie.setConfig(response.data);
          //$scope.config = response.data;
          if(response.data!="null" && (response.data.servers_rack.length!=0 || response.data.clients_rack.length!=0))
          {
            $scope.availability_zone=3;

            $scope.topology = {"servers_rack": response.data.servers_rack, "clients_rack": response.data.clients_rack};
            kbCookie.setTopology($scope.topology);
            console.log(response.data);

            for (var i in $scope.topology.servers_rack) {
              var moveId = arrayObjectIndexOf($scope.items, $scope.topology.servers_rack[i], "firstName");
              $scope.listC.push($scope.items[moveId]);
              var delId = arrayObjectIndexOf($scope.listA, $scope.topology.servers_rack[i], "firstName");
              $scope.listA.splice(delId,1);
            }
            for (var i in $scope.topology.clients_rack) {
              var moveId = arrayObjectIndexOf($scope.items, $scope.topology.clients_rack[i], "firstName");
              $scope.listB.push($scope.items[moveId]);
              var delId = arrayObjectIndexOf($scope.listA, $scope.topology.clients_rack[i], "firstName");
              $scope.listA.splice(delId,1);
            }

          }
          console.log("get & save topology config");
        },
        function (response) {  //  .reject
          console.log("get topology config error:");
          console.log(response);
        }
      );

    };
    $scope.getRunConfig();


    $scope.changeConfig = function() {
      if($scope.status==="READY"|| $scope.status==="") {
        kbCookie.setConfig($scope.config);

        if($scope.availability_zone==3) {
          $scope.topology = {"servers_rack": [], "clients_rack": []};
          for (var t in $scope.listC) {
            $scope.topology.servers_rack.push($scope.listC[t].firstName);
          }
          for (var t in $scope.listB) {
            $scope.topology.clients_rack.push($scope.listB[t].firstName);
          }

          kbCookie.setTopology($scope.topology);
          console.log($scope.topology);
        }
        else{
          kbCookie.setTopology({"servers_rack":"", "clients_rack": ""});
        }

        $scope.chaCon = {"kb_cfg": {},"topo_cfg":{}};
        $scope.chaCon.kb_cfg = kbCookie.getConfig();
        $scope.chaCon.topo_cfg = kbCookie.getTopology();

        console.log($scope.chaCon);
        kbHttp.putMethod("/config/running_config/" + $scope.sessionID, $scope.chaCon)
          .then(
          function (response) {  //  .resolve
            console.log("change running config");
          },
          function (response) {  //  .reject
            console.log("change running config error:");
            console.log(response);
          }
        )
      }
      else{
        console.log("config not allow to change now!");
      }
    };


    $scope.changeTopology = function(){
      if($scope.availability_zone==1)
      {
        $scope.config.server.availability_zone = "";
        $scope.config.client.availability_zone = "";
        $scope.topology = {};
        kbCookie.setTopology({"servers_rack":"", "clients_rack": ""});
        init();
        $scope.getTopology();
      }
      else if($scope.availability_zone==2)
      {
        $scope.topology = {};
        kbCookie.setTopology({"servers_rack":"", "clients_rack": ""});
        init();
        $scope.getTopology();
      }
      else if($scope.availability_zone==3)
      {
        $scope.config.server.availability_zone = "";
        $scope.config.client.availability_zone = "";
      }
    };

  });



