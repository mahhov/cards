class XPool extends XElement {
	static get attributeTypes() {
		return {};
	}

	static get htmlTemplate() {
		return `
				<style>
					:host {
						display: block;
						min-height: 100px;
					}
				</style>
				
				<div><button id="move">move</button></div>
				<div id="stacks-container"></div>
			`;
	}

	static create() {
		return document.createElement('x-pool');
	}

	constructor() {
		super();
		this.stacks = [];
	}

	connectedCallback() {
		this.$('#move').addEventListener('click', () => this.emit('move'));
	}

	addStack(card, count = 1) {
		let stack = XStack.create(card, count);
		this.stacks.push(stack);
		this.$('#stacks-container').appendChild(stack);
		card.addEventListener('select', () => this.emit('select', card));
	}

	removeStack(stackIndex) {
		this.stacks.splice(stackIndex, 1)[0].remove();
	}

	removeDeadStacks() {
		this.stacks = this.stacks.filter(stack => {
			if (stack.card.life || stack.card.type !== cardTypes.creature)
				return true;
			stack.remove();
		});
	}

	findCardIndex(card) {
		return this.stacks.findIndex(stack => stack.card === card);
	}

	get selectedStackIndex() {
		return this.stacks.findIndex(stack => stack.card.selected);
	}
}

customElements.define(getXElementName(), XPool);
