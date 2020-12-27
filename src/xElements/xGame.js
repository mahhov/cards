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
	constructor(turnPlayer, opponentPlayer) {
		super();
		this.turnPlayer = turnPlayer;
		this.opponentPlayer = opponentPlayer;
		this.resource = 0;
	}

	apply(game) {
		game.triggerAbilities(this.turnPlayer, this.opponentPlayer, conditions.entity.player, conditions.event.turnStart, this);
		game.resources += this.resource;
		game.notifyPlayersOfChange();
		return [];
	}
}

class PreSummonEvent extends Event {
	constructor(player, otherPlayer, target) {
		super();
		this.player = player;
		this.otherPlayer = otherPlayer;
		this.target = target;
		this.cost = target.cost;
	}

	apply(game) {
		game.triggerAbilities(this.player, this.otherPlayer, this.target.typeAsCondition, conditions.event.preSummon, this);
		return game.resources >= this.cost ?
			[new SummonEvent(this.player, this.otherPlayer, this.target, this.cost)] :
			[];
	}
}

class SummonEvent extends Event {
	constructor(player, otherPlayer, target, cost = target.cost) {
		super();
		this.player = player;
		this.otherPlayer = otherPlayer;
		this.target = target;
		this.cost = cost;
	}

	apply(game) {
		game.triggerAbilities(this.player, this.otherPlayer, this.target.typeAsCondition, conditions.event.summon, this);
		game.resources -= this.cost;
		if (this.target.type === cardTypes.resource) {
			game.phase = phases.playResourcePlayed;
			game.resources++;
		}
		game.moveCard(this.player.hand, this.target, this.player.active);
		game.notifyPlayersOfChange();
		return [];
	}
}

class DrawEvent extends Event {
	constructor() {
		super();
	}
}

class EndPlayEvent extends Event {
	constructor(turnPlayer, opponentPlayer) {
		super();
		this.turnPlayer = turnPlayer;
		this.opponentPlayer = opponentPlayer;
	}

	apply(game) {
		game.triggerAbilities(this.turnPlayer, this.opponentPlayer, conditions.entity.player, conditions.event.endPlay, this);
		return [];
	}
}

class EndDrawEvent extends Event {
	constructor(turnPlayer, opponentPlayer) {
		super();
		this.turnPlayer = turnPlayer;
		this.opponentPlayer = opponentPlayer;
	}

	apply(game) {
		game.triggerAbilities(this.turnPlayer, this.opponentPlayer, conditions.entity.player, conditions.event.endDraw, this);
		game.turn = 1 - game.turn;
		game.phase = phases.play;
		game.resources = game.player.active.stacks
			.filter(stack => stack.card.type === cardTypes.resource)
			.reduce((a, stack) => a + stack.count, 0) + 100;
		return [new TurnStartEvent(game.player, game.otherPlayer)];
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
	constructor(otherPlayer, ownerPlayer, target) {
		super();
		this.otherPlayer = otherPlayer;
		this.ownerPlayer = ownerPlayer;
		this.target = target;
		this.die = true;
	}

	apply(game) {
		game.triggerAbilities(this.ownerPlayer, this.otherPlayer, this.target.typeAsCondition, conditions.event.preDeath, this);
		return this.die ? [new DeathEvent(this.otherPlayer, this.ownerPlayer, this.target)] : [];
	}
}

class DeathEvent extends Event {
	constructor(otherPlayer, ownerPlayer, target) {
		super();
		this.otherPlayer = otherPlayer;
		this.ownerPlayer = ownerPlayer;
		this.target = target;
	}

	apply(game) {
		game.triggerAbilities(this.ownerPlayer, this.otherPlayer, this.target.typeAsCondition, conditions.event.death, this);
		// todo handle player death
		return [new SelfDeathEvent(this.otherPlayer, this.ownerPlayer, this.target)];
	}
}

class SelfDeathEvent extends Event {
	constructor(otherPlayer, ownerPlayer, target) {
		super();
		this.otherPlayer = otherPlayer;
		this.ownerPlayer = ownerPlayer;
		this.target = target;
	}

