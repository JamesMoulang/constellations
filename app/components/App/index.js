import React, { Component } from 'react';
import _ from 'underscore';
import Scroll from 'react-scroll';
import io from 'socket.io-client/socket.io';
import Game from '../../Game';

class AppComponent extends Component {
	constructor(props) {
		super(props);
		this.state = {
			msg: '',
			messages: [],
			id: null,
			players: [],
			game: null
		}
	}

	removePlayer(id) {
		var players = _.filter(this.state.players, (p) => {
			return p.id != id;
		})
		this.setState({players});
	}

	createPlayer(id) {
		var players = _.map(this.state.players, _.clone);
		players.push({id});
		this.setState({players});
	}

	componentDidUpdate() {
		Scroll.animateScroll.scrollToBottom();
	}

	sendMessage(msg) {

	}

	componentDidMount() {
		var game = new Game('content');
		game.sendMessage = this.sendMessage.bind(this);
		this.setState({game});
	}

	render() {
		return (
			<div>
				<div ref="content" id="content"/>
			</div>
		)
	}
}

export default AppComponent;
