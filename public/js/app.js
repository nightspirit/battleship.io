(function(){
  function msgFactory($timeout){
    var vm = this;
    function $t(fn){ return $timeout(fn,0)}

    vm.output = [];
    vm.output.push = function(data){
      var self = this;
      if(!Array.isArray(data)){
        data = [data];
      }
      $t(function(){
        Array.prototype.push.apply(self,data);
      });
    }

    var socket = io.connect({
      reconnection : false
    });

    var auto_fire = {
      mode: "",
      auto_target: "a0 a1 a2 a3 a4 b0 b1 b2 b3 c0 c1 c2 c3 d0 d1 d2 e0 e1".split(" "),
      auto_idx:0,
      auto: function(){
        if(this.mode == 'auto'){
          vm.command(this.auto_target[this.auto_idx]);
          this.auto_idx++;
        }
      },
      random: function(){
        if(this.mode == 'random'){
          var pool = "abcdefghij";
          var target =  pool.charAt(Math.floor(Math.random() * pool.length)) + Math.floor(Math.random()*10);
          vm.command(target);
        }
      },
      reset: function(){
        this.mode= "";
        this.auto_idx=0;
      }
    }

    var prompt_deploy = {
      inputs : [],
      q	: [
        "Deploy your Carrier (5 slots):",
        "Deploy your Battleship (4 slots):",
        "Deploy your Submarine (4 slots):",
        "Deploy your Cruiser (3 slots):",
        "Deploy your Patrol Boat (2 slots):"
      ],
      show: function(){
        if(this.inputs.length < 5)
          vm.output.push({type:"system",text:this.q[this.inputs.length]});
      },
      next: function(input){
        if(input !== "fast"){
          this.inputs.push(input);
          vm.output.push({text:input});
          if(this.inputs.length < 5){
            this.show();
          }else{
            this.send();
          }
        }else{
          this.inputs = ["a0 a1 a2 a3 a4","b0 b1 b2 b3","c0 c1 c2 c3","d0 d1 d2","e0 e1"];
          this.send();
        }
      },
      send: function(){
        console.log(this.inputs);
        socket.emit('deploy',{
          carrier:this.inputs[0],
          battleship:this.inputs[1],
          submarine:this.inputs[2],
          cruiser:this.inputs[3],
          patrolboat:this.inputs[4]
        }); // expecting deployed
      },
      reset: function(){
        this.inputs = [];
      }
    }

    var state = {
      in_game: false,
      ready: false,
      my_turn : false,
      game: "",
      reset: function(){
        this.in_game = false;
        this.ready = false;
        this.my_turn = false;
        this.game = "";
        auto_fire.reset();
      }
    }

    // socket event
    socket.on('connected',function(data){
      // socket connected
      console.log(data);
      var hash = window.location.hash;

      socket.emit('join_room',hash||'demo');
    });
    socket.on('rooms', function (data) {
      console.log(data);
    });
    socket.on('in_room', function (data) {
      console.log(data);
    });
    socket.on('room_joined', function (data) {
      console.log(data);
      vm.output.push({msg:"system",text:"You are in room: "+data.name});
    });
    socket.on('game_state',function(data){
      console.log(data);
      state.game = data.state;
      switch(data.state){
        case 'INIT':
          vm.output.push({type:"system",text:"Game Start"});
          state.reset();
          break;
        case 'DEPLOY':
          var msg = data.players[0].id + " vs " + data.players[1].id;
          vm.output.push({type:"system",text:msg});
          if(state.in_game){
            prompt_deploy.show();
          }
          break;
        case 'ENGAGE':
          vm.output.push({type:"error",text:"START ENGAGING"});
          if(socket.id == data.first){
            state.my_turn = true;
            vm.output.push({type:"system",text:"Your turn. Ready to fire."});
          }
          break;
        case 'END':
          var msg,type;
          if(!!data.winner){
            if(socket.id == data.winner){
              msg = "You win!";
              type = "system";
            }else if (socket.id == data.loser){
              msg = "You lose!";
              type = "error";
            }else{
              msg = data.winner + " win!";
              type = "system";
            }
            vm.output.push({type:type,text:msg});
          }
          vm.output.push({type:"system",text:"Game Over"});
          break;
      }
      game_state = data;
    });
    socket.on('game_joined',function(res){
      console.log('game_joined:'+res);
      if(res == "OK"){
        state.in_game = true;
      }else{
        // ERR_NO_GAME
        // ERR_ALREADY_START
        // ERR_FULL
        // ERR_ALREADY_JOINED
        vm.output.push({type:"error",text:res});
      }
    });
    socket.on('deployed',function(res){
      console.log(res);
      if(res != "OK"){
        vm.output.push({type:"error",text:res});
        prompt_deploy.reset();
        prompt_deploy.show();
      }else{
        state.ready = true; // ready engage
        vm.output.push({type:"system",text:"DEPLOY SUCCESS"});
      }
    });
    socket.on('fired',function(res){
      console.log(res);
      vm.output.push({type:"error",text:res});
    });
    socket.on('engage',function(res){
      console.log(res);
      state.my_turn = false;
      var attcker;
      if(socket.id == res.offence){
        attcker = "You";
      }else if(socket.id == res.defence){
        attcker = "Opponent";
      }else{
        attcker = res.offence;
      }
      var msg = attcker + ' fire on ' + res.target + (res.result == 'HIT'?' and hit!':' but miss.');
      var type = res.result == 'HIT'?'error':'bad';
      vm.output.push({type:type,text:msg});
      if(socket.id == res.defence){
        state.my_turn = true;
        vm.output.push({type:"system",text:"Your turn. Ready to fire."});
        if(!!auto_fire.mode){
          auto_fire[auto_fire.mode]();
        }
      }
    });
    socket.on('disconnect',function(){
      alert('You are disconnectd!');
    });
    // from ctrl
    vm.command = function(input){
      try{
        switch(input){
          case "start":
            socket.emit('start_game');
            break;
          case "join":
            socket.emit('join_game');
            break;
          default:
            if(state.game == "DEPLOY" && state.in_game && !state.ready){
              prompt_deploy.next(input);
              break;
            }else if(state.game == "ENGAGE" && state.my_turn){
              if(!/auto|random/.test(input)){
                socket.emit('fire',input);
              }else {
                auto_fire.mode = input;
                auto_fire[input]();
              }
              // error : listen to fired
              // result : listen to engage
              break;
            }

            throw "BAD_COMMAND"
        }
      }catch(err){
        if(err == "BAD_COMMAND"){
          vm.output.push({type:"bad",text:"Bad command. Try something else."});
        }else{
          vm.output.push({type:"error",text:err});
        }

      }
    }
  }
  msgFactory.$inject = ['$timeout'];

  function shellCtrl($msg,$scope){
    var vm = this;
    vm.display = $msg.output;
    vm.input = "";
    vm.enter = function(){
      $msg.command(vm.input);
      vm.input = "";
    }
  }
  shellCtrl.$inject = ['msgFactory'];

  angular.module('app',[])
    .service('msgFactory',msgFactory)
    .controller('shellCtrl',shellCtrl);

})();
