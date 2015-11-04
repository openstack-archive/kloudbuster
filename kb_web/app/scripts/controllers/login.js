// Copyright 2015 Cisco Systems, Inc.  All rights reserved.
//
//    Licensed under the Apache License, Version 2.0 (the "License"); you may
//    not use this file except in compliance with the License. You may obtain
//    a copy of the License at
//
//         http://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
//    WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
//    License for the specific language governing permissions and limitations
//    under the License.

'use strict';


angular.module('kbWebApp')
  .controller('LoginCtrl', function ($scope,$http,$location,kbHttp,kbCookie) {
    this.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
    //if(kbCookie.getSessionID()!="") $location.path('/');

    $scope.deleteSession = function(){
        kbHttp.delMethod("/config/running_config/" + $scope.sessionID)
          .then(
          function (response) {  //  .resolve
            console.log("del sessionID");
          },
          function (response) {  //  .reject
            console.log("delete error:");
            console.log(response);
          }
        );
    };

    $scope.CleanUp = function(){
        kbHttp.postMethod("/kloudbuster/cleanup/" + $scope.sessionID)
          .then(
          function(response) {  //  .resolve
            console.log("clean up successfully");
          },
          function(response) {  //  .reject
            console.log("clean error:");
            console.log(response);
          }
        );
    };


    if(kbCookie.getSessionID()!="") {
      $scope.sessionID=kbCookie.getSessionID();
      if(kbCookie.getStatus()!="READY")
      {
        $scope.CleanUp();
      }
      $scope.deleteSession();
      kbCookie.init();
    }
//---------------------------------credentials--------------------------------
    $scope.samecloud = true;
    $scope.clouds = function() {
      if($scope.samecloud===true) {
        $('#inputPassword2').attr("disabled",true);
        $('#file2').attr("disabled",true);
      }
      else{
        $('#inputPassword2').attr("disabled",false);
        $('#file2').attr("disabled",false);

      }
      //console.log($scope.samecloud);
    };

    var test_rc;
    function readFile (evt) {
      var files = evt.target.files;
      var file = files[0];
      var reader = new FileReader();
      reader.onload = function() {
        test_rc = this.result;
        //console.log(this.result);
      };
      reader.readAsText(file);
    }
    document.getElementById('file1').addEventListener('change', readFile, false);

    var test_rc2;
    function readFile2 (evt) {
      var files = evt.target.files;
      var file = files[0];
      var reader = new FileReader();
      reader.onload = function() {
        test_rc2 = this.result;
        //console.log(this.result);
      };
      reader.readAsText(file);
    }
    document.getElementById('file2').addEventListener('change', readFile2, false);


    $(document).ready(function(){
      $("#inputPassword1").keydown(function(e){
        var curKey = e.which;
        if(curKey == 13){
          $scope.setConfig();
          return false;
        }
      });
      $("#inputPassword2").keydown(function(e){
        var curKey = e.which;
        if(curKey == 13){
          $scope.setConfig();
          return false;
        }
      });
    });

    $scope.setConfig = function() {
      if($scope.samecloud===true){
        kbCookie.setIsOneCloud(true);
        $scope.credentials = { "tested-passwd": $scope.inputPassword1, "tested-rc": test_rc, "testing-passwd":"", "testing-rc":""};
      }
      else{
        kbCookie.setIsOneCloud(false);
        $scope.credentials = { "tested-passwd": $scope.inputPassword1, "tested-rc": test_rc, "testing-passwd":inputPassword2, "testing-rc":test_rc2};
      }

      //no sessionID but have cred
      $scope.runCon = {"credentials":{},kb_cfg:""};
      $scope.credentials ={"tested-passwd":"admin","tested-rc":"\n#!/bin/bash\n\n# To use an Openstack cloud you need to authenticate against keystone, which\n# returns a **Token** and **Service Catalog**.  The catalog contains the\n# endpoint for all services the user/tenant has access to - including nova,\n# glance, keystone, swift.\n#\n# *NOTE*: Using the 2.0 *auth api* does not mean that compute api is 2.0.  We\n# will use the 1.1 *compute api*\nexport OS_AUTH_URL=http://172.22.191.172:5000/v2.0\n\n# With the addition of Keystone we have standardized on the term **tenant**\n# as the entity that owns the resources.\nexport OS_TENANT_ID=650c758455934bd9bd8cc229d9d7b17a\nexport OS_TENANT_NAME=\"admin\"\n\n# In addition to the owning entity (tenant), openstack stores the entity\n# performing the action as the **user**.\nexport OS_USERNAME=\"admin\"\n\n# With Keystone you pass the keystone password.\necho \"Please enter your OpenStack Password: \"\nread -sr OS_PASSWORD_INPUT\nexport OS_PASSWORD=$OS_PASSWORD_INPUT\n\n# If your configuration has multiple regions, we set that information here.\n# OS_REGION_NAME is optional and only valid in certain environments.\nexport OS_REGION_NAME=\"RegionOne\"\n# Don't leave a blank variable, unset it if it was empty\nif [ -z \"$OS_REGION_NAME\" ]; then unset OS_REGION_NAME; fi\n"};

      //console.log($scope.credentials);
      $scope.runCon.credentials = $scope.credentials;

      kbCookie.setCredentials($scope.credentials);

      kbHttp.postMethod("/config/running_config", $scope.runCon)
        .then(
        function(response) {  //  .resolve
          kbCookie.setSessionID(response.data);
          $scope.sessionID = kbCookie.getSessionID();
          console.log("set config & get sesID:" + $scope.sessionID);
          $location.path('/');
        },
        function(response) {  //  .reject
          alert("Error while parsing the configuration file!");
          console.log("set config error:");
          console.log(response);
        }
      );
    }
  });
