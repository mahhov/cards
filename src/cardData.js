let conditions = {
	player: {
		self: 'self',
		opponent: 'opponent',
	},
	entity: {
		player: 'player',
		resource: 'resource',
		creature: 'creature',
		spell: 'spell',
	},
	event: {
		turnStart: 'turnStart', // always entity.player
		preSummon: 'preSummon',
		summon: 'summon',
		draw: 'draw',
		endPlay: 'endPlay', // always entity.player
		endDraw: 'endDraw', // always entity.player
		attackTarget: 'attackTarget',
		attackDamage: 'attackDamage',
		preDeath: 'preDeath',
		death: 'death',
		selfDeath: 'selfDeath', // special event only triggered for the ownerCard and bypasses card.dead filter
		buff: 'buff',
	},
};

class Condition {
	constructor(players, entities, events) {
		this.players = players;
		this.entities = entities;
		this.events = events;
	}

	try(player, entity, event) {
		return Condition.matches(this.players, player) &&
			Condition.matches(this.entities, entity) &&
			Condition.matches(this.events, event)
	}

	static matches(conditions, condition) {
		return !conditions.length || conditions.includes(condition)
	}
}

class Effect {
	constructor(eventHandler) {
		this.eventHandler = eventHandler;
	}

	trigger(event, ownerCard, ability) {
		return this.eventHandler(event, ownerCard, ability) || [];
	}
}

class Ability {
	constructor(conditions, effects) {
		this.conditions = conditions;
		this.effects = effects;
		this.triggered = 0;
	}

	tryTrigger(playerCondition, entityConditions, eventCondition, event, ownerCard) {
		if (this.conditions.some(condition => condition.try(playerCondition, entityConditions, eventCondition)))
			return this.effects.flatMap(effect => effect.trigger(event, ownerCard, this));
	}

	get clone() {
		return new Ability(this.conditions, this.effects);
	}

	static taunt() {
		return new Ability(
			[new Condition([conditions.player.self], [conditions.entity.creature], [conditions.event.attackTarget])],
			[new Effect((event, ownerCard, ability) => {
				if (!event.taunted) {
					event.taunted = true;
					event.target = ownerCard;
				}
			})]);
	}

	static decreaseIncomingDamage(amount) {
		return new Ability(
			[new Condition([conditions.player.self], [conditions.entity.creature], [conditions.event.attackDamage])],
			[new Effect((event, ownerCard, ability) => {
				if (event.target === ownerCard)
					event.attack -= amount;
			})]);
	}

	static returnDamage(count, amount) {
		return new Ability(
			[new Condition([conditions.player.self], [conditions.entity.creature], [conditions.event.attackDamage])],
			[new Effect((event, ownerCard, ability) => {
				if (ability.triggered < count && event.sourceCard.life) {
					ability.triggered++;
					return new AttackDamageEvent(ownerCard, event.targetPlayer, event.sourcePlayer, event.sourceCard, amount);
				}
			})]);
	}

	static damageAllHostiles(amount) {
		return new Ability(
			[new Condition([conditions.player.self], [conditions.entity.player], [conditions.event.endPlay])],
			[new Effect((event, ownerCard, ability) => {
				return event.opponentPlayer.active.cards.map(target =>
					new AttackDamageEvent(ownerCard, event.turnPlayer, event.opponentPlayer, target, amount));
			})]);
	}

	static buffOnDamage(entityCondition, attack, life) {
		return new Ability(
			[new Condition([conditions.player.opponent], [conditions.entity.creature], [conditions.event.attackDamage])],
			[new Effect((event, ownerCard, ability) => {
				if (event.sourceCard === ownerCard && event.target.typeAsCondition === entityCondition)
					return new BuffEvent(event.targetPlayer, event.sourcePlayer, ownerCard, attack, life);
			})]);
	}

	static buffWhileActive(playerCondition, entityConditions, attack, life) {
		return new Ability(
			[new Condition([playerCondition], [], [conditions.event.turnStart])],
			[new Effect((event, ownerCard, ability) => {
				return event.turnPlayer.active.cards
					.filter(card => card !== ownerCard && Condition.matches(entityConditions, card.typeAsCondition))
					.map(card => new BuffEvent(event.turnPlayer, event.otherPlayer, card, attack, life, false, ownerCard));
			})]);
	}

