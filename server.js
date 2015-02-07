var path = require('path');
var _ = require('lodash');
var express = require('express')
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var Game = require('./game.js');

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'clients')));

app.get('/', function(req, res) {
  res.sendFile(path.join(__dirname + '/public/index.html'));
});

app.get('/react', function(req, res) {
  res.sendFile(path.join(__dirname + '/clients/react/index.html'));
});



var games = {};

io.on('connection', function(socket) {
  console.log('socket connected:%s', socket.id);
  socket.room = ""; // set room to socket session
  socket.emit('connected', socket.id);

  // bind event
  socket
  .on('disconnect', function() {
    var game = games[socket.room];
    if (!!game) {
      if (!!_.find(game.players, {
        id: socket.id
      })) {
        games[socket.room] = null;
        io.to(socket.room).emit('game_state', {
          state: 'END'
        });
      }
    }
  })
  .on('rooms', function() {
    socket.emit('rooms', io.sockets.adapter.rooms);
  })
  .on('join_room', function(room_name) {
    socket.join(room_name);
    socket.room = room_name;
    var res = {name:room_name};
    res.game_state = "";
    if(!!games[socket.room])
    res.game_state = games[socket.room].state;
    socket.emit('room_joined',res);
    io.to(socket.room).emit('player_joined', socket.id);
  })
  .on('in_room', function(room_name) {
    var room = room_name || socket.room;
    socket.emit('in_room', io.sockets.adapter.rooms[room]);
  })
  .on('start_game', function() {
    try {
      games[socket.room] = new Game();
      var game = games[socket.room];
      // TRY JOIN
      var result = game.join(socket.id);
      if (result !== 'OK') throw result;

      io.to(socket.room).emit('game_state', {
        state: game.state, // init
        players: game.players.map(function(p) {
          return {
            id: p.id,
            ready: p.ready
          };
        })
      });

      socket.emit('game_joined', result);

    } catch (err) {
      socket.emit('game_joined', err);
    }
  })
  .on('join_game', function() {
    try {
      // ERR CHECK
      var game = games[socket.room];
      if (!game) throw "ERR_NO_GAME";
      // TRY JOIN
      var result = game.join(socket.id);
      if (result !== 'OK') throw result;

      socket.emit('game_joined', result);

      io.to(socket.room).emit('game_state', {
        state: game.state, // deploy
        players: game.players.map(function(p) {
          return {
            id: p.id,
            ready: p.ready
          };
        })
      });

    } catch (err) {
      socket.emit('game_joined', err);
    }
  })
  .on('deploy', function(fleet) {
    try {
      var game = games[socket.room];
      if (!game) throw "ERR_NO_GAME";
      // TRY DEPLOY
      var result = game.deploy(socket.id, fleet);
      if (result !== 'OK') throw result;

      socket.emit('deployed', result);

      if (game.state == "ENGAGE") {
        io.to(socket.room).emit('game_state', {
          state: game.state,
          first: game.players[game.turn].id
        });
      }
    } catch (err) {
      socket.emit('deployed', err);
    }
  })
  .on('fire', function(target) {
    try {
      var game = games[socket.room];
      if (!game) throw "ERR_NO_GAME";
      // TRY fire
      var result = game.fire(socket.id, target);
      if (!/HIT|MISS/.test(result)) throw result;

      io.to(socket.room).emit('engage', {
        offence: game.players[game.turn ? 0 : 1].id,
        defence: game.players[game.turn].id,
        target: target,
        result: result
      });

      if (game.state == "END") {
        io.to(socket.room).emit('game_state', {
          state: "END",
          winner: game.winner,
          loser: game.loser
        });
      }
    } catch (err) {
      socket.emit('fired', err);
    }
  });

});

server.listen(process.env.PORT || 80);
