export default class PauseOverlay {
    constructor({ getGamepad } = {}) {
        this.getGamepad = typeof getGamepad === 'function'
            ? getGamepad
            : () => window.getGlobalGamepad?.();
        this.overlay = null;
        this.optionsContainer = null;
        this.options = [];
        this.selectedIndex = 0;
        this.lastDpadUp = false;
        this.lastDpadDown = false;
        this.optionsClickListener = null;
        this.pauseKeyListener = null;
        this.pauseGamepadInterval = null;
        this.startButtonWasPressed = false;
        this.onResume = null;
    }

    show({
        id = 'game-pause-overlay',
        title = 'PAUSED',
        subtitle = '',
        hint = '',
        zIndex = 9999,
        background = 'rgba(0, 0, 0, 0.8)',
        options = [],
        selectedIndex = 0,
        onResume
    } = {}) {
        this.hide();

        this.onResume = typeof onResume === 'function' ? onResume : null;
        this.options = Array.isArray(options) ? options : [];
        this.selectedIndex = Math.max(0, Math.min(selectedIndex, this.options.length - 1));

        this.overlay = document.createElement('div');
        this.overlay.id = id;
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: ${background};
            z-index: ${zIndex};
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        `;

        const subtitleMarkup = subtitle
            ? `<div style="font-size: 18px; color: #AAA; margin-bottom: 10px;">${subtitle}</div>`
            : '';
        const hintMarkup = hint
            ? `<div style="font-size: 18px; color: #AAA; margin-bottom: 18px;">${hint}</div>`
            : '';

        this.overlay.innerHTML = `
            <div style="text-align: center; color: white;">
                <div style="font-size: 72px; font-weight: bold; margin-bottom: 20px; color: #FFD700;">
                    ${title}
                </div>
                ${subtitleMarkup}
                ${hintMarkup}
                <div data-pause-options="true"></div>
            </div>
        `;

        this.optionsContainer = this.overlay.querySelector('[data-pause-options="true"]');
        this._renderOptions();
        this.optionsClickListener = (event) => {
            const target = event.target.closest('[data-option-index]');
            if (!target) return;
            event.preventDefault();
            const index = Number(target.getAttribute('data-option-index'));
            if (!Number.isNaN(index)) {
                this.selectedIndex = index;
                this._renderOptions();
                this._handleActivate();
            }
        };
        this.optionsContainer.addEventListener('click', this.optionsClickListener);

        document.body.appendChild(this.overlay);

        this.pauseKeyListener = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                this._handleActivate();
                return;
            }

            if (event.key === 'ArrowUp' || event.key === 'w' || event.key === 'W') {
                event.preventDefault();
                this._moveSelection(-1);
                return;
            }

            if (event.key === 'ArrowDown' || event.key === 's' || event.key === 'S') {
                event.preventDefault();
                this._moveSelection(1);
                return;
            }
        };
        document.addEventListener('keydown', this.pauseKeyListener);

        this.pauseGamepadInterval = setInterval(() => {
            const pad = this.getGamepad?.();
            const dpadUp = !!(pad && pad.buttons && pad.buttons[12] && pad.buttons[12].pressed);
            const dpadDown = !!(pad && pad.buttons && pad.buttons[13] && pad.buttons[13].pressed);

            if (dpadUp && !this.lastDpadUp) {
                this._moveSelection(-1);
            }
            if (dpadDown && !this.lastDpadDown) {
                this._moveSelection(1);
            }

            this.lastDpadUp = dpadUp;
            this.lastDpadDown = dpadDown;

            if (pad && pad.buttons && pad.buttons[9] && pad.buttons[9].pressed) {
                if (!this.startButtonWasPressed) {
                    this.startButtonWasPressed = true;
                    this._handleActivate();
                }
            } else {
                this.startButtonWasPressed = false;
            }
        }, 50);
    }

    hide() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
        }

        if (this.pauseKeyListener) {
            document.removeEventListener('keydown', this.pauseKeyListener);
            this.pauseKeyListener = null;
        }

        if (this.pauseGamepadInterval) {
            clearInterval(this.pauseGamepadInterval);
            this.pauseGamepadInterval = null;
        }

        if (this.optionsContainer && this.optionsClickListener) {
            this.optionsContainer.removeEventListener('click', this.optionsClickListener);
        }
        this.optionsClickListener = null;

        this.onResume = null;
        this.startButtonWasPressed = false;
        this.lastDpadUp = false;
        this.lastDpadDown = false;
        this.options = [];
        this.selectedIndex = 0;
        this.optionsContainer = null;
    }

    _handleActivate() {
        if (this.options.length > 0) {
            const selected = this.options[this.selectedIndex];
            if (selected && typeof selected.onSelect === 'function') {
                selected.onSelect();
                return;
            }
            if (selected && selected.id === 'resume' && this.onResume) {
                this.onResume();
                return;
            }
        }

        if (this.onResume) {
            this.onResume();
        }
    }

    _moveSelection(delta) {
        if (!this.options.length) {
            return;
        }

        const nextIndex = (this.selectedIndex + delta + this.options.length) % this.options.length;
        this.selectedIndex = nextIndex;
        this._renderOptions();
    }

    _renderOptions() {
        if (!this.optionsContainer) {
            return;
        }

        if (!this.options.length) {
            this.optionsContainer.innerHTML = '';
            return;
        }

        const optionsMarkup = this.options
            .map((option, index) => {
                const isSelected = index === this.selectedIndex;
                const color = isSelected ? '#FFD700' : '#FFFFFF';
                const weight = isSelected ? 'bold' : 'normal';
                return `
                    <div data-option-index="${index}" style="font-size: 18px; color: ${color}; font-weight: ${weight}; margin: 6px 0; cursor: pointer;">
                        ${option.label}
                    </div>
                `;
            })
            .join('');

        this.optionsContainer.innerHTML = optionsMarkup;
    }
}
