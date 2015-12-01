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
 * Created by xiyu3 on 10/12/15.
 */

'use strict';


angular.module('kbWebApp')
  .controller('LoginCtrl', function ($scope, $http, $location, showAlert, $q, kbHttp, kbCookie, locationChange) {
    this.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma'
    ];
    //if(kbCookie.getSessionID()!="") $location.path('/');
    //---------------------------------top navigation bar---------------------------------
    $(window).on('hashchange', locationChange.change());

//---------------------------------for uploading files---------------------------------
    (function (e, t, n) {
      var r = e.querySelectorAll("html")[0];
      r.className = r.className.replace(/(^|\s)no-js(\s|$)/, "$1js$2")
    })(document, window, 0);

    ( function (document, window, index) {
      var inputs = document.querySelectorAll('.inputfile');
      Array.prototype.forEach.call(inputs, function (input) {
        var label = input.nextElementSibling,
          labelVal = label.innerHTML;

        input.addEventListener('change', function (e) {
          var fileName = '';
          fileName = e.target.value.split('\\').pop();
          if (fileName)
            label.querySelector('span').innerHTML = fileName;
          else
            label.innerHTML = labelVal;
        });

        // Firefox bug fix
        input.addEventListener('focus', function () {
          input.classList.add('has-focus');
        });
        input.addEventListener('blur', function () {
          input.classList.remove('has-focus');
        });
      });
    }(document, window, 0));


    $scope.deleteSession = function () {
      kbHttp.delMethod("/config/running_config/" + $scope.sessionID)
        .then(
        function (response) {  //  .resolve
          console.log("del sessionID");
        },
        function (response) {  //  .reject
          //console.log("delete error:");
          //console.log(response);
        }
      );
    };

    $scope.CleanUp = function () {
      var deferred = $q.defer();
      if (kbCookie.getStatus() != "READY" && kbCookie.getStatus() != "CLEANING") {
        kbHttp.postMethod("/kloudbuster/cleanup/" + $scope.sessionID)
          .then(
          function (response) {  //  .resolve
            console.log("clean up successfully");
          },
          function (response) {  //  .reject
            //console.log("clean error:");
            //console.log(response);
          }
        );
        deferred.resolve(1);
      }
      else deferred.resolve(1);
      return deferred.promise;
    };

    //-----init-----
    if (kbCookie.getSessionID() != "") {
      $scope.sessionID = kbCookie.getSessionID();

      var promise = $scope.CleanUp();
      promise.then(function () {
        $scope.deleteSession();
        kbCookie.init();
      });


    }

//---------------------------------credentials--------------------------------
    $scope.samecloud = true;
    $scope.clouds = function () {
      if ($scope.samecloud === true) {
        $('#inputPassword2').attr("disabled", true);
        $('#file2').attr("disabled", true);
        $('#rcfile2').attr("disabled", true);

      }
      else {
        $('#inputPassword2').attr("disabled", false);
        $('#file2').attr("disabled", false);
        $('#rcfile2').attr("disabled", false);


      }
      //console.log($scope.samecloud);
    };

    var test_rc;

    function readFile(evt) {
      var files = evt.target.files;
      var file = files[0];
      var reader = new FileReader();
      reader.onload = function () {
        test_rc = this.result;
        //console.log(this.result);
      };
      reader.readAsText(file);
    }

    document.getElementById('file1').addEventListener('change', readFile, false);

    var test_rc2;

    function readFile2(evt) {
      var files = evt.target.files;
      var file = files[0];
      var reader = new FileReader();
      reader.onload = function () {
        test_rc2 = this.result;
        //console.log(this.result);
      };
      reader.readAsText(file);
    }

    document.getElementById('file2').addEventListener('change', readFile2, false);


    $("#inputPassword1").keydown(function (e) {
      var curKey = e.which;
      if (curKey == 13) {
        $scope.setConfig();
      }
    });

    $("#inputPassword2").keydown(function (e) {
      var curKey = e.which;
      if (curKey == 13) {
        $scope.setConfig();
      }
    });


    $scope.setConfig = function () {
      if ($scope.samecloud === true) {
        kbCookie.setIsOneCloud(true);
        $scope.credentials = { "tested-passwd": $scope.inputPassword1, "tested-rc": test_rc};
      }
      else {
        kbCookie.setIsOneCloud(false);
        $scope.credentials = {
          "tested-passwd": $scope.inputPassword1,
          "tested-rc": test_rc,
          "testing-passwd": inputPassword2,
          "testing-rc": test_rc2
        };
      }
      //no sessionID but have cred
      $scope.runCon = {"credentials": {}, kb_cfg: ""};

      //console.log($scope.credentials);
      $scope.runCon.credentials = $scope.credentials;

      kbCookie.setCredentials($scope.credentials);

      kbHttp.postMethod("/config/running_config", $scope.runCon)
        .then(
        function (response) {  //  .resolve
          kbCookie.setSessionID(response.data);
          $scope.sessionID = kbCookie.getSessionID();
          console.log("set config & get sesID:" + $scope.sessionID);
          $location.path('/');
        },
        function (response) {  //  .reject
          //console.log("set config error:");
          //console.log(response);
          //$scope.showAlert(response.data);
          if (response.status == 400)
            showAlert.showAlert("Error while parsing configurations! Please check your inputs!");
          else if (response.status == -1)
            showAlert.showAlert("Error while connecting kloudbuster server!");

        }
      );
    }
  });

