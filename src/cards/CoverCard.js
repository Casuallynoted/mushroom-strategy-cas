import {AbstractCard} from "./AbstractCard";

/**
 * Cover Card Class
 *
 * Used to create a card for controlling an entity of the cover domain.
 *
 * @class
 * @extends AbstractCard
 */
class CoverCard extends AbstractCard {
  /**
   * Default options of the card.
   *
   * @type {coverCardOptions}
   * @private
   */
  #defaultOptions = {
    type: "custom:mushroom-cover-card",
    icon: undefined,
    show_buttons_control: true,
    layout: 'horizontal',
    show_position_control: false,
    show_tilt_position_control: false,
  };

  /**
   * Class constructor.
   *
   * @param {hassEntity} entity The hass entity to create a card for.
   * @param {coverCardOptions} [options={}] Options for the card.
   * @throws {Error} If the Helper module isn't initialized.
   */
  constructor(entity, options = {}) {
    super(entity);
    this.mergeOptions(
        this.#defaultOptions,
        options,
    );
  }
}

export {CoverCard};
