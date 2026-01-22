export default class PauseManager {
    constructor({
        getPaused,
        setPaused,
        onPause,
        onResume,
        onToggle,
        id
    } = {}) {
        this._paused = false;
        this.id = id || 'PauseManager';

        this.getPaused = typeof getPaused === 'function'
            ? getPaused
            : () => this._paused;

        this.setPaused = typeof setPaused === 'function'
            ? setPaused
            : (paused) => {
                this._paused = !!paused;
            };

        this.onPause = typeof onPause === 'function' ? onPause : null;
        this.onResume = typeof onResume === 'function' ? onResume : null;
        this.onToggle = typeof onToggle === 'function' ? onToggle : null;
    }

    isPaused() {
        return !!this.getPaused();
    }

    pause(context) {
        if (this.isPaused()) {
            return false;
        }

        this.setPaused(true);

        if (this.onPause) {
            this.onPause(context);
        }

        if (this.onToggle) {
            this.onToggle(true, context);
        }

        return true;
    }

    resume(context) {
        if (!this.isPaused()) {
            return false;
        }

        this.setPaused(false);

        if (this.onResume) {
            this.onResume(context);
        }

        if (this.onToggle) {
            this.onToggle(false, context);
        }

        return true;
    }

    toggle(context) {
        return this.isPaused() ? this.resume(context) : this.pause(context);
    }
}
