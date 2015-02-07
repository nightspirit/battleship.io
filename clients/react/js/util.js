// utils
function clsGen(o){
  var cls = [];
  if(!!o){
    cls.push(o.type);
    if(!!o.pos){
      cls.push('r'+o.pos[0][0]);
      cls.push('c'+o.pos[0][1]);
      cls.push('s'+o.pos.length);
      if(o.pos.length >1){
        if(o.pos[0][1] == o.pos[1][1]){
          cls.push('v'); //vertical
        }
      }
    }
    if(!!o.name){
      cls.push(o.name);
    }
    if(!!o.ph){
      cls.push('ph');
    }
    if(!!o.overlap){
      cls.push('overlap');
    }
    if(o.hasOwnProperty('hit')){
      cls.push(o.hit?'hit':'miss');
    }
    return cls.join(' ');
  }else{
    return '';
  }
}

function posGen(startAt, size, v) {
  var pos = [];
  var i = startAt.charCodeAt(!!v?0:1);
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

function idGen()
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}