	static buffOnDeath(entityCondition, attack, life) {
		return new Ability(
			[new Condition([conditions.player.self], [entityCondition], [conditions.event.selfDeath])],
			[new Effect((event, ownerCard, ability) => {
				if (event.target === ownerCard)
					// todo iterate ownerPlayer.cards and remove card.buffedTargets field
					return event.target.buffedTargets.map(buffed =>
						new BuffEvent(event.ownerPlayer, event.otherPlayer, buffed, attack, life, false, null));
			})]);
	}

	static resource(amount) {
		return new Ability(
			[new Condition([conditions.player.self], [], [conditions.event.turnStart])],
			[new Effect((event, ownerCard, ability) => {
				event.resource += amount;
			})]);
	}

	static summonCost(playerCondition, entityCondition, amount) {
		return new Ability(
			[new Condition([playerCondition], [entityCondition], [conditions.event.preSummon])],
			[new Effect((event, ownerCard, ability) => {
				event.cost += amount;
			})]);
	}

	static healOnTurnEnd(entityConditions, amount) {
		return new Ability(
			[new Condition([conditions.player.self], [], [conditions.event.endPlay])],
			[new Effect((event, ownerCard, ability) => {
				event.turnPlayer.active.cards
					.filter(card => card !== ownerCard && Condition.matches(entityConditions, card.typeAsCondition))
					.map(card => new BuffEvent(event.turnPlayer, event.otherPlayer, card, 0, amount, true));
			})]);
	}
}

let cards = {
	resource: [
		XCard.create('resource', cardTypes.resource, '', 0, 0, 0),
	],
	common: [
		XCard.create('goblin', cardTypes.creature, '', 1, 1, 1),
		XCard.create('giant', cardTypes.creature, '', 1, 3, 2),
		XCard.create('wild beast', cardTypes.creature, '', 2, 1, 2),
		XCard.create('empower', cardTypes.spell, '+1/+1 to target creature', 0, 0, 3),
		XCard.create('witch', cardTypes.creature, '1 damage the first hostile creature attacking each turn', 2, 1, 3,
			[Ability.returnDamage(1, 1)]),
	],
	uncommon: [
		XCard.create('wall', cardTypes.creature, '-1 all incoming damage, taunt', 0, 4, 3,
			[Ability.taunt(), Ability.decreaseIncomingDamage(1)]),
		XCard.create('vampire', cardTypes.creature, '+1/+0 damage after dealing damage to the player', 2, 4, 4,
			[Ability.buffOnDamage(conditions.entity.player, 1, 0)]),
		XCard.create('fireball', cardTypes.spell, '2 damage to any creature or player', 0, 0, 3),
		XCard.create('reinforcements', cardTypes.spell, 'draw 2 cards', 0, 0, 3),
		XCard.create('sword', cardTypes.spell, '1 damage to one attacking creature per turn', 0, 0, 4),
	],
	rare: [
		XCard.create('supplies', cardTypes.creature, '+1 resource', 0, 2, 3,
			[Ability.resource(1)]),
		XCard.create('general', cardTypes.creature, '+1/+1 boost to all friendly creatures while active', 3, 1, 6, [
			Ability.buffWhileActive(conditions.player.self, [conditions.entity.creature], 1, 1),
			Ability.buffOnDeath(conditions.entity.creature, -1, -1)]),
		XCard.create('priest', cardTypes.creature, 'heal +0/+1 to all other friendly creatures and player at turn end', 1, 3, 6,
			[Ability.healOnTurnEnd([conditions.entity.player, conditions.entity.creature], 1)]),
		XCard.create('summoner', cardTypes.creature, 'creatures cost 1 less resource to cast', 1, 2, 6,
			[Ability.summonCost(conditions.player.self, conditions.entity.creature, -1)]),
	],
	legendary: [
		XCard.create('dragon', cardTypes.creature, '1 damage to all hostile creatures on attack', 0, 5, 8,
			[Ability.damageAllHostiles(1)]),
	],
};
