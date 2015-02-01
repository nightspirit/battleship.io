var path = require('path');
var _ = require('lodash');
var express = require('express')
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var Game = require('./game.js');

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
	res.sendFile(__dirname + 'public/index.html');
});

var games = {};

io.on('connection', function (socket) {
	console.log('socket connected:%s',socket.id);
	socket.room = ""; // set room to socket session
	socket.emit('connected',socket.id);

	// bind event
	socket.on('disconnect', function(){ 
		var game = games[socket.room];
		if(!!game){
			if(!!_.find(game.players,{id:socket.id})){
				games[socket.room] = null;
				io.to(socket.room).emit('game_state',{state:'END'});
			}
		}
	});
	socket.on('rooms',function(){
		socket.emit('rooms',io.sockets.adapter.rooms);
	});
	socket.on('join_room',function(room_name){
		socket.join(room_name);
		socket.room = room_name;
		socket.emit('room_joined',room_name);
		io.to(socket.room).emit('player_joined',socket.id);
	});
	socket.on('in_room',function(room_name){
		var room = room_name || socket.room; // default is own room;
		socket.emit('in_room',io.sockets.adapter.rooms[room]);
	});

	socket.on('start_game',function(){
		try{
			games[socket.room] = new Game();
			var game = games[socket.room];
			// TRY JOIN
			var result = game.join(socket.id);
			if(result !== 'OK') throw result;
					
			io.to(socket.room).emit('game_state',{
				state:game.state, // init
				players:game.players.map(function(p){ return {id:p.id,ready:p.ready}; })
			});
			
			socket.emit('game_joined',result);
			
		}catch(err){
			socket.emit('game_joined',err);
		}
	});
	socket.on('join_game',function(){
		try{
			// ERR CHECK
			var game = games[socket.room];
			if(!game) throw "ERR_NO_GAME";
			// TRY JOIN
			var result = game.join(socket.id);
			if(result !== 'OK') throw result;
			
			socket.emit('game_joined',result);
			
			io.to(socket.room).emit('game_state',{
				state:game.state, // deploy
				players:game.players.map(function(p){ return {id:p.id,ready:p.ready}; })
			});

		}catch(err){
			socket.emit('game_joined',err);
		}
	});
	socket.on('deploy',function(fleet){
		try{
			var game = games[socket.room];
			if(!game) throw "ERR_NO_GAME";
			// TRY DEPLOY
			var result = game.deploy(socket.id,fleet);
			if(result !== 'OK') throw result;
		
			socket.emit('deployed',result);
			
			if(game.state == "ENGAGE"){
				io.to(socket.room).emit('game_state',{
					state:game.state,
					first:game.players[game.turn].id
				});
			}
		}catch(err){
			socket.emit('deployed',err);
		}
	});
	socket.on('fire',function(target){
		try{
			var game = games[socket.room];
			if(!game) throw "ERR_NO_GAME";
			// TRY fire
			var result = game.fire(socket.id,target);
			if(!/HIT|MISS/.test(result)) throw result;

			if(game.state == "END"){
				io.to(socket.room).emit('game_state',{state:"END",winner:game.winner,loser:game.loser});
			}else{
				io.to(socket.room).emit('engage',{
					offence:game.players[game.turn?0:1].id,
					defence:game.players[game.turn].id,
					target:target,
					result:result
				});
			}
		}catch(err){
			socket.emit('fired',{error:err});
		}
	});

});



server.listen(80);