# XElement

Convenience class for creating custom HTML elements.

## Toggle button example

```html
<style>
	:host {
		display: flex;
	}

	label {
		display: flex;
	}

	input:checked ~ .toggle-off {
		display: none
	}

	input:not(:checked) ~ .toggle-on {
		display: none
	}
</style>

<label>
    <span id="title"></span>
	<input id="checkbox" type="checkbox" hidden>
	<slot name="toggle-on" class="toggle-on"></slot>
	<slot name="toggle-off" class="toggle-off"></slot>
</label>
```

```js
const {XElement, importUtil} = require('xx-element');
const {template, name} = importUtil(__filename);

customElements.define(name, class extends XElement {
	static get attributeTypes() {
		return {title: {}, checked: {type: XElement.propertyTypes.boolean}};
	}

	static get htmlTemplate() {
		return template;
	}

	connectedCallback() {
		this.$('#checkbox').addEventListener('change', () => {
			this.checked = this.$('#checkbox').checked;
            this.dispatchEvent(new CustomEvent('change', {detail: this.checked}));
		});
		this.$('label').addEventListener('click', e => e.stopPropagation());
	}

	set title(value) {
		this.$('#title').textContent = value;
	}
	
	set checked(value) {
		this.$('#checkbox').checked = value;
	}
});
```

## Usage

- Create a class extending XElement.
- Override the static getter `attributeTypes` and add setter methods for each bound attribute (see below).
- Override the static getter `htmlTemplate`; it should return a string representation of the element's `HTML`.

## Attribute bindings

### setters

For each attribute to be bound, specify a setter that will be invoked when the attribute changes. If omitted, a no-op setter will be used.

### `static get attributeTypes`

Returns `{attribute: {type: XElement.propertyTypes.string|boolean|number|object, allowRedundantAssignment: true|false}, ...}`. Keys indicate which attributes will be bound. Values indicate the binding options. Setting `boolean: true` indicates a boolean attribute. Setting `allowRedundantAssignment: true` indicates re-assigning the current value to the binding will not short-circuit and propagate as if a new value was being assigned. 

### Example

```
    static get attributeTypes() {
        return {title: {}, checked: {type: Xelement.propertyTypes.boolean}};
    }
    ...
    
    set title(value) {
        this.$('#title').textContent = value;
    }
```

`myElement.title = 'yes'` or `<my-elemnet title="yes">` will both update the `title` attribute and call the defined setter. `myElement.title` will return the current value.

## Helpers

The `XElement` base class provides 3 helper functions:

- `$(selector)` invokes to `querySelector` on the XElement's `shadowRoot`.
- `$$(selector)` invokes to `querySelectorAll` on the XElement's `shadowRoot`.
- `clearChildren(selector)` and `XElement.clearChildren(element)` clear the children elements of the specified element.
- `emit(eventName, detail, otherEventParams)` constructs a `CustomEvent` and invokes `dispatchEvent` on the XElement.

## importUtils

`importUtils` provides a function to help fetch the custom element names and templates. To use, simply replace first 3 lines from the above example to:

```js
const {importUtil, XElement} = require('xx-element');
const {template, name} = importUtil(__filename);

customElements.define(name, class extends XElement  {
    ...
```
