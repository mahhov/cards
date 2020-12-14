class XStack extends XElement {
	static get attributeTypes() {
		return {
			// card as object
			count: {type: XElement.PropertyTypes.number},
		};
	}

	static get htmlTemplate() {
		return `
				<style>
					:host {
						display: inline-block;
						margin: 5px;
					}
				</style>
				
				<div id="card-container"></div>
				<div>x <span id="count"></span></div>
			`;
	}

	static create(card, count) {
		let stack = document.createElement('x-stack');
		stack.card = card;
		stack.count = count;
		return stack;
	}

	connectedCallback() {
	}

	get card() {
		return this.card_;
	}

	set card(value) {
		this.card_ = value;
		this.$('#card-container').appendChild(value);
	}

	set count(value) {
		this.$('#count').textContent = value;
	}
}

customElements.define(getXElementName(), XStack);
