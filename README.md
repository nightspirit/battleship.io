# Battleship.io
Battleship game host powered by socket.io and node.js

## git clone and start local server
```bash
$ git clone https://github.com/nightspirit/battleship.io.git
$ cd battleship.io
$ npm install
$ npm start
```
By default, it will create a game server on http://localhost and listen to port 80

## Example
[CLI example](http://battleship.io.pofolio.cc/)

[GUI in ReactJS](http://battleship.io.pofolio.cc/react)

[GUI in Backbone](http://battleship.io.pofolio.cc/backbone)

## How to use on client side
include lib in your html
```html
<script src="https://cdn.socket.io/socket.io-1.4.5.js"></script>
```
for your javascript app
```js
var socket = io.connect();
// Establish an io socket instance which connect to localhost
// or io.connect("battleship.io.pofolio.cc"); which is my public server.

// subscribe 'connected' event
socket.on('connected',function(data){
	// join your own room by emit the 'join_room' and your specific room name
	socket.emit('join_room','YOUR ROOM NAME');
});

// subscribe to different events to make your client works
socket.on('room_joined',function(){...});
socket.on('game_state',function(){...});
socket.on('game_joined',function(){...});
socket.on('room_joined',function(){...});
socket.on('deployed',function(){...});
socket.on('fired',function(){...});
socket.on('engage',function(){...});
```

## Game flow
1. Client A emit **"start_game"**
2. Client A listen to **"game_joined"** for response
3. Server broadcast **"game_state"** as **"INIT"** if game started successfully
4. Client B emit **"join_game"**
5. Client B listen to **"game_joined"** for response
6. Server broadcast **"game_state"** as **"DEPLOY"** if player joined successfully
7. Both clients try to deploy their fleet by emit **'deploy'** and **fleet location object**
8. Listen to **"deployed"** for response
9. Server broadcast **'game_state'** as **"ENGAGE"** if both players deployed successfully
10. Both clients emit **"fire"** and **coordinates** for engaging alternately
11. Listen to **"fired"** for response
12. Server broadcast **"engage"** as engaging result each turn
13. If any client's fleet all sunk, server broadcast  **"game_state"** as **"END"**

## Game actions
### 'start_game'
```js
socket.emit('start_game'); // start game
```
### 'join_game'
```js
socket.emit('join_game'); // join existing game
```
### 'deploy'
```js
socket.emit('deploy',{
	carrier: "a0 a1 a2 a3 a4", // size 5
	battleship: "b0 b1 b2 b3", // size 4
	submarine: "c0 c1 c2 c3", // size 4
	cruiser: "d0 d1 d2", // size 3
	patrolboat: "e0 e1" // size 2
});
```
> Coordinates format should be like [a-j0-9] for example "f1". For each type of ship it should be space or comma separated string.
>
> Although there has server side validation, for better UX, client side should do validation before sending data.

### 'fire'
```js
socket.emit('fire',"c2");
```

## Game Events
### 'game_joined'
```js
socket.on('game_joined',function(res){
	// res:
	// OK - success
	// ERR_NO_GAME - there is no game in room
	// ERR_ALREADY_START - game already started
    // ERR_FULL - players full (when join_game)
	// ERR_ALREADY_JOINED - you have already joined
}
```
### 'game_state'
```js
socket.on('game_state',function(res){
	// res.state
	// INIT - initial state
	// DEPLOY - deploy state
	// ENGAGE - engage state
	// END - game over

	// Additional data
	// when DEPLOY
	// res.players = [{id:<socket id>,ready:<bool>},{...}]
	// when ENGAGE
	// res.first = <id> is first strike player socket id
	// when END and game has result
	// res.winner = <id> is winner socket id
	// res.loser = <id> is loser socket id
});
```
### 'deployed'
```js
socket.on('deployed',function(res){
	// res
	// OK - success
	// ERR_NO_GAME - no ongoing game in room
	// ERR_STATE - not in DEPLOY state
	// ERR_PLAYER - not the participant
	// ERR_ALREADY - already deployed
	// ERR_TYPE - ship key is not correct
	// ERR_FORMAT - coordinates are not correct
	// ERR_OVERLAP - ship overlapping
});
```
### 'fired'
```js
socket.on('fired',function(res){
	// ERR_NO_GAME- no ongoing game in room
	// ERR_STATE - not in ENGAGE state
	// ERR_PLAYER- not your turn
	// ERR_TARGET - coordinates are not correct
});
```
### 'engage'
```js
socket.on('engage',function(res){
/*
	res:
	{
		offence:<id>,
		defence:<id>,
		target:<coordinates>,
		result:<HIT|MISS>
		sunk:<ship.type> // if any ship sunk, otherwise empty string
	}
*/
});
```

## Room actions / events
###"rooms"
```js
socket.emit('rooms');
socket.on('rooms',function(data){
	// current live room ids
});
```
### 'join_room' / 'room_joined'
```js
socket.emit('join_room',"<room name>");
socket.on('room_joined',function(data){
	// data = {name:<room name>,game_state:<current game state>}
	// game_state : ""||"INIT"||"DEPLOY"||"ENGAGE"||"END"
});
```
### 'in_room'
```js
socket.emit('in_room');
socket.on('in_room',function(data){
	// all in room user ids
});
```
## License
MIT
