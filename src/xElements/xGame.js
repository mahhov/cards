let randomIndexes = (n, pick) => {
	let array = Array(n).fill(0).map((_, i) => i);
	for (let i = 0; i < pick; i++) {
		let j = Math.floor(Math.random() * n);
		[array[i], array[j]] = [array[j], array[i]];
	}
	return array.slice(0, pick);
}

let randInt = (min, max) => Math.floor(Math.random() * (max - min)) + min;

class Event {
	apply(game) {
		return [];
	}
}

class TurnStartEvent extends Event {
	constructor() {
		super();
	}

	apply() {
	}
}

class SummonEvent extends Event {
	constructor() {
		super();
	}

}

class DrawEvent extends Event {
	constructor() {
		super();
	}

}

class EndPlayEvent extends Event {
	constructor() {
		super();
	}

}

class EndDrawEvent extends Event {
	constructor() {
		super();
	}

}

class AttackTargetEvent extends Event {
	constructor(sourceCard, sourcePlayer, targetPlayer) {
		super();
		this.sourceCard = sourceCard;
		this.sourcePlayer = sourcePlayer;
		this.targetPlayer = targetPlayer;
		this.target = targetPlayer;
	}

	apply(game) {
		if (!this.sourceCard.attack || !this.sourceCard.life)
			return [];
		game.triggerAbilities(this.targetPlayer, this.sourcePlayer, this.sourceCard.typeAsCondition, conditions.event.attackTarget, this);
		return [new AttackDamageEvent(this.sourceCard, this.sourcePlayer, this.targetPlayer, this.target)];
	}
}

class AttackDamageEvent extends Event {
	constructor(sourceCard, sourcePlayer, targetPlayer, target, attack = sourceCard.attack) {
		super();
		this.sourceCard = sourceCard;
		this.sourcePlayer = sourcePlayer;
		this.targetPlayer = targetPlayer;
		this.target = target;
		this.attack = attack;
	}

	apply(game) {
		game.triggerAbilities(this.targetPlayer, this.sourcePlayer, this.sourceCard.typeAsCondition, conditions.event.attackDamage, this);
		this.target.life -= this.attack;
		return this.target.life <= 0 ? [new PreDeathEvent(this.sourcePlayer, this.targetPlayer, this.target)] : [];
	}
}

class PreDeathEvent extends Event {
	constructor(sourcePlayer, targetPlayer, target) {
		super();
		this.sourcePlayer = sourcePlayer;
		this.targetPlayer = targetPlayer;
		this.target = target;
		this.die = true;
	}

	apply(game) {
		game.triggerAbilities(this.targetPlayer, this.sourcePlayer, this.target.typeAsCondition, conditions.event.preDeath, this);
		return this.die ? [new DeathEvent(this.sourcePlayer, this.targetPlayer, this.target)] : [];
	}
}

class DeathEvent extends Event {
	constructor(sourcePlayer, targetPlayer, target) {
		super();
		this.sourcePlayer = sourcePlayer;
		this.targetPlayer = targetPlayer;
		this.target = target;
	}

	apply(game) {
		game.triggerAbilities(this.targetPlayer, this.sourcePlayer, this.target.typeAsCondition, conditions.event.death, this);
		// todo handle player death
		return [];
	}
}

class ActiveEvent extends Event {
	constructor() {
		super();
	}

}

class BuffEvent extends Event {
	constructor(targetPlayer, nonTargetPlayer, target, attack, life) {
		super();
		this.targetPlayer = targetPlayer;
		this.nonTargetPlayer = nonTargetPlayer;
		this.target = target;
		this.attack = attack;
		this.life = life;
	}

	apply(game) {
		game.triggerAbilities(this.targetPlayer, this.nonTargetPlayer, this.target.typeAsCondition, conditions.event.buff, this);
		this.target.attack += this.attack;
		this.target.maxAttack += this.attack;
		this.target.life += this.life;
		this.target.maxLife += this.life;
		return [];
	}
}

class XGame extends XElement {
	static get attributeTypes() {
		return {};
	}

	static get htmlTemplate() {
		return `
				<style>
					:host {
						display: flex;
						flex-direction: column;
					}
				</style>
				
				<x-pool id="center-pool"></x-pool>
				<span id="players"></span>
			`;
	}

	static create() {
		return document.createElement('x-game');
	}

