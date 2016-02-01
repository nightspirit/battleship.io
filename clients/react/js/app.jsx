var Grid = React.createClass({
  render: function(){
    var cls = this.props.className;
    var arrC = [0,1,2,3,4,5,6,7,8,9];
    var arrR = ['a','b','c','d','e','f','g','h','i','j'];
    var rows = arrR.map(function(r){
      var tds = arrC.map(function(c){
        return <td key={c} data-pos={r+c}/>;
      });
      return <tr key={r}>{tds}</tr>;
      });
      return <table className={cls}>{rows}</table>;
      }
    });

    var MyMap = React.createClass({
      mixins: [FluxMixin, StoreWatchMixin("GameStore")],
      getStateFromFlux: function() {
        var flux = this.getFlux();
        return flux.store("GameStore").getState().mymap;
      },
      clickHandler:function(e){
        if(!this.state.ph.overlap){
          this.getFlux().actions.add_ship(this.state.ph);
        }
      },
      mouseoverHandler: function(e){
        if(!!e.nativeEvent.fromElement)
        var from = e.nativeEvent.fromElement.getAttribute('data-pos')||"";
        if(!!e.nativeEvent.toElement)
        var to = e.nativeEvent.toElement.getAttribute('data-pos')||"";
        var ph = this.state.ph;
        if(!!ph && !!from  && !!to){
          var size = ph.pos.length;
          // new pos
          ph.pos = posGen(to,size,(from[1] == to[1])); // (from[1] == to[1]) = vertical
          // overlap detect
          var objs = this.state.objs;
          ph.overlap = !!(_.chain(objs).pluck('pos').flatten().intersection(ph.pos).value().length);
          this.setState({
            ph:ph
          });
        }
      },
      render:function(){
        var objs = this.state.objs.map(function(o){
          return <div className={clsGen(o)} />
        });

        var ph = !!this.state.ph?<div className={clsGen(this.state.ph)}/>:"";

        return (
          <div className="map"
            onClick={this.clickHandler}
            onMouseOver={this.mouseoverHandler}>
            <Grid className="inv"/>
            {objs}{ph}
            <Grid/>
          </div>
        );
      }
    });

    var OpMap = React.createClass({
      mixins: [FluxMixin, StoreWatchMixin("GameStore")],
      getStateFromFlux: function() {
        var flux = this.getFlux();
        return flux.store("GameStore").getState().opmap;
      },
      clickHandler:function(e){
        if(!this.state.ph.overlap){
          this.getFlux().actions.fire(this.state.ph);
        }
      },
      mouseoverHandler: function(e){
        if(!!e.nativeEvent.toElement)
        var to = e.nativeEvent.toElement.getAttribute('data-pos')||"";
        var ph = this.state.ph;
        if(!!ph && !!to){
          // new pos
          ph.pos = [to]
          // overlap detect
          var objs = this.state.objs;
          var overlap = 0;
          objs.map(function(o){
            overlap += _.intersection(o.pos,ph.pos).length;
          });

          ph.overlap = !!overlap;

          this.setState({
            ph:ph
          });
        }
      },
      render:function(){
        var objs = this.state.objs.map(function(o){
          return <div className={clsGen(o)} />
        });

        var ph = !!this.state.ph?<div className={clsGen(this.state.ph)}/>:"";

        return (
          <div className="map"
            onClick={this.clickHandler}
            onMouseOver={this.mouseoverHandler}>
            <Grid className="inv"/>
            {objs}{ph}
            <Grid/>
          </div>
        );
      }
    });

    var BattleShip = React.createClass({
      mixins: [FluxMixin, StoreWatchMixin("GameStore")],
      getStateFromFlux: function() {
        var flux = this.getFlux();
        return flux.store("GameStore").getState();
      },
      start: function(){
        this.getFlux().actions.start_game();
      },
      join: function(){
        this.getFlux().actions.join_game();
      },
      showStart : function(){
        return !this.state.game_state || this.state.game_state == "END"
      },
      showJoin : function(){
        return this.state.game_state == "INIT" && !this.state.is_player
      },
      showRandom : function(){
        return this.state.game_state == "ENGAGE" && !this.state.fire_mode == "random" && this.state.is_player
      },
      showGameAlreayStart : function(){
        return !(this.state.game_state == "" || this.state.game_state == "INIT") && !this.state.is_player
      },
      roomHopping: function(){
        window.location.href = "/react#"+idGen();
      },
      fireMode : function(mode){
        this.getFlux().actions.fire_mode(mode);
      },
      render:function(){
        var btn_random;
        if(this.state.game_state == "ENGAGE"){
          if(this.state.fire_mode == "random"){
            btn_random = <button className="btn btn-danger active" onClick={this.fireMode.bind(this,'')}>Disable Random</button>
          }else{
            btn_random = <button className="btn btn-danger" onClick={this.fireMode.bind(this,'random')}>Random Fire</button>
          }
        }
        return(
          <div className="row">
            <div className="col-sm-12 sysmsg">{this.state.sys_message}</div>
            <div className="col-md-6">
              <h3>My map</h3>
              <MyMap/>
              <div className="btns">
                {this.showStart()?<button className="btn btn-primary" onClick={this.start}>Start</button>:""}
                {this.showJoin()?<button className="btn btn-success" onClick={this.join}>Join</button>:""}
                {this.showGameAlreayStart()?<div class="warning">Game has alreay started. <a onClick={this.roomHopping}>Try another room</a></div>:""}
              </div>
            </div>
            <div className="col-md-6">
              <h3>Oppoenent's map</h3>
              <OpMap/>
              <div className="btns">
                {btn_random}
              </div>
            </div>
          </div>
        );
      }
    });

    // init
    React.render(<BattleShip flux={flux}/>,document.getElementById('battleship'));
