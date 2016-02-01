$(function() {

  // utils
  function clsGen(o) {
    var cls = [];
    if (!!o) {
      cls.push(o.type);
      if (!!o.pos) {
        cls.push('r' + o.pos[0][0]);
        cls.push('c' + o.pos[0][1]);
        cls.push('s' + o.pos.length);
        if (o.pos.length > 1) {
          if (o.pos[0][1] == o.pos[1][1]) {
            cls.push('v'); //vertical
          }
        }
      }
      if (!!o.name) {
        cls.push(o.name);
      }
      if (!!o.ph) {
        cls.push('ph');
      }
      if (!!o.overlap) {
        cls.push('overlap');
      }
      if (o.hasOwnProperty('hit')) {
        cls.push(o.hit ? 'hit' : 'miss');
      }
      return cls.join(' ');
    } else {
      return '';
    }
  }

  function posGen(startAt, size, v) {
    var pos = [];
    var i = startAt.charCodeAt(!!v ? 0 : 1);
    var temp;
    if (i < 58 && i + size > 58) { //0-9
      i = 58 - size;
    } else if (i < 75 && i + size > 75) { // A-J
      i = 75 - size;
    } else if (i < 107 && i + size > 107) { // a-j
      i = 107 - size;
    }
    while (size--) {
      temp = "";
      if (!v) {
        temp = startAt[0] + String.fromCharCode(i);
      } else {
        temp = String.fromCharCode(i) + startAt[1];
      }
      pos.push(temp);
      i++;
    }
    return pos;
  }

  function idGen() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < 5; i++)
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }

  // View
  var GridView = Backbone.View.extend({
    initialize: function() {
      this.render();
    },
    render: function() {
      var arrC = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
      var arrR = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];
      var rows = arrR.map(function(r) {
        var tds = arrC.map(function(c) {
          return $('<td/>').attr('data-pos', r + c);
        });
        return $('<tr/>').html(tds);
      });
      this.$el.html($('<table/>').html(rows));
    },
    events: {
      "click": "click_handler",
      "mouseover td": "mouseover_handler"
    },
    click_handler: function(e) {
      var map_id = $(e.target).parents('.map').attr('id');
      if (map_id == "mymap") {
        var ph = myPh.toJSON();
        if(!!ph.pos){
          if(!ph.overlap){
            ui_add_ship(ph);
          }
        }
      } else if (map_id == "opmap") {
        var ph = opPh.toJSON();
        if(!!ph.pos){
          if(!ph.overlap){
            fire(ph);
          }
        }
      }
    },
    mouseover_handler: function(e) {
      var map_id = $(e.target).parents('.map').attr('id');
      if (!!e.originalEvent.fromElement)
        var from = e.originalEvent.fromElement.getAttribute('data-pos') || "";
      if (!!e.originalEvent.toElement)
        var to = e.originalEvent.toElement.getAttribute('data-pos') || "";

      if (!!from && !!to && map_id == 'mymap') {

        var ph = myPh.toJSON();
        if (!!ph.pos) {
          var size = ph.pos.length;
          // new pos
          ph.pos = posGen(to, size, (from[1] == to[1])); // (from[1] == to[1]) = vertical
          // overlap detect
          var objs = myObjs.toJSON();
          ph.overlap = !!(_.chain(objs).pluck('pos').flatten().intersection(ph.pos).value().length);
          myPh.set(ph);
        }
      } else if (!!to && map_id == 'opmap') {
        var ph = opPh.toJSON();
        // new pos
        if (!!ph.pos) {
          ph.pos = [to];
          // overlap detect
          var objs = opObjs.toJSON();
          ph.overlap = !!(_.chain(objs).pluck('pos').flatten().intersection(ph.pos).value().length);
          opPh.set(ph);
        }
      }

    }
  });
  var ObjCollectionView = Backbone.View.extend({
    initialize: function() {
      this.collection.on('change reset add remove', this.render, this);
    },
    render: function() {
      var html = this.collection.map(function(o) {
        return $('<div class="' + clsGen(o.toJSON()) + '"/>');
      });
      this.$el.html(html);
    }
  });
  var PhView = Backbone.View.extend({
    initialize: function() {
      this.model.on('change', this.render, this);
    },
    render: function() {
      if (!!this.model) {
        this.$el.html('<div class="ph ' + clsGen(this.model.toJSON()) + '"/>');
      } else {
        this.$el.html('');
      }
    }
  });
  var BtnRandomView = Backbone.View.extend({
    initialize: function() {
      this.model.on('change', this.render, this);
    },
    render: function() {
      var html = "";
      if (this.model.get('game_state') == 'ENGAGE') {
        if (this.model.get('fire_mode') == 'random') {
          html = '<button class="btn btn-danger active">Disable Random</button>';
        } else {
          html = '<button class="btn btn-danger">Random Fire</button>';
        }
      }
      this.$el.html(html);
    },
    events: {
      "click .btn": "click_handler"
    },
    click_handler: function(e) {
      if ($(e.target).hasClass('active')) {
        ui_fire_mode('');
      } else {
        ui_fire_mode('random');
      }
    }
  });
  var BtnsView = Backbone.View.extend({
    initialize: function() {
      this.model.on('change', this.render, this);
    },
    render: function() {
      var html = "";
      var game_state = this.model.get('game_state');
      var is_player = this.model.get('is_player');
      if(!game_state || game_state == "END"){
        html = '<button class="btn btn-primary start">Start</button>';
      }else if(game_state == 'INIT' && !is_player){
        html = '<button class="btn btn-success join">Join</button>';
      }else if(game_state !== "" && game_state !== "INIT" && !is_player){
        html = '<div class="warning">Game has alreay started. <a class="hop">Try another room</a></div>'
      }
      this.$el.html(html);
    },
    events: {
      "click .btn": "click_handler",
      "click .hop": "hopping"
    },
    click_handler: function(e) {
      if ($(e.target).hasClass('start')) {
        start_game();
      } else if ($(e.target).hasClass('join')) {
        join_game();
      }
    },
    hopping:function(){
      window.location.href = "/backbone#"+idGen();
    }
  });
  var SysMsgView = Backbone.View.extend({
    initialize:function(){
      this.model.on('change', this.render, this);
    },
    render:function(){
      this.$el.html(this.model.get('sys_message'));
    }
  })

  // Model
  var ObjModel = Backbone.Model.extend({});
  var GameModel = Backbone.Model.extend({
    room_name: "",
    game_state: "",
    sys_message: "",
    is_player: false,
    my_turn: false,
    fire_mode: ""
  });

  // Collection
  var ObjCollection = Backbone.Collection.extend({
    model: ObjModel
  })

  // Model instance
  var myObjs = new ObjCollection();
  var opObjs = new ObjCollection();
  var myPh = new ObjModel();
  var opPh = new ObjModel();
  var game = new GameModel();

  // View instance
  var gv = new GridView({
    el: '.grid'
  });
  var myObjsView = new ObjCollectionView({
    el: "#myobjs",
    collection: myObjs
  });
  var myPhView = new PhView({
    el: "#myph",
    model: myPh
  });
  var opObjsView = new ObjCollectionView({
    el: "#opobjs",
    collection: opObjs
  });
  var opPhView = new PhView({
    el: "#opph",
    model: opPh
  });
  var btnRandom = new BtnRandomView({
    el: "#btn-random",
    model:game
  });
  var btns = new BtnsView({
    el: "#btn-game",
    model:game
  });
  var sysmsg = new SysMsgView({
    el: "#sysmsg",
    model:game
  });

  // fleetTmpl
  var fleetTmpl = [{
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

  // socket i/o
  var socket = io.connect({
    reconnection: false
  });

  // socket event binding
  socket
    .on('connected', function(data) {
    // join your own room by emit the 'join_room' and your specific room name
    var hash = window.location.hash;
    socket.emit('join_room', hash || 'demo-Backbone');
  })
    .on('room_joined', function(data) {
    console.log('[socket]room_joined:', data);
    game.set({
      sys_message: "You are in room " + data.name,
      game_state: data.game_state
    });
  })
    .on('game_state', function(data) {
    console.log('[socket]game_state:', data);
    switch (data.state) {
      case 'INIT':
        reset();
        game.set({
          sys_message: "Game initiated.",
          game_state: data.state
        });
        break;
      case 'DEPLOY':
        var msg = data.players[0].id + " vs " + data.players[1].id;
        game.set({
          sys_message: msg,
          game_state: data.state
        });
        if (game.get('is_player')) {
          ui_deploy();
        }
        break;
      case 'ENGAGE':
        if (game.get('is_player')) {
          if (socket.id == data.first) {
            game.set({
              my_turn: true,
              sys_message: "Your turn. Ready to fire.",
              game_state: data.state
            });
            ui_aim();
          } else {
            game.set({
              my_turn: false,
              sys_message: "Opponenet's turn",
              game_state: data.state
            });
          }
        }
        break;
      case 'END':
        reset_ph();
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
        game.set({
          sys_message: msg,
          game_state: data.state
        });
        break;
    }
  })
    .on('game_joined', function(data) {
    console.log('[socket]game_joined:', data);
    if (data == "OK") {
      game.set({
        is_player: true
      });
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
    if (game.get("is_player")) {
      var boom = {
        type: 'boom',
        pos: [data.target],
        hit: (data.result == "HIT")
      };
      if (socket.id == data.defence) {
        myObjs.add(new ObjModel(boom));
        game.set({
          my_turn: true,
          sys_message: "Your turn. Ready to fire."
        });
        ui_aim();
      } else {
        opObjs.add(new ObjModel(boom));
        game.set({
          my_turn: false,
          sys_message: "Opponenet's turn"
        });
      }
    }
  })
    .on('disconnect',function(){
    alert('You are disconnectd!');
  });

  // actions
  function reset_ph() {
    myPh.clear();
    opPh.clear();
  }

  function reset() {
    myObjs.reset();
    opObjs.reset();
    reset_ph();
    game.clear().set(game.defaults);
  }

  function start_game() {
    socket.emit('start_game');
  }

  function join_game() {
    socket.emit('join_game');
  }

  function deploy() {
    var fleet = {};
    myObjs.toJSON().map(function(s) {
      fleet[s.name] = s.pos.join(' ');
    });
    if (!!fleet)
      socket.emit('deploy', fleet);
  }

  function fire(ph) {
    if (!!ph) {
      opPh.clear();
      socket.emit('fire', ph.pos[0]);
    }
  }

  function random_fire() {
    var objs = opObjs.toJSON();
    console.log(objs);
    var pool = "abcdefghij";
    var target;
    do {
      target = pool.charAt(Math.floor(Math.random() * pool.length)) + Math.floor(Math.random() * 10);
    } while (_.chain(objs).pluck('pos').flatten().indexOf(target).value() >= 0);
    if (!!target)
      socket.emit('fire', target);
  }

  function ui_add_ship(ph) {
    myObjs.add(new ObjModel({
      type: ph.type,
      name: ph.name || "",
      pos: ph.pos
    }));
    if (myObjs.length < fleetTmpl.length) {
      ui_deploy();
    } else {
      myPh.clear();
      deploy();
    }
  }

  function ui_place_ship(ship) {
    var ph = {
      type: 'ship',
      name: ship.name,
      pos: posGen('a0', ship.size, 0)
    }
    myPh.set(ph);
  }

  function ui_deploy() {
    if (myObjs.length < fleetTmpl.length) {
      ui_place_ship(fleetTmpl[myObjs.length]);
    }
  }

  function ui_aim() {
    if (game.get('fire_mode') == "random") {
      game.set({
        sys_message: "Randomly Fire!"
      });
      opPh.clear();
      random_fire();
    } else {
      var ph = {
        type: 'boom',
        pos: ['a0'],
        ph: 1
      }
      if (opObjs.length) {
        ph.pos = opObjs.toJSON()[opObjs.length - 1].pos;
      }
      opPh.set(ph);
    }
  }

  function ui_fire_mode(mode) {
    game.set({
      fire_mode: mode
    });
    if (game.get("my_turn")) {
      ui_aim();
    }
  }

});