	constructor() {
		super();

		this.centerPool = this.$('#center-pool');
		[
			{rarity: 'resource', count: 1, stackSize: 20},
			{rarity: 'common', count: 3, stackSize: 15},
			{rarity: 'uncommon', count: 3, stackSize: 10},
			{rarity: 'rare', count: 2, stackSize: 6},
			{rarity: 'legendary', count: 1, stackSize: 4},
		]
			.flatMap(format => randomIndexes(cards[format.rarity].length, format.count)
				.map(i => cards[format.rarity][i])
				.map(card => [card, format.stackSize]))
			.sort(([card1], [card2]) => card1.cost - card2.cost)
			.forEach(([card, stackSize]) => this.centerPool.addStack(card.clone, stackSize));
		this.players = [
			XPlayer.create('Computer', 20),
			XPlayer.create('Player', 20)];
		this.turn = randInt(0, 2);
		this.phase = phases.play;
		this.resources = 0;
		this.draws = 0;
		this.moveCard(this.centerPool, 0, this.players[this.turn].hand);
		this.moveCard(this.centerPool, 0, this.players[1 - this.turn].hand);
		this.moveCard(this.centerPool, 0, this.players[1 - this.turn].hand);

		let pools = [
			this.centerPool,
			this.players[0].hand,
			this.players[0].active,
			this.players[1].hand,
			this.players[1].active];
		pools.forEach(pool =>
			pool.addEventListener('select', ({detail: card}) => {
				let wasSelected = card.selected;
				pools.forEach(pool => pool.stacks.forEach(stack => stack.card.selected = false));
				card.selected = !wasSelected;
			}));
		this.players.forEach((player, i) => {
			player.addEventListener('end-phase', () => this.phase === phases.draw ?
				this.endDrawPhase(i) :
				this.endPlayPhase(i));
			player.addEventListener('draw', () => this.drawCard(i, this.centerPool.selectedStackIndex));
			player.addEventListener('play', () => this.playCard(i, this.players[i].hand.selectedStackIndex));
			this.$('#players').appendChild(player);
		});
		this.notifyPlayersOfChange();

		// todo available selection indicator
	}

	connectedCallback() {
	}

	moveCard(fromPool, fromIndex, toPool) {
		let stack = fromPool.stacks[fromIndex];
		let resourceStack = toPool.stacks.find(stack => stack.card.type === cardTypes.resource);
		if (stack.card.type === cardTypes.resource && resourceStack)
			resourceStack.count++;
		else
			toPool.addStack(stack.card.clone, 1);
		if (!--stack.count) {
			fromPool.removeStack(fromIndex);
			this.notifyPlayersOfChange();
		}
	}

	drawCard(playerIndex, poolCardIndex) {
		if (this.turn === playerIndex && this.phase === phases.draw && this.draws && this.centerPool.stacks[poolCardIndex]?.count) {
			this.draws--;
			this.moveCard(this.centerPool, poolCardIndex, this.players[playerIndex].hand);
			this.notifyPlayersOfChange();
		}
	}

	playCard(playerIndex, handCardIndex) {
		// must be appropriate turn & phase
		if (this.turn !== playerIndex || this.phase !== phases.play && this.phase !== phases.playResourcePlayed)
			return;
		let stack = this.players[playerIndex].hand.stacks[handCardIndex];
		// must have card to play
		if (!stack?.count)
			return
		// can play 1 resource per turn
		if (stack.card.type === cardTypes.resource && this.phase === phases.playResourcePlayed)
			return;
		// must have enough resources
		if (stack.card.cost > this.resources)
			return false;
		// play card
		this.resources -= stack.card.cost;
		if (stack.card.type === cardTypes.resource) {
			this.phase = phases.playResourcePlayed;
			this.resources++;
		}
		this.moveCard(this.players[playerIndex].hand, handCardIndex, this.players[playerIndex].active);
		this.notifyPlayersOfChange();
	}

	endPlayPhase(playerIndex) {
		this.players.forEach(player => player.active.stacks.forEach(stack => stack.card.resetAbilities()));

		if (this.turn === playerIndex && (this.phase === phases.play || this.phase === phases.playResourcePlayed)) {
			this.players[this.turn].active.stacks.forEach(stack =>
				this.doEvent(new AttackTargetEvent(stack.card, this.players[this.turn], this.players[1 - this.turn])));
			this.players.forEach(player => player.active.removeDeadStacks());
			this.phase = phases.draw;
			this.draws = 2;
			this.notifyPlayersOfChange();
		}
	}

	endDrawPhase(playerIndex) {
		if (this.turn === playerIndex && this.phase === phases.draw) {
			this.turn = 1 - this.turn;
			this.phase = phases.play;
			this.resources = this.players[this.turn].active.stacks
				.filter(stack => stack.card.type === cardTypes.resource)
				.reduce((a, stack) => a + stack.count, 0) + 100;
			this.notifyPlayersOfChange();
		}
	}

	notifyPlayersOfChange() {
		this.players.forEach((player, i) => {
			player.turn = this.turn === i;
			player.phase = this.phase;
			player.resources = this.resources;
			player.draws = this.draws;
		});
	}

	doEvent(event) {
		event.apply(this).forEach(event => this.doEvent(event));
	}

	triggerAbilities(selfPlayer, opponentPlayer, sourceCondition, eventCondition, eventData) {
		[selfPlayer, opponentPlayer].forEach((player, isOpponentPlayer) =>
			player.active.stacks.forEach(stack =>
				stack.card.abilities.forEach(ability =>
					ability.tryTrigger(
						isOpponentPlayer ? conditions.player.opponent : conditions.player.self,
						sourceCondition,
						eventCondition,
						eventData,
						stack.card)
						?.forEach(event => this.doEvent(event)))));
	}
}

customElements.define(getXElementName(), XGame);
