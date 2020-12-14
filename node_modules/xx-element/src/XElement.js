const PropertyTypes = {
	string: 'string',
	boolean: 'boolean',
	number: 'number',
	object: 'object',
};

class XElement extends HTMLElement {
	static get attributeTypes() {
		return {};
		/* override */
	}

	static get htmlTemplate() {
		return '';
		/* override */
	}

	static get observedAttributes() {
		return Object.keys(this.attributeTypes)
			.map(propName => XElement.propToAttribName_(propName));
	}

	constructor() {
		super();
		this.attachShadow({mode: 'open'});
		this.shadowRoot.innerHTML = this.constructor.htmlTemplate;

		let properties = Object.getOwnPropertyDescriptors(Object.getPrototypeOf(this));
		Object.entries(this.constructor.attributeTypes).forEach(([propName, {type, allowRedundantAssignment}]) => {
			let attribName = XElement.propToAttribName_(propName);
			Object.defineProperty(this, XElement.setterName_(propName), properties[propName] || {set: () => 0});
			switch (type) {
				case PropertyTypes.boolean:
					Object.defineProperty(this, propName, {
						get: () => this.hasAttribute(attribName),
						set: value => {
							if (allowRedundantAssignment || !value === this.hasAttribute(attribName))
								if (value)
									this.setAttribute(attribName, '');
								else
									this.removeAttribute(attribName);
						}
					});
					break;
				case PropertyTypes.number:
					Object.defineProperty(this, propName, {
						get: () => Number(this.getAttribute(attribName)),
						set: value => {
							if (allowRedundantAssignment || value !== this.getAttribute(attribName))
								this.setAttribute(attribName, Number(value));
						}
					});
					break;
				case PropertyTypes.object:
					Object.defineProperty(this, propName, {
						get: () => this.objectAttributes[attribName],
						set: value => {
							if (allowRedundantAssignment || value !== this.objectAttributes[attribName])
								this.objectAttributes[attribName] = value;
						}
					});
					break;
				case PropertyTypes.string:
				default:
					Object.defineProperty(this, propName, {
						get: () => this.getAttribute(attribName),
						set: value => {
							if (allowRedundantAssignment || value !== this.getAttribute(attribName))
								this.setAttribute(attribName, value);
						}
					});
					break;
			}
		});

	}

	attributeChangedCallback(attribName, oldValue, newValue) {
		let propName = XElement.attribToPropName_(attribName);
		this[XElement.setterName_(propName)] = this[propName];
	}

	$(query) {
		return this.shadowRoot.querySelector(query);
	}

	$$(query) {
		return this.shadowRoot.querySelectorAll(query);
	}

	clearChildren(query) {
		XElement.clearChildren(this.$(query));
	}

	static clearChildren(element) {
		while (element.firstChild)
			element.removeChild(element.firstChild);
	}

	emit(eventName, detail, otherEventParams) {
		this.dispatchEvent(new CustomEvent(eventName, {detail, ...otherEventParams}))
	}

	static propToAttribName_(propName) {
		return propName.replace(/[A-Z]/g, a => `-${a.toLowerCase()}`);
	}

	static attribToPropName_(attribName) {
		return attribName.replace(/-(.)/g, (_, a) => a.toUpperCase());
	}

	static setterName_(propName) {
		return `xel2_${propName}_`;
	}
}

XElement.PropertyTypes = PropertyTypes;

module.exports = XElement;
