let cardTypes = {
	resource: 'resource',
	creature: 'creature',
	spell: 'spell',
}

class XCard extends XElement {
	static get attributeTypes() {
		return {
			name: {},
			type: {},
			description: {},
			attack: {type: XElement.PropertyTypes.number},
			maxAttack: {type: XElement.PropertyTypes.number},
			life: {type: XElement.PropertyTypes.number},
			maxLife: {type: XElement.PropertyTypes.number},
			cost: {type: XElement.PropertyTypes.number},
			// abilities as object
			selected: {type: XElement.PropertyTypes.boolean},
		};
	}

	static get htmlTemplate() {
		return `
				<style>
					:host {
						outline: 1px solid #555;
						padding: 5px;
						width: 140px;
						height: 120px;
						display: flex;
						flex-direction: column;
					}
					
					:host(.resource) {
						background: #e0ffe0;
					}
						
					:host(.creature) {
						background: #e0f0ff;
					}
						
					:host(.spell) {
						background: #ffe0e0;
					}
					
					:host(.selected) {
						background: #ffb;
					}
					
					#cost, #life-container {
						float: right;
					}
				
					#description {
						flex-grow: 1;
						margin-top: 10px;
					}
				</style>
				
				<div>
					<span id="name"></span>
					<span id="cost"></span>
				</div>
				<div id="description"></div>
				<div>
					<span>
						<span id="attack"></span> / <span id="max-attack"></span>
					</span>
					<span id="life-container">
						<span id="life"></span> / <span id="max-life"></span>
					</span>
				</div>
			`;
	}

	static create(name, type, description, attack, life, cost, abilities = []) {
		let card = document.createElement('x-card');
		card.name = name;
		card.type = type;
		card.description = description;
		card.attack = attack;
		card.maxAttack = attack;
		card.life = life;
		card.maxLife = life;
		card.cost = cost;
		card.abilities = abilities;
		return card;
	}

	connectedCallback() {
		this.addEventListener('click', () => this.emit('select'));
	}

	set name(value) {
		this.$('#name').textContent = value;
	}

	set type(value) {
		this.classList.remove(...this.classList);
		this.classList.add(value);
		this.selected = this.selected;
	}

	set description(value) {
		this.$('#description').textContent = value;
	}

	set attack(value) {
		this.$('#attack').textContent = value;
	}

	set maxAttack(value) {
		this.$('#max-attack').textContent = value;
	}

	set life(value) {
		this.$('#life').textContent = value;
	}

	set maxLife(value) {
		this.$('#max-life').textContent = value;
	}

	set cost(value) {
		this.$('#cost').textContent = value;
	}

	set selected(value) {
		this.classList.toggle('selected', value);
	}

	resetAbilities() {
		this.abilities.forEach(ability => ability.triggered = 0);
	}

	get clone() {
		return XCard.create(this.name, this.type, this.description, this.maxAttack, this.maxLife, this.cost, this.abilities.map(ability => ability.clone));
	}

	get typeAsCondition() {
		return conditions.source[this.type];
	}
}

customElements.define(getXElementName(), XCard);
