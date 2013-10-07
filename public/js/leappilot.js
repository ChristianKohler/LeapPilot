(function(window, document) {
        'use strict';
        // Static keymap used within this module (copied from pilot.js)
        var Keymap = {
          'left' : {
            ev : 'move',
            action : 'left'
          },
          'right' : {
            ev : 'move',
            action : 'right'
          },
          'front' : {
            ev : 'move',
            action : 'front'
          },
          'back' : {
            ev : 'move',
            action : 'back'
          },
          'up' : {
            ev : 'move',
            action : 'up'
          },
          'down' : {
            ev : 'move',
            action : 'down'
          },
          'ccw' : {
            ev : 'move',
            action : 'counterClockwise'
          },
          'cw' : {
            ev : 'move',
            action : 'clockwise'
          },
          'stop' : {
            ev : 'drone',
            action : 'stop'
          },
          'takeoff' : {
            ev : 'drone',
            action : 'takeoff'
          },
          'land' : {
            ev : 'drone',
            action : 'land'
          },
          'emerg' : {
            ev : 'drone',
            action : 'disableEmergency'
          },
          'flip' : {
            ev : 'animate',
            action : 'flip'
          }
        };
       
        /*
         * Constructor
         */
        var LeapPilot = function LeapPilot(cockpit) {
                console.log("Loading LeapPilot plugin.");
                this.cockpit = cockpit;
                this.keys = {};
                this.stopCalled = false;
                this.palmFrontBackLimit = 0.1;
                this.palmLeftRightLimit = 0.2;
                this.palmUpDownLimitBottom = 150;
                this.palmUpDownLimitTop = 250;
                this.directionXInit = -0.3;
                this.directionXTh = 0.3;

                // Setup a timer to send motion command
                var self = this;
                setInterval(function(){self.sendCommands()},100);

                // Listen Loop Leap Motion
                this.listen();
        };

        LeapPilot.prototype.listen = function listen() {
                var that = this;
                Leap.loop(function(obj) {
                    var   hands = obj.hands.length, 
                          fingers = obj.pointables.length,
                          actualTimestamp = obj.data.timestamp; 

                    if(hands === 1 && fingers >= 4) {
                        that.setCommands(obj.hands[0].palmNormal, obj.hands[0].palmPosition, obj.hands[0].direction);
                    }else {
                      that.keys = {};
                    }
                });
        };
        
        
        LeapPilot.prototype.setCommands = function setCommands(palmNormal, palmPosition, direction) {
            var palmFrontBack = palmNormal[2], 
                key, 
                palmLeftRight = palmNormal[0],
                palmUpDown = palmPosition[1],
                directionX = direction[0];

            // Front & Back
            if(palmFrontBack > this.palmFrontBackLimit){
              this.addOrKeepKey('front', palmFrontBack);
              this.removeKey('back');
            } else if(palmFrontBack < -this.palmFrontBackLimit){
              this.addOrKeepKey('back', palmFrontBack);
              this.removeKey('front');
            } else {
              this.removeKey('back');
              this.removeKey('front');
            }

            // Left & Right
            if(palmLeftRight > this.palmLeftRightLimit){
              this.addOrKeepKey('left', palmLeftRight);
              this.removeKey('right');
            } else if(palmLeftRight < -this.palmLeftRightLimit){
              this.addOrKeepKey('right', palmLeftRight);
              this.removeKey('left');
            } else {
              this.removeKey('left');
              this.removeKey('right');
            }

            // Up & Down
            if(palmUpDown > this.palmUpDownLimitTop){
              this.addOrKeepKey('up', 0.5);
              this.removeKey('down');
            } else if(palmUpDown < this.palmUpDownLimitBottom){
              this.addOrKeepKey('down', 0.5);
              this.removeKey('up');
            } else {
              this.removeKey('up');
              this.removeKey('down');
            }

            // CCW & CW
            if(directionX > this.directionXInit + this.directionXTh){
              this.addOrKeepKey('cw', 2 * (directionX - (this.directionXInit + this.directionXTh)));
              this.removeKey('ccw');
            } else if(directionX < this.directionXInit - this.directionXTh){
              this.addOrKeepKey('ccw', 2 * (directionX - (this.directionXInit - this.directionXTh)));
              this.removeKey('cw');
            } else {
              this.removeKey('ccw');
              this.removeKey('cw');
            }
        };

        LeapPilot.prototype.addOrKeepKey = function(key, speed) {
            this.keys[key] = Math.abs(speed / 2);
        };


        LeapPilot.prototype.removeKey = function(key) {
            delete this.keys[key];
        };

        LeapPilot.prototype.sendCommands = function() {
                for (var k in this.keys) {
                    var cmd = Keymap[k];
                    // Send the command
                    this.cockpit.socket.emit("/pilot/" + cmd.ev, {
                        action : cmd.action,
                        speed : this.keys[k]
                    });
                }

                if(jQuery.isEmptyObject(this.keys) && !this.stopCalled) {
                    this.cockpit.socket.emit("/pilot/drone", {
                        action : 'stop'
                    });
                    this.stopCalled = true;
                } else if(!jQuery.isEmptyObject(this.keys)) {
                  this.stopCalled = false;
                }
        };

        window.Cockpit.plugins.push(LeapPilot);

}(window, document));