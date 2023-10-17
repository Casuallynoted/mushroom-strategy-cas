/**
 * Title Card class.
 *
 * Used for creating a Title Card.
 *
 * @class
 */
class TitleCard {
  /**
   * @type {string[]} An array of area ids.
   * @private
   */
  #areaIds;

  /**
   * @type {titleCardOptions}
   * @private
   */
  #options = {
    title: undefined,
    subtitle: undefined,
    showControls: true,
    iconOn: "mdi:power-on",
    iconOff: "mdi:power-off",
    onService: "none",
    offService: "none",
  };

  /**
   * Class constructor.
   *
   * @param {areaEntity[]} areas An array of area entities.
   * @param {titleCardOptions} options Title Card options.
   */
  constructor(areas, options = {}) {
    this.#areaIds = areas.map(area => area.area_id).filter(area_id => area_id);
    this.#options = {
      ...this.#options,
      ...options,
    };
  }

  /**
   * Create a Title card.
   *
   * @return {Object} A Title card.
   */
  createCard() {
    /** @type {Object[]} */
    const cards = [
      {
        type: "custom:mushroom-title-card",
        title: this.#options.title,
        subtitle: this.#options.subtitle,
      },
    ];

    if (this.#options.showControls) {
      cards.push({
        type: "custom:mushroom-chips-card",
        alignment: 'end',
        card_mod: {
          style: `
          ha-card {
            margin: 18px 0;
          }
          `
        },
        chips: [
          {
            type: 'template',
            icon: this.#options.iconOff,
            icon_color: "red",
            tap_action: {
              action: "call-service",
              service: this.#options.offService,
              target: {
                area_id: this.#areaIds,
              },
              data: {},
            },
          },
          {
            type: 'template',
            icon: this.#options.iconOn,
            icon_color: "amber",
            tap_action: {
              action: "call-service",
              service: this.#options.onService,
              target: {
                area_id: this.#areaIds,
              },
              data: {},
            },
          },
        ]
      });
    }

    return {
      type: "horizontal-stack",
      cards: cards,
    };
  }
}

export {TitleCard};