	apply(game) {
		game.triggerAbilities(this.ownerPlayer, this.otherPlayer, this.target.typeAsCondition, conditions.event.selfDeath, this);
		return [];
	}
}

class BuffEvent extends Event {
	constructor(targetPlayer, nonTargetPlayer, target, attack, life, capped = false, sourceCard = null) {
		super();
		this.targetPlayer = targetPlayer;
		this.nonTargetPlayer = nonTargetPlayer;
		this.target = target;
		this.attack = attack;
		this.life = life;
		this.capped = true;
		this.sourceCard = sourceCard;
	}

	apply(game) {
		if (this.target.buffedBy?.includes(this.sourceCard) || this.sourceCard?.buffedTargets?.includes(this.target))
			return [];

		game.triggerAbilities(this.targetPlayer, this.nonTargetPlayer, this.target.typeAsCondition, conditions.event.buff, this);

		if (this.capped && this.attack > 0)
			this.target.attack = Math.max(this.target.attack, Math.min(this.target.attack + this.attack, this.target.maxAttack));
		else
			this.target.attack += this.attack;

		if (this.capped && this.life > 0)
			this.target.life = Math.max(this.target.life, Math.min(this.target.life + this.life, this.target.maxLife));
		else
			this.target.life += this.life;

		if (this.sourceCard) {
			this.target.buffedBy.push(this.sourceCard);
			this.sourceCard.buffedTargets.push(this.target);
		}
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
		this.moveCardByIndex(this.centerPool, 0, this.player.hand);
		this.moveCardByIndex(this.centerPool, 0, this.otherPlayer.hand);
		this.moveCardByIndex(this.centerPool, 0, this.otherPlayer.hand);

		let pools = [
			this.centerPool,
			this.players[0].hand,
			this.players[0].active,
			this.players[1].hand,
			this.players[1].active];
		pools.forEach(pool =>
			pool.addEventListener('select', ({detail: card}) => {
				let wasSelected = card.selected;
				pools.forEach(pool => pool.cards.forEach(card => card.selected = false));
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

		this.player.hand.addStack(cards.legendary[0], 3);
		this.otherPlayer.hand.addStack(cards.common[1], 3);

		// todo available selection indicator
	}

	moveCardByIndex(fromPool, fromIndex, toPool) {
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

	moveCard(fromPool, fromCard, toPool) {
		let fromIndex = fromPool.stacks.findIndex(stack => stack.card === fromCard);
		this.moveCardByIndex(fromPool, fromIndex, toPool);
	}

	// todo use event
	drawCard(playerIndex, poolCardIndex) {
		if (this.turn === playerIndex && this.phase === phases.draw && this.draws && this.centerPool.stacks[poolCardIndex]?.count) {
			this.draws--;
			this.moveCardByIndex(this.centerPool, poolCardIndex, this.players[playerIndex].hand);
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
		this.doEvent(new PreSummonEvent(this.player, this.otherPlayer, stack.card));
	}

	endPlayPhase(playerIndex) {
		if (this.turn === playerIndex && this.phase !== phases.draw) {
			this.players.forEach(player => player.active.cards.forEach(card => card.resetAbilities()));
			this.player.active.cards.forEach(card =>
				this.doEvent(new AttackTargetEvent(card, this.player, this.otherPlayer)));
			this.doEvent(new EndPlayEvent(this.player, this.otherPlayer));
			this.players.forEach(player => player.active.removeDeadStacks());

			this.phase = phases.draw;
			this.draws = 2;
			this.notifyPlayersOfChange();
		}
	}

	endDrawPhase(playerIndex) {
		if (this.turn === playerIndex && this.phase === phases.draw)
			this.doEvent(new EndDrawEvent(this.player, this.otherPlayer));
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

	triggerAbilities(selfPlayer, opponentPlayer, entityCondition, eventCondition, eventData) {
		[selfPlayer, opponentPlayer].forEach((player, isOpponentPlayer) =>
			player.active.stacks.map(stack => stack.card)
				.filter(card => !card.dead ||
					eventCondition === conditions.event.selfDeath && card === eventData.target)
				.forEach(card =>
					card.abilities.forEach(ability =>
						ability.tryTrigger(
							isOpponentPlayer ? conditions.player.opponent : conditions.player.self,
							entityCondition,
							eventCondition,
							eventData,
							card)
							?.forEach(event => this.doEvent(event)))));
	}

	get player() {
		return this.players[this.turn];
	}

	get otherPlayer() {
		return this.players[1 - this.turn];
	}
}

customElements.define(getXElementName(), XGame);
