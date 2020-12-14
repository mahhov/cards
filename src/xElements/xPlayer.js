let phases = {
	play: 'play',
	playResourcePlayed: 'playResourcePlayed',
	draw: 'draw',
};

class XPlayer extends XElement {
	static get attributeTypes() {
		return {
			name: {},
			life: {type: XElement.PropertyTypes.number},
			maxLife: {type: XElement.PropertyTypes.number},
			turn: {type: XElement.PropertyTypes.boolean},
			phase: {},
			resources: {type: XElement.PropertyTypes.number},
			draws: {type: XElement.PropertyTypes.number},
		};
	}

	static get htmlTemplate() {
		return `
				<style>
					:host {
						display: flex;
						outline: 1px solid #888;
						padding: 10px;
						margin: 10px;
					}
					
					.column {
						flex: 1;
					}
					
					.hidden {
						display: none;
					}
				</style>
				
				<div class="column">
					<div>
						<span id="name"></span>
						<span><span id="life"></span> / <span id="max-life"></span></span>
					</div>
					<div>
						<button id="end-phase-button" class="hidden"></button>
					</div>
					<div>
						<div id="turn-label"></div>
					</div>
					<div>Hand</div>
					<x-pool id="hand-pool"></x-pool>
				</div>
				<div class="column">
					<div>Actives</div>
					<x-pool id="active-pool"></x-pool>
				</div>
			`;
	}

	static create(name, life) {
		let player = document.createElement('x-player');
		player.name = name;
		player.life = life;
		player.maxLife = life;
		return player;
	}

	connectedCallback() {
		this.$('#end-phase-button').addEventListener('click', () => this.emit('end-phase'));
		this.$('#hand-pool').addEventListener('move', () => this.emit('draw'));
		this.$('#active-pool').addEventListener('move', () => this.emit('play'));
	}

	set name(value) {
		this.$('#name').textContent = value;
	}

	set life(value) {
		this.$('#life').textContent = value;
	}

	set maxLife(value) {
		this.$('#max-life').textContent = value;
	}

	set turn(value) {
		this.$('#end-phase-button').classList.toggle('hidden', !value);
	}

	set phase(value) {
		if (!this.turn)
			this.$('#turn-label').textContent = value === phases.draw ?
				"Opponent's draw phase." :
				"Opponent's play phase.";
		else
			this.$('#end-phase-button').textContent = value === phases.draw ?
				"End turn" :
				"End play";
	}

	set resources(value) {
		if (this.turn && this.phase !== phases.draw)
			this.$('#turn-label').textContent = `${value} resources remaining.`;
	}

	set draws(value) {
		if (this.turn && this.phase === phases.draw)
			this.$('#turn-label').textContent = `${value} draws remaining.`;
	}

	get hand() {
		return this.$('#hand-pool')
	}

	get active() {
		return this.$('#active-pool')
	}

	get typeAsCondition() {
		return conditions.source.player;
	}
}

customElements.define(getXElementName(), XPlayer);
