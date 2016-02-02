var _ = require('lodash');

var shipSize = {
  carrier:5,
  battleship:4,
  submarine:4,
  cruiser:3,
  patrolboat:2
};

// CLASS SHIP
function Ship(type){
  this.type = type;
  this.location = [];
  this.wasHit = [];
  this.dead = false;
}

Ship.prototype.set = function(l){
  var i;
  l.sort();
  try{
    // Size check
    if(l.length != shipSize[this.type]) throw "ERR_SIZE"; 
    // Format check
    if(l.filter(function(p){ return !/^[a-jA-J][0-9]$/.test(p)}).length) throw "ERR_FORMAT";
    // Location check
    if(l[0][0] == l[1][0]){ // fix row
      for(i=1;i<l.length;i++){
        if(l[i-1][0] != l[i][0] || l[i-1][1].charCodeAt() != l[i][1].charCodeAt() -1) throw "ERR_LOCATE";
      }
    }else if(l[0][1] == l[1][1]){ // fix col
      for(i=1;i<l.length;i++){
        if(l[i-1][1] != l[i][1] || l[i-1][0].charCodeAt() != l[i][0].charCodeAt() -1) throw "ERR_LOCATE";
      }
    }
    this.location = l;
    return "OK";
  }catch(err){
    return err;	
  }
}

Ship.prototype.hit = function(pos){
  var hit = false;
  if(this.location.indexOf(pos) != -1 &&
     this.wasHit.indexOf(pos) == -1){
    this.wasHit.push(pos);
    hit = true;
  }
  if(this.wasHit.length == shipSize[this.type]){
    this.dead = true;
  }
  return hit;
}

// CLASS PLAYER
function Player(id) {
  var self = this;
  this.id = id;
  this.fleet = [];
  this.ready = false;
}

Player.prototype.deploy = function (f) {
  var self = this;
  this.fleet = [];
  try {
    _.forEach(f, function (s, type) {
      // Key check
      if (!shipSize.hasOwnProperty(type)) throw "ERR_TYPE";
      var ship = new Ship(type);
      // Location format Check
      if (typeof s != 'string') throw type + ":ERR_FORMAT";
      if(s.indexOf(',') !== -1){
        s = s.split(',');
      }else{
        s = s.split(' ');
      }

      var result = ship.set(s);
      if (result !== 'OK') throw type + ":" + result;
      // Overlay check
      var overlay = self.fleet.filter(function (fleet_ship) {
        return _.intersection(ship.location, fleet_ship.location).length
      }).length;
      if (!!overlay) throw type + ":ERR_OVERLAP";
      self.fleet.push(ship);
    });

    if (self.fleet.length == 5) {
      self.ready = true;
      return "OK";
    }
  } catch (err) {
    return err;
  }
}

// CLASS GAME
function Game(){
  var self = this;
  this.players = [];
  this.state = "INIT"; // INIT,DEPLOY,ENGAGE,END
  this.turn = null;
  this.winner = null;
  this.loser = null;
}

Game.prototype.join = function(id){
  var self = this;
  try{
    if(this.players.length >= 2) throw "ERR_FULL";
    if(!!_.find(self.players,{id:id})) throw "ERR_ALREADY_JOINED";
    this.players.push(new Player(id));

    if(this.players.length == 2){
      this.state = "DEPLOY";
    }
    return "OK";
  }catch(err){
    return err;
  }
}

Game.prototype.deploy = function(id,fleet){
  var self = this;
  try{
    if(this.state != 'DEPLOY') throw "ERR_STATE";
    var player = _.find(self.players,{id:id});
    if(!player) throw "ERR_PLAYER";
    if(player.ready) throw "ERR_ALREADY";
    var result = player.deploy(fleet);

    // check if ready
    if(!this.players.filter(function(p){return !p.ready;}).length){
      this.state = "ENGAGE";
      this.turn = 0;
    }

    return result;
  }catch(err){
    return err;
  }
}

Game.prototype.fire = function(id,target){
  var self = this;
  try{
    if(this.state != 'ENGAGE') throw "ERR_STATE";
    if(this.players[this.turn].id != id) throw "ERR_PLAYER";
    if(!/^[a-jA-J][0-9]$/.test(target)) throw "ERR_TARGET";

    var op = this.turn?0:1;
    var op_fleet = this.players[op].fleet;
    self.sunk = "";
    var hit = op_fleet.filter(function(ship){
      var h = ship.hit(target);
      if(h && ship.dead){
        self.sunk = ship.type;
      }
      return h;
    }).length;

    if(hit){
      var remain = op_fleet.filter(function(ship){
        return !ship.dead;
      }).length;

      if(!remain){
        this.state = "END";
        this.winner = id;
        this.loser = this.players[op].id;
      }
    }
    this.turn = op;
    return hit?"HIT":"MISS";

  }catch(err){return err;}
}

module.exports = Game;