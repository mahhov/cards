let conditions = {
	player: {
		self: 'self',
		opponent: 'opponent',
	},
	source: {
		player: 'player',
		resource: 'resource',
		creature: 'creature',
		spell: 'spell',
	},
	event: {
		turnStart: 'turnStart',
		summon: 'summon',
		draw: 'draw',
		endPlay: 'endPlay',
		endDraw: 'endDraw',
		attackTarget: 'attackTarget',
		attackDamage: 'attackDamage',
		preDeath: 'preDeath',
		death: 'death',
		active: 'active',
		buff: 'buff',
	},
};

class Condition {
	constructor(players, sources, events) {
		this.player = players;
		this.sources = sources;
		this.events = events;
	}
}

class Effect {
	constructor(eventHandler) {
		this.eventHandler = eventHandler;
	}

	trigger(eventCondition, event, ownerCard, ability) {
		return this.eventHandler(eventCondition, event, ownerCard, ability) || [];
	}
}

class Ability {
	constructor(conditions, effects) {
		this.conditions = conditions;
		this.effects = effects;
		this.triggered = 0;
	}

	tryTrigger(playerCondition, sourceCondition, eventCondition, event, ownerCard) {
		if (this.conditions.some(condition => condition.player.includes(playerCondition) &&
			condition.sources.includes(sourceCondition) &&
			condition.events.includes(eventCondition)))
			return this.effects.flatMap(effect => effect.trigger(eventCondition, event, ownerCard, this));
	}

	get clone() {
		return new Ability(this.conditions, this.effects);
	}

	static taunt() {
		return new Ability(
			[new Condition([conditions.player.self], [conditions.source.creature], [conditions.event.attackTarget])],
			[new Effect((eventCondition, event, ownerCard, ability) => {
				if (!event.taunted) {
					event.taunted = true;
					event.target = ownerCard;
				}
			})]);
	}

	static decreaseIncomingDamage(amount) {
		return new Ability(
			[new Condition([conditions.player.self], [conditions.source.creature], [conditions.event.attackDamage])],
			[new Effect((eventCondition, event, ownerCard, ability) => {
				if (event.target === ownerCard)
					event.attack -= amount;
			})]
		);
	}

	static returnDamage(count, amount) {
		return new Ability(
			[new Condition([conditions.player.self], [conditions.source.creature], [conditions.event.attackDamage])],
			[new Effect((eventCondition, event, ownerCard, ability) => {
				if (ability.triggered < count && event.sourceCard.life) {
					ability.triggered++;
					return new AttackDamageEvent(ownerCard, event.targetPlayer, event.sourcePlayer, event.sourceCard, amount);
				}
			})]
		);
	}

	static buffOnDamage(playerCondition, sourceCondition, attack, life) {
		return new Ability(
			[new Condition([playerCondition], [conditions.source.creature], [conditions.event.attackDamage])],
			[new Effect((eventCondition, event, ownerCard, ability) => {
				if (!ability.triggered && event.sourceCard === ownerCard && event.target.typeAsCondition === sourceCondition) {
					ability.triggered++;
					return new BuffEvent(event.targetPlayer, event.sourcePlayer, ownerCard, attack, life);
				}
			})]
		);
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
			[Ability.buffOnDamage(conditions.player.opponent, conditions.source.player, 1, 0)]),
		XCard.create('fireball', cardTypes.spell, '2 damage to any creature or player', 0, 0, 3),
		XCard.create('reinforcements', cardTypes.spell, 'draw 2 cards', 0, 0, 3),
		XCard.create('sword', cardTypes.spell, '1 damage to one attacking creature per turn', 0, 0, 4),
	],
	rare: [
		XCard.create('supplies', cardTypes.creature, '+1 resource', 0, 2, 3),
		XCard.create('general', cardTypes.creature, '+1/+1 boost to all friendly creatures while active', 3, 4, 6),
		XCard.create('priest', cardTypes.creature, 'heal +0/+1 to all other friendly creatures and player after dealing damage', 2, 6, 6),
		XCard.create('summoner', cardTypes.creature, 'creatures cost 1 less resource to cast', 1, 2, 6),
	],
	legendary: [
		XCard.create('dragon', cardTypes.creature, '1 damage to all hostile creatures on attack', 0, 5, 8),
	],
};
