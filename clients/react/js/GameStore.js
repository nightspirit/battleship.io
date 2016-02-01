// Fluxxor
var GameStore = Fluxxor.createStore({
  initialize: function() {
    var self = this;

    this.mymap = {
      objs: [],
      ph: null
    };

    this.opmap = {
      objs: [],
      ph: null
    };

    this.fleet = [{
      name: "carrier",
      size: 5
    }, {
      name: "battleship",
      size: 4
    }, {
      name: "submarine",
      size: 4
    }, {
      name: "cruiser",
      size: 3
    }, {
      name: "patrolboat",
      size: 2
    }];

    this.room_name = "";
    this.game_state = "";
    this.sys_message = "";
    this.is_player = false;
    this.my_turn = false;
    this.fire_mode = "";

    // init io
    var socket = io.connect({
      reconnection: false
    });
    this.socket_binding(socket);

    // binding Actions
    this.bindActions(
      'START_GAME', this.start_game,
      'JOIN_GAME', this.join_game,
      'ADD_SHIP', this.ui_add_ship,
      'FIRE', this.fire,
      'FIRE_MODE', this.ui_fire_mode
    );
  },
  socket_binding: function(socket) {
    var store = this;
    socket
      .on('connected', function(data) {
      // join your own room by emit the 'join_room' and your specific room name
      var hash = window.location.hash;
      socket.emit('join_room', hash || 'demo-react');
    })
      .on('room_joined', function(data) {
      console.log('[socket]room_joined:', data);
      store.sys_message = "You are in room " + data.name;
      store.game_state = data.game_state;
      store.emit('change');
    })
      .on('game_state', function(data) {
      console.log('[socket]game_state:', data);
      store.game_state = data.state;
      switch (data.state) {
        case 'INIT':
          store.reset();
          store.sys_message = "Game initiated.";
          store.emit('change');
          break;
        case 'DEPLOY':
          var msg = data.players[0].id + " vs " + data.players[1].id;
          store.sys_message = msg;
          if (store.is_player) {
            store.ui_deploy();
          } else {
            store.emit("change");
          }
          break;
        case 'ENGAGE':
          if (store.is_player) {
            console.log(socket.id);
            if (socket.id == data.first) {
              store.my_turn = true;
              store.sys_message = "Your turn. Ready to fire.";
              store.ui_aim();
            } else {
              store.my_turn = false;
              store.sys_message = "Opponenet's turn";
              store.emit("change");
            }
          }
          break;
        case 'END':
          store.reset_ph();
          if (!!data.winner) {
            if (socket.id == data.winner) {
              msg = "You win!";
            } else if (socket.id == data.loser) {
              msg = "You lose!";
            } else {
              msg = data.winner + " win!";
            }
          } else {
            msg = "Game has terminated."
          }
          store.sys_message = msg
          store.emit("change");
          break;
      }
    })
      .on('game_joined', function(data) {
      console.log('[socket]game_joined:', data);
      if (data == "OK") {
        store.is_player = true;
        store.emit('change');
      }
    })
      .on('deployed', function(data) {
      console.log('[socket]deployed:', data);
    })
      .on('fired', function(data) {
      console.log('[socket]fired:', data);
    })
      .on('engage', function(data) {
      console.log('[socket]engage:', data);
      // put boom into both map
      if (store.is_player) {
        var boom = {
          type: 'boom',
          pos: [data.target],
          hit: (data.result == "HIT")
        };
        if (socket.id == data.defence) {
          store.mymap.objs.push(boom);
          store.my_turn = true;
          store.sys_message = "Your turn. Ready to fire.";
          store.ui_aim();
        } else {
          store.opmap.objs.push(boom);
          store.my_turn = false;
          store.sys_message = "Opponenet's turn";
          store.emit("change");
        }
      }
    })
      .on('disconnect',function(){
      alert('You are disconnectd!');
    });
    this.socket = socket;
  },
  reset_ph: function() {
    this.mymap.ph = null;
    this.opmap.ph = null;
  },
  reset: function() {
    this.mymap = {
      objs: [],
      ph: null
    };
    this.opmap = {
      objs: [],
      ph: null
    };
    this.sys_message = "";
    this.is_player = false;
    this.my_turn = false;
    this.fire_mode = "";
  },
  start_game: function() {
    if (!!this.socket)
      this.socket.emit('start_game');
  },
  join_game: function() {
    if (!!this.socket)
      this.socket.emit('join_game');
  },
  deploy: function() {
    var fleet = {};
    this.mymap.objs.map(function(s) {
      fleet[s.name] = s.pos.join(' ');
    });
    if (!!this.socket && !!fleet)
      this.socket.emit('deploy', fleet);
  },
  fire: function(ph) {
    this.opmap.ph = null;
    if (!!this.socket && !!ph)
      this.socket.emit('fire', ph.pos[0]);
  },
  random_fire: function() {
    var objs = this.opmap.objs;
    var pool = "abcdefghij";
    var target;
    do {
      target = pool.charAt(Math.floor(Math.random() * pool.length)) + Math.floor(Math.random() * 10);
    } while (_.chain(objs).pluck('pos').flatten().indexOf(target).value() >= 0);
    if (!!this.socket && !!target)
      this.socket.emit('fire', target);
  },
  ui_add_ship: function(pl) {
    this.mymap.objs.push({
      type: pl.type,
      name: pl.name || "",
      pos: pl.pos
    });
    if (this.mymap.objs.length < this.fleet.length) {
      this.ui_deploy();
    } else {
      this.mymap.ph = null;
      this.deploy();
    }
    this.emit("change");
  },
  ui_place_ship: function(pl) {
    var ph = {
      type: 'ship',
      name: pl.name,
      pos: posGen('a0', pl.size, 0),
      ph: 1
    }
    this.mymap.ph = ph;
    this.emit("change");
  },
  ui_deploy: function() {
    if (this.mymap.objs.length < this.fleet.length) {
      this.ui_place_ship(this.fleet[this.mymap.objs.length]);
    }
  },
  ui_aim: function() {
    if (this.fire_mode == "random") {
      this.sys_message = "Randomly Fire!";
      this.opmap.ph = null;
      this.emit("change");
      this.random_fire();
    } else {
      var last_fire = this.opmap.objs[this.opmap.objs.length-1]
      var ph = {
        type: 'boom',
        pos: ['a0'],
        ph: 1
      }
      if(this.opmap.objs.length){
        ph.pos = this.opmap.objs[this.opmap.objs.length-1].pos;
      }
      this.opmap.ph = ph;
      this.emit("change");
    }
  },
  ui_fire_mode: function(mode) {
    this.fire_mode = mode;
    if (this.my_turn){
      this.ui_aim();
    }else{
      this.emit("change");
    }
  },
  getState: function() {
    return {
      mymap: this.mymap,
      opmap: this.opmap,
      room_name: this.room_name,
      game_state: this.game_state,
      is_player: this.is_player,
      sys_message: this.sys_message,
      fire_mode: this.fire_mode
    };
  }
});

var actions = {
  start_game: function() {
    this.dispatch('START_GAME');
  },

  join_game: function() {
    this.dispatch('JOIN_GAME');
  },

  add_ship: function(ship) {
    this.dispatch('ADD_SHIP', ship);
  },

  fire: function(ph) {
    this.dispatch('FIRE', ph);
  },

  fire_mode: function(mode) {
    this.dispatch('FIRE_MODE', mode);
  }
};

var stores = {
  GameStore: new GameStore()
};

var flux = new Fluxxor.Flux(stores, actions);

flux.on("dispatch", function(type, payload) {
  console.log("[Dispatch]", type, payload);
});

var FluxMixin = Fluxxor.FluxMixin(React);
var StoreWatchMixin = Fluxxor.StoreWatchMixin;
