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
 * Created by xiyu3 on 9/8/15.
 */
'use strict';

angular.module('kbWebApp')
  .controller('StorageConfigCtrl', function ($scope, $http, $location, showAlert, kbHttp, kbCookie, locationChange) {
    this.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];

    if (kbCookie.getSessionID() === "") $location.path('/Login');
    else kbCookie.checkMode('storage');
    //---------------------------------top navigation bar---------------------------------
    $(window).on('hashchange', locationChange.change());

    $scope.sessionID = kbCookie.getSessionID();
    $scope.status = kbCookie.getStatus();

    //------------------------------------------------------
    $scope.dash1status1 = "active";
    $scope.dash1status1vis = true;
    $scope.dash1status2 = "";
    $scope.dash1status2vis = false;
    //$scope.dash1status3 = "";
    //$scope.dash1status3vis = false;

    $scope.setDash1Status = function (dashNum) {
      if (dashNum === 1) {
        $scope.dash1status2 = "";
        $scope.dash1status2vis = false;
        //$scope.dash1status3 = "";
        //$scope.dash1status3vis = false;
        $scope.dash1status1 = "active";
        $scope.dash1status1vis = true;
      }
      else if (dashNum === 2) {
        $scope.dash1status1 = "";
        $scope.dash1status1vis = false;
        //$scope.dash1status3 = "";
        //$scope.dash1status3vis = false;
        $scope.dash1status2 = "active";
        $scope.dash1status2vis = true;
      }
      //else if (dashNum === 3) {
      //  $scope.dash1status1 = "";
      //  $scope.dash1status1vis = false;
      //  $scope.dash1status2 = "";
      //  $scope.dash1status2vis = false;
      //  $scope.dash1status3 = "active";
      //  $scope.dash1status3vis = true;
      //}
    };

    $scope.parseInt = parseInt;

    $scope.checkStatus = function () {
      if ($scope.sessionID) {
        kbHttp.getMethod2("/kloudbuster/status/" + $scope.sessionID)
          .then(
          function (response) {  //  .resolve
            $scope.status = response.data.status;
            kbCookie.setStatus($scope.status);
            $scope.configStatus();
          },
          function (response) {  //  .reject
            console.log("status error");
            //console.log(response);
          }
        );
      }
      else {
        $scope.status = "NO SESSION ID";
        kbCookie.setStatus("");
      }
    };


    var disabledStagingConfig = false;

    $scope.disableConfig = function (disableId) {
      $("#" + disableId).find("input,button,a").each(function () {//show Config
        $(this).attr("disabled", "disabled");
        console.log(this);
        //$(this).removeAttr("disabled");
      });
    };

    $scope.enableConfig = function (enableId) {
      $("#" + enableId).find("input,button,a").each(function () {//disable Config
        //$(this).attr("disabled", "disabled");
        $(this).removeAttr("disabled");
      });
    };

    $scope.configStatus = function () {
      if ($scope.status === "READY")//show all config
      {
        if (disabledStagingConfig === true) {
          disabledStagingConfig = false;
          $scope.enableConfig("stagingConfig3");
          $scope.enableConfig("getButton");
        }
      }
      else//no config can be modified
      {

        if (disabledStagingConfig === false) {
          disabledStagingConfig = true;
          $scope.disableConfig("stagingConfig3");
          $scope.disableConfig("getButton");
        }
      }

    };

    $("#dropdownrandrw").append('<li class="divider"></li>');

    $scope.storageMode = {
      "randread":{"name":"Random Read","type":"panel-randread","para":["description","rate_iops","block_size","iodepth","runtime","extra_opts"]},
      "randwrite":{"name":"Random Write","type":"panel-randwrite","para":["description","rate_iops","block_size","iodepth","runtime","extra_opts"]},
      "randrw":{"name":"Random Read/Write","type":"panel-randrw","para":["description","rate_iops","block_size","iodepth","rwmixread","runtime","extra_opts"]},
      "read":{"name":"Seq Read","type":"panel-read","para":["description","rate","block_size","iodepth","runtime","extra_opts"]},
      "write":{"name":"Seq Write","type":"panel-write","para":["description","rate","block_size","iodepth","runtime","extra_opts"]},
      "rw":{"name":"Seq Read/Write","type":"panel-rw","para":["description","rate","block_size","iodepth","rwmixread","runtime","extra_opts"]}
    };

    $scope.options = {
      "description":{"name":"Description","default":""},
      "mode":{"name":"Mode"},
      "runtime":{"name":"Run Time","default":30},
      "block_size":{"name":"Block Size (KB)","default":"4k"},
      "iodepth":{"name":"IO Depth","default":"1"},
      "rate_iops":{"name":"IOPs","default":100},
      "rate":{"name":"BW (MB/s)","default":"60M"},
      "rwmixread":{"name":"Read %","default":70},
      "extra_opts":{"name":"Extra Options","default":""}
    };

    $scope.switchIndex = function (index, order) {//order = 0 delete; order = 1 move up; order = -1 move down
      var tem = $scope.config.client.storage_tool_configs[index];
      $scope.config.client.storage_tool_configs.splice(index, 1);//delete
      if (order == 1) {
        $scope.config.client.storage_tool_configs.splice(index - 1, 0, tem);
      }
      else if (order == -1) {
        $scope.config.client.storage_tool_configs.splice(index + 1, 0, tem);
      }
    };

    $scope.addMode = function (adding) {
      var newmode= {};
      for(var opt in $scope.storageMode[adding]["para"]){
        var newOpt = $scope.storageMode[adding]["para"][opt];
        newmode[newOpt] = $scope.options[newOpt]["default"];
      }
      newmode["mode"] = adding;
      $scope.config.client.storage_tool_configs.splice(0,0,newmode)
    };



    $scope.getDefaultConfig = function () {
      kbHttp.getMethod("/config/default_config")
        .then(
        function (response) {  //  .resolve
          kbCookie.setConfig(response.data);
          $scope.config = response.data;
          console.log("get & save default config");
        },
        function (response) {  //  .reject
          //console.log("get default config error:");
          //console.log(response);
          showAlert.showAlert("Cannot get the Default Configuration!");
        }
      );
      //$scope.config =JSON.stringify(response);
    };

    $scope.getRunConfig = function () {

      kbHttp.getMethod("/config/running_config/" + $scope.sessionID)
        .then(
        function (response) {  //  .resolve
          kbCookie.setConfig(response.data);
          $scope.config = response.data;

          $scope.checkStatus();

          console.log("get & save running config");
        },
        function (response) {  //  .reject
          console.log("get running config error:");
          console.log(response);
        }
      );
    };
    $scope.getRunConfig();


    $scope.changeConfig = function () {
      if ($scope.status === "READY" || $scope.status === "") {
        if ($scope.server.$valid == true && $scope.general.$valid == true) {
          kbCookie.setConfig($scope.config);


          $scope.chaCon = {"kb_cfg": {}, "topo_cfg": {}};
          $scope.chaCon.kb_cfg = kbCookie.getConfig();

          kbCookie.setTopology({"servers_rack": "", "clients_rack": ""});
          $scope.chaCon.topo_cfg = kbCookie.getTopology();
          $scope.config.server.availability_zone = "";
          $scope.config.client.availability_zone = "";

          console.log($scope.chaCon);
          kbHttp.putMethod("/config/running_config/" + $scope.sessionID, $scope.chaCon)
            .then(
            function (response) {  //  .resolve
              console.log("change running config");
              //showAlert.showAlert("Configuration updated successfully!");

            },
            function (response) {  //  .reject
              //console.log("change running config error:");
              //console.log(response);
              showAlert.showAlert("Failed to update configuration!");
            }
          )
        }
        else{
          showAlert.showAlert("Please check your inputs!");
        }
      }
      else {
        //console.log("config not allow to change now!");
        showAlert.showAlert("Configuration cannot be changed now!");
      }
    };


  });

